/**
 * 이모티학 브랜드 마크 — 시스템 이모지(🙂) 대신 쓰는 커스텀 스티커 심볼.
 *  · 보라→마젠타 그라데이션 스퀴클 위에 웃는 얼굴과 반짝임 한 점.
 *  · 24px 작은 크기에서도 '스티커 스튜디오'라는 성격이 읽히도록 형태를 단순하게 유지한다.
 *  · 같은 페이지에 여러 번 놓여도 되도록 그라데이션 id 에 접미사를 받는다.
 */
export function BrandMark({
  className = '',
  idSuffix = 'default',
  title,
}: {
  className?: string;
  idSuffix?: string;
  title?: string;
}) {
  const gradientId = `em-mark-${idSuffix}`;
  return (
    <svg viewBox="0 0 40 40" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={gradientId} x1="5" y1="2" x2="35" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8B5CF6" />
          <stop offset="0.46" stopColor="#6E29F5" />
          <stop offset="1" stopColor="#FF4D8D" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="37" height="37" rx="12.5" fill={`url(#${gradientId})`} />
      {/* 유리 같은 하이라이트 */}
      <path
        d="M3.2 15.4C7.4 8.2 13.4 4.6 21 4.4"
        stroke="#FFFFFF"
        strokeOpacity="0.42"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* 얼굴 */}
      <ellipse cx="15.4" cy="20.2" rx="2" ry="2.5" fill="#2A0F55" />
      <ellipse cx="24.6" cy="20.2" rx="2" ry="2.5" fill="#2A0F55" />
      <path
        d="M14.6 25.1c1.6 2.3 3.6 3.4 5.4 3.4s3.8-1.1 5.4-3.4"
        stroke="#2A0F55"
        strokeWidth="2.3"
        strokeLinecap="round"
        fill="none"
      />
      {/* 반짝임 */}
      <path
        d="M31.1 7.2l0.9 2.2 2.2 0.9-2.2 0.9-0.9 2.2-0.9-2.2-2.2-0.9 2.2-0.9z"
        fill="#FFE9A8"
      />
    </svg>
  );
}
