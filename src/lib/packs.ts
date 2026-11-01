import type {
  CharacterSheet,
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
import { PLANS } from '@/lib/pricing';

const FRAME_INTERVAL_MS = 850;

export class PackError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export const FREE_TONES: Tone[] = ['2d-cute', 'caricature'];

export function tonesForPlan(plan: 'FREE' | 'PLUS' | 'STUDIO'): Tone[] {
  return plan === 'FREE' ? FREE_TONES : ['2d-cute', '3d-cartoon', 'sketch', 'mono', 'watercolor', 'caricature'];
}

export async function createSheet(userId: string, faceId: string, tone: Tone) {
  return withDB((db) => {
    const face = db.faces.find((f) => f.id === faceId && f.userId === userId);
    if (!face) throw new PackError('FACE_NOT_FOUND', '얼굴 정보를 찾을 수 없습니다');

    const base = Date.now();
    const variants = [
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
    });

    const sheet: CharacterSheet = {
      id: uid('sheet'),
      userId,
      faceId,
      tone,
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
    if (!sheet.variants.some((v) => v.key === variantKey)) throw new PackError('VARIANT_NOT_FOUND', '없는 시트 옵션입니다');
    sheet.chosenKey = variantKey;
    return sheet;
  });
}

export async function createPack(userId: string, sheetId: string, size: number, title?: string) {
  const { sheet, face } = await withDB((db) => {
    const s = db.sheets.find((x) => x.id === sheetId && x.userId === userId);
    if (!s) throw new PackError('SHEET_NOT_FOUND', '캐릭터 시트를 찾을 수 없습니다');
    if (!s.chosenKey) throw new PackError('SHEET_NOT_CHOSEN', '캐릭터를 먼저 선택해 주세요');
    const f = db.faces.find((x) => x.id === s.faceId);
    if (!f) throw new PackError('FACE_NOT_FOUND', '얼굴 정보를 찾을 수 없습니다');
    return { sheet: s, face: f };
  });

  const recent = await withDB((db) =>
    db.packs
      .filter((p) => p.userId === userId)
      .slice(-2)
      .flatMap((p) => p.frames.map((f) => f.templateId)),
  );

  const templates = composePackTemplates(size, new Date(), recent);
  const packId = uid('pack');
  const now = Date.now();

  const frames: Frame[] = templates.map((t, i) => ({
    id: uid('frm'),
    packId,
    index: i,
    emotion: t.emotion,
    intensity: t.emotion === 'king' || t.emotion === 'angry' ? 88 : t.emotion === 'laugh' ? 82 : 62,
    templateId: t.id,
    label: t.label,
    line: t.line,
    prop: 'none',
    background: 'transparent',
    seed: (now % 100000) + i * 17,
    readyAt: now + i * FRAME_INTERVAL_MS,
    usageCount: 0,
  }));

  try {
    await applyCredits({
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

  const chosen = sheet.variants.find((v) => v.key === sheet.chosenKey) ?? sheet.variants[0];
  const pack: Pack = {
    id: packId,
    userId,
    sheetId,
    tone: sheet.tone,
    title: title?.trim() || `${sheet.tone === 'caricature' ? '개그' : '나의'} 이모티콘 팩`,
    size,
    status: 'GENERATING',
    creditsSpent: size,
    createdAt: new Date().toISOString(),
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
    logEvent(db, userId, 'pack_created', { packId, size, tone: sheet.tone, cost: size });
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
  return pack.frames.filter((f) => f.readyAt <= now).length;
}

export function isReady(pack: Pack, now = Date.now()) {
  return readyCount(pack, now) >= pack.frames.length;
}

export async function getPackView(userId: string, packId: string) {
  return withDB((db) => {
    const pack = db.packs.find((p) => p.id === packId && p.userId === userId);
    if (!pack) throw new PackError('PACK_NOT_FOUND', '팩을 찾을 수 없습니다');
    // 얼굴이 24h 후 파기돼도 팩은 계속 렌더돼야 한다 → 스냅샷 우선, 없으면 데모 기본값
    const identity = identityOf(db, pack) ?? fallbackIdentity(pack.tone);
    const now = Date.now();
    const ready = readyCount(pack, now);
    const frames: FrameView[] = pack.frames
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((f) => ({ ...f, spec: specFromIdentity(identity, f), ready: f.readyAt <= now }));
    return {
      pack: { ...pack, status: (ready >= pack.frames.length ? 'READY' : 'GENERATING') as Pack['status'] },
      frames,
      ready,
      total: pack.frames.length,
      watermark: PLANS[db.users.find((u) => u.id === userId)?.plan ?? 'FREE'].watermark,
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
  },
): Promise<FrameView> {
  return withDB((db) => {
    const pack = db.packs.find((p) => p.frames.some((f) => f.id === frameId));
    if (!pack || pack.userId !== userId) throw new PackError('FRAME_NOT_FOUND', '컷을 찾을 수 없습니다');
    const frame = pack.frames.find((f) => f.id === frameId)!;
    if (typeof patch.line === 'string') frame.line = patch.line.slice(0, 34);
    if (patch.prop) frame.prop = patch.prop;
    if (patch.background) frame.background = patch.background;
    if (typeof patch.intensity === 'number') frame.intensity = Math.max(0, Math.min(100, Math.round(patch.intensity)));
    if (patch.emotion) frame.emotion = patch.emotion;

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
