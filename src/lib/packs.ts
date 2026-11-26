import type {
  CharacterSheet,
  CompositionMode,
  SubjectKind,
  FaceProfile,
  Frame,
  FrameView,
  IdentitySnapshot,
  Pack,
  StickerSpec,
  Tone,
} from '@/lib/types';
import { DEFAULT_PALETTE, DEFAULT_SIGNATURE, signatureFromSeed } from '@/lib/art/sticker';
import type { DB } from '@/lib/store';
import { composePackTemplates } from '@/lib/recommend/engine';
import { TEMPLATES_BY_ID } from '@/lib/recommend/templates';
import { applyCredits, CreditError } from '@/lib/credits';
import { logEvent, uid, withDB } from '@/lib/store';
import { isFullAccess, watermarkFor, effectivePlan, type Viewer } from '@/lib/admin-access';
import { comicExpressionById } from '@/lib/comic-expressions';
import { loadImage } from '@/lib/images';
import { localizedComicExpressions, localizedPhotoStickerScenes } from '@/lib/i18n/presets';
import { presetById, presetCaption, presetKeyword, presetTextLayer } from '@/data/emoticon-presets-150';
import { curationPackageById } from '@/data/curation-packages';
import { curationTitleForSize } from '@/lib/pack-title';
import type { Locale } from '@/lib/i18n/locale';
import { buildCharacterSheet } from '@/lib/ai/character-sheet';
import { defaultLayerOf, formatCuts, packFormatById, type PackFormatId } from '@/lib/pack-formats';
import { layerFromLine, normalizeLayer, normalizeLayers } from '@/lib/studio/layers';
import { PREVIEW_PACK_SIZE, PREVIEW_WATERMARK } from '@/lib/trial-policy';
import { SKUS, unlockSkuForPack } from '@/lib/pricing';


const FRAME_INTERVAL_MS = 850;

export class PackError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// 실사(사진 그대로)가 기본 — 화풍 선택 UI 도 이 순서로 보여 준다.
export const FREE_TONES: Tone[] = ['photo-sticker', 'caricature', '2d-cute', 'doodle', 'office-meme', 'clay-3d', 'pixel-art'];

export function tonesForPlan(plan: 'FREE' | 'PLUS' | 'STUDIO'): Tone[] {
  return plan === 'FREE'
    ? FREE_TONES
    : [
        'photo-sticker',
        'caricature',
        '2d-cute',
        'doodle',
        'office-meme',
        'clay-3d',
        'pixel-art',
        '3d-cartoon',
        'sketch',
        'mono',
        'watercolor',
      ];
}

export async function createSheet(
  userId: string,
  faceId: string,
  tone: Tone,
  mode: CompositionMode = 'face',
  subjectKind: SubjectKind = 'person',
  formatId?: PackFormatId,
  /** 무료 체험은 시안 1장만 만든다 (원가 방어). 기본 3종 */
  variantLimit = 3,
) {
  return withDB((db) => {
    const face = db.faces.find((f) => f.id === faceId && f.userId === userId);
    if (!face) throw new PackError('FACE_NOT_FOUND', '얼굴 정보를 찾을 수 없습니다');
    const format = formatId ? packFormatById(formatId) : undefined;
    if (formatId && !format) throw new PackError('INVALID_FORMAT', '알 수 없는 표현 형태입니다');

    const base = Date.now();
    const variants = ([
      { key: 'A', label: '기본형', seed: (base % 100000) + 11 },
      { key: 'B', label: '동글형', seed: (base % 100000) + 27 },
      { key: 'C', label: '시크형', seed: (base % 100000) + 43 },
    ].map((v, i) => {
      const sig = signatureFromSeed(v.seed);
      return {
        key: v.key,
        seed: v.seed,
        label: v.label,
        signature: {
          ...face.signature,
          ...sig,
          hairStyle: (face.signature.hairStyle + i) % 5,
          headScale: face.signature.headScale * (i === 1 ? 1.05 : i === 2 ? 0.98 : 1),
          cheek: Math.min(1, face.signature.cheek * (i === 1 ? 1.15 : 1)),
          eyeSize: face.signature.eyeSize * (i === 2 ? 0.95 : 1),
          browWeight: face.signature.browWeight * (i === 2 ? 1.18 : 1),
        },
      };
    })).slice(0, Math.min(3, Math.max(1, variantLimit)));

    const sheet: CharacterSheet = {
      id: uid('sheet'),
      userId,
      faceId,
      tone,
      mode,
      subjectKind,
      ...(format ? { format: format.id, textMode: format.textMode } : {}),
      variants,
      chosenKey: null,
      createdAt: new Date().toISOString(),
    };
    db.sheets.push(sheet);
    return sheet;
  });
}

