import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PackViewer } from '@/components/studio/PackViewer';
import { getCurrentUser } from '@/lib/session';
import { getPackView } from '@/lib/packs';
import { buildReviewSheet } from '@/lib/reviewer-sheet';
import { referralSummaryFor } from '@/lib/referral';
import { validatePackForKakao } from '@/lib/packager';
import { effectivePlan, isFullAccess } from '@/lib/admin-access';
import { headers } from 'next/headers';
import { getLocale } from '@/lib/i18n/server';
import { checkoutSuspended, paymentsUnavailable } from '@/lib/payments';
import { localizedPath, tr } from '@/lib/i18n/locale';

export const dynamic = 'force-dynamic';

export default async function PackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const lp = (href: string) => localizedPath(locale, href);
  let view: Awaited<ReturnType<typeof getPackView>> | null = null;
  try {
    view = await getPackView(user.id, id, user);
  } catch {
    notFound();
  }
  if (!view) notFound();

  const plan = effectivePlan(user);
  const kakao = {
    validation: validatePackForKakao({ size: view.pack.size, frames: view.frames }),
    // 잠금이 해제된 팩은 등급과 무관하게 규격 ZIP 을 열고, Creator Pro 는 심사 시트까지 함께 넣는다.
    packaging: view.exportState.unlocked,
    plan,
  };
  // Creator Pro: 심사 시트(컨셉·제목·해시태그)를 만들어 카카오 ZIP·화면에 함께 넣는다.
  const reviewSheet = plan === 'STUDIO' || isFullAccess(user)
    ? buildReviewSheet({
        title: view.pack.title,
        tone: view.pack.tone,
        format: view.pack.format ?? null,
        subjectKind: view.pack.subjectKind ?? 'person',
        frames: view.frames.map((frame) => ({ label: frame.label, line: frame.line })),
      }, locale)
    : null;
  let origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://emotihak.com';
  try { origin = (await headers()).get('x-forwarded-host') ? `https://${(await headers()).get('x-forwarded-host')}` : origin; } catch { /* 요청 밖 */ }
  const invite = await referralSummaryFor(user.id, origin);

  return (
    <div className="wrap py-10">
      <nav className="mb-6 flex items-center gap-2 text-xs font-bold text-sub">
        <Link href={lp('/')} className="hover:text-ink">{t('홈', 'Home')}</Link>
        <span>/</span>
        <Link href={lp('/studio/upload')} className="hover:text-ink">{t('만들기', 'Create')}</Link>
        <span>/</span>
        <span className="text-ink">{t('내 팩', 'My pack')}</span>
        <span className="ml-auto chip">STEP 4 / 4</span>
      </nav>

      <div className="mb-8">
        <h1 className="h2">{t('내 이모티콘 팩', 'My sticker pack')}</h1>
        <p className="mt-2 text-sm text-sub">
          {view.exportState.unlocked
            ? t('컷을 눌러 크게 보고 저장·공유하거나 대사와 표정을 수정해 보세요. AI 이미지의 변경 사항은 다시 그리기로 적용됩니다.', 'Select a cut to preview, save, share, or edit. Regenerate AI images to apply visual changes.')
            : t('지금은 무료 4컷 미리보기 상태예요. 컷을 눌러 공유하거나, 아래 단건 완성권으로 잠금을 해제하면 나머지 8컷까지 그려 12컷 전체와 고화질·투명 PNG·ZIP을 받을 수 있어요.', 'This is a free 4-cut preview. Share a cut, or unlock the pack below to draw the remaining 8 cuts and download all 12 as high-resolution transparent PNGs and a ZIP.')}
        </p>
      </div>

      <PackViewer
        pack={view.pack}
        frames={view.frames}
        ready={view.ready}
        total={view.total}
        watermark={view.watermark}
        kakao={kakao}
        exportState={view.exportState}
        reviewSheet={reviewSheet}
        invite={invite}
        checkoutReady={!paymentsUnavailable() && !checkoutSuspended()}
        locale={locale}
      />
    </div>
  );
}
