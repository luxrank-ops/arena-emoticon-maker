import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SheetPicker } from '@/components/studio/SheetPicker';
import { getCurrentUser } from '@/lib/session';
import { getSheetView } from '@/lib/packs';
import { TONES } from '@/lib/art/sticker';
import { formatKstDate } from '@/lib/time';

export const dynamic = 'force-dynamic';

export default async function SheetPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  let data: Awaited<ReturnType<typeof getSheetView>> | null = null;
  let purged = false;
  try {
    data = await getSheetView(user.id, params.id);
  } catch (e) {
    // 24시간이 지나 얼굴 정보가 파기된 시트 → 404 대신 안내 후 재촬영으로 유도
    if ((e as { code?: string })?.code === 'FACE_PURGED') purged = true;
    else notFound();
  }

  if (purged) {
    return (
      <div className="wrap max-w-xl py-20 text-center">
        <p className="text-4xl">🫧</p>
        <h1 className="h2 mt-4">얼굴 정보가 파기되었습니다</h1>
        <p className="mt-2 text-sm leading-relaxed text-sub">
          개인정보 보호를 위해 얼굴 파생 정보는 생성 후 24시간이 지나면 자동 파기됩니다.
          <br />
          이미 만든 팩은 그대로 열 수 있고, 새 팩은 사진 한 장으로 다시 만들 수 있어요.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/studio/upload" className="btn-primary !px-5 !py-3 text-sm">
            사진 다시 올리기 →
          </Link>
          <Link href="/billing" className="btn-ghost !px-5 !py-3 text-sm">
            내 팩 보기
          </Link>
        </div>
      </div>
    );
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
        얼굴 특징점은 <strong className="text-ink">{formatKstDate(face.purgedAt)}</strong>까지
        보관된 뒤 파기 예약되어 있습니다 · 원본 사진은 보관하지 않습니다
      </p>
    </div>
  );
}