export async function chooseSheet(userId: string, sheetId: string, variantKey: string) {
  return withDB((db) => {
    const sheet = db.sheets.find((s) => s.id === sheetId && s.userId === userId);
    if (!sheet) throw new PackError('SHEET_NOT_FOUND', '캐릭터 시트를 찾을 수 없습니다');
    const variant = sheet.variants.find((v) => v.key === variantKey);
    if (!variant) throw new PackError('VARIANT_NOT_FOUND', '없는 시트 옵션입니다');
    if (!variant.imageId) throw new PackError('REFERENCE_REQUIRED', '시안 이미지가 준비된 후 선택해 주세요.');
    sheet.chosenKey = variantKey;
    return sheet;
  });
}

export async function createPack(
  userId: string,
  sheetId: string,
  size: number,
  title?: string,
  unlimited = false,
  comicExpressionIds?: string[],
  locale: Locale = 'ko',
  formatId?: PackFormatId,
  /** 표정·포즈 프리셋 150종 선택 (컷 수만큼, 중복 없이) */
  presetIds?: number[],
  /**
   * 무료 12컷 워터마크 미리보기 팩.
   *  · 크레딧을 차감하지 않고, 첫 팩은 12컷 전체를 저비용(Flash) 렌더로 채운다.
   *  · 결제(단건 완성권) 전에는 내보내기가 잠긴다 (packExportState).
   */
  opts: { preview?: boolean; curationPackageId?: string } = {},
) {
  if (opts.preview && size !== PREVIEW_PACK_SIZE) {
    throw new PackError('INVALID_SIZE', `무료 미리보기는 ${PREVIEW_PACK_SIZE}컷 팩으로만 만들 수 있어요.`);
  }
  const { sheet, face } = await withDB((db) => {
    const s = db.sheets.find((x) => x.id === sheetId && x.userId === userId);
    if (!s) throw new PackError('SHEET_NOT_FOUND', '캐릭터 시트를 찾을 수 없습니다');
    if (!s.chosenKey) throw new PackError('SHEET_NOT_CHOSEN', '캐릭터를 먼저 선택해 주세요');
    const f = db.faces.find((x) => x.id === s.faceId);
    if (!f) throw new PackError('FACE_NOT_FOUND', '얼굴 정보를 찾을 수 없습니다');
    return { sheet: s, face: f };
  });

  // 컷 전체에 사용할 시안을 고정하고, 차감 전에 이미지 접근 가능 여부를 확인한다.
  const chosen = sheet.variants.find((v) => v.key === sheet.chosenKey);
  const reference = chosen?.imageId ? await loadImage(chosen.imageId) : null;
  if (!chosen?.imageId || !reference || reference.userId !== userId) {
    throw new PackError('REFERENCE_REQUIRED', '선택한 시안을 불러올 수 없어요. 시안을 다시 만들거나 선택해 주세요.');
  }

  const recent = await withDB((db) =>
    db.packs
      .filter((p) => p.userId === userId)
      .slice(-2)
      .flatMap((p) => p.frames.map((f) => f.templateId)),
  );

  const packFormat = sheet.format ? packFormatById(sheet.format) : formatId ? packFormatById(formatId) : undefined;
  const curationPackage = opts.curationPackageId ? curationPackageById(opts.curationPackageId) : undefined;
  if (opts.curationPackageId && !curationPackage) throw new PackError('INVALID_CURATION_PACKAGE', '알 수 없는 큐레이션 패키지입니다.');
  if (curationPackage) {
    const previewSample = opts.preview && size === PREVIEW_PACK_SIZE && curationPackage.count >= size;
    if (sheet.format || formatId || packFormat || comicExpressionIds || presetIds) {
      throw new PackError('INVALID_PRESET_SELECTION', '큐레이션 패키지는 다른 팩 구성과 함께 사용할 수 없습니다.');
    }
    if (size !== curationPackage.count && !previewSample) {
      throw new PackError('INVALID_SIZE', `${curationPackage.title} 패키지는 ${curationPackage.count}컷으로 만들어야 합니다.`);
    }
  }
  const selectedCurationCuts = curationPackage ? curationPackage.cuts.slice(0, size) : undefined;
  if (selectedCurationCuts && selectedCurationCuts.length !== size) {
    throw new PackError('INVALID_CURATION_PACKAGE', '큐레이션 패키지의 컷 구성이 올바르지 않습니다.');
  }
  if (sheet.tone === 'photo-sticker' && !packFormat && size !== 12 && size !== 16) throw new PackError('INVALID_SIZE', '실사 카톡 스티커는 12컷 또는 16컷을 선택해 주세요');
  if (size === 16 && sheet.tone !== 'photo-sticker' && !packFormat) throw new PackError('INVALID_SIZE', '16컷은 실사 카톡 스티커에서만 선택할 수 있습니다');
  if (packFormat?.id === 'pet-meme' && (sheet.subjectKind ?? 'person') !== 'pet') {
    throw new PackError('PET_PHOTO_REQUIRED', '반려동물 집사 밈 팩은 반려동물 사진으로 시작해 주세요.');
  }
  if (comicExpressionIds && (comicExpressionIds.length !== size || new Set(comicExpressionIds).size !== size || comicExpressionIds.some((id) => !comicExpressionById(id)))) throw new PackError('INVALID_COMIC_SELECTION', '선택한 코믹 표정을 컷 수에 맞게 확인해 주세요.');
  if (presetIds && (presetIds.length !== size || new Set(presetIds).size !== size || presetIds.some((id) => !presetById(id)))) {
    throw new PackError('INVALID_PRESET_SELECTION', '선택한 프리셋을 컷 수에 맞게 확인해 주세요.');
  }
  if (packFormat && comicExpressionIds) throw new PackError('INVALID_COMIC_SELECTION', '표현 형태 팩에는 코믹 표정을 함께 고를 수 없습니다.');
  if (packFormat && presetIds) throw new PackError('INVALID_PRESET_SELECTION', '표현 형태 팩에는 프리셋을 함께 고를 수 없습니다.');
  if (comicExpressionIds && presetIds) throw new PackError('INVALID_PRESET_SELECTION', '코믹 표정과 프리셋은 함께 고를 수 없습니다.');
  const formatCutList = packFormat ? formatCuts(packFormat.id, size, locale) : null;
  if (packFormat && (!formatCutList || formatCutList.length < size)) throw new PackError('INVALID_SIZE', `${packFormat.label} 팩은 최대 ${packFormat.cuts.length}컷까지 만들 수 있습니다.`);
  /** 프리셋 팩: 고른 순서 그대로 컷이 만들어진다. 큐레이션은 원본 장면에 팩별 문구를 적용한다. */
  const presetList = selectedCurationCuts
    ? selectedCurationCuts.map((cut) => presetById(cut.presetId)!)
    : presetIds ? presetIds.map((id) => presetById(id)!) : null;
  const templates = formatCutList
    ? formatCutList.map((cut) => ({
        id: `fmt-${packFormat!.id}-${cut.id}`,
        label: cut.label,
        line: cut.line,
        emotion: cut.emotion,
      }))
    : presetList
    ? presetList.map((preset, index) => {
        const curatedCut = selectedCurationCuts?.[index];
        return {
          id: `preset-${preset.id}`,
          label: locale === 'en'
            ? curatedCut?.displayLabelEn ?? presetKeyword(preset, locale)
            : curatedCut?.displayLabel ?? presetKeyword(preset, locale),
          line: locale === 'en'
            ? curatedCut?.lineEn ?? presetCaption(preset, locale)
            : curatedCut?.line ?? presetCaption(preset, locale),
          emotion: preset.emotion,
        };
      })
    : comicExpressionIds
    ? localizedComicExpressions(locale)
        .filter((item) => comicExpressionIds.includes(item.id) && comicExpressionById(item.id))
        .sort((a, b) => comicExpressionIds.indexOf(a.id) - comicExpressionIds.indexOf(b.id))
        .map((item) => ({ ...item, id: `comic-${item.id}` }))
    : sheet.tone === 'photo-sticker'
      ? localizedPhotoStickerScenes(locale).slice(0, size)
      : locale === 'en'
        ? localizedComicExpressions('en').slice(0, size).map((item) => ({ ...item, id: `comic-${item.id}` }))
        : composePackTemplates(size, new Date(), recent);
  const packId = uid('pack');
  const now = Date.now();
  const textMode: 'baked' | 'layer' = packFormat?.textMode ?? (presetList ? 'layer' : sheet.textMode ?? 'baked');

  const frames: Frame[] = templates.map((t, i) => {
    const cut = packFormat ? packFormat.cuts.find((item) => `fmt-${packFormat.id}-${item.id}` === t.id) : undefined;
    const preset = presetList ? presetList[i] : undefined;
    const presetLayer = cut ? defaultLayerOf(cut) : null;
    const textLayers = textMode === 'layer'
      ? preset
        ? [normalizeLayer({ ...presetTextLayer(preset, locale), text: t.line }, 0)]
        : presetLayer
          ? [normalizeLayer({ ...presetLayer, id: `cut-${cut!.id}` }, 0)]
          : (() => { const layer = layerFromLine(t.line); return layer ? [layer] : []; })()
      : undefined;
    return {
      id: uid('frm'),
      packId,
      index: i,
      emotion: t.emotion,
      intensity: t.emotion === 'king' || t.emotion === 'angry' ? 88 : t.emotion === 'laugh' ? 82 : 62,
      templateId: t.id,
      ...(comicExpressionIds ? { comicExpressionId: comicExpressionIds[i] } : {}),
      ...(preset ? { presetId: preset.id } : {}),
      label: t.label,
      line: t.line,
      prop: 'none',
      // 실사 스티커는 흰색 불투명 배경으로 생성되므로 투명 배경으로 표시하지 않는다.
      background: sheet.tone === 'photo-sticker' && !packFormat ? 'cream' : 'transparent',
      seed: (now % 100000) + i * 17,
      readyAt: now + i * FRAME_INTERVAL_MS,
      usageCount: 0,
      ...(cut?.comboRole ? { comboRole: cut.comboRole } : {}),
      ...(textLayers && textLayers.length ? { textLayers } : {}),
    };
  });

  // 콤보 짝(위/아래)을 프레임 id 로 연결한다.
  if (packFormat?.id === 'combo') {
    for (const cut of packFormat.cuts) {
      if (cut.comboRole !== 'top' || !cut.comboPair) continue;
      const top = frames.find((f) => f.templateId === `fmt-combo-${cut.id}`);
      const bottom = frames.find((f) => f.templateId === `fmt-combo-${cut.comboPair}`);
      if (top && bottom) {
        top.comboPairId = bottom.id;
        bottom.comboPairId = top.id;
      }
    }
  }

  try {
    if (opts.preview) {
      // 무료 미리보기 — 크레딧을 쓰지 않는다. 원가 상한은 /api/packs 의 체험 카운터가 막는다.
    } else if (!unlimited) await applyCredits({
      userId,
      delta: -size,
      reason: 'GENERATION',
      refType: 'pack',
      refId: packId,
    });
  } catch (e) {
    if (e instanceof CreditError && e.code === 'INSUFFICIENT') {
      throw new PackError('QUOTA_EXCEEDED', '크레딧이 부족합니다. 충전하거나 플랜을 업그레이드해 주세요');
    }
    throw e;
  }

  const pack: Pack = {
    id: packId,
    locale,
    userId,
    sheetId,
    subjectKind: sheet.subjectKind ?? 'person',
    characterReferenceImageId: chosen?.imageId,
    ...(packFormat ? { format: packFormat.id } : {}),
    ...(curationPackage ? { curationPackageId: curationPackage.id } : {}),
    textMode,
    designSheet: buildCharacterSheet({
      tone: sheet.tone,
      subjectKind: sheet.subjectKind ?? 'person',
      mode: sheet.mode ?? 'face',
      palette: face.palette,
      signature: chosen?.signature ?? face.signature,
    }),
    tone: sheet.tone,
    mode: sheet.mode ?? 'face',
    // 12컷 미리보기는 24컷 큐레이션 패키지의 앞 12컷만 담으므로 제목도 실제 컷 수로 맞춘다
    // ("기본 고빈도 24컷" → "기본 고빈도 12컷").
    title: title?.trim() || (curationPackage
      ? curationTitleForSize(
        locale === 'en' ? curationPackage.titleEn : curationPackage.title,
        curationPackage.count,
        size,
        locale,
      )
      : locale === 'en' ? 'My reaction stickers' : `${sheet.tone === 'caricature' ? '개그' : '나의'} 이모티콘 팩`),
    size,
    status: 'GENERATING',
    renderer: 'ai',
    creditsSpent: opts.preview || unlimited ? 0 : size,
    createdAt: new Date().toISOString(),
    ...(opts.preview ? { preview: { watermark: PREVIEW_WATERMARK, cuts: PREVIEW_PACK_SIZE, model: 'flash' as const } } : {}),
    frames,
    // 얼굴 프로필이 파기된 뒤에도 이 팩을 계속 그릴 수 있게 비식별 스냅샷을 고정한다
    identity: {
      palette: face.palette,
      signature: chosen?.signature ?? face.signature,
      tone: sheet.tone,
    },
  };

  await withDB((db) => {
    db.packs.push(pack);
    logEvent(db, userId, 'pack_created', { packId, size, tone: sheet.tone, cost: pack.creditsSpent, preview: !!opts.preview });
    void face;
  });

  return pack;
}

