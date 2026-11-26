import Link from 'next/link';
import { BUSINESS } from '@/lib/business';
import { BrandMark } from '@/components/BrandMark';
import { getLocale } from '@/lib/i18n/server';
import { localizedPath, tr } from '@/lib/i18n/locale';

export async function SiteFooter() {
  const locale = await getLocale();
  const lp = (href: string) => localizedPath(locale, href);
  const links = [
    { href: '/waitlist', ko: '사전예약', en: 'Pre-register' },
    { href: '/invite', ko: '친구 초대', en: 'Invite' },
    { href: '/privacy', ko: '개인정보처리방침', en: 'Privacy' },
    { href: '/terms', ko: '이용약관', en: 'Terms' },
    { href: '/refund', ko: '환불 정책', en: 'Refunds' },
    { href: '/guide', ko: '사용 설명서', en: 'Korean guide' },
    { href: '/support', ko: '고객센터', en: 'Support' },
    { href: '/account-deletion', ko: '계정 삭제', en: 'Delete account' },
  ];
  return (
    <footer className="mt-16 border-t border-line/70 bg-white/60 backdrop-blur">
      <div className="wrap flex flex-col gap-5 py-10 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="flex items-center gap-2 font-extrabold tracking-[-0.03em]">
            <BrandMark idSuffix="footer" className="h-6 w-6" />
            {tr(locale, '이모티학', 'EmotiHak')}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-sub">
            {links.map((item) => <Link key={item.href} href={lp(item.href)} className="hover:text-ink">{tr(locale, item.ko, item.en)}</Link>)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
          {/* 앱은 아직 출시 전 — 스토어 404 링크 대신 '준비 중' 안내만 둔다(출시되면 링크로 교체). */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/70 px-3 py-1.5 text-sub">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
            {tr(locale, '구글 플레이 앱 출시 준비 중', 'Google Play app coming soon')}
          </span>
          <a href="mailto:luxrank@gmail.com" className="btn-ghost !px-4 !py-2">{tr(locale, '앱 문의 메일', 'Email app support')}</a>
        </div>
        <p className="max-w-3xl text-xs leading-relaxed text-sub">
          {tr(
            locale,
            '생성 결과는 사진·스타일에 따라 달라질 수 있어요. 원본 사진은 저장하지 않으며, 얼굴 분석 정보는 생성 후 24시간 뒤 자동 파기됩니다.',
            'AI results vary with the photo and selected style. Original photos are not stored; derived face-analysis data is deleted automatically 24 hours after generation.',
          )}
        </p>
        <details className="text-xs leading-relaxed text-sub" open>
          <summary className="cursor-pointer font-bold">{tr(locale, '사업자 정보', 'Business information')}</summary>
          <p className="mt-2">
            {tr(locale, '상호', 'Business')}: {BUSINESS.name} · {tr(locale, '대표', 'Representative')}: {BUSINESS.owner}<br />
            {tr(locale, '사업자등록번호', 'Business registration')}: {BUSINESS.regNo} · {tr(locale, '통신판매업신고', 'E-commerce registration')}: {BUSINESS.mailOrder || tr(locale, '정보 미입력', 'Not provided')}<br />
            {tr(locale, '주소', 'Address')}: {BUSINESS.address}<br />
            {tr(locale, '문의', 'Contact')}: <a className="underline" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> · {BUSINESS.tel}<br />
            {tr(locale, BUSINESS.supportHours, 'Weekdays 10:00–18:00 KST · Closed weekends and Korean public holidays')}
          </p>
        </details>
        <p className="text-[11px] text-sub">© {new Date().getFullYear()} EmotiHak · AI-generated images may vary.</p>
      </div>
    </footer>
  );
}
