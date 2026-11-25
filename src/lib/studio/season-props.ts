// ─────────────────────────────────────────────────────────────
// 시즌 소품 11종 — 실사풍 입체 PNG 에셋 하나를 화면(<img>)과 저장(Canvas)이 같이 쓴다.
//  · 에셋: public/props/season/*.png (투명 PNG, 512px, 팔레트 256색) — 생성 이미지를
//    순백 배경 누끼(테두리 플러드필 + 봉인 구멍 제거 + 흰 테두리 언프리멀티플라이)로 다듬었다.
//  · 배치: 누끼 사진의 알파에서 피사체 바운딩박스·머리 너비를 재서 '머리 비율'에 맞춰
//    자동 스케일·배치하고, 사용자는 크기·좌우·상하를 슬라이더로 바로 다듬는다.
//  · 미리보기와 내려받기(PNG·GIF·APNG·ZIP)는 같은 에셋·같은 배치 계산을 쓴다.
//  · 오픈 전에는 이 데이터를 쓰지 않고 잠금 배지로만 보여 준다(판정은 src/lib/season.ts).
// ─────────────────────────────────────────────────────────────

export type SeasonPropId =
  | 'santaHat'
  | 'reindeerAntlers'
  | 'rudolphNose'
  | 'giftSack'
  | 'snowSled'
  | 'snowflake'
  | 'firework'
  | 'partyPopper'
  | 'confettiBurst'
  | 'bokjumeoni'
  | 'hanbokBow';

/**
 * 소품의 성격
 *  · wear  — 머리·얼굴에 '입는' 소품. 사진 각도·헤어스타일에 따라 어색해질 수 있다.
 *  · decor — 인물 주변(프레임)에 놓는 소품. 사진이 어떻든 위화감이 없다(실패 0).
 */
export type SeasonPropKind = 'wear' | 'decor';

/** 소품을 얹는 자리 — 사진마다 얼굴·몸 위치가 달라 자리를 고를 수 있다 */
export type SeasonPropSpot = 'top' | 'center' | 'topRight' | 'left' | 'right' | 'bottomLeft' | 'bottomRight';

/**
 * 자동 맞춤 기준
 *  · head  — 정수리 위. 크기는 '머리 너비'에 비례하고 챙이 눈을 덮지 않는다(산타 모자·뿔).
 *  · face  — 얼굴 가운데(코 자리). 머리 너비 기준.
 *  · chest — 가슴 높이. 피사체 너비 기준(한복 고름).
 *  · free  — 피사체가 비워 둔 여백에 맞춰 넣는다(선물보따리·썰매·눈결정·폭죽…).
 */
export type SeasonPropFit = 'head' | 'face' | 'chest' | 'free';

export interface SeasonProp {
  id: SeasonPropId;
  label: string;
  labelEn: string;
  emoji: string;
  /** 'wear' 면 '쓰는 소품', 'decor' 면 '주변 데코' — 화면에서 묶음·배지를 나눈다 */
  kind: SeasonPropKind;
  packId: 'christmas' | 'newyear' | 'lunar';
  /** 기본 자리 — 사용자가 자리를 바꾸면 free 배치로 계산한다 */
  spot: SeasonPropSpot;
  fit: SeasonPropFit;
  /**
   * 기본 크기
   *  · head·face — 머리 너비 대비 배율
   *  · chest — 피사체 너비 대비 배율
   *  · free — 남은 여백 대비 배율
   */
  scale: number;
  /** head 전용: 정수리에서 '머리에 닿는 선'까지 내려 얹는 정도(머리 너비 대비) */
  overlap?: number;
  /**
   * head 전용: 에셋 위에서 '머리에 닿는 선'의 위치(0=맨 위, 1=맨 아래).
   *  · 산타 모자는 챙 아래끝이 머리에 닿는다 → 거의 1
   *  · 뿔은 뿌리(정수리에 닿는 곳)가 에셋의 93% 지점 → 그 아래는 헤어 속으로 사라지는 다리
   *  · 이 값을 기준으로 접촉선을 정수리에 맞추므로, 에셋 아래에 여백이 있어도 뜨지 않는다.
   */
  anchor?: number;
  /** 투명 PNG 경로 */
  asset: string;
  /** 에셋 가로/세로 (px 는 배치 계산에 쓰지 않고 비율만 쓴다) */
  aspect: number;
}

const ASSET_DIR = '/props/season';