/** 팩에 저장된 비식별 스냅샷으로 스펙을 만든다 (얼굴 프로필 불필요) */
export function specFromIdentity(identity: IdentitySnapshot, frame: Frame): StickerSpec {
  return {
    seed: frame.seed,
    tone: identity.tone,
    palette: identity.palette,
    signature: identity.signature,
    emotion: frame.emotion,
    intensity: frame.intensity,
    prop: frame.prop,
    background: frame.background,
    line: frame.line,
    linePosition: 'bottom',
    imageUrl: frame.imageId ? `/api/images/${frame.imageId}` : undefined,
    ...(frame.textLayers && frame.textLayers.length ? { textLayers: frame.textLayers } : {}),
  };
}

export function materializeSpec(face: FaceProfile, sheet: CharacterSheet, frame: Frame): StickerSpec {
  const variant = sheet.variants.find((v) => v.key === sheet.chosenKey) ?? sheet.variants[0];
  return specFromIdentity(
    {
      palette: face.palette,
      signature: variant?.signature ?? face.signature,
      tone: sheet.tone,
    },
    frame,
  );
}

/**
 * 팩을 그리는 데 필요한 정체성 정보를 찾는다.
 * 1순위: 팩에 고정된 스냅샷 (얼굴이 파기돼도 영구히 유효)
 * 2순위: 시트 → 얼굴 (스냅샷 도입 이전에 만들어진 팩)
 */
