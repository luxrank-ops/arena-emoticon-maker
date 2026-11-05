import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PackViewer } from '@/components/studio/PackViewer';
import { getCurrentUser } from '@/lib/session';
import { getPackView } from '@/lib/packs';
import { validatePackForKakao } from '@/lib/packager';
import { effectivePlan } from '@/lib/admin-access';
import { getLocale } from '@/lib/i18n/server';
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

  const kakao = {
    validation: validatePackForKakao({ size: view.pack.size, frames: view.frames }),
    packaging: effectivePlan(user) === 'STUDIO',
    plan: effectivePlan(user),
  };

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
          {t('컷을 눌러 크게 보고 저장·공유하거나 대사와 표정을 수정해 보세요. AI 이미지의 변경 사항은 다시 그리기로 적용됩니다.', 'Select a cut to preview, save, share, or edit. Regenerate AI images to apply visual changes.')}
        </p>
      </div>

      <PackViewer
        pack={view.pack}
        frames={view.frames}
        ready={view.ready}
        total={view.total}
        watermark={view.watermark}
        kakao={kakao}
        locale={locale}
      />
    </div>
  );
}
