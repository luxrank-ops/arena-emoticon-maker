import Link from 'next/link';

// PG(카드사) 심사 필수 노출 항목 — 값은 운영 시 .env 로 주입
const BIZ = {
  name: process.env.NEXT_PUBLIC_BUSINESS_NAME ?? '이모티미',
  owner: process.env.NEXT_PUBLIC_BUSINESS_OWNER ?? '홍길동',
  regNo: process.env.NEXT_PUBLIC_BUSINESS_REG_NO ?? '000-00-00000',
  address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS ?? '서울특별시 강남구 테헤란로 0, 3층',
  tel: process.env.NEXT_PUBLIC_BUSINESS_TEL ?? '02-000-0000',
  mailOrder: process.env.NEXT_PUBLIC_MAIL_ORDER_NO ?? '제2026-서울강남-0000호',
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? 'support@emotime.app',
};

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t-2 border-ink/90 bg-paper">
      <div className="wrap grid gap-10 py-12 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl border-2 border-ink bg-lemon text-lg">🙂</span>
            <span className="text-lg font-black tracking-[-0.04em]">이모티미</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-sub">
            내 얼굴로 만드는 3초 이모티콘. 사진 1장으로 24컷을 만들고, 매일 아침 오늘 쓸 답장을 추천받고,
            마음에 드는 컷은 실물 굿즈로.
          </p>
          <p className="mt-4 text-xs text-sub">
            고객센터 <strong className="text-ink">{BIZ.tel}</strong> · 평일 10:00–18:00
            <br />
            <a className="underline" href={`mailto:${BIZ.email}`}>
              {BIZ.email}
            </a>
          </p>
        </div>

        <div className="text-sm">
          <p className="mb-3 font-black">서비스</p>
          <ul className="space-y-2 text-sub">
            <li><Link className="hover:text-ink" href="/studio/upload">이모티콘 만들기</Link></li>
            <li><Link className="hover:text-ink" href="/reply">톡 답장 추천</Link></li>
            <li><Link className="hover:text-ink" href="/brief">오늘의 브리핑</Link></li>
            <li><Link className="hover:text-ink" href="/goods">굿즈 스토어</Link></li>
            <li><Link className="hover:text-ink" href="/pricing">요금제</Link></li>
          </ul>
        </div>

        <div className="text-sm">
          <p className="mb-3 font-black">정책 · 지원</p>
          <ul className="space-y-2 text-sub">
            <li><Link className="hover:text-ink" href="/terms">이용약관</Link></li>
            <li><Link className="hover:text-ink" href="/privacy">개인정보처리방침</Link></li>
            <li><Link className="hover:text-ink" href="/refund">환불·청약철회 정책</Link></li>
            <li><Link className="hover:text-ink" href="/support">고객센터</Link></li>
            <li><Link className="hover:text-ink" href="/admin">운영 콘솔</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="wrap flex flex-col gap-2 py-6 text-[11px] leading-relaxed text-sub md:flex-row md:items-center md:justify-between">
          <div className="space-x-2">
            <span>상호 {BIZ.name}</span>
            <span>대표 {BIZ.owner}</span>
            <span>사업자등록번호 {BIZ.regNo}</span>
            <span>통신판매업신고 {BIZ.mailOrder}</span>
          </div>
          <div className="space-x-2">
            <span>주소 {BIZ.address}</span>
            <span>유선 {BIZ.tel}</span>
          </div>
        </div>
        <div className="wrap pb-8 text-[11px] text-sub">
          © {new Date().getFullYear()} 이모티미. 생성 결과물은 AI가 만들었습니다. · 결제는 토스페이먼츠를 통해
          안전하게 처리됩니다.
        </div>
      </div>
    </footer>
  );
}