export function identityOf(db: DB, pack: Pack): IdentitySnapshot | null {
  if (pack.identity) return pack.identity;
  const sheet = db.sheets.find((s) => s.id === pack.sheetId);
  if (!sheet) return null;
  const variant = sheet.variants.find((v) => v.key === sheet.chosenKey) ?? sheet.variants[0];
  const face = db.faces.find((f) => f.id === sheet.faceId);
  if (!face) return null;
  return {
    palette: face.palette,
    signature: variant?.signature ?? face.signature,
    tone: sheet.tone,
  };
}

function fallbackIdentity(tone: Tone): IdentitySnapshot {
  return { palette: DEFAULT_PALETTE, signature: DEFAULT_SIGNATURE, tone };
}

export function readyCount(pack: Pack, now = Date.now()) {
  // AI 팩은 컷 이미지가 실제로 생성돼야 완성으로 본다 (시간 기반 가짜 완료 금지)
  if (pack.renderer === 'ai') return pack.frames.filter((f) => !f.hiddenAt && !!f.imageId).length;
  return pack.frames.filter((f) => !f.hiddenAt && f.readyAt <= now).length;
}

export function isReady(pack: Pack, now = Date.now()) {
  return readyCount(pack, now) >= pack.frames.filter((frame) => !frame.hiddenAt).length;
}

