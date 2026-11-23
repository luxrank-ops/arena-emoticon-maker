import { PhotoCutoutStudio } from '@/components/studio/PhotoCutoutStudio';
import { getLocale } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '내 사진 바로 누끼 스티커 — 이모티학',
  description:
    '올린 사진 그대로 배경만 떼고 캘리그라피 한 줄을 얹어 360×360 투명 PNG·카카오 규격 ZIP으로 바로 저장하세요. AI 생성 없이 무료, 사진은 기기 안에서만 처리합니다.',
};

export default async function PhotoCutoutPage() {
  const locale = await getLocale();
  return (
    <div className="wrap py-6 sm:py-10">
      <PhotoCutoutStudio locale={locale} />
    </div>
  );
}