export const SEASON_PROPS: SeasonProp[] = [
  {
    id: 'santaHat',
    label: '산타 모자',
    labelEn: 'Santa hat',
    emoji: '🎅',
    kind: 'wear',
    packId: 'christmas',
    spot: 'top',
    fit: 'head',
    // 챙이 머리카락 윗부분을 덮으며 내려오고, 눈썹은 절대 가리지 않는 폭·깊이
    scale: 1.28,
    overlap: 0.42,
    // 챙 아래끝(그 아래로 스며드는 접촉 그림자 포함) = 에셋의 95.5%
    anchor: 0.955,
    asset: `${ASSET_DIR}/santa-hat.png`,
    aspect: 1.1199,
  },
  {
    id: 'reindeerAntlers',
    label: '루돌프 뿔',
    labelEn: 'Reindeer antlers',
    emoji: '🦌',
    kind: 'wear',
    packId: 'christmas',
    spot: 'top',
    fit: 'head',
    // 동그란 머리띠는 지우고, 정수리 양옆으로 감기는 다리+접촉 그림자만 남긴 에셋
    scale: 1.62,
    overlap: 0.2,
    // 뿔 뿌리 = 에셋의 97.3% (그 아래는 헤어 속으로 사라지는 다리)
    anchor: 0.973,
    asset: `${ASSET_DIR}/reindeer-antlers.png`,
    aspect: 1.454,
  },
  {
    id: 'rudolphNose',
    label: '빨간 코',
    labelEn: 'Red nose',
    emoji: '🔴',
    kind: 'wear',
    packId: 'christmas',
    spot: 'center',
    fit: 'face',
    scale: 0.34,
    asset: `${ASSET_DIR}/rudolph-nose.png`,
    aspect: 0.9902,
  },
  {
    id: 'giftSack',
    label: '선물보따리',
    labelEn: 'Gift sack',
    emoji: '🎁',
    kind: 'decor',
    packId: 'christmas',
    spot: 'bottomRight',
    fit: 'free',
    scale: 0.95,
    asset: `${ASSET_DIR}/gift-sack.png`,
    aspect: 0.9863,
  },
  {
    id: 'snowSled',
    label: '눈썰매',
    labelEn: 'Snow sled',
    emoji: '🛷',
    kind: 'decor',
    packId: 'christmas',
    spot: 'bottomLeft',
    fit: 'free',
    scale: 0.95,
    asset: `${ASSET_DIR}/snow-sled.png`,
    aspect: 2.4381,
  },
  {
    id: 'snowflake',
    label: '눈결정',
    labelEn: 'Snowflake',
    emoji: '❄️',
    kind: 'decor',
    packId: 'christmas',
    spot: 'topRight',
    fit: 'free',
    scale: 0.85,
    asset: `${ASSET_DIR}/snowflake.png`,
    aspect: 0.8906,
  },
  {
    id: 'firework',
    label: '폭죽',
    labelEn: 'Firework',
    emoji: '🎆',
    kind: 'decor',
    packId: 'newyear',
    spot: 'topRight',
    fit: 'free',
    scale: 1,
    asset: `${ASSET_DIR}/firework.png`,
    aspect: 1.0364,
  },
  {
    id: 'partyPopper',
    label: '파티 폭죽',
    labelEn: 'Party popper',
    emoji: '🎉',
    kind: 'decor',
    packId: 'newyear',
    spot: 'bottomLeft',
    fit: 'free',
    scale: 0.95,
    asset: `${ASSET_DIR}/party-popper.png`,
    aspect: 0.9199,
  },
  {
    id: 'confettiBurst',
    label: '새해 꽃가루',
    labelEn: 'Confetti',
    emoji: '🎊',
    kind: 'decor',
    packId: 'newyear',
    spot: 'top',
    fit: 'free',
    scale: 1,
    asset: `${ASSET_DIR}/confetti-burst.png`,
    aspect: 0.9863,
  },
  {
    id: 'bokjumeoni',
    label: '복주머니',
    labelEn: 'Lucky pouch',
    emoji: '🧧',
    kind: 'decor',
    packId: 'lunar',
    spot: 'bottomRight',
    fit: 'free',
    scale: 0.95,
    asset: `${ASSET_DIR}/bokjumeoni.png`,
    aspect: 0.8125,
  },
  {
    id: 'hanbokBow',
    label: '한복 고름',
    labelEn: 'Hanbok bow',
    emoji: '🎀',
    kind: 'decor',
    packId: 'lunar',
    spot: 'center',
    fit: 'chest',
    scale: 0.26,
    asset: `${ASSET_DIR}/hanbok-bow.png`,
    aspect: 1.0261,
  },
];

export const SEASON_PROP_COUNT = SEASON_PROPS.length;

export function seasonPropById(id: string | null | undefined): SeasonProp | undefined {
  return SEASON_PROPS.find((prop) => prop.id === id);
}

