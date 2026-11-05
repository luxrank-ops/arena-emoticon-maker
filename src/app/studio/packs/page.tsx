import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import { withDB } from '@/lib/store';
import { formatKstDate } from '@/lib/time';
import { getLocale } from '@/lib/i18n/server';
import { localizedPath, tr } from '@/lib/i18n/locale';

export const dynamic = 'force-dynamic';

export default async function MyPacksPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const lp = (href: string) => localizedPath(locale, href);
  const packs = await withDB((db) => db.packs.filter((pack) => pack.userId === user.id).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  return (
    <div className="wrap max-w-4xl py-10">
      <nav aria-label={t('현재 위치', 'Breadcrumb')} className="mb-6 flex items-center gap-2 text-xs font-bold text-sub"><Link href={lp('/')} className="hover:text-ink">{t('홈', 'Home')}</Link><span>/</span><span className="text-ink">{t('내 팩', 'My packs')}</span></nav>
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="h2">{t('내 이모티콘 팩', 'My sticker packs')}</h1><p className="mt-2 text-sm leading-relaxed text-sub">{t('만든 팩을 열어 컷을 확인하고 편집하거나 내려받을 수 있어요.', 'Open a pack to review, edit, or download your stickers.')}</p></div><Link href={lp('/studio/upload')} className="btn-primary !py-3">{t('새 팩 만들기 →', 'Create a new pack →')}</Link></div>
      {!user.isAuthenticated ? <p className="mt-5 rounded-xl border-2 border-line bg-paper p-4 text-sm leading-relaxed text-sub">{t('현재 게스트로 이용 중이에요. 게스트 팩은 이 세션에만 연결되며, 로그인한 계정으로 자동 이전되지 않습니다.', 'You are using a guest session. Guest packs stay linked to this session and are not automatically transferred to an account when you sign in.')}</p> : null}
      {packs.length === 0 ? <div className="card mt-6 p-8 text-center"><p aria-hidden="true" className="text-3xl">🗂️</p><h2 className="mt-3 text-lg font-black">{t('아직 만든 팩이 없어요', 'No packs yet')}</h2><p className="mt-2 text-sm text-sub">{t('사진 한 장으로 첫 이모티콘을 만들어 보세요.', 'Turn one photo into your first sticker pack.')}</p><Link href={lp('/studio/upload')} className="btn-primary mt-5">{t('첫 팩 만들기 →', 'Make my first pack →')}</Link></div> :
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">{packs.map((pack) => { const ready = pack.renderer === 'ai' ? pack.frames.filter((frame) => !!frame.imageId).length : pack.frames.filter((frame) => frame.readyAt <= Date.now()).length; return <li key={pack.id}><Link href={lp(`/studio/pack/${pack.id}`)} className="card group block h-full p-5 transition hover:-translate-y-0.5 hover:shadow-pop"><div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-black group-hover:underline">{pack.title}</h2><p className="mt-1 text-xs text-sub">{formatKstDate(pack.createdAt)} · {t(`${pack.size}컷`, `${pack.size} cuts`)}</p></div><span className="chip !bg-cream">{ready >= pack.frames.length ? t('완성', 'Ready') : t('만드는 중', 'Generating')}</span></div><p className="mt-4 text-sm font-bold text-sub">{ready} / {pack.frames.length}{t('컷 준비됨', ' cuts ready')}</p><p className="mt-3 text-sm font-black text-coralink">{t('팩 열기 →', 'Open pack →')}</p></Link></li>; })}</ul>}
      <div className="mt-8 flex flex-wrap gap-4 text-sm font-bold">{locale === 'ko' ? <Link href="/billing" className="text-coralink underline underline-offset-4">크레딧과 결제 내역 보기</Link> : null}<Link href={lp('/support')} className="text-coralink underline underline-offset-4">{t('도움이 필요해요', 'I need help')}</Link></div>
    </div>
  );
}
