import type { Metadata } from 'next';
import Link from 'next/link';
import { AccountDeletionPanel } from '@/components/account/AccountDeletionPanel';
import { BUSINESS } from '@/lib/business';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '계정 및 데이터 삭제 · 이모티학', description: '이모티학 계정과 연관 데이터의 삭제를 요청하는 공식 페이지입니다.' };

export default async function AccountDeletionPage({ searchParams }: { searchParams: Promise<{ deleted?: string; pending?: string }> }) {
  const [{ deleted, pending }, user] = await Promise.all([searchParams, getCurrentUser()]);
  const pendingCount = Math.max(0, Number(pending ?? 0) || 0);

  return (
    <div className="wrap max-w-3xl py-12">
      <h1 className="h2">계정 및 데이터 삭제</h1>
      <p className="mt-2 text-sm leading-relaxed text-sub">이모티학(개발자: {BUSINESS.name}) 계정과 연관 데이터를 삭제하는 공식 경로입니다. 앱과 웹에서 같은 계정으로 사용할 수 있습니다.</p>

      {deleted === '1' ? (
        <div className="card mt-8 border-mint bg-mint/10 p-6" role="status">
          <h2 className="text-base font-black">계정 삭제를 완료했습니다</h2>
          <p className="mt-2 text-xs leading-relaxed text-sub">로그인 정보와 계정에 연결된 생성물은 삭제했습니다. 법정 보존이 필요한 결제 기록은 개인정보처리방침에 따라 분리 보관합니다.</p>
          {pendingCount > 0 ? <p className="mt-2 text-xs font-bold text-sub">이미지 저장소 지연으로 남은 정리 작업 {pendingCount}건은 자동으로 다시 시도하며, 해당 이미지에는 더 이상 접근할 수 없습니다.</p> : null}
          <Link href="/" className="btn-dark mt-4 !py-2 text-xs">홈으로 이동</Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <section className="card-flat p-5 text-xs leading-relaxed text-sub">
            <h2 className="text-sm font-black text-ink">삭제되는 정보</h2>
            <p className="mt-2">계정 정보와 세션, 얼굴 분석·일관성 준비 정보, 캐릭터 시트, 팩과 생성 이미지, 브리핑, AI 신고와 공정 이용 기록을 삭제합니다. 물리 상품의 배송·연락처와 상품 이미지도 삭제합니다.</p>
            <h2 className="mt-4 text-sm font-black text-ink">일시적으로 남는 정보</h2>
            <p className="mt-2">법령에 따라 보존해야 하는 유료 주문과 구매·환불 원장은 남습니다. 이 기록에서도 배송 정보와 생성 이미지는 제거합니다. 미해결 결제나 제작·배송 중인 주문이 있으면 먼저 처리해야 합니다.</p>
          </section>

          {user.isAuthenticated && user.role !== 'admin' ? <AccountDeletionPanel /> : (
            <div className="card p-5">
              <h2 className="text-sm font-black">로그인 후 직접 삭제할 수 있습니다</h2>
              <p className="mt-2 text-xs leading-relaxed text-sub">계정 보호를 위해 로그인과 현재 비밀번호 확인이 필요합니다. 로그인할 수 없다면 계정 이메일과 삭제 요청 사실을 고객센터로 알려 주세요. 비밀번호나 카드 정보는 요청하지 않습니다.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/login?next=/account-deletion" className="btn-dark !py-2 text-xs">로그인하고 삭제하기</Link>
                {BUSINESS.email ? <a href={`mailto:${BUSINESS.email}?subject=${encodeURIComponent('이모티학 계정 삭제 요청')}`} className="btn-ghost !py-2 text-xs">삭제 요청 이메일</a> : null}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
