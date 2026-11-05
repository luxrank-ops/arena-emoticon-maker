import Link from 'next/link';
import { AdminAccess } from '@/components/settings/AdminAccess';
import { getCurrentUser } from '@/lib/session';
import { getLocale } from '@/lib/i18n/server';
import { localizedPath, tr } from '@/lib/i18n/locale';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return <SettingsContent />;
}

async function SettingsContent() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const lp = (href: string) => localizedPath(locale, href);
  const links = [
    { href: '/studio/packs', ko: '내 이모티콘 팩', en: 'My sticker packs', icon: '🗂️' },
    { href: locale === 'ko' ? '/billing' : '/pricing', ko: '크레딧·요금·결제 내역', en: 'Credits, plans and billing', icon: '⚡' },
    { href: '/support', ko: '고객센터', en: 'Support', icon: '💬' },
    { href: '/privacy', ko: '개인정보처리방침', en: 'Privacy policy', icon: '🔒' },
    { href: '/account-deletion', ko: '계정 삭제 안내', en: 'Delete account', icon: '⚙️' },
  ];
  return (
    <div className="wrap max-w-2xl py-8 sm:py-10">
      <nav aria-label={t('현재 위치', 'Breadcrumb')} className="mb-6 flex items-center gap-2 text-xs font-bold text-sub">
        <Link href={lp('/studio/packs')} className="min-h-11 py-3 hover:text-ink">{t('내 팩', 'My packs')}</Link><span>/</span><span className="text-ink">{t('설정', 'Settings')}</span>
      </nav>
      <h1 className="h2">{t('설정', 'Settings')}</h1>
      <p className="mt-2 text-sm text-sub">{t('계정과 제작 도구, 앱 정보를 관리해요.', 'Manage your account, creation tools, and app information.')}</p>

      <section className="card mt-6 p-5" aria-label={t('현재 계정', 'Current account')}>
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border-2 border-ink bg-lemon text-xl" aria-hidden="true">🙂</span>
          <div><p className="text-sm font-black">{user.name}</p><p className="mt-0.5 text-xs text-sub">{user.role === 'admin' ? t('관리자 · 크레딧 ∞', 'Admin · ∞ credits') : user.isAuthenticated ? t('로그인 계정', 'Signed-in account') : t('게스트 세션', 'Guest session')}</p></div>
        </div>
      </section>

      <section className="card-flat mt-4 overflow-hidden" aria-label={t('설정 메뉴', 'Settings menu')}>
        <ul className="divide-y divide-line">
          {links.map((item) => <li key={item.href}><Link href={lp(item.href)} className="flex min-h-14 items-center gap-3 px-4 py-3 text-sm font-bold hover:bg-cream"><span aria-hidden="true">{item.icon}</span><span>{t(item.ko, item.en)}</span><span className="ml-auto text-sub" aria-hidden="true">›</span></Link></li>)}
        </ul>
      </section>

      <section className="card-flat mt-4 px-2 py-1" aria-label={t('앱 정보', 'App information')}>
        <div className="flex min-h-12 items-center px-3 text-xs font-bold text-sub"><span>{t('서비스', 'Service')}</span><span className="ml-auto font-normal">EmotiHak</span></div>
        <AdminAccess version="0.2.0" disabled={!process.env.ADMIN_PASSCODE} />
      </section>
    </div>
  );
}
