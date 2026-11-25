import { seasonPropById } from '@/lib/studio/season-props';

/**
 * 시즌 소품 아트 — 화면(카드·티저)에서 **저장과 같은 PNG 에셋**을 그대로 보여 준다.
 *  · 순수 함수 컴포넌트(훅 없음)라 서버·클라이언트 양쪽에서 쓸 수 있다.
 *  · 카드가 많은 화면이 있어 lazy 로딩한다(필요할 때만 40~80KB 를 받는다).
 *  · 오픈 전 잠금 카드에서도 아트는 보여 주되(기대감), 실제 얹기는 막는다.
 */
export function SeasonPropArt({
  id,
  className = 'h-full w-full',
  title,
}: {
  id: string;
  className?: string;
  title?: string;
}) {
  const prop = seasonPropById(id);
  if (!prop) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={prop.asset}
      alt={title ?? prop.label}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={`${className} object-contain`}
    />
  );
}