// ── 단건 잠금 해제(페이월) ───────────────────────────────────
/** 이 날짜 이전에 만든 팩은 이미 소유한 것으로 보고 잠그지 않는다 (기존 사용자 보존). */
const PAYWALL_START = Date.parse('2026-11-22T12:00:00+09:00');

export interface PackExportState {
  /** 잠금 해제(또는 유료 등급)라 고화질·무워터마크·ZIP 이 열린 상태 */
  unlocked: boolean;
  /** 미리보기 워터마크를 얹어야 하는가 */
  watermark: boolean;
  /** 이 팩을 열 때 쓰는 단건 완성권 */
  unlockSku: string;
  unlockPrice: number;
  unlockTitle: string;
  /** 잠긴 이유 — paywall(결제 전) · plan(플랜으로 열림) · unlocked(단건 해제) · legacy */
  reason: 'paywall' | 'plan' | 'unlocked' | 'legacy';
}

/**
 * 팩 내보내기 권한 판정 (서버·클라이언트 공용 규칙).
 *  · 관리자·검증된 플레이 구매자·유료 등급(Creator Pro/Plus)은 모든 팩을 연다.
 *  · 무료 등급은 단건 완성권으로 잠금 해제한 팩만 연다.
 *  · 개편 이전에 만든 팩은 잠그지 않는다.
 */
