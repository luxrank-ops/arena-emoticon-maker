import { handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { getPackView } from '@/lib/packs';
import { KAKAO_RULES, validatePackForKakao } from '@/lib/packager';
import { effectivePlan } from '@/lib/admin-access';

export const dynamic = 'force-dynamic';

/** 카카오 제안 규격 검증 결과 (팩 데이터로 판정 가능한 항목) */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const user = await getCurrentUser();
    const view = await getPackView(user.id, id, user);
    const plan = effectivePlan(user);
    const validation = validatePackForKakao({
      size: view.pack.size,
      frames: view.frames.map((f) => ({ ...f, readyAt: f.ready ? 0 : Infinity })),
    });
    return ok({
      validation,
      rules: KAKAO_RULES,
      /** 잠금 해제한 팩은 규격 패키징(ZIP)을 받을 수 있다 (Creator Pro 는 심사 시트 포함) */
      packaging: view.exportState.unlocked,
      plan, reviewSheet: plan === 'STUDIO',
    });
  } catch (e) {
    return handleError(e);
  }
}
