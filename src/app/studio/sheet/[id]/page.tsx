import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SheetPicker } from '@/components/studio/SheetPicker';
import { getCurrentUser } from '@/lib/session';
import { getSheetView } from '@/lib/packs';
import { TONES } from '@/lib/art/sticker';

export const dynamic = 'force-dynamic';

export default async function SheetPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  let data: Awaited<ReturnType<typeof getSheetView>> | null = null;
  try {
    data = await getSheetView(user.id, params.id);
  } catch {
    notFound();
  }
  if (!data) notFound();

  const { sheet, face } = data;

  return (
    <div className="wrap py-10">
      <nav className="mb-6 flex items-center gap-2 text-xs font-bold text-sub">
        <Link href="/" className="hover:text-ink">홈</Link>
        <span>/</span>
        <Link href="/studio/upload" className="hover:text-ink">만들기</Link>
        <span>/</span>
        <span className="text-ink">캐릭터 선택</span>
        <span className="ml-auto chip">STEP 2 / 3</span>
      </nav>

      <div className="mb-8">
        <h1 className="h2">어떤 얼굴로 만들까요?</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sub">
          선택한 시안의 얼굴이 <strong className="text-ink">{TONES[sheet.tone].label}</strong> 스타일로
          12컷 내내 유지됩니다. 다시 만들면 표정이 조금씩 달라져요.
        </p>
      </div>

      <SheetPicker
        sheetId={sheet.id}
        variants={sheet.variants}
        palette={face.palette}
        tone={sheet.tone}
        credits={user.credits}
        alreadyChosen={sheet.chosenKey}
      />

      <p className="mt-8 text-center text-[11px] text-sub">
        얼굴 특징점은 <strong className="text-ink">{new Date(face.purgedAt).toLocaleDateString('ko-KR')}</strong>까지
        보관된 뒤 파기 예약되어 있습니다 · 원본 사진은 보관하지 않습니다
      </p>
    </div>
  );
}
