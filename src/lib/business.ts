/** 공개 사업자·고객센터 정보. 운영 환경변수로 변경할 수 있다. */
export const BUSINESS = {
  name: process.env.NEXT_PUBLIC_BUSINESS_NAME || '아모가',
  owner: process.env.NEXT_PUBLIC_BUSINESS_OWNER || '이춘학',
  regNo: process.env.NEXT_PUBLIC_BUSINESS_REG_NO || '212-77-00245',
  // 등록증에서 확인되는 도로명 주소. 괄호 안의 상세 표기는 확인 후 보완한다.
  address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || '부산광역시 강서구 명지오션시티2로 71, 107동 5층 501호',
  tel: process.env.NEXT_PUBLIC_BUSINESS_TEL || '010-2846-8906',
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'luxrank@gmail.com',
  supportHours: '평일 10:00~18:00 (점심시간 없음) · 주말·공휴일 휴무',
  mailOrder: process.env.NEXT_PUBLIC_MAIL_ORDER_NO || null,
} as const;