export function packExportState(pack: Pack, viewer: Viewer | null | undefined): PackExportState {
  const sku = unlockSkuForPack(pack.format, pack.subjectKind);
  const base = {
    unlockSku: sku,
    unlockPrice: SKUS[sku]?.price ?? 5900,
    unlockTitle: SKUS[sku]?.title ?? '단건 팩 완성권',
  };
  if (isFullAccess(viewer) || effectivePlan(viewer) !== 'FREE') {
    return { ...base, unlocked: true, watermark: false, reason: 'plan' };
  }
  if (pack.unlockedAt) return { ...base, unlocked: true, watermark: false, reason: 'unlocked' };
  // 미리보기 팩은 언제 만들어졌든 잠근다 — 결제 전에는 열리지 않는다.
  if (pack.preview) return { ...base, unlocked: false, watermark: true, reason: 'paywall' };
  // 개편 전에 만든 일반 팩은 기존 사용자 보존을 위해 잠그지 않는다.
  if (Date.parse(pack.createdAt) < PAYWALL_START) return { ...base, unlocked: true, watermark: true, reason: 'legacy' };
  return { ...base, unlocked: false, watermark: true, reason: 'paywall' };
}

/** 결제 승인 뒤 팩 잠금을 해제한다 (같은 팩은 1회만). */
export async function unlockPack(userId: string, packId: string, sku: string): Promise<Pack> {
  return withDB((db) => {
    const pack = db.packs.find((p) => p.id === packId && p.userId === userId);
    if (!pack) throw new PackError('PACK_NOT_FOUND', '팩을 찾을 수 없습니다');
    if (!pack.unlockedAt) {
      pack.unlockedAt = new Date().toISOString();
      pack.unlockSku = sku;
      logEvent(db, userId, 'pack_unlocked', { packId, sku });
    }
    return pack;
  });
}

