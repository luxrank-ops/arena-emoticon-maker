import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PayPanel } from '@/components/payments/PayPanel';
import { getCurrentUser } from '@/lib/session';
import { withDB } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage({ params }: { params: { orderId: string } }) {
  const user = await getCurrentUser();
  const order = await withDB((db) => db.orders.find((o) => o.id === params.orderId && o.userId === user.id) ?? null);
  if (!order) notFound();

  return (
    <div className="wrap max-w-3xl py-12">
      <nav className="mb-6 flex items-center gap-2 text-xs font-bold text-sub">
        <Link href="/pricing" className="hover:text-ink">요금제</Link>
        <span>/</span>
        <span className="text-ink">결제</span>
      </nav>

      <h1 className="h2 mb-6">주문 확인</h1>

      <PayPanel
        orderId={order.id}
        amount={order.amount}
        title={order.title}
        credits={order.credits}
        provider={process.env.PAYMENT_PROVIDER ?? 'mock'}
      />

      <div className="mt-6 space-y-2 text-[11px] leading-relaxed text-sub">
        <p>· 결제는 토스페이먼츠를 통해 처리되며, 카드 정보는 이모티미에 저장되지 않습니다.</p>
        <p>· 크레딧은 결제 완료 즉시 지급됩니다.</p>
        <p>
          · 환불 규정은 <Link href="/refund" className="text-coralink underline">환불·청약철회 정책</Link>을
          따릅니다.
        </p>
      </div>
    </div>
  );
}
