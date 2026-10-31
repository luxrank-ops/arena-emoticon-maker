import { handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { getPackView } from '@/lib/packs';
import { KAKAO_RULES, validatePackForKakao } from '@/lib/packager';
import { PLANS } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

/** 카카오 제안 규격 검증 결과 (팩 데이터로 판정 가능한 항목) */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    const view = await getPackView(user.id, params.id);
    const plan = PLANS[user.plan];
    const validation = validatePackForKakao({
      size: view.pack.size,
      frames: view.frames.map((f) => ({ ...f, readyAt: f.ready ? 0 : Infinity })),
    });
    return ok({
      validation,
      rules: KAKAO_RULES,
      /** Studio 플랜부터 규격 패키징(ZIP) 제공 */
      packaging: plan.plan === 'STUDIO',
      plan: plan.plan,
    });
  } catch (e) {
    return handleError(e);
  }
}
