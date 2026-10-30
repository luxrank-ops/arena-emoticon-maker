import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '환불·청약철회 정책 · 이모티미' };

const TABLE = [
  {
    type: 'Plus / Studio 구독',
    rule: '결제일로부터 7일 이내이며 해당 기간에 생성 이력이 전혀 없는 경우 전액 환불. 생성 이력이 있으면 디지털 콘텐츠 제공이 개시된 것으로 보아 잔여 기간 환불 불가.',
  },
  {
    type: '크레딧 팩',
    rule: '미사용 크레딧에 한해 결제일로부터 7일 이내 전액 환불. 1크레딧이라도 사용한 경우 환불 불가.',
  },
  {
    type: '굿즈(실물)',
    rule: '제작 착수 전까지 무료 취소. 제작 착수 후 단순 변심 취소 불가. 상품 하자·오배송은 수령 후 7일 이내 교환/환불.',
  },
  {
    type: '서비스 장애',
    rule: '회사 귀책으로 생성이 실패한 경우 사용된 크레딧을 자동 복구합니다.',
  },
];

export default function RefundPage() {
  return (
    <div className="wrap max-w-3xl py-12">
      <h1 className="h2">환불 · 청약철회 정책</h1>
      <p className="mt-2 text-xs text-sub">시행일: 2026년 10월 30일</p>

      <div className="mt-8 space-y-6 text-[13px] leading-relaxed text-sub">
        <section>
          <h2 className="text-sm font-black text-ink">1. 디지털 콘텐츠의 청약철회 제한 안내</h2>
          <p className="mt-2">
            이모티미의 크레딧·구독 상품은 전자상거래법 제17조 제2항에 따른 디지털 콘텐츠입니다.
            <strong className="text-ink"> 생성이 시작되면 청약철회가 제한</strong>되며, 회사는 결제 화면에서
            이 사실을 고지하고 별도의 동의를 받습니다.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-black text-ink">2. 상품별 환불 기준</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead className="text-[11px] uppercase tracking-wide">
                <tr className="border-b border-line">
                  <th className="py-2">상품</th>
                  <th className="py-2">기준</th>
                </tr>
              </thead>
              <tbody>
                {TABLE.map((r) => (
                  <tr key={r.type} className="border-b border-line align-top">
                    <td className="w-32 py-3 font-bold text-ink">{r.type}</td>
                    <td className="py-3">{r.rule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-black text-ink">3. 환불 신청 방법</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>고객센터(support@emotime.app) 또는 <Link href="/support" className="text-coralink underline">고객센터 페이지</Link>로 주문번호와 사유 접수</li>
            <li>영업일 기준 2일 이내 검토·회신</li>
            <li>승인 시 결제 수단으로 3~7영업일 내 환불 (카드사 정책에 따라 상이)</li>
          </ol>
        </section>

        <section>
          <h2 className="text-sm font-black text-ink">4. 환불이 제한되는 경우</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>이용약관 제5조의 금지행위로 이용이 제한된 경우</li>
            <li>이미 내보내기한 결과물의 대금</li>
            <li>제작이 착수된 실물 굿즈</li>
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-black text-ink">5. 사업자 정보</h2>
          <p className="mt-2">
            상호 이모티미 · 대표 홍길동 · 사업자등록번호 000-00-00000 · 통신판매업신고
            제2026-서울강남-0000호 · 고객센터 02-000-0000
          </p>
        </section>
      </div>
    </div>
  );
}