export function seasonPropsForPack(packId: string): SeasonProp[] {
  return SEASON_PROPS.filter((prop) => prop.packId === packId);
}

// ─────────────────────────────────────────────────────────────
// 피사체 비율 — 누끼 결과의 알파에서 잰다
// ─────────────────────────────────────────────────────────────

export interface SubjectMetrics {
  /** 정규화(0~1) 바운딩박스 */
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
  centerX: number;
  /** 머리(위쪽 18% 구간에서 가장 넓은 줄) 너비·중심 */
  headWidth: number;
  headCenterX: number;
  /** 코 높이 추정 — 정수리에서 머리 너비의 1.05배 아래(이마·미간을 지나 콧등) */
  noseY: number;
  /** 정수리 y (= top) */
  headTop: number;
  /** 정수리 윤곽에 맞춘 원의 반지름(정규화) — 머리카락 삐침에 흔들리지 않는 폭 */
  crownRadius: number;
  /** 그 원의 중심 x — 소품을 앉힐 정수리 한가운데 */
  crownCenterX: number;
  /** 머리 축 기울기(도). 오른쪽으로 기운 머리는 +값(시계방향) */
  tiltDeg: number;
}

/**
 * 알파 채널에서 피사체 비율을 잰다.
 *  · 머리 너비 = 위쪽 18% 구간에서 가장 넓은 줄의 폭 (모자·뿔 크기의 기준)
 *  · 어깨가 프레임을 가득 채운 클로즈업이면 그 줄 자체가 머리 폭이 된다 — 그게 맞다.
 *  · 피사체를 못 찾으면 null (배치가 옛 고정 자리로 폴백).
 */
