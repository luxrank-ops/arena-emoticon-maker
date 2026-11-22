import { ACCESSORIES } from '@/lib/accessories';
import { createHash } from 'node:crypto';
import { AI_ADMIN_ONLY_MESSAGE, aiAccess, bypassesRateLimit, isUnlimited } from '@/lib/admin-access';
import { consumeTrialImage, TRIAL_MESSAGES, TRIAL_VARIANT_KEYS, trialIpHash, trialToneAllowed } from '@/lib/free-trial';
import { buildCharacterSheet } from '@/lib/ai/character-sheet';
import { preparedSchema } from '@/lib/ai/consistency';
import { comicExpressionById } from '@/lib/comic-expressions';
import { presetById, presetPrompt } from '@/data/emoticon-presets-150';
import { PHOTO_STICKER_SCENES } from '@/lib/photo-stickers';
import { z } from 'zod';
import { fail, handleError, ok, photoInputError } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { logEvent, uid, withDB } from '@/lib/store';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';
import { RenderError, renderWithGemini } from '@/lib/ai/gemini-render';
import { isCharacterDesignSheet } from '@/lib/ai/character-sheet';
import type { CharacterDesignSheet } from '@/lib/ai/character-sheet';
import { formatCutByTemplate, packFormatById } from '@/lib/pack-formats';
import { deleteImage, loadImage, newImageId, saveImage } from '@/lib/images';
import { applyCredits, CreditError } from '@/lib/credits';
import type { Emotion, Tone } from '@/lib/types';
import { consumePlayGeneration } from '@/lib/play-usage';

// Gemini 생성(최대 ~55초) + 변환 여유를 위해 함수 실행 시간을 늘린다
export const maxDuration = 60;
export const runtime = 'nodejs';

/** 에디터에서 다시 그리기 1회당 차감 크레딧 */
const REDRAW_COST = 1;

const SHEET_NOTES = [
  'natural balanced proportions, closest to the original photo',
  'softer colors and a gentle presentation, preserving the same facial proportions',
  'a more stylish presentation, preserving the same facial proportions',
];

const schema = z.object({
  /** 사진은 요청 본문으로만 전달되며 서버에 저장되지 않는다 */
  photo: z
    .string()
    .max(4_000_000)
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, '사진 형식을 확인해 주세요'),
  /** 2인·반려 케미 팩의 두 번째 인물 사진 (사진 2장 입력) */
  secondPhoto: z
    .string()
    .max(4_000_000)
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, '두 번째 사진 형식을 확인해 주세요')
    .optional(),
  secondConsistency: preparedSchema.optional(),
  consistency: preparedSchema,
  target: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('frame'),
      frameId: z.string().min(3).max(80),
      /** true 면 기존 컷을 무시하고 현재 대사·표정으로 다시 그린다 (에디터, 1크레딧) */
      force: z.boolean().optional(),
      accessoryIds: z.array(z.string().refine((id) => ACCESSORIES.some((a) => a.id === id), '알 수 없는 악세사리입니다'))
        .max(3).refine((ids) => new Set(ids).size === ids.length, '중복된 악세사리입니다').optional(),
    }),
    z.object({
      kind: z.literal('sheet'),
      sheetId: z.string().min(3).max(80),
      variantKey: z.string().min(1).max(2),
    }),
    /** 무료 체험 컷 1장 — 팩에 붙이지 않고 결과만 돌려준다 (시안 1장 + 컷 2장 맛보기) */
    z.object({
      kind: z.literal('preview'),
      sheetId: z.string().min(3).max(80),
      variantKey: z.string().min(1).max(2),
      emotion: z.enum([
        'joy', 'laugh', 'love', 'sad', 'angry', 'sulk', 'tired',
        'surprised', 'smug', 'cry', 'king', 'blank',
      ]),
    }),
  ]),
});

