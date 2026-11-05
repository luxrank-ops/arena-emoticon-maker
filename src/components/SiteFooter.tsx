import Link from 'next/link';

import { BUSINESS as BIZ } from '@/lib/business';

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t-2 border-ink/90 bg-paper">
      <div className="wrap grid gap-10 py-12 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl border-2 border-ink bg-lemon text-lg">🙂</span>
            <span className="text-lg font-black tracking-[-0.04em]">이모티학</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-sub">
            사진 한 장으로 나만의 이모티콘을 만들고, 표정을 골라 편집하고 저장해 보세요.
          </p>
          <p className="mt-4 text-xs text-sub">
            고객센터 {BIZ.tel ? <strong className="text-ink">{BIZ.tel}</strong> : null}
            {BIZ.email ? <><br /><a className="underline" href={`mailto:${BIZ.email}`}>{BIZ.email}</a></> : <span> · 연락처 설정 중</span>}
            <br />
            {BIZ.supportHours}
          </p>
        </div>

        <div className="text-sm">
          <p className="mb-3 font-black">서비스</p>
          <ul className="space-y-2 text-sub">
            <li><Link className="hover:text-ink" href="/studio/upload">이모티콘 만들기</Link></li>
            <li><Link className="hover:text-ink" href="/studio/packs">내 팩</Link></li>
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
            <li><Link className="hover:text-ink" href="/account-deletion">계정 및 데이터 삭제</Link></li>
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
            <span>통신판매업신고 {BIZ.mailOrder || '정보 미입력'}</span>
          </div>
          <div className="space-x-2">
            <span>주소 {BIZ.address}</span>
            {BIZ.tel ? <span>연락처 {BIZ.tel}</span> : null}
          </div>
        </div>
        <div className="wrap pb-8 text-[11px] text-sub">
          © {new Date().getFullYear()} 이모티학. 생성 결과물은 AI가 만들었습니다.
        </div>
      </div>
    </footer>
  );
}
