import Link from 'next/link';
import { CurationPackageSection } from '@/components/studio/CurationPackageSection';
import { PresetCatalog } from '@/components/studio/PresetCatalog';
import { PRESET_CATEGORIES, PRESET_COUNT } from '@/data/emoticon-presets-150';
import { CURATION_PACKAGES } from '@/data/curation-packages';
import { getLocale } from '@/lib/i18n/server';
import { localizedPath, tr } from '@/lib/i18n/locale';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const locale = await getLocale();
  return {
    title: locale === 'en' ? '150 expression presets & 3 curated packs — EmotiHak' : '표정·포즈 프리셋 150종 · 큐레이션 패키지 3종 — 이모티학',
    description:
      locale === 'en'
        ? 'Browse 150 Korean chat-sticker presets plus three curated 24/32-cut sets — office survival, sweet couple, everyday meme. Pick one and make your own face stickers.'
        : '표정·포즈·이펙트·대사가 한 묶음인 150종 프리셋과 직장인 생존·달달 꽁냥 커플·만능 일상 & 병맛 티키타카 큐레이션 패키지 24·32컷. 하나를 골라 내 얼굴 이모티콘으로 만들면 그대로 반영됩니다.',
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
        <span className="text-ink">{t('큐레이션 패키지 · 프리셋 150', 'Curated packs · Presets 150')}</span>
      </nav>

      <div className="mb-5 grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="max-w-3xl">
          <p className="eyebrow">PRESET LIBRARY · {PRESET_COUNT} + CURATED · {CURATION_PACKAGES.length}</p>
          <h1 className="h2 mt-1 break-keep">{t('큐레이션 패키지와 프리셋 150종', 'Curated packs & 150 presets')}</h1>
          <p className="mt-3 text-sm leading-relaxed text-sub">
            {t(
              '직장인 생존·달달 꽁냥 커플·만능 일상 & 병맛 티키타카 24·32컷 세트를 한 번에 채우거나, 150종 프리셋에서 직접 골라 구성하세요. 표정·포즈·이펙트·대사가 그대로 내 얼굴 이모티콘에 반영됩니다.',
              'Fill a 24 or 32 cut set in one tap — office survival, sweet couple, everyday meme — or hand-pick from 150 presets. Expression, pose, effects and caption are carried into your own face stickers.',
            )}
          </p>
        </div>
        <Link href={lp('/studio/upload')} className="btn-dark w-full sm:w-auto">✨ {t('AI로 직접 만들기', 'Create with AI')}</Link>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 text-[11px] font-bold text-sub sm:grid-cols-3">
        <span className="chip justify-center !bg-white">{t(`① 큐레이션 패키지 ${CURATION_PACKAGES.length}종`, `① ${CURATION_PACKAGES.length} curated sets`)}</span>
        <span className="chip justify-center !bg-white">{t('② 프리셋 선택', '② Pick a preset')}</span>
        <span className="chip justify-center !bg-white col-span-2 sm:col-span-1">{t('③ 만들기에서 반영', '③ Applied when creating')}</span>
      </div>

      <CurationPackageSection locale={locale} />

      <div className="mt-8 mb-3 border-t border-line pt-5">
        <p className="eyebrow">PRESET LIBRARY · {PRESET_COUNT}</p>
        <h2 className="mt-1 text-lg font-black break-keep sm:text-xl">{t('전체 프리셋에서 직접 고르기', 'Or build your own from all 150')}</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-sub">
          {t(
            `${PRESET_CATEGORIES.length}개 카테고리와 한국어·영어 검색으로 원하는 컷을 골라 직접 구성할 수 있어요.`,
            `Pick individual cuts with ${PRESET_CATEGORIES.length} categories and Korean or English search.`,
          )}
        </p>
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
