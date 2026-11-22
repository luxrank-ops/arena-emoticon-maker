import { z } from 'zod';
import { comicExpressionById } from '@/lib/comic-expressions';
import { presetById } from '@/data/emoticon-presets-150';
import { handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { composeFrame } from '@/lib/packs';

const layerSchema = z.object({
  id: z.string().min(1).max(40),
  text: z.string().min(1).max(24),
  style: z.enum(['hand', 'gothic', 'bold', 'stamp']),
  bubble: z.enum(['none', 'round', 'shout', 'caption', 'tape']),
  effect: z.enum(['none', 'sweat', 'heart', 'sparkle', 'anger', 'money', 'flame']),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  size: z.number().min(0.05).max(0.34),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  rotate: z.number().min(-35).max(35),
}).strict();

const schema = z.object({
  line: z.string().max(34).optional(),
  comicExpressionId: z.string().refine((id) => !!comicExpressionById(id)).nullable().optional(),
  /** 표정·포즈 프리셋 150종 (id 1~150, null 이면 해제) */
  presetId: z.number().int().min(1).max(150).refine((id) => !!presetById(id), '알 수 없는 프리셋입니다').nullable().optional(),
  /** 앱이 합성하는 한글 대사·이펙트 레이어 (최대 4장) */
  textLayers: z.array(layerSchema).max(4).optional(),
  prop: z.enum(['none', 'coffee', 'laptop', 'phone', 'tissue', 'cake', 'crown', 'heart', 'sweat']).optional(),
  background: z.enum(['transparent', 'cream', 'mint', 'sky', 'pink', 'lemon', 'dark']).optional(),
  intensity: z.number().min(0).max(100).optional(),
  emotion: z
    .enum(['joy','laugh','love','sad','angry','sulk','tired','surprised','smug','cry','king','blank'])
    .optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getCurrentUser();
    const patch = schema.parse(await req.json());
    const frame = await composeFrame(user.id, id, patch);
    return ok({ frame });
  } catch (e) {
    return handleError(e);
  }
}
