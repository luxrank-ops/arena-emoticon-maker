import { seasonPropById } from '@/lib/studio/season-props';

/**
 * 시즌 소품 벡터 아트 — 저장(Canvas)과 **똑같은 path 문자열**을 그대로 <path> 로 그린다.
 *  · 순수 함수 컴포넌트(훅 없음)라 서버·클라이언트 양쪽에서 쓸 수 있다.
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
    <svg
      viewBox="-1.15 -1.15 2.35 2.35"
      className={className}
      role="img"
      aria-label={title ?? prop.label}
      focusable="false"
    >
      {prop.parts.map((part, index) => (
        <path
          key={`${prop.id}-${index}`}
          d={part.d}
          fill={part.fill ?? 'none'}
          stroke={part.stroke ?? 'none'}
          strokeWidth={part.strokeWidth ?? 0}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
