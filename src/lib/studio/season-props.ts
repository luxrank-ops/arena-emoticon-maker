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
  /** head 전용: 정수리에서 챙 아래끝까지 내려 얹는 정도(머리 너비 대비) */
  overlap?: number;
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
    packId: 'christmas',
    spot: 'top',
    fit: 'head',
    scale: 1.32,
    overlap: 0.1,
    asset: `${ASSET_DIR}/santa-hat.png`,
    aspect: 1.1636,
  },
  {
    id: 'reindeerAntlers',
    label: '루돌프 뿔',
    labelEn: 'Reindeer antlers',
    emoji: '🦌',
    packId: 'christmas',
    spot: 'top',
    fit: 'head',
    scale: 1.62,
    overlap: 0,
    asset: `${ASSET_DIR}/reindeer-antlers.png`,
    aspect: 1.0492,
  },
  {
    id: 'rudolphNose',
    label: '빨간 코',
    labelEn: 'Red nose',
    emoji: '🔴',
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

  for (let y = 0; y < size; y += 1) {
    const rowStart = y * size * 4;
    for (let x = 0; x < size; x += 1) {
      if (data[rowStart + x * 4 + 3] > alphaThreshold) {
        if (x < rowMin[y]) rowMin[y] = x;
        if (x > rowMax[y]) rowMax[y] = x;
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
  let headWidthPx = 0;
  let headCenterPx = (left + right) / 2;
  for (let y = top; y <= bandEnd; y += 1) {
    if (rowMax[y] < 0) continue;
    const span = rowMax[y] - rowMin[y] + 1;
    if (span > headWidthPx) {
      headWidthPx = span;
      headCenterPx = (rowMin[y] + rowMax[y]) / 2;
    }
  }
  if (headWidthPx <= 0) {
    headWidthPx = width;
    headCenterPx = (left + right) / 2;
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

/** 머리 소품이 위쪽에서 잘리면 사진을 살짝 줄여 자리를 만든다 (0.8~1) */
export const SEASON_PROP_FIGURE_SCALE_MIN = 0.8;
/** 위에서 이만큼(캔버스 대비) 넘치면 사진을 줄인다 — 모자 끝이 살짝 잘리는 건 자연스럽다 */
const CLIP_TOLERANCE = 0.03;

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
  const minTop = size * 0.008;

  let cx: number;
  let cy: number;
  let w: number;
  let h: number;
  let basis: ResolvedSeasonProp['basis'] = prop.fit;
  let clipped = 0;

  const fitted = metrics && spot === prop.spot && prop.fit !== 'free';

  if (fitted && metrics && prop.fit === 'head') {
    const headW = Math.max(6, Math.min(size, metrics.headWidth * size));
    const idealW = headW * prop.scale * sizeFactor;
    w = clamp(idealW, size * 0.08, size * 0.95);
    h = w / prop.aspect;
    cx = metrics.headCenterX * size;
    const headTop = metrics.top * size;
    let bottom = headTop + (prop.overlap ?? 0.08) * headW;
    let top = bottom - h;
    if (top < minTop) {
      // 위 공간이 없다 — 챙을 머리카락에만 살짝 걸치는 정도까지만 내린다(얼굴은 가리지 않는다).
      const maxBottom = headTop + (prop.overlap ?? 0.08) * headW + headW * 0.15;
      const shift = Math.min(minTop - top, Math.max(0, maxBottom - bottom));
      bottom += shift;
      top = bottom - h;
      if (top < minTop) {
        // 그래도 넘치면 머리 너비 대비 85% 까지만 줄여 위 공간에 맞춘다.
        //  (사용자가 크기를 키웠다면 그만큼은 지킨다 — 위쪽은 잘려도 된다)
        const maxH = Math.max(size * 0.02, bottom - minTop);
        const minH = (headW * prop.scale * sizeFactor * 0.85) / prop.aspect;
        h = Math.max(minH, Math.min(h, maxH));
        w = h * prop.aspect;
        top = bottom - h;
        if (top < minTop) clipped = minTop - top;
      }
    }
    cy = (top + bottom) / 2;
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

  return { cx, cy, w, h, rotate, basis, clipped };
}

/**
 * 머리 소품이 위쪽에서 잘리지 않도록 사진을 얼마나 줄일지 정한다 (1 = 그대로).
 *  · 잘리면 0.03 씩 줄여 보고, 0.8 밑으로는 줄이지 않는다(사진이 작아 보이니까).
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
  for (let scale = 1; scale >= SEASON_PROP_FIGURE_SCALE_MIN - 0.001; scale -= 0.03) {
    const rect = resolveSeasonPropRect(prop, placement, scaleSubjectMetrics(metrics, scale, size), size);
    if (rect.clipped <= tolerance) return Math.round(scale * 100) / 100;
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
  ctx.translate(rect.cx, rect.cy);
  if (rect.rotate) ctx.rotate((rect.rotate * Math.PI) / 180);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, -rect.w / 2, -h / 2, rect.w, h);
  ctx.restore();
}
