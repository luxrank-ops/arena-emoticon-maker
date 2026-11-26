/**
 * 이모티학 브랜드 마크 — 2026-11 공식 아이콘(실사 스티커형 v1)을 그대로 쓴다.
 *  · 예전에는 SVG 스마일 심볼을 그렸지만, 앱 아이콘(파비콘·홈화면·스토어)과
 *    헤더 마크가 서로 다른 그림이면 브랜드가 흔들려 같은 자산을 쓰도록 통일했다.
 *  · public/icons/brand-mark.png 는 둥근 사각형 바깥을 투명 처리한 256px PNG라
 *    밝은 유리 헤더·어두운 배경 어디에 놓아도 사각 테두리가 생기지 않는다.
 *  · idSuffix 는 예전 SVG 그라데이션 id 충돌 방지용이었다. 호출부 호환을 위해
 *    prop 은 남겨 두되 이미지에는 쓰지 않는다.
 */
const BRAND_MARK_SRC = '/icons/brand-mark.png';

export function BrandMark({
  className = '',
  title,
}: {
  className?: string;
  idSuffix?: string;
  title?: string;
}) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- 256px 정적 PNG 한 장이라 next/image 최적화가 필요 없다 */
    <img
      src={BRAND_MARK_SRC}
      alt={title ?? ''}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      width={256}
      height={256}
      draggable={false}
      className={className}
    />
  );
}
