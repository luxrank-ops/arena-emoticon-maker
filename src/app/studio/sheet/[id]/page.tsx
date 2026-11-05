import Link from 'next/link';
import { isUnlimited } from '@/lib/admin-access';
import { notFound } from 'next/navigation';
import { SheetPicker } from '@/components/studio/SheetPicker';
import { getCurrentUser } from '@/lib/session';
import { getSheetView } from '@/lib/packs';
import { formatKstDate } from '@/lib/time';
import { getLocale } from '@/lib/i18n/server';
import { localizedPath, tr } from '@/lib/i18n/locale';
import { toneCopy } from '@/lib/i18n/presets';

export const dynamic = 'force-dynamic';

export default async function SheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const lp = (href: string) => localizedPath(locale, href);
  let data: Awaited<ReturnType<typeof getSheetView>> | null = null;
  let purged = false;
  try {
    data = await getSheetView(user.id, id);
  } catch (e) {
    // 24시간이 지나 얼굴 정보가 파기된 시트 → 404 대신 안내 후 재촬영으로 유도
    if ((e as { code?: string })?.code === 'FACE_PURGED') purged = true;
    else notFound();
  }

  if (purged) {
    return (
      <div className="wrap max-w-xl py-20 text-center">
        <p className="text-4xl">🫧</p>
        <h1 className="h2 mt-4">{t('얼굴 정보가 파기되었습니다', 'Face-analysis data has been deleted')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-sub">
          {t('개인정보 보호를 위해 얼굴 파생 정보는 생성 후 24시간이 지나면 자동 파기됩니다.', 'For privacy, derived face-analysis data is automatically deleted 24 hours after generation.')}
          <br />
          {t('이미 만든 팩은 그대로 열 수 있고, 새 팩은 사진 한 장으로 다시 만들 수 있어요.', 'Existing packs remain available. Add one photo again to create a new pack.')}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href={lp('/studio/upload')} className="btn-primary !px-5 !py-3 text-sm">
            {t('사진 다시 올리기 →', 'Add a photo again →')}
          </Link>
          <Link href={lp('/studio/packs')} className="btn-ghost !px-5 !py-3 text-sm">
            {t('내 팩 보기', 'View my packs')}
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
        <Link href={lp('/')} className="hover:text-ink">{t('홈', 'Home')}</Link>
        <span>/</span>
        <Link href={lp('/studio/upload')} className="hover:text-ink">{t('만들기', 'Create')}</Link>
        <span>/</span>
        <span className="text-ink">{t('캐릭터 선택', 'Choose a character')}</span>
        <span className="ml-auto chip">STEP 3 / 4</span>
      </nav>

      <div className="mb-8">
        <h1 className="h2">{sheet.subjectKind === 'pet' ? t('어떤 반려동물 캐릭터로 만들까요?', 'Which pet character should we use?') : t('어떤 얼굴로 만들까요?', 'Which character looks most like you?')}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sub">
          {locale === 'en' ? <>Your selected draft guides the <strong className="text-ink">{toneCopy(locale, sheet.tone).label}</strong> style for every cut. AI results may differ slightly from the photo or draft.</> : <>선택한 시안의 {sheet.subjectKind === 'pet' ? '모습이' : '얼굴이'} <strong className="text-ink">{toneCopy(locale, sheet.tone).label}</strong> 스타일로 컷을 만들 때 참조됩니다. AI 결과는 사진이나 시안과 다소 다를 수 있어요.</>}
        </p>
      </div>

      <SheetPicker
        sheetId={sheet.id}
        subjectKind={sheet.subjectKind ?? 'person'}
        variants={sheet.variants}
        palette={face.palette}
        tone={sheet.tone}
        credits={user.credits}
        unlimited={isUnlimited(user)}
        alreadyChosen={sheet.chosenKey}
        locale={locale}
      />

      <p className="mt-8 text-center text-[11px] text-sub">
        {t('생성된 컷은 팩과 함께 보관됩니다 · 원본 사진은 저장하지 않습니다 · 사진 분석 정보 기한', 'Generated cuts are saved with your pack · Original photos are not stored · Face-analysis data expires')} <strong className="text-ink">{formatKstDate(face.purgedAt)}</strong>
      </p>
    </div>
  );
}
