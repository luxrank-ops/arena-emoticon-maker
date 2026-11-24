/** 공개 사업자·고객센터 정보. 운영 환경변수로 변경할 수 있다. */
export const BUSINESS = {
  name: process.env.NEXT_PUBLIC_BUSINESS_NAME || '아모가',
  owner: process.env.NEXT_PUBLIC_BUSINESS_OWNER || '이춘학',
  regNo: process.env.NEXT_PUBLIC_BUSINESS_REG_NO || '212-77-00245',
  // 공개 표시용 도로명 주소 (상세 주소는 노출하지 않는다)
  address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || '부산광역시 강서구 명지오션시티2로 71',
  tel: process.env.NEXT_PUBLIC_BUSINESS_TEL || '010-2846-8906',
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'luxrank@gmail.com',
  supportHours: '평일 10:00~18:00 (점심시간 없음) · 주말·공휴일 휴무',
  /**
   * 통신판매업 신고번호 (전자상거래법 §13 표시의무 · PG 심사 · 스토어 심사 공통).
   *  · 형식은 지자체마다 다르다: `2026-부산강서구-0693`, `제2026-서울마포-0123호`, `2026-000123` 등.
   *  · 정부24 > 통신판매업 신고 결과(신고증)에 적힌 **문자열 그대로** 넣는다. 임의로 만들면 심사에서 반려된다.
   *  · 아래 기본값은 운영 정보 예시이며, 배포 전 실제 신고증과 대조해야 한다.
   */
  mailOrder: process.env.NEXT_PUBLIC_MAIL_ORDER_NO || '2026-부산강서구-0693',
  /**
   * 신고 면제 대상(부가세법상 간이과세자이거나 직전연도 통신판매 거래 50회 미만)이면 1.
   *  · 이 경우 신고번호 대신 "신고 면제 대상"으로 표시한다(번호를 지어내지 않는다).
   *  · 일반과세자로 전환되거나 거래가 늘면 즉시 신고 대상 → 번호를 발급받아 채운다.
   */
  mailOrderExempt: process.env.NEXT_PUBLIC_MAIL_ORDER_EXEMPT === '1',
  /** 사업자등록번호 검증(국세청 홈택스) — 전자상거래법상 '사업자정보확인' 링크로 쓴다. */
  hometaxUrl: 'https://www.hometax.go.kr',
} as const;

/** 화면·영수증에 쓰는 신고번호 표기 (면제면 그 사실을 적는다). */
export function mailOrderLabel(): string {
  if (BUSINESS.mailOrderExempt) return '통신판매업 신고 면제 대상';
  return BUSINESS.mailOrder || '정보 미입력';
}
