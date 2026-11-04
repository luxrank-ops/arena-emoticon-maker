import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import { withDB } from '@/lib/store';
import { formatKstDate } from '@/lib/time';

export const dynamic = 'force-dynamic';

export default async function MyPacksPage() {
  const user = await getCurrentUser();
  const packs = await withDB((db) => db.packs.filter((pack) => pack.userId === user.id).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  return (
    <div className="wrap max-w-4xl py-10">
      <nav aria-label="현재 위치" className="mb-6 flex items-center gap-2 text-xs font-bold text-sub"><Link href="/" className="hover:text-ink">홈</Link><span>/</span><span className="text-ink">내 팩</span></nav>
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="h2">내 이모티콘 팩</h1><p className="mt-2 text-sm leading-relaxed text-sub">만든 팩을 열어 컷을 확인하고 편집하거나 내려받을 수 있어요.</p></div><Link href="/studio/upload" className="btn-primary !py-3">새 팩 만들기 →</Link></div>
      {!user.isAuthenticated ? <p className="mt-5 rounded-xl border-2 border-line bg-paper p-4 text-sm leading-relaxed text-sub">현재 게스트로 이용 중이에요. 게스트 팩은 이 세션에만 연결되며, 로그인한 계정으로 자동 이전되지 않습니다.</p> : null}
      {packs.length === 0 ? <div className="card mt-6 p-8 text-center"><p aria-hidden="true" className="text-3xl">🗂️</p><h2 className="mt-3 text-lg font-black">아직 만든 팩이 없어요</h2><p className="mt-2 text-sm text-sub">사진 한 장으로 첫 이모티콘을 만들어 보세요.</p><Link href="/studio/upload" className="btn-primary mt-5">첫 팩 만들기 →</Link></div> :
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">{packs.map((pack) => { const ready = pack.renderer === 'ai' ? pack.frames.filter((frame) => !!frame.imageId).length : pack.frames.filter((frame) => frame.readyAt <= Date.now()).length; return <li key={pack.id}><Link href={`/studio/pack/${pack.id}`} className="card group block h-full p-5 transition hover:-translate-y-0.5 hover:shadow-pop"><div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-black group-hover:underline">{pack.title}</h2><p className="mt-1 text-xs text-sub">{formatKstDate(pack.createdAt)} · {pack.size}컷</p></div><span className="chip !bg-cream">{ready >= pack.frames.length ? '완성' : '만드는 중'}</span></div><p className="mt-4 text-sm font-bold text-sub">{ready} / {pack.frames.length}컷 준비됨</p><p className="mt-3 text-sm font-black text-coralink">팩 열기 →</p></Link></li>; })}</ul>}
      <div className="mt-8 flex flex-wrap gap-4 text-sm font-bold"><Link href="/billing" className="text-coralink underline underline-offset-4">크레딧과 결제 내역 보기</Link><Link href="/support" className="text-coralink underline underline-offset-4">도움이 필요해요</Link></div>
    </div>
  );
}