/**
 * @param viewer 현재 요청의 사용자(getCurrentUser 결과)를 전달하면 워터마크 판정이
 *        해당 사용자를 기준으로 한다 — TWA(플레이 유료 앱) 사용자의 임시 play 플래그가
 *        DB 에 없어 호출하는 쪽이 viewer 를 전달해야 풀액세스가 적용된다. 전달 안 하면 DB 조회.
 */
export async function getPackView(userId: string, packId: string, viewer?: Viewer | null) {
  return withDB((db) => {
    const pack = db.packs.find((p) => p.id === packId && p.userId === userId);
    if (!pack) throw new PackError('PACK_NOT_FOUND', '팩을 찾을 수 없습니다');
    // 얼굴이 24h 후 파기돼도 팩은 계속 렌더돼야 한다 → 스냅샷 우선, 없으면 데모 기본값
    const identity = identityOf(db, pack) ?? fallbackIdentity(pack.tone);
    const now = Date.now();
    const ready = readyCount(pack, now);
    const visibleFrames = pack.frames.filter((frame) => !frame.hiddenAt);
    const frames: FrameView[] = visibleFrames
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((f) => ({
        ...f,
        spec: specFromIdentity(identity, f),
        ready: pack.renderer === 'ai' ? !!f.imageId : f.readyAt <= now,
      }));
    const viewerUser = viewer ?? (db.users.find((u) => u.id === userId) ?? null);
    const exportState = packExportState(pack, viewerUser);
    return {
      pack: { ...pack, status: (ready >= visibleFrames.length ? 'READY' : 'GENERATING') as Pack['status'] },
      frames,
      ready,
      total: visibleFrames.length,
      watermark: exportState.watermark || watermarkFor(viewerUser),
      unlocked: exportState.unlocked,
      exportState,
    };
  });
}

export async function composeFrame(
  userId: string,
  frameId: string,
  patch: {
    line?: string;
    prop?: Frame['prop'];
    background?: Frame['background'];
    intensity?: number;
    emotion?: Frame['emotion'];
    comicExpressionId?: string | null;
    /** 표정·포즈 프리셋 150종 — null 이면 해제 */
    presetId?: number | null;
    textLayers?: Frame['textLayers'];
  },
): Promise<FrameView> {
  return withDB((db) => {
    const pack = db.packs.find((p) => p.frames.some((f) => f.id === frameId));
    if (!pack || pack.userId !== userId) throw new PackError('FRAME_NOT_FOUND', '컷을 찾을 수 없습니다');
    const frame = pack.frames.find((f) => f.id === frameId)!;
    if (frame.hiddenAt) throw new PackError('FRAME_NOT_FOUND', '컷을 찾을 수 없습니다');
    if (typeof patch.line === 'string') frame.line = patch.line.slice(0, 34);
    if (patch.prop) frame.prop = patch.prop;
    if (patch.background) frame.background = patch.background;
    if (typeof patch.intensity === 'number') frame.intensity = Math.max(0, Math.min(100, Math.round(patch.intensity)));
    if (patch.emotion) frame.emotion = patch.emotion;
    if (patch.comicExpressionId === null) delete frame.comicExpressionId;
    else if (patch.comicExpressionId !== undefined) frame.comicExpressionId = patch.comicExpressionId;
    if (patch.presetId === null) delete frame.presetId;
    else if (patch.presetId !== undefined) {
      const preset = presetById(patch.presetId);
      if (preset) {
        const locale = pack.locale ?? 'ko';
        frame.presetId = preset.id;
        // 프리셋만 바꾸고 대사·표정을 따로 보내지 않았으면 프리셋 값으로 맞춘다.
        if (typeof patch.line !== 'string') frame.line = presetCaption(preset, locale);
        if (!patch.emotion) frame.emotion = preset.emotion;
        if (!patch.textLayers && frame.textLayers) frame.textLayers = [normalizeLayer(presetTextLayer(preset, locale), 0)];
      }
    }
    if (patch.textLayers !== undefined) {
      const layers = normalizeLayers(patch.textLayers);
      if (layers.length) frame.textLayers = layers;
      else delete frame.textLayers;
    }

    const identity = identityOf(db, pack) ?? fallbackIdentity(pack.tone);
    logEvent(db, userId, 'frame_composed', { frameId, packId: pack.id });
    return { ...frame, spec: specFromIdentity(identity, frame), ready: true };
  });
}

