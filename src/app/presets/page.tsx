import Link from 'next/link';
import { PresetCatalog } from '@/components/studio/PresetCatalog';
import { PRESET_CATEGORIES, PRESET_COUNT } from '@/data/emoticon-presets-150';
import { getLocale } from '@/lib/i18n/server';
import { localizedPath, tr } from '@/lib/i18n/locale';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const locale = await getLocale();
  return {
    title: locale === 'en' ? '150 expression presets — EmotiHak' : '표정·포즈 프리셋 150종 — 이모티학',
    description:
      locale === 'en'
        ? 'Browse 150 Korean chat-sticker presets: expression, pose, effect and caption. Pick one and make your own face stickers.'
        : '표정·포즈·이펙트·대사가 한 묶음인 150종 이모티콘 프리셋. 하나를 골라 내 얼굴 이모티콘으로 만들면 그대로 반영됩니다.',
  };
}

export default async function PresetsPage() {
  const locale = await getLocale();
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const lp = (href: string) => localizedPath(locale, href);

  return (
    <main className="wrap pb-16 pt-8 sm:pt-10">
      <nav className="mb-6 flex items-center gap-2 text-xs font-bold text-sub" aria-label={t('현재 위치', 'Breadcrumb')}>
        <Link href={lp('/')} className="hover:text-ink">{t('홈', 'Home')}</Link>
        <span>/</span>
        <span className="text-ink">{t('프리셋 150', 'Presets 150')}</span>
      </nav>

      <div className="mb-5 grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="max-w-3xl">
          <p className="eyebrow">PRESET LIBRARY · {PRESET_COUNT}</p>
          <h1 className="h2 mt-1 break-keep">{t('표정·포즈 프리셋 150종', '150 expression presets')}</h1>
          <p className="mt-3 text-sm leading-relaxed text-sub">
            {t(
              '표정·포즈·이펙트·대사가 한 묶음으로 준비돼 있어요. 마음에 드는 것을 고르면 내 얼굴 이모티콘을 만들 때 표정과 동작, 장식, 말풍선 대사까지 그대로 반영됩니다.',
              'Each preset bundles an expression, a pose, decorative effects and a caption. Pick one and it is carried into your own face stickers: expression, gesture, decorations and the speech-bubble caption.',
            )}
          </p>
        </div>
        <Link href={lp('/studio/upload')} className="btn-dark w-full sm:w-auto">✨ {t('AI로 직접 만들기', 'Create with AI')}</Link>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 text-[11px] font-bold text-sub sm:grid-cols-3">
        <span className="chip justify-center !bg-white">{t(`① ${PRESET_CATEGORIES.length}개 카테고리`, `① ${PRESET_CATEGORIES.length} categories`)}</span>
        <span className="chip justify-center !bg-white">{t('② 프리셋 선택', '② Pick a preset')}</span>
        <span className="chip justify-center !bg-white col-span-2 sm:col-span-1">{t('③ 만들기에서 반영', '③ Applied when creating')}</span>
      </div>

      <PresetCatalog locale={locale} />

      <p className="mt-6 rounded-xl border border-line bg-cream px-4 py-3 text-[11px] leading-relaxed text-sub">
        {t(
          'AI는 사진 속 얼굴과 선택한 시안을 기준으로 그리며, 결과는 사진과 다소 다를 수 있어요. 한글 대사는 AI가 뭉개지 않도록 앱이 글자 레이어로 깔끔하게 합성합니다.',
          'AI draws from your photo and the chosen draft, so results can differ slightly. Korean captions are composed by the app as a text layer so they stay legible.',
        )}
      </p>
    </main>
  );
}
