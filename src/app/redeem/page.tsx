import type { Metadata } from 'next';
import Link from 'next/link';
import { RedeemForm } from '@/components/payments/RedeemForm';
import { getCurrentUser } from '@/lib/session';
import { creditsLabel } from '@/lib/admin-access';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '교환권 사용 | 이모티학',
  description: '구입처에서 받은 32자리 교환권 코드로 팩 완성권·크레딧·Creator Pro를 받으세요.',
};

/**
 * 교환권 사용 화면 — PG 계약 전에도 유료 상품을 인도하는 경로.
 *  · 로그인(게스트 세션 포함) 상태에서만 동작한다. 코드는 서버에서만 검증한다.
 *  · docs/FREE-PAYMENT-PLAYBOOK.md §3 운영 절차와 짝을 이룬다.
 */
export default async function RedeemPage() {
  const user = await getCurrentUser();
  return (
    <div className="wrap max-w-4xl py-12">
      <nav className="mb-6 flex items-center gap-2 text-xs font-bold text-sub">
        <Link href="/pricing" className="hover:text-ink">
          요금제
        </Link>
        <span>/</span>
        <span className="text-ink">교환권</span>
      </nav>

      <div className="mb-6">
        <span className="chip !border-ink !bg-lemon !text-ink">교환권 · 코드 결제</span>
        <h1 className="h2 mt-3">교환권 코드 사용</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-sub">
          코드만 있으면 카드 없이 바로 받을 수 있어요. {user.isAuthenticated ? `지금 ${creditsLabel(user)} 상태예요.` : '게스트로도 사용할 수 있고, 나중에 로그인하면 같은 브라우저에서 이어집니다.'}
        </p>
      </div>

      <RedeemForm initialCredits={user.credits} />

      <div className="mt-8 grid gap-3 text-[11px] leading-relaxed text-sub sm:grid-cols-2">
        <div className="card-flat p-4">
          <p className="text-xs font-black text-ink">사용 시 주의</p>
          <p className="mt-1">
            코드 1장은 보통 1회만 쓸 수 있어요. 이미 사용한 코드·유효기간이 지난 코드는 지급되지 않습니다. 잠금 해제형 교환권은 팩마다 1장이 필요해요.
          </p>
        </div>
        <div className="card-flat p-4">
          <p className="text-xs font-black text-ink">교환권은 결제가 아니에요</p>
          <p className="mt-1">
            교환권은 상품을 받는 수단이며, 대금 결제·환불은 코드를 구입한 판매처(운영자·제휴처)의 안내를 따릅니다. 카드 정보는 어디에도 저장되지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
