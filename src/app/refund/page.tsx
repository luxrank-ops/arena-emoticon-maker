import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '환불·청약철회 정책 · 이모티미' };

export default function RefundPage() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  return (
    <div className="wrap max-w-3xl py-12">
      <h1 className="h2">환불 · 청약철회 정책</h1>
      <p className="mt-2 text-xs text-sub">작성일: 2026년 11월 4일 · 검토용 초안</p>
      <div className="mt-5 rounded-xl border-2 border-coral/40 bg-cream p-4 text-sm leading-relaxed text-ink">
        <strong>운영 전 확인이 필요한 초안입니다.</strong> 사업자·고객센터 정보, 결제·구독 운영 방식과 관계 법령을 검토한 후 시행일을 정해 공지해야 합니다. 법령에 따른 소비자의 권리는 이 안내보다 우선합니다.
      </div>
      <div className="mt-8 space-y-8 text-sm leading-relaxed text-sub">
        <section>
          <h2 className="text-base font-black text-ink">먼저 확인해 주세요</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>유료 크레딧을 사용하지 않았다면 결제 후 7일 이내에 전액 청약철회를 신청할 수 있습니다. 일부를 사용했더라도 가분적인 미사용 부분은 청약철회 대상이 될 수 있습니다.</li>
            <li>팩을 만들 때는 선택한 컷 수만큼 크레딧이 먼저 차감됩니다. 아직 이미지가 생성되지 않았거나 생성에 실패한 컷은 이용 내역을 확인해 처리합니다.</li>
            <li>환불은 현재 앱에서 자동 신청·처리되지 않습니다. 고객센터로 접수하면 주문과 이용 내역을 확인해 처리하는 방식입니다.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-base font-black text-ink">1. 유료 크레딧</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li><strong className="text-ink">7일 이내, 전부 미사용:</strong> 해당 주문으로 받은 유료 크레딧과 관련 유료 혜택을 사용하지 않았다면 결제액 전액의 청약철회를 신청할 수 있습니다.</li>
            <li><strong className="text-ink">7일 이내, 일부 사용:</strong> 사용이 시작된 부분은 법령상 제한될 수 있지만, 분리 가능한 미사용 유료 크레딧 부분은 청약철회를 신청할 수 있습니다. 잔여분 금액은 원칙적으로 해당 주문의 실제 결제액 × 미사용 유료 크레딧 ÷ 해당 주문의 유료 크레딧 수로 계산하고 원 미만은 절사합니다. 할인과 함께 제공된 혜택은 주문 조건과 법령을 확인해 안내합니다.</li>
            <li><strong className="text-ink">7일 이후:</strong> 단순 변심 환불 가능 여부는 구매 조건과 관련 법령에 따라 검토합니다. 서비스 오류나 계약과 다른 제공 등 법령상 권리는 별도로 적용됩니다.</li>
            <li>무료로 지급된 가입·이벤트 크레딧은 결제한 금액이 없어 현금 환불 대상이 아닙니다. 여러 주문과 무료 크레딧이 섞여 있으면 이용 내역을 확인하고 해당 주문의 미사용분과 산정 내역을 안내합니다.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-base font-black text-ink">2. 유료 플랜 · 구독</h2>
          <p className="mt-3">해당 결제의 유료 혜택을 사용하지 않았다면 결제 후 7일 이내 전액 청약철회를 신청할 수 있습니다. 일부 이용했더라도 법령상 가분적인 미제공 부분은 별도로 확인합니다.</p>
          <p className="mt-2">즉시 해지 요청 시에는 결제한 이용기간을 기준으로 해지 요청 접수일의 다음 날부터 남은 일수를 계산합니다. 환불액은 실제 결제액 × 잔여 일수 ÷ 전체 이용 일수로 산정하고 원 미만은 절사합니다. 예를 들어 30일 중 20일이 남은 9,900원 상품은 6,600원입니다. 즉시 해지와 함께 해당 플랜의 유료 혜택과 미사용 플랜 크레딧은 종료·회수합니다. 다른 주문으로 구매한 크레딧과 무료 크레딧은 별도로 확인합니다. 7일 이내 가분적인 미제공 부분의 법령상 권리는 별도이며 같은 부분을 중복 환불하지 않습니다. 산정 내역과 종료일은 처리 전에 안내합니다.</p>
          <p className="mt-2">현재 앱에는 구독 해지·부분 환불을 직접 처리하는 기능이 없습니다. 고객센터에 요청해 주세요. 앱마켓 결제라면 해당 마켓의 절차도 확인해야 하며, 법령상 권리는 제한되지 않습니다.</p>
        </section>
        <section>
          <h2 className="text-base font-black text-ink">3. 생성 실패 · 결제 오류</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>중복 결제, 크레딧 미지급 또는 회사 측 장애로 결과물을 제공받지 못한 경우 주문번호와 상황을 알려 주세요. 확인 후 결제 취소, 미제공분 환불 또는 크레딧 복구 등 적절한 방법을 안내합니다.</li>
            <li>AI로 기존 컷을 다시 그리다 실패한 경우 차감된 크레딧의 자동 복구를 시도합니다. 복구가 확인되지 않거나 처음 팩을 만드는 중 일부 컷이 실패한 경우에는 고객센터에서 이용 내역을 확인합니다.</li>
            <li>AI 결과는 사진과 다르거나 문구가 부정확할 수 있습니다. 단순한 취향 차이로 이미 제공된 부분의 청약철회가 제한될 수 있으나, 서비스 장애나 표시·계약 내용과 다르게 제공된 경우의 법적 권리는 별도입니다.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-base font-black text-ink">4. 실물 굿즈</h2>
          <p className="mt-3">제작 전 취소를 원하면 가능한 빨리 주문번호와 함께 문의해 주세요. 주문에 따라 개별 제작되는 상품은 제작이 시작된 뒤 관련 법령의 요건을 충족하는 경우 단순 변심 청약철회가 제한될 수 있습니다. 제작 착수 여부와 제한 사유는 개별 확인합니다.</p>
          <p className="mt-2">하자, 오배송 또는 표시·계약 내용과 다르게 제공된 경우에는 수령 후 7일이 지났더라도 법령상 청약철회 권리가 적용될 수 있습니다. 관련 법령상 공급받은 날부터 3개월 이내이면서 해당 사실을 안 날 또는 알 수 있었던 날부터 30일 이내의 청약철회 가능 여부를 확인합니다. 배송비 부담도 사유와 법령에 따라 안내합니다.</p>
        </section>
        <section>
          <h2 className="text-base font-black text-ink">5. 신청 방법과 처리</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li><Link href="/support" className="font-bold text-coralink underline">고객센터</Link>{email ? <> 또는 <a href={`mailto:${email}`} className="font-bold text-coralink underline">{email}</a></> : null}로 환불 또는 해지를 요청해 주세요. {email ? null : '현재 환불 접수 연락처를 설정 중입니다.'}</li>
            <li>계정 이메일 또는 닉네임, 주문번호, 구매 상품과 결제일, 요청 사유를 알려 주세요. 장애라면 실패한 팩·컷과 발생 시각도 도움이 됩니다. 비밀번호, 카드번호 전체나 인증번호는 보내지 마세요.</li>
            <li>담당자가 결제·사용 내역과 적용 기준을 확인한 뒤 환불 가능 여부, 계산 내역, 크레딧·혜택 처리 및 진행 방법을 안내합니다. 환불 대상이 아닌 경우에도 이유와 이의 제기 방법을 안내합니다.</li>
            <li>환불은 원칙적으로 결제한 수단으로 처리합니다. 적법한 청약철회의 환급은 법령상 기한에 따라 진행하며, 카드사·결제사에 실제 표시되기까지 추가 시간이 걸릴 수 있습니다.</li>
          </ol>
          <p className="mt-3">표시·광고 또는 계약 내용과 다르게 제공된 경우에는 통상적인 7일 규칙과 별도로 공급받은 날부터 3개월 이내이면서 해당 사실을 안 날 또는 알 수 있었던 날부터 30일 이내의 청약철회 가능 여부를 확인합니다. 분쟁이 해결되지 않으면 1372 소비자상담센터 등에 상담을 요청할 수 있습니다.</p>
        </section>
        <section className="border-t border-line pt-5 text-xs">
          <h2 className="font-black text-ink">작성 시 참고한 자료</h2>
          <p className="mt-2">카카오의 정책이 이모티미에 그대로 적용되는 것은 아닙니다.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><a href="https://cs.kakao.com/helps_html/1073209001?locale=ko" target="_blank" rel="noopener noreferrer" className="text-coralink underline">카카오 이모티콘 결제 취소 안내</a></li>
            <li><a href="https://cs.kakao.com/helps_html/1073198521?locale=ko" target="_blank" rel="noopener noreferrer" className="text-coralink underline">카카오 My 구독 웹결제 해지 안내</a></li>
            <li><a href="https://www.law.go.kr/LSW/ftcInfoP.do?ftcSeq=14785" target="_blank" rel="noopener noreferrer" className="text-coralink underline">공정거래위원회 결정문: 가분적 디지털 콘텐츠</a></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
