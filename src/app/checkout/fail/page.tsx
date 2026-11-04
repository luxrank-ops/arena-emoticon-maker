import Link from 'next/link';
export default function PaymentFailPage() {
  return <div className="wrap max-w-xl py-16"><div className="card p-6"><h1 className="h2">결제가 완료되지 않았어요</h1><p className="mt-4 text-sm text-sub">결제가 취소되었거나 처리 중 문제가 발생했습니다. 결제 내역을 확인하고 문제가 계속되면 고객센터에 문의해 주세요.</p><div className="mt-5 flex gap-2"><Link href="/billing" className="btn-ghost">결제 내역</Link><Link href="/support" className="btn-ghost">고객센터</Link></div></div></div>;
}
