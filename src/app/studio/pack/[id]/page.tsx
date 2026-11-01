import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PackViewer } from '@/components/studio/PackViewer';
import { getCurrentUser } from '@/lib/session';
import { getPackView } from '@/lib/packs';
import { validatePackForKakao } from '@/lib/packager';
import { PLANS } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default async function PackPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  let view: Awaited<ReturnType<typeof getPackView>> | null = null;
  try {
    view = await getPackView(user.id, params.id);
  } catch {
    notFound();
  }
  if (!view) notFound();

  const kakao = {
    validation: validatePackForKakao({ size: view.pack.size, frames: view.frames }),
    packaging: PLANS[user.plan].plan === 'STUDIO',
    plan: user.plan,
  };

  return (
    <div className="wrap py-10">
      <nav className="mb-6 flex items-center gap-2 text-xs font-bold text-sub">
        <Link href="/" className="hover:text-ink">홈</Link>
        <span>/</span>
        <Link href="/studio/upload" className="hover:text-ink">만들기</Link>
        <span>/</span>
        <span className="text-ink">내 팩</span>
        <span className="ml-auto chip">STEP 3 / 3</span>
      </nav>

      <div className="mb-8">
        <h1 className="h2">내 이모티콘 팩</h1>
        <p className="mt-2 text-sm text-sub">
          컷을 눌러 편집하면 대사·감정선·소품을 바꿀 수 있어요. 생성은 <strong className="text-ink">재조합 방식</strong>이라
          수정은 즉시 반영됩니다.
        </p>
      </div>

      <PackViewer
        pack={view.pack}
        frames={view.frames}
        ready={view.ready}
        total={view.total}
        watermark={view.watermark}
        kakao={kakao}
      />
    </div>
  );
}
