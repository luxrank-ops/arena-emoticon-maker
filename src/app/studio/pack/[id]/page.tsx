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
        <span className="ml-auto chip">STEP 4 / 4</span>
      </nav>

      <div className="mb-8">
        <h1 className="h2">내 이모티콘 팩</h1>
        <p className="mt-2 text-sm text-sub">
          컷을 눌러 대사·표정·악세사리를 편집해 보세요. AI 이미지에 변경 사항을 적용하려면 다시 그리기가 필요합니다.
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