export async function framesForReply(userId: string, templateId: string, seedBase: number) {
  return withDB((db) => {
    const pack = db.packs.filter((p) => p.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!pack) return null;
    const identity = identityOf(db, pack);
    if (!identity) return null;
    const t = TEMPLATES_BY_ID[templateId];
    const virtual: Frame = {
      id: `virtual_${templateId}`,
      packId: pack.id,
      index: 0,
      emotion: t?.emotion ?? 'joy',
      intensity: 62,
      templateId,
      label: t?.label ?? '',
      line: t?.line ?? '',
      prop: 'none',
      background: 'transparent',
      seed: seedBase,
      readyAt: 0,
      usageCount: 0,
    };
    return { identity, frame: virtual };
  });
}

export async function bumpUsage(userId: string, frameId: string) {
  await withDB((db) => {
    for (const p of db.packs) {
      if (p.userId !== userId) continue;
      const f = p.frames.find((x) => x.id === frameId);
      if (f) {
        f.usageCount += 1;
        logEvent(db, userId, 'reply_used', { frameId });
        return;
      }
    }
  });
}

export async function getSheetView(userId: string, sheetId: string) {
  return withDB((db) => {
    const sheet = db.sheets.find((s) => s.id === sheetId && s.userId === userId);
    if (!sheet) throw new PackError('SHEET_NOT_FOUND', '캐릭터 시트를 찾을 수 없습니다');
    const face = db.faces.find((f) => f.id === sheet.faceId);
    // 24시간이 지나 파기된 얼굴 → 시트는 다시 만들 수 없으므로 안내 후 새로 만들기로 유도
    if (!face) throw new PackError('FACE_PURGED', '얼굴 정보가 파기되었습니다. 사진을 다시 올려 주세요');
    return { sheet, face };
  });
}

/**
 * 팩 삭제: 팩과 그 컷 이미지 목록을 돌려준다 (이미지 실제 삭제는 호출자가 한다).
 *  · 이 팩에서만 쓰던 캐릭터 시트와 그 시안 이미지도 함께 대상이 된다.
 *  · 이미 쓴 크레딧은 환불하지 않는다.
 */
export async function deletePack(userId: string, packId: string): Promise<{ imageIds: string[] }> {
  return withDB((db) => {
    const idx = db.packs.findIndex((p) => p.id === packId && p.userId === userId);
    if (idx < 0) throw new PackError('PACK_NOT_FOUND', '팩을 찾을 수 없습니다');
    const pack = db.packs[idx];
    const imageIds = pack.frames.map((f) => f.imageId).filter((x): x is string => !!x);
    db.packs.splice(idx, 1);
    db.sharedLinks = (db.sharedLinks ?? []).filter((link) => link.packId !== packId);

    const sheetStillUsed = db.packs.some((p) => p.sheetId === pack.sheetId);
    if (!sheetStillUsed) {
      const sIdx = db.sheets.findIndex((s) => s.id === pack.sheetId && s.userId === userId);
      if (sIdx >= 0) {
        const [sheet] = db.sheets.splice(sIdx, 1);
        for (const v of sheet.variants) if (v.imageId) imageIds.push(v.imageId);
      }
    }
    return { imageIds };
  });
}
