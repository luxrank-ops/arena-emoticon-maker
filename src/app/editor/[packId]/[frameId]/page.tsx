import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FrameEditor } from '@/components/editor/FrameEditor';
import { getCurrentUser } from '@/lib/session';
import { getPackView } from '@/lib/packs';

export const dynamic = 'force-dynamic';

export default async function EditorPage({
  params,
}: {
  params: { packId: string; frameId: string };
}) {
  const user = await getCurrentUser();
  let view: Awaited<ReturnType<typeof getPackView>> | null = null;
  try {
    view = await getPackView(user.id, params.packId);
  } catch {
    notFound();
  }
  if (!view) notFound();

  const frame = view.frames.find((f) => f.id === params.frameId);
  if (!frame) notFound();

  return (
    <div className="wrap py-8">
      <nav className="mb-5 flex items-center gap-2 text-xs font-bold text-sub">
        <Link href="/studio/upload" className="hover:text-ink">만들기</Link>
        <span>/</span>
        <Link href={`/studio/pack/${params.packId}`} className="hover:text-ink">내 팩</Link>
        <span>/</span>
        <span className="text-ink">편집</span>
      </nav>
      <div className="mb-6">
        <h1 className="h2">컷 편집</h1>
        <p className="mt-1 text-sm text-sub">
          대사·표정·소품·배경을 즉시 바꿔보세요. 모든 변경은 자동 저장됩니다.
        </p>
      </div>
      <FrameEditor
        frame={frame}
        packId={params.packId}
        watermark={view.watermark}
        index={frame.index}
        total={view.total}
      />
    </div>
  );
}
