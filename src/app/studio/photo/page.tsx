import { PhotoCutoutStudio, type SeasonPropGroup } from '@/components/studio/PhotoCutoutStudio';
import { getLocale } from '@/lib/i18n/server';
import { seasonPackById } from '@/data/season-packs';
import { seasonTimeContext, seasonViews } from '@/lib/season';
import { pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return pageMetadata({
    path: '/studio/photo',
    title: '내 사진 바로 누끼 스티커 — 이모티학',
    description:
      '올린 사진 그대로 캘리그라피 한 줄을 얹어 360×360 PNG·카카오 규격 ZIP으로 바로 저장하세요. 사람 사진은 배경을 뗀 투명 스티커로, 반려동물은 원본 배경을 살린 둥근 프레임으로 마감합니다. AI 생성 없이 무료, 사진은 기기 안에서만 처리합니다.',
  });
}

export default async function PhotoCutoutPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; preview?: string; at?: string; subject?: string }>;
}) {
  const [params, locale] = await Promise.all([searchParams, getLocale()]);

  // 시즌 소품 잠금 판정은 서버가 한다(홈·허브·/season 과 같은 규칙).
  //  · ?preview=season 은 오픈 전 소품 동작을 확인하는 검수용 — 이 화면은 전부 브라우저 안에서
  //    처리되고(서버 생성·결제 없음) 미리보기로 열려도 원가나 판매에 영향이 없다.
  const context = seasonTimeContext(params);
  const seasonGroups: SeasonPropGroup[] = seasonViews(context.now, context.preview)
    .filter((view) => view.stage !== 'closed')
    .map((view) => ({
      id: view.pack.id,
      emoji: view.pack.emoji,
      title: view.pack.title,
      titleEn: view.pack.titleEn,
      unlocked: view.unlocked,
      openLabel: view.openLabel,
      openLabelEn: view.openLabelEn,
      propIds: view.pack.propIds,
    }));
  const seasonFocus = seasonPackById(params.season)?.id ?? null;
  // /pets 처럼 반려동물 흐름에서 오면 누끼 대신 '배경 유지(사진 프레임)'로 시작한다.
  const initialBackdrop = params.subject === 'pet' ? 'frame' : 'cutout';

  return (
    <div className="wrap py-6 sm:py-10">
      <PhotoCutoutStudio locale={locale} seasonGroups={seasonGroups} seasonFocus={seasonFocus} initialBackdrop={initialBackdrop} />
    </div>
  );
}
