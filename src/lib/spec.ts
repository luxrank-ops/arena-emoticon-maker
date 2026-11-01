import type { BackgroundKey, Emotion, PropKey, StickerSpec, Tone } from '@/lib/types';
import { DEFAULT_PALETTE, DEFAULT_SIGNATURE, signatureFromSeed } from '@/lib/art/sticker';
import { withDB } from '@/lib/store';
import { identityOf, specFromIdentity } from '@/lib/packs';

export interface SpecInput {
  emotion: Emotion;
  line: string;
  intensity?: number;
  prop?: string;
  background?: string;
  seed: number;
  tone?: Tone;
  templateId?: string;
}

/** 사용자의 최신 얼굴/시트를 사용해 스펙을 만든다. 없으면 데모 기본값. */
export async function specFor(userId: string, input: SpecInput): Promise<StickerSpec> {
  const ctx = await withDB((db) => {
    const pack = db.packs
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!pack) return null;
    // 스냅샷이 있으면 얼굴 프로필이 파기돼도 내 얼굴로 계속 그린다
    return identityOf(db, pack);
  });

  const base = ctx
    ? specFromIdentity(ctx, {
        id: 'virtual',
        packId: 'virtual',
        index: 0,
        emotion: input.emotion,
        intensity: input.intensity ?? 70,
        templateId: input.templateId ?? '',
        label: '',
        line: input.line,
        prop: (input.prop ?? 'none') as PropKey,
        background: (input.background ?? 'transparent') as BackgroundKey,
        seed: input.seed,
        readyAt: 0,
        usageCount: 0,
      })
    : {
        seed: input.seed,
        tone: (input.tone ?? '2d-cute') as Tone,
        palette: DEFAULT_PALETTE,
        signature: signatureFromSeed(input.seed),
        emotion: input.emotion,
        intensity: input.intensity ?? 70,
        prop: (input.prop ?? 'none') as PropKey,
        background: (input.background ?? 'transparent') as BackgroundKey,
        line: input.line,
        linePosition: 'bottom' as const,
      };

  return {
    ...base,
    emotion: input.emotion,
    line: input.line,
    intensity: input.intensity ?? base.intensity,
    prop: (input.prop ?? base.prop) as PropKey,
    background: (input.background ?? base.background) as BackgroundKey,
    tone: input.tone ?? base.tone,
    signature: base.signature ?? DEFAULT_SIGNATURE,
  };
}

export async function hasFace(userId: string) {
  return withDB((db) => db.packs.some((p) => p.userId === userId && p.status !== 'FAILED'));
}