export function computeSubjectMetrics(
  data: Uint8ClampedArray | Uint8Array,
  size: number,
  alphaThreshold = 16,
): SubjectMetrics | null {
  if (!(size > 0) || data.length < size * size * 4) return null;
  let top = size;
  let bottom = -1;
  let left = size;
  let right = -1;
  const rowMin = new Int32Array(size).fill(size);
  const rowMax = new Int32Array(size).fill(-1);
  const colMin = new Int32Array(size).fill(size);

  for (let y = 0; y < size; y += 1) {
    const rowStart = y * size * 4;
    for (let x = 0; x < size; x += 1) {
      if (data[rowStart + x * 4 + 3] > alphaThreshold) {
        if (x < rowMin[y]) rowMin[y] = x;
        if (x > rowMax[y]) rowMax[y] = x;
        if (y < colMin[x]) colMin[x] = y;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (bottom < top || right < left) return null;

  const height = bottom - top + 1;
  const width = right - left + 1;
  const bandEnd = Math.min(bottom, top + Math.max(3, Math.round(height * 0.18)));

  // ── 머리 줄 찾기 ───────────────────────────────────
  //  행 전체의 min~max 를 쓰면 머리 옆에 떨어진 것(느낌표 장식·다른 사람·소품)까지 머리 폭에 들어온다.
  //  그래서 행마다 '끊기지 않은 덩어리'를 찾아 **가장 넓은 덩어리**를 머리로 본다.
  const runsOf = (y: number): { x0: number; x1: number }[] => {
    const out: { x0: number; x1: number }[] = [];
    let start = -1;
    let gap = 0;
    for (let x = left; x <= right; x += 1) {
      const on = data[(y * size + x) * 4 + 3] > alphaThreshold;
      if (on) {
        if (start < 0) start = x;
        gap = 0;
      } else if (start >= 0) {
        gap += 1;
        if (gap > 2) {
          out.push({ x0: start, x1: x - gap });
          start = -1;
          gap = 0;
        }
      }
    }
    if (start >= 0) out.push({ x0: start, x1: right - gap });
    return out;
  };
  let headWidthPx = 0;
  let headCenterPx = (left + right) / 2;
  let headLeftPx = left;
  let headRightPx = right;
  for (let y = top; y <= bandEnd; y += 1) {
    if (rowMax[y] < 0) continue;
    let best: { x0: number; x1: number } | null = null;
    for (const run of runsOf(y)) {
      if (!best || run.x1 - run.x0 > best.x1 - best.x0) best = run;
    }
    if (!best) continue;
    const span = best.x1 - best.x0 + 1;
    if (span > headWidthPx) {
      headWidthPx = span;
      headCenterPx = (best.x0 + best.x1) / 2;
      headLeftPx = best.x0;
      headRightPx = best.x1;
    }
  }
  if (headWidthPx <= 0) {
    headWidthPx = width;
    headCenterPx = (left + right) / 2;
    headLeftPx = left;
    headRightPx = right;
  }

  // ── 정수리 원호 맞춤 ─────────────────────────────────
  //  윗선(컬럼별 가장 위 픽셀)에 원을 맞춰 정수리 중심·반지름을 얻는다.
  //  머리카락 한 옴이 솟아도 원이 평균을 잡아 주므로 폭·중심이 흔들리지 않는다.
  const crownLimit = top + Math.max(3, Math.round(headWidthPx * 0.45));
  let cn = 0;
  let sx1 = 0;
  let sy1 = 0;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  let sx3 = 0;
  let sy3 = 0;
  let sx2y = 0;
  let sxy2 = 0;
  for (let x = Math.max(left, headLeftPx - Math.round(headWidthPx * 0.06)); x <= Math.min(right, headRightPx + Math.round(headWidthPx * 0.06)); x += 1) {
    const y = colMin[x];
    if (y === size || y > crownLimit) continue;
    cn += 1;
    sx1 += x;
    sy1 += y;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
    sx3 += x * x * x;
    sy3 += y * y * y;
    sx2y += x * x * y;
    sxy2 += x * y * y;
  }
  let crownRadiusPx = headWidthPx / 2;
  let crownCenterPx = headCenterPx;
  if (cn >= 10) {    // 2cx·x + 2cy·y + c = x² + y² 꼴의 최소자승해
    const a11 = 4 * sxx;
    const a12 = 4 * sxy;
    const a13 = 2 * sx1;
    const a22 = 4 * syy;
    const a23 = 2 * sy1;
    const a33 = cn;
    const b1 = 2 * (sx3 + sxy2);
    const b2 = 2 * (sx2y + sy3);
    const b3 = sxx + syy;
    const det =
      a11 * (a22 * a33 - a23 * a23) - a12 * (a12 * a33 - a23 * a13) + a13 * (a12 * a23 - a22 * a13);
    if (Math.abs(det) > 1e-6) {
      const cx =
        (b1 * (a22 * a33 - a23 * a23) - a12 * (b2 * a33 - a23 * b3) + a13 * (b2 * a23 - a22 * b3)) / det;
      const cy =
        (a11 * (b2 * a33 - a23 * b3) - b1 * (a12 * a33 - a23 * a13) + a13 * (a12 * b3 - b2 * a13)) / det;
      const c =
        (a11 * (a22 * b3 - b2 * a23) - a12 * (a12 * b3 - b2 * a13) + b1 * (a12 * a23 - a22 * a13)) / det;
      const rSq = c + cx * cx + cy * cy;
      if (Number.isFinite(rSq) && rSq > 0) {
        const r = Math.sqrt(rSq);
        // 터무니없는 해(머리 폭의 0.3~1.3배 밖)는 버리고 기존 측정값을 쓴다
        if (r > headWidthPx * 0.3 && r < headWidthPx * 1.3) {
          crownRadiusPx = r;
          crownCenterPx = cx;
        }
      }
    }
  }

  // ── 머리 축 기울기 ────────────────────────────────
  //  얼굴 구간 행들의 좌우 중간점을 직선으로 맞춰 기울기를 잰다(어깨가 넓어지는 행은 뺌).
  const tiltRowsEnd = Math.min(bottom, top + Math.round(headWidthPx * 0.9));
  let rn = 0;
  let rsy = 0;
  let rsm = 0;
  let rsyy = 0;
  let rsym = 0;
  for (let y = top + 2; y <= tiltRowsEnd; y += 1) {
    if (rowMax[y] < 0) continue;
    // 머리 줄(가장 가까운 덩어리)의 중간점만 쓴다 — 옆에 떨어진 것은 빼고
    let best: { x0: number; x1: number } | null = null;
    let bestDist = Infinity;
    for (const run of runsOf(y)) {
      const cen = (run.x0 + run.x1) / 2;
      const dist = Math.abs(cen - headCenterPx);
      if (dist < bestDist && run.x1 - run.x0 + 1 >= headWidthPx * 0.45) {
        best = run;
        bestDist = dist;
      }
    }
    if (!best) continue;
    const span = best.x1 - best.x0 + 1;
    if (span > headWidthPx * 1.35) continue;
    const mid = (best.x0 + best.x1) / 2;
    rn += 1;
    rsy += y;
    rsm += mid;
    rsyy += y * y;
    rsym += y * mid;
  }
  let tiltDeg = 0;
  if (rn >= 8) {
    const denom = rn * rsyy - rsy * rsy;
    if (Math.abs(denom) > 1e-6) {
      const slope = (rn * rsym - rsy * rsm) / denom;
      const deg = (-Math.atan(slope) * 180) / Math.PI;
      if (Number.isFinite(deg) && Math.abs(deg) <= 10) tiltDeg = Math.abs(deg) < 1.2 ? 0 : Math.round(deg * 10) / 10;
    }
  }

  const norm = (value: number) => Math.min(1, Math.max(0, value / size));
  return {
    top: norm(top),
    bottom: norm(bottom),
    left: norm(left),
    right: norm(right),
    width: norm(width),
    height: norm(height),
    centerX: norm((left + right) / 2),
    headWidth: norm(headWidthPx),
    headCenterX: norm(headCenterPx),
    headTop: norm(top),
    noseY: norm(top + headWidthPx * 1.05),
    crownRadius: norm(crownRadiusPx),
    crownCenterX: norm(crownCenterPx),
    tiltDeg,
  };
}

/** 사진을 줄였을 때(아래변 고정) 비율도 같이 줄인다 */
export function scaleSubjectMetrics(metrics: SubjectMetrics, scale: number, _size: number): SubjectMetrics {
  const sx = (value: number) => 0.5 + (value - 0.5) * scale;
  const sy = (value: number) => 1 - (1 - value) * scale;
  return {
    top: sy(metrics.top),
    bottom: sy(metrics.bottom),
    left: sx(metrics.left),
    right: sx(metrics.right),
    width: metrics.width * scale,
    height: metrics.height * scale,
    centerX: sx(metrics.centerX),
    headWidth: metrics.headWidth * scale,
    headCenterX: sx(metrics.headCenterX),
    headTop: sy(metrics.headTop),
    noseY: sy(metrics.noseY),
    crownRadius: metrics.crownRadius * scale,
    crownCenterX: sx(metrics.crownCenterX),
    tiltDeg: metrics.tiltDeg,
  };
}

// ─────────────────────────────────────────────────────────────
// 배치 계산 (순수 함수 — 미리보기·저장·테스트가 같은 값을 쓴다)
// ─────────────────────────────────────────────────────────────

export interface SeasonPropPlacement {
  id: SeasonPropId | string;
  /** 지정하지 않으면 소품의 기본 자리 */
  spot?: SeasonPropSpot;
  /** 사용자가 조절한 크기 배율 (기본 1) */
  sizeFactor?: number;
  /** 캔버스 한 변 대비 좌우 이동 (-0.3~0.3) */
  dx?: number;
  /** 캔버스 한 변 대비 상하 이동 (-0.3~0.3) */
  dy?: number;
  /** 회전(도) */
  rotate?: number;
}

export interface ResolvedSeasonProp {
  /** 중심 좌표·크기 (px) */
  cx: number;
  cy: number;
  w: number;
  h: number;
  rotate: number;
  basis: SeasonPropFit | 'fallback';
  /** 위쪽에서 잘리는 px — 사진을 살짝 줄여 없앤다 */
  clipped: number;
  /** 머리 소품이 머리에 닿는 선의 y(px) — 회전축이자 접촉선. 없으면 중심 */
  contactY?: number;
}

/** 자리별 기본 중심·크기 — 피사체 비율을 못 잴 때(폴백)·자유 배치 기준 */
export const SEASON_PROP_SPOTS: Record<SeasonPropSpot, { x: number; y: number; scale: number }> = {
  top: { x: 0.5, y: 0.2, scale: 1 },
  center: { x: 0.5, y: 0.5, scale: 1 },
  topRight: { x: 0.79, y: 0.22, scale: 0.72 },
  left: { x: 0.2, y: 0.34, scale: 0.72 },
  right: { x: 0.8, y: 0.34, scale: 0.72 },
  bottomLeft: { x: 0.21, y: 0.72, scale: 0.85 },
  bottomRight: { x: 0.79, y: 0.72, scale: 0.85 },
};

export const SEASON_PROP_SPOT_LABELS: { id: SeasonPropSpot; label: string; labelEn: string }[] = [
  { id: 'top', label: '머리 위', labelEn: 'Top' },
  { id: 'center', label: '얼굴 가운데', labelEn: 'Face' },
  { id: 'topRight', label: '오른쪽 위', labelEn: 'Top right' },
  { id: 'left', label: '왼쪽', labelEn: 'Left' },
  { id: 'right', label: '오른쪽', labelEn: 'Right' },
  { id: 'bottomLeft', label: '왼쪽 아래', labelEn: 'Bottom left' },
  { id: 'bottomRight', label: '오른쪽 아래', labelEn: 'Bottom right' },
];

/** 사용자 조절 범위 — UI 슬라이더와 계산이 같은 값을 본다 */
export const SEASON_PROP_SIZE_RANGE = { min: 0.55, max: 1.85, step: 0.05 } as const;
export const SEASON_PROP_SHIFT_RANGE = { min: -0.3, max: 0.3, step: 0.01 } as const;

/** 머리 소품이 위쪽에서 잘리면 사진을 살짝 줄여 자리를 만든다 (0.72~1) */
export const SEASON_PROP_FIGURE_SCALE_MIN = 0.72;
/** 위에서 이만큼(캔버스 대비) 넘치면 사진을 줄인다 — 모자 끝이 살짝 잘리는 건 자연스럽다 */
const CLIP_TOLERANCE = 0.03;
/** 챙·머리띠가 이 선(정수리에서 머리 너비의 52%)보다 내려오면 눈썹을 덮는다 — 상한선 */
export const SEASON_PROP_BROW_GUARD = 0.52;
/** 얼굴 축 기울기를 소품 회전에 반영하는 정도 (과보정 방지) */
const TILT_DAMPING = 0.85;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function fallbackWidth(prop: SeasonProp): number {
  switch (prop.fit) {
    case 'head':
      return 0.32;
    case 'face':
      return 0.12;
    case 'chest':
      return 0.24;
    default:
      return 0.2;
  }
}

/** 자유 배치 — 자리(사분면)의 빈 여백을 찾아 그 안에 넣는다 */
function freeRect(
  prop: SeasonProp,
  spot: SeasonPropSpot,
  metrics: SubjectMetrics | null,
  size: number,
  sizeFactor: number,
): { cx: number; cy: number; w: number; h: number } {
  const pad = size * 0.035;
  if (!metrics) {
    const base = SEASON_PROP_SPOTS[spot];
    const w = size * fallbackWidth(prop) * base.scale * sizeFactor;
    return { cx: size * base.x, cy: size * base.y, w, h: w / prop.aspect };
  }

  const subject = {
    left: metrics.left * size,
    right: metrics.right * size,
    top: metrics.top * size,
    bottom: metrics.bottom * size,
  };
  let area = { x0: pad, x1: size - pad, y0: pad, y1: size - pad };
  switch (spot) {
    case 'topRight':
      area = { x0: subject.right, x1: size - pad, y0: pad, y1: subject.top };
      break;
    case 'left':
      area = { x0: pad, x1: subject.left, y0: subject.top, y1: subject.bottom };
      break;
    case 'right':
      area = { x0: subject.right, x1: size - pad, y0: subject.top, y1: subject.bottom };
      break;
    case 'bottomLeft':
      area = { x0: pad, x1: subject.left, y0: subject.bottom, y1: size - pad };
      break;
    case 'bottomRight':
      area = { x0: subject.right, x1: size - pad, y0: subject.bottom, y1: size - pad };
      break;
    case 'top':
      area = { x0: pad, x1: size - pad, y0: pad, y1: subject.top };
      break;
    case 'center':
      area = { x0: pad, x1: size - pad, y0: pad, y1: size - pad };
      break;
    default:
      break;
  }
  let freeW = Math.max(0, area.x1 - area.x0);
  let freeH = Math.max(0, area.y1 - area.y0);

  // 여백이 거의 없으면(피사체가 프레임을 채움) 캔버스 모서리로 물러난다.
  //  이때는 피사체 폭에 맞춰 크기를 잡아 '작은 콩알'이 되지 않게 한다.
  if (freeW < size * 0.08 || freeH < size * 0.06) {
    const corner = SEASON_PROP_SPOTS[spot];
    const base = clamp(metrics.width * size * 0.42, size * 0.12, size * 0.34) * sizeFactor;
    const w = Math.min(base, size * 0.42);
    const h = w / prop.aspect;
    return {
      cx: clamp(size * corner.x, w / 2, size - w / 2),
      cy: clamp(size * corner.y, h / 2, size - h / 2),
      w,
      h,
    };
  }

  let w = Math.min(freeW, freeH * prop.aspect) * 0.92 * prop.scale * sizeFactor;
  w = clamp(w, size * 0.1, size * 0.45);
  let h = w / prop.aspect;
  if (h > freeH) {
    h = freeH;
    w = h * prop.aspect;
  }
  if (w > freeW) {
    w = freeW;
    h = w / prop.aspect;
  }
  // 사분면이 아니라 'top'/'center' 처럼 넓은 영역이면 여백 중앙에 둔다.
  const cx = spot === 'center' ? (subject.left + subject.right) / 2 : (area.x0 + area.x1) / 2;
  const cy = (area.y0 + area.y1) / 2;
  return { cx, cy, w, h };
}

/**
 * 소품 하나의 사각형을 정한다.
 *  · 머리 소품은 머리 너비에 비례해 크기를 잡고, 챙이 눈 위에서 멈추게 내려 얹는다.
 *  · 위 공간이 없으면(정수리가 프레임 맨 위) 조금 더 눌러 쓰고, 그래도 넘치면 clipped 로 알려 준다.
 */
export function resolveSeasonPropRect(
  prop: SeasonProp,
  placement: SeasonPropPlacement,
  metrics: SubjectMetrics | null,
  size: number,
): ResolvedSeasonProp {
  const spot = placement.spot ?? prop.spot;
  const sizeFactor = clamp(placement.sizeFactor ?? 1, SEASON_PROP_SIZE_RANGE.min, SEASON_PROP_SIZE_RANGE.max);
  const rotate = placement.rotate ?? 0;
  const dx = placement.dx ?? 0;
  const dy = placement.dy ?? 0;
  // 위쪽 여백 — 뿔 끝·모자 꼭대기가 캔버스 경계에 딱 붙어 잘려 보이지 않게
  const minTop = size * 0.018;

  let cx: number;
  let cy: number;
  let w: number;
  let h: number;
  let basis: ResolvedSeasonProp['basis'] = prop.fit;
  let clipped = 0;
  let contactY: number | undefined;
  let tilt = rotate;

  const fitted = metrics && spot === prop.spot && prop.fit !== 'free';

  if (fitted && metrics && prop.fit === 'head') {
    const headW = Math.max(6, Math.min(size, metrics.headWidth * size));
    const idealW = headW * prop.scale * sizeFactor;
    w = clamp(idealW, size * 0.08, size * 0.95);
    h = w / prop.aspect;
    // 정수리 원호 중심과 머리 폭 중심을 반씩 섮어 쓴다(옆모습·삐친 머리에서도 흔들리지 않게)
    cx = (metrics.headCenterX * 0.5 + metrics.crownCenterX * 0.5) * size;
    const anchor = clamp(prop.anchor ?? 1, 0.2, 1);
    const headTop = metrics.top * size;
    const overlap = prop.overlap ?? 0.08;
    let contact = headTop + overlap * headW;
    // 에셋 위에서 '머리에 닿는 선'이 anchor 지점이다 → 그 선을 접촉선에 맞춘다
    let top = contact - anchor * h;
    if (top < minTop) {
      // 위 공간이 없다 — 얼굴을 덮지 않는 선(눈썹 위)까지만 내려서 맞춘다
      const guard = Math.min(SEASON_PROP_BROW_GUARD, overlap + 0.12);
      const maxContact = headTop + Math.max(overlap, guard) * headW;
      const shift = Math.min(minTop - top, Math.max(0, maxContact - contact));
      contact += shift;
      top += shift;
      if (top < minTop) {
        // 그래도 넘치면 85% 까지만 줄여 위 공간에 맞춘다.
        //  (사용자가 크기를 키웠다면 그만큼은 지킨다 — 위쪽은 잘려도 된다)
        const touchBottom = top + anchor * h;
        const maxH = Math.max(size * 0.02, (touchBottom - minTop) / anchor);
        const minH = (headW * prop.scale * sizeFactor * 0.85) / prop.aspect;
        h = Math.max(minH, Math.min(h, maxH));
        w = h * prop.aspect;
        top = touchBottom - anchor * h;
        if (top < minTop) clipped = minTop - top;
      }
    }
    cy = top + h / 2;
    contactY = top + anchor * h;
    // 얼굴 축 기울기만큼 모자를 함께 눕힌다 — 회전축은 접촉선(챙 아래)이라 뜨지 않는다
    tilt = rotate + metrics.tiltDeg * TILT_DAMPING;
  } else if (fitted && metrics && prop.fit === 'face') {
    const headW = Math.max(6, Math.min(size, metrics.headWidth * size));
    w = clamp(headW * prop.scale * sizeFactor, size * 0.04, size * 0.6);
    h = w / prop.aspect;
    cx = metrics.headCenterX * size;
    cy = metrics.noseY * size;
  } else if (fitted && metrics && prop.fit === 'chest') {
    w = clamp(metrics.width * size * prop.scale * sizeFactor, size * 0.08, size * 0.7);
    h = w / prop.aspect;
    cx = metrics.centerX * size;
    cy = (metrics.top + metrics.height * 0.8) * size;
  } else {
    const rect = freeRect(prop, spot, metrics, size, sizeFactor);
    cx = rect.cx;
    cy = rect.cy;
    w = rect.w;
    h = rect.h;
    basis = metrics ? 'free' : 'fallback';
  }

  cx = clamp(cx + dx * size, 0, size);
  cy = clamp(cy + dy * size, 0, size);
  if (contactY !== undefined) contactY += dy * size;

  return { cx, cy, w, h, rotate: tilt, basis, clipped, contactY };
}

/**
 * 머리 소품이 정해진 크기 그대로 얹히려면 사진을 얼마나 줄여야 하는지 정한다 (1 = 그대로).
 *  · 잘리거나(clipped) 소품이 찌그러지면(85% 압축) 0.03 씩 더 줄여 다시 본다.
 *  · 0.72 밑으로는 줄이지 않는다 — 사진이 작아 보이니까.
 */
export function planFigureScale(
  prop: SeasonProp,
  placement: SeasonPropPlacement,
  metrics: SubjectMetrics | null,
  size: number,
): number {
  if (!metrics) return 1;
  const spot = placement.spot ?? prop.spot;
  if (spot !== prop.spot || prop.fit === 'free') return 1;
  const tolerance = size * CLIP_TOLERANCE;
  const sizeFactor = clamp(placement.sizeFactor ?? 1, SEASON_PROP_SIZE_RANGE.min, SEASON_PROP_SIZE_RANGE.max);
  for (let scale = 1; scale >= SEASON_PROP_FIGURE_SCALE_MIN - 0.001; scale -= 0.03) {
    const scaled = scaleSubjectMetrics(metrics, scale, size);
    const rect = resolveSeasonPropRect(prop, placement, scaled, size);
    const idealW = Math.max(6, Math.min(size, scaled.headWidth * size)) * prop.scale * sizeFactor;
    // 위가 잘리지 않고, 소품이 '원래 크기'대로 들어가면 그 배율로 정한다
    if (rect.clipped <= tolerance && rect.w >= Math.min(idealW, size * 0.95) - 0.5) return Math.round(scale * 100) / 100;
  }
  return SEASON_PROP_FIGURE_SCALE_MIN;
}

// ─────────────────────────────────────────────────────────────
// 그리기 — 화면 미리보기·PNG·GIF·APNG·ZIP 이 모두 이 함수를 쓴다
// ─────────────────────────────────────────────────────────────

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadSeasonPropImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'sync';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`season prop asset failed: ${src}`));
    image.src = src;
  });
  imageCache.set(src, promise);
  // 실패는 캐시에 남기지 않는다 — 다음 렌더에서 다시 시도할 수 있게.
  promise.catch(() => imageCache.delete(src));
  return promise;
}

