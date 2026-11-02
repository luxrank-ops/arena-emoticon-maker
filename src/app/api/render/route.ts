import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { logEvent, uid, withDB } from '@/lib/store';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';
import { RenderError, renderWithGemini } from '@/lib/ai/gemini-render';
import { encodeWebp, newImageId, saveImage } from '@/lib/images';
import { applyCredits, CreditError } from '@/lib/credits';
import type { Emotion, Tone } from '@/lib/types';

// Gemini 생성(최대 ~55초) + 변환 여유를 위해 함수 실행 시간을 늘린다
export const maxDuration = 60;
export const runtime = 'nodejs';

/** 에디터에서 다시 그리기 1회당 차감 크레딧 */
const REDRAW_COST = 1;

const SHEET_NOTES = [
  'natural balanced proportions, closest to the original photo',
  'slightly rounder and softer features, cute proportions',
  'a cooler, sharper and more stylish look',
];

const schema = z.object({
  /** 사진은 요청 본문으로만 전달되며 서버에 저장되지 않는다 */
  photo: z
    .string()
    .max(4_000_000)
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, '사진 형식을 확인해 주세요'),
  target: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('frame'),
      frameId: z.string().min(3).max(80),
      /** true 면 기존 컷을 무시하고 현재 대사·표정으로 다시 그린다 (에디터, 1크레딧) */
      force: z.boolean().optional(),
    }),
    z.object({
      kind: z.literal('sheet'),
      sheetId: z.string().min(3).max(80),
      variantKey: z.string().min(1).max(2),
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
    if (limited) return limited;

    const body = schema.parse(await req.json());
    const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(body.photo);
    if (!match) return fail('INVALID_INPUT', '사진 형식을 확인해 주세요', 422);
    const mimeType = match[1];
    const photoBase64 = match[2];

    const target = body.target;

    // 1) 대상 확인 (소유자 검증)
    const plan = await withDB((db) => {
      if (target.kind === 'frame') {
        const pack = db.packs.find((p) => p.userId === user.id && p.frames.some((f) => f.id === target.frameId));
        if (!pack) throw Object.assign(new Error('컷을 찾을 수 없습니다'), { code: 'FRAME_NOT_FOUND' });
        const frame = pack.frames.find((f) => f.id === target.frameId)!;
        if (frame.imageId && !target.force) return { existing: frame.imageId as string };
        return {
          kind: 'frame' as const,
          packId: pack.id,
          frameId: frame.id,
          tone: pack.tone as Tone,
          emotion: frame.emotion as Emotion,
          line: frame.line,
          variantNote: undefined as string | undefined,
          charged: !!target.force,
        };
      }
      const sheet = db.sheets.find((s) => s.id === target.sheetId && s.userId === user.id);
      if (!sheet) throw Object.assign(new Error('캐릭터 시트를 찾을 수 없습니다'), { code: 'SHEET_NOT_FOUND' });
      const variantIndex = sheet.variants.findIndex((v) => v.key === target.variantKey);
      if (variantIndex < 0) throw Object.assign(new Error('없는 시트 옵션입니다'), { code: 'VARIANT_NOT_FOUND' });
      const variant = sheet.variants[variantIndex];
      if (variant.imageId) return { existing: variant.imageId as string };
      return {
        kind: 'sheet' as const,
        sheetId: sheet.id,
        variantKey: variant.key,
        tone: sheet.tone as Tone,
        emotion: 'joy' as Emotion,
        line: '',
        variantNote: SHEET_NOTES[variantIndex] ?? SHEET_NOTES[0],
        charged: false,
      };
    });

    if ('existing' in plan) {
      return ok({ imageId: plan.existing, imageUrl: `/api/images/${plan.existing}` });
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
      // 3) Gemini 생성 (DB 잠금 밖에서 수행)
      const png = await renderWithGemini({
        photoBase64,
        mimeType,
        tone: plan.tone,
        emotion: plan.emotion,
        line: plan.line || undefined,
        variantNote: plan.variantNote,
      });

      // 4) WebP 로 줄여 저장 → DB 에 연결
      const webp = await encodeWebp(png);
      const imageId = newImageId();
      await saveImage(imageId, user.id, webp);

      await withDB((db) => {
        if (plan.kind === 'frame') {
          const pack = db.packs.find((p) => p.id === plan.packId && p.userId === user.id);
          const frame = pack?.frames.find((f) => f.id === plan.frameId);
          if (frame) frame.imageId = imageId;
        } else {
          const sheet = db.sheets.find((s) => s.id === plan.sheetId && s.userId === user.id);
          const variant = sheet?.variants.find((v) => v.key === plan.variantKey);
          if (variant) variant.imageId = imageId;
        }
        logEvent(db, user.id, 'generate', {
          kind: plan.kind,
          tone: plan.tone,
          redraw: plan.charged,
          provider: 'gemini',
          bytes: webp.length,
        });
      });

      return ok({ imageId, imageUrl: `/api/images/${imageId}` });
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
    if (e instanceof RenderError) {
      const status = e.code === 'AI_BUSY' || e.code === 'AI_NOT_CONFIGURED' ? 503 : 502;
      return fail(e.code, e.message, status);
    }
    const code = (e as { code?: string })?.code;
    if (code === 'FRAME_NOT_FOUND' || code === 'SHEET_NOT_FOUND' || code === 'VARIANT_NOT_FOUND') {
      return fail(code, (e as Error).message, 404);
    }
    return handleError(e);
  }
}