/**
 * POST /api/render
 * 업로드한 사진을 참조해 컷(또는 캐릭터 시안) 1장을 생성한다.
 *  · frame: 팩의 컷 (대사·감정은 팩에서 읽는다). 이미 있으면 그대로 돌려준다.
 *           force=true(에디터 다시 그리기)면 1크레딧을 먼저 차감하고, 실패하면 환불한다.
 *  · sheet: 캐릭터 시안 (감정은 기쁨 고정, 시안마다 살짝 다른 지시). 무료.
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'generate', RATE_LIMITS.generate);
    if (limited && !bypassesRateLimit(user)) return limited;
    // 관리자 전용 기간에는 일반 방문자를 막되, 무료 체험(1~2컷)이 열려 있으면 'trial' 로 통과시킨다.
    //  · trial 은 아래에서 사용자·IP·전체 상한을 소비하고, 팩 컷(frame)은 만들 수 없다.
    const access = aiAccess(user);
    if (access === 'blocked') return fail('AI_ADMIN_ONLY', AI_ADMIN_ONLY_MESSAGE, 403);

    const body = schema.parse(await req.json());
    const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(body.photo);
    if (!match) return fail('INVALID_INPUT', '사진 형식을 확인해 주세요', 422);
    const mimeType = match[1];
    const photoBase64 = match[2];

    const hash = (s: string) => createHash('sha256').update(s).digest('hex');
    const identityGuidance = await withDB((db) => {
      const now = Date.now();
      db.consistencyPreparations = db.consistencyPreparations.filter((entry) => entry.expiresAt > now);
      const entry = db.consistencyPreparations.find((item) => item.tokenHash === hash(body.consistency.token) && item.userId === user.id && item.photoHash === hash(body.photo));
      return entry ?? null;
    });
    if (!identityGuidance) return fail('CONSISTENCY_REQUIRED', '사진이 바뀌었거나 준비가 만료됐어요. 사진을 다시 확인해 주세요.', 409);
    const target = body.target;

    // 무료 체험은 '맛보기'만 — 팩 컷(12컷 등 다량 생성)은 막는다.
    if (access === 'trial' && target.kind === 'frame') {
      return fail('TRIAL_ONLY', TRIAL_MESSAGES.packBlocked, 403);
    }

    if (target.kind === 'frame' && target.accessoryIds && !target.force) {
      return fail('INVALID_INPUT', '악세사리를 적용하려면 다시 그려야 합니다', 422);
    }

    // 1) 대상 확인 (소유자 검증)
    const plan = await withDB((db) => {
      if (target.kind === 'frame') {
        const pack = db.packs.find((p) => p.userId === user.id && p.frames.some((f) => f.id === target.frameId));
        if (!pack) throw Object.assign(new Error('컷을 찾을 수 없습니다'), { code: 'FRAME_NOT_FOUND' });
        const frame = pack.frames.find((f) => f.id === target.frameId)!;
        if (frame.hiddenAt) throw Object.assign(new Error('컷을 찾을 수 없습니다'), { code: 'FRAME_NOT_FOUND' });
        const sheet = db.sheets.find((s) => s.id === pack.sheetId && s.userId === user.id);
        const chosenImageId = pack.characterReferenceImageId ?? sheet?.variants.find((variant) => variant.key === sheet.chosenKey)?.imageId;
        if (frame.imageId && !target.force) return { existing: frame.imageId as string };
        // 표정·포즈 프리셋을 고른 컷이면 표정·포즈·이펙트를 그대로 프롬프트에 넣는다.
        const framePreset = presetById(frame.presetId);
        return {
          kind: 'frame' as const,
          subjectKind: pack.subjectKind ?? 'person',
          packId: pack.id,
          frameId: frame.id,
          tone: pack.tone as Tone,
          mode: pack.mode ?? 'face',
          emotion: frame.emotion as Emotion,
          presetPrompt: framePreset ? presetPrompt(framePreset) : undefined,
          sceneAction: frame.comicExpressionId ? comicExpressionById(frame.comicExpressionId)?.action : pack.tone === 'photo-sticker' ? PHOTO_STICKER_SCENES.find((s) => s.id === frame.templateId && s.emotion === frame.emotion)?.action : undefined,
          line: frame.line,
          accessoryIds: target.accessoryIds ?? frame.accessoryIds ?? [],
          chosenImageId,
          variantNote: undefined as string | undefined,
          charged: !!target.force && !isUnlimited(user),
          previousImageId: frame.imageId as string | undefined,
          format: pack.format,
          textMode: pack.textMode ?? 'baked',
          designSheet: isCharacterDesignSheet(pack.designSheet) ? pack.designSheet : undefined,
          templateId: frame.templateId,
          comboRole: frame.comboRole,
        };
      }
      const sheet = db.sheets.find((s) => s.id === target.sheetId && s.userId === user.id);
      if (!sheet) throw Object.assign(new Error('캐릭터 시트를 찾을 수 없습니다'), { code: 'SHEET_NOT_FOUND' });
      const variantIndex = sheet.variants.findIndex((v) => v.key === target.variantKey);
      if (variantIndex < 0) throw Object.assign(new Error('없는 시트 옵션입니다'), { code: 'VARIANT_NOT_FOUND' });
      const variant = sheet.variants[variantIndex];
      if (target.kind === 'preview') {
        // 무료 체험 컷: 시안 이미지를 스타일 기준으로만 쓰고 결과는 팩에 붙이지 않는다.
        if (!variant.imageId) throw Object.assign(new Error('시안 이미지가 준비된 후 체험할 수 있습니다'), { code: 'REFERENCE_REQUIRED' });
        const face = db.faces.find((f) => f.id === sheet.faceId);
        if (!face) throw Object.assign(new Error('얼굴 정보를 찾을 수 없습니다'), { code: 'FACE_NOT_FOUND' });
        return {
          kind: 'preview' as const,
          subjectKind: sheet.subjectKind ?? 'person',
          sheetId: sheet.id,
          variantKey: variant.key,
          tone: sheet.tone as Tone,
          mode: sheet.mode ?? 'face',
          emotion: target.emotion as Emotion,
          presetPrompt: undefined as { expression: string; pose: string; effect: string } | undefined,
          sceneAction: undefined as string | undefined,
          line: '',
          accessoryIds: [] as string[],
          chosenImageId: variant.imageId as string,
          variantNote: 'one expressive reaction sticker on a plain cream background, same person and same outfit as the reference',
          charged: false,
          previousImageId: undefined as string | undefined,
          format: undefined as string | undefined,
          textMode: 'baked' as 'baked' | 'layer',
          designSheet: buildCharacterSheet({
            tone: sheet.tone,
            subjectKind: sheet.subjectKind ?? 'person',
            mode: sheet.mode ?? 'face',
            palette: face.palette,
            signature: variant.signature,
          }),
          templateId: undefined as string | undefined,
          comboRole: undefined as 'top' | 'bottom' | undefined,
        };
      }
      if (variant.imageId) return { existing: variant.imageId as string };
      return {
        kind: 'sheet' as const,
        subjectKind: sheet.subjectKind ?? 'person',
        sheetId: sheet.id,
        variantKey: variant.key,
        tone: sheet.tone as Tone,
        mode: sheet.mode ?? 'face',
        emotion: 'joy' as Emotion,
        presetPrompt: undefined as { expression: string; pose: string; effect: string } | undefined,
        sceneAction: undefined as string | undefined,
        line: '',
        accessoryIds: [] as string[],
        chosenImageId: undefined as string | undefined,
        variantNote: SHEET_NOTES[variantIndex] ?? SHEET_NOTES[0],
        charged: false,
        previousImageId: undefined as string | undefined,
        format: undefined as string | undefined,
        textMode: 'baked' as 'baked' | 'layer',
        designSheet: undefined as CharacterDesignSheet | undefined,
        templateId: undefined as string | undefined,
        comboRole: undefined as 'top' | 'bottom' | undefined,
      };
    });

    if ('existing' in plan) {
      return ok({ imageId: plan.existing, imageUrl: `/api/images/${plan.existing}` });
    }

    // 무료 체험 제한 — 스타일(실사 스티커 제외)과 시안 1장.
    if (access === 'trial') {
      if (!trialToneAllowed(plan.tone)) return fail('TRIAL_TONE_LIMITED', TRIAL_MESSAGES.toneBlocked, 403);
      if (plan.kind === 'sheet' && !(TRIAL_VARIANT_KEYS as readonly string[]).includes(plan.variantKey)) {
        return fail('TRIAL_ONLY', '무료 체험에서는 시안 1장만 만들 수 있어요.', 403);
      }
    }

    if ((identityGuidance.subjectKind ?? 'person') !== plan.subjectKind) return fail('CONSISTENCY_REQUIRED', '사진을 대상에 맞게 다시 확인해 주세요.', 409);

    // 시안이 누락되면 원본 사진만으로 조용히 진행하지 않는다. 차감 전 확인한다.
    const needsReference = plan.kind === 'frame' || plan.kind === 'preview';
    const reference = needsReference && plan.chosenImageId ? await loadImage(plan.chosenImageId) : null;
    if (needsReference && (!reference || reference.userId !== user.id)) {
      return fail('REFERENCE_REQUIRED', '선택한 시안을 불러올 수 없어 컷을 만들 수 없어요. 시안을 다시 선택해 새 팩을 만들어 주세요.', 409);
    }
    const characterReference = reference ? { mimeType: 'image/webp', base64: Buffer.from(reference.data).toString('base64') } : undefined;

    // 2인·반려 케미 팩: 두 번째 인물 사진도 같은 방식으로 사전 확인 토큰을 요구한다.
    const packFormat = plan.format ? packFormatById(plan.format) : undefined;
    const cutInfo = plan.templateId ? formatCutByTemplate(plan.templateId) : null;
    let secondPhoto: { mimeType: string; base64: string } | undefined;
    if (packFormat?.needsSecondPhoto && (!body.secondPhoto || !body.secondConsistency)) {
      return fail('SECOND_PHOTO_REQUIRED', '2인 케미 팩은 사진 2장이 필요합니다. 두 번째 사진을 올려 주세요.', 422);
    }
    if (body.secondPhoto) {
      if (!body.secondConsistency) return fail('CONSISTENCY_REQUIRED', '두 번째 사진을 먼저 확인해 주세요.', 409);
      const secondMatch = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(body.secondPhoto);
      if (!secondMatch) return fail('INVALID_INPUT', '두 번째 사진 형식을 확인해 주세요', 422);
      const secondEntry = await withDB((db) => {
        const now = Date.now();
        db.consistencyPreparations = db.consistencyPreparations.filter((entry) => entry.expiresAt > now);
        return db.consistencyPreparations.find(
          (item) => item.tokenHash === hash(body.secondConsistency!.token) && item.userId === user.id && item.photoHash === hash(body.secondPhoto!),
        ) ?? null;
      });
      if (!secondEntry) return fail('CONSISTENCY_REQUIRED', '두 번째 사진이 바뀌었거나 준비가 만료됐어요. 다시 확인해 주세요.', 409);
      secondPhoto = { mimeType: secondMatch[1], base64: secondMatch[2] };
    }

    // 2) 다시 그리기면 먼저 차감 (잔액 부족이면 생성하지 않는다)
    const chargeRef = uid('rd');
    if (plan.charged) {
      try {
        await applyCredits({
          userId: user.id,
          delta: -REDRAW_COST,
          reason: 'GENERATION',
          refType: 'redraw',
          refId: chargeRef,
        });
      } catch (e) {
        if (e instanceof CreditError && e.code === 'INSUFFICIENT') {
          return fail('QUOTA_EXCEEDED', '크레딧이 부족합니다. 충전하거나 플랜을 업그레이드해 주세요', 402);
        }
        throw e;
      }
    }

    try {
      // 무료 체험은 실제 생성 직전에 상한을 1회 소비한다 (실패한 호출도 원가 방어를 위해 시도로 센다).
      const trial = access === 'trial'
        ? await consumeTrialImage({ userId: user.id, ipHash: trialIpHash(req) }, plan.kind === 'preview' ? 'cut' : 'image')
        : null;
      // 실제 AI 생성이 필요하고 참조·요금 검증이 끝난 뒤에만 공정 이용 1회를 소비한다.
      const playUsage = await consumePlayGeneration(user);

      // 3) Gemini 생성 (DB 잠금 밖에서 수행)
      const accessoryPrompts = plan.accessoryIds
        .map((id) => ACCESSORIES.find((a) => a.id === id)?.promptAddition)
        .filter(Boolean) as string[];

      // 원본 사진을 우선하고, 팩에 고정된 시안을 모든 컷의 스타일 기준으로 사용한다.
      const textMode: 'baked' | 'layer' = plan.textMode === 'layer' ? 'layer' : 'baked';
      const png = await renderWithGemini({
        photoBase64,
        mimeType,
        identityGuidance: identityGuidance.features,
        subjectKind: plan.subjectKind,
        characterReference,
        secondPhoto,
        designSheet: plan.designSheet,
        formatDirectives: packFormat ? { scene: packFormat.prompt.scene, layout: packFormat.prompt.layout } : undefined,
        comboRole: plan.comboRole,
        textMode,
        tone: plan.tone,
        mode: plan.mode,
        emotion: plan.emotion,
        line: textMode === 'layer' ? undefined : plan.line || undefined,
        variantNote: plan.variantNote,
        accessoryPrompts,
        sceneAction: cutInfo?.cut.action ?? plan.sceneAction,
        preset: plan.presetPrompt,
      });

      // 4) 컷은 360px로 선명하게 저장하고 시안은 참조용 512px를 유지한다.
      const imageData = new Uint8Array(png);
      const imageId = newImageId();
      await saveImage(imageId, user.id, imageData);

      let hiddenAfterGeneration = false;
      await withDB((db) => {
        if (plan.kind === 'frame') {
          const pack = db.packs.find((p) => p.id === plan.packId && p.userId === user.id);
          const frame = pack?.frames.find((f) => f.id === plan.frameId);
          if (!frame || frame.hiddenAt) hiddenAfterGeneration = true;
          else {
            frame.imageId = imageId;
            frame.accessoryIds = plan.accessoryIds;
          }
        } else if (plan.kind === 'sheet') {
          const sheet = db.sheets.find((s) => s.id === plan.sheetId && s.userId === user.id);
          const variant = sheet?.variants.find((v) => v.key === plan.variantKey);
          if (!sheet || !variant) hiddenAfterGeneration = true;
          else variant.imageId = imageId;
        }
        // 체험 컷(preview)은 팩·시안에 붙이지 않는다 — 결과 이미지만 돌려준다.
        logEvent(db, user.id, 'generate', {
          kind: plan.kind,
          tone: plan.tone,
          redraw: plan.charged,
          provider: 'gemini',
          bytes: imageData.length,
        });
      });

      if (hiddenAfterGeneration) {
        await deleteImage(imageId).catch(() => undefined);
        throw Object.assign(new Error('생성 대상을 찾을 수 없습니다'), { code: plan.kind === 'frame' ? 'FRAME_NOT_FOUND' : 'SHEET_NOT_FOUND' });
      }

      // 다시 그린 컷이면 이전 이미지는 바로 지운다 (고아 이미지 방지)
      if (plan.previousImageId && plan.previousImageId !== imageId) {
        await deleteImage(plan.previousImageId).catch(() => undefined);
      }

      return ok({ imageId, imageUrl: `/api/images/${imageId}`, playUsage, ...(trial ? { trial } : {}) });
    } catch (e) {
      // 생성 실패 → 차감했던 크레딧 환불
      if (plan.charged) {
        await applyCredits({
          userId: user.id,
          delta: REDRAW_COST,
          reason: 'REFUND',
          refType: 'redraw',
          refId: chargeRef,
        }).catch(() => undefined);
      }
      throw e;
    }
  } catch (e) {
    const inputError = photoInputError(e);
    if (inputError) return inputError;
    if (e instanceof RenderError) {
      const status = e.code === 'AI_BUSY' || e.code === 'AI_NOT_CONFIGURED' || e.code === 'AI_QUOTA' ? 503 : 502;
      return fail(e.code, e.message, status);
    }
    const code = (e as { code?: string })?.code;
    if (code === 'FRAME_NOT_FOUND' || code === 'SHEET_NOT_FOUND' || code === 'VARIANT_NOT_FOUND' || code === 'FACE_NOT_FOUND') {
      return fail(code, (e as Error).message, 404);
    }
    if (code === 'REFERENCE_REQUIRED') return fail(code, (e as Error).message, 409);
    return handleError(e);
  }
}