/** 화면에 소품 카드가 뜰 때 미리 받아 둔다(고르는 순간 바로 그려지게) */
export function preloadSeasonPropAssets(ids?: string[]): void {
  const list = ids?.length ? SEASON_PROPS.filter((prop) => ids.includes(prop.id)) : SEASON_PROPS;
  for (const prop of list) void loadSeasonPropImage(prop.asset).catch(() => undefined);
}

/**
 * 캔버스에 소품을 그린다 — 저장(PNG·GIF·APNG·ZIP) 결과에 그대로 들어간다.
 *  · 사진 위·글자 아래에 그려지고, 배경은 투명하게 유지한다(스티커 규격).
 *  · subject 는 누끼 사진의 알파에서 잰 피사체 비율 — 없으면 옛 고정 자리로 그린다.
 */
export async function drawSeasonProp(
  ctx: CanvasRenderingContext2D,
  placement: SeasonPropPlacement | null | undefined,
  size: number,
  subject?: SubjectMetrics | null,
): Promise<void> {
  if (!placement) return;
  const prop = seasonPropById(placement.id);
  if (!prop) return;
  const rect = resolveSeasonPropRect(prop, placement, subject ?? null, size);
  if (!(rect.w > 0) || !(rect.h > 0)) return;

  let image: HTMLImageElement;
  try {
    image = await loadSeasonPropImage(prop.asset);
  } catch {
    return; // 에셋을 못 받으면 사진만 저장한다(빈 사각형을 남기지 않는다)
  }
  const natural = image.naturalWidth > 0 && image.naturalHeight > 0 ? image.naturalWidth / image.naturalHeight : prop.aspect;
  const h = rect.w / natural;
  if (typeof window !== 'undefined' && (window as unknown as { __SEASON_DEBUG?: boolean }).__SEASON_DEBUG) {
    console.log('[season-rect]', JSON.stringify({ id: prop.id, rect }));
  }

  ctx.save();
  // 회전축은 '머리에 닿는 선'(contactY) — 눕혀도 챙이 머리에서 뜨지 않는다
  const pivotY = rect.contactY ?? rect.cy;
  ctx.translate(rect.cx, pivotY);
  if (rect.rotate) ctx.rotate((rect.rotate * Math.PI) / 180);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, -rect.w / 2, rect.cy - pivotY - h / 2, rect.w, h);
  ctx.restore();
}
