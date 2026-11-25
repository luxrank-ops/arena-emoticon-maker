// ─────────────────────────────────────────────────────────────
// 시즌 누끼 소품 10종 — 벡터(경로) 데이터 하나로 화면(SVG)과 저장(Canvas)을 같이 그린다.
//  · 좌표계는 반지름 1 기준 정규화 박스. x·y 모두 -1~1 안에 들어오게 그린다.
//  · 색은 한 소품에 2~3톤만 — 기존 데코(decor.ts)의 '절제된 톤온톤' 규칙을 따른다.
//    (산타 베리레드 + 크림 + 골드 / 눈·얼음은 슬레이트 블루 / 한복은 라벤더 + 골드)
//  · 화면에서는 <SeasonPropArt> 가 parts 를 그대로 <path> 로 그리고,
//    저장(내려받기)에서는 drawSeasonProp 이 같은 path 문자열을 Path2D 로 채운다 → 100% 같은 그림.
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

/** 소품을 얹는 자리 — 사진마다 얼굴·몸 위치가 달라 네 곳 중에서 고른다 */
export type SeasonPropSpot = 'top' | 'center' | 'topRight' | 'left' | 'right' | 'bottomLeft' | 'bottomRight';

export interface SeasonPropPart {
  /** SVG path 문자열 (M/L/Q/C/Z) */
  d: string;
  fill?: string;
  stroke?: string;
  /** stroke 두께 (정규화 단위) */
  strokeWidth?: number;
}

export interface SeasonProp {
  id: SeasonPropId;
  label: string;
  labelEn: string;
  emoji: string;
  packId: 'christmas' | 'newyear' | 'lunar';
  /** 얹었을 때 기본 자리 */
  spot: SeasonPropSpot;
  /** 기본 크기 (캔버스 한 변 대비 반지름) */
  scale: number;
  parts: SeasonPropPart[];
}

// ── 톤 ────────────────────────────────────────────────────────
const BERRY = '#C2405A';
const BERRY_DARK = '#96283F';
const CREAM = '#FFF4E8';
const CREAM_DIM = '#F0E2D2';
const GOLD = '#E0B45C';
const GOLD_LIGHT = '#F4DFAE';
const SLATE = '#6B87B0';
const SLATE_LIGHT = '#C0CEE0';
const LAVENDER = '#8C7BC8';
const LAVENDER_LIGHT = '#CFC6EC';
const CORAL = '#E46B7A';
const WOOD = '#A9764B';
const WOOD_LIGHT = '#D8B283';
const CHARCOAL = '#4B5263';
const SNOW_WHITE = '#FFFFFF';

// ── 경로 도우미 ───────────────────────────────────────────────
type Cmd = ['M' | 'L', number, number] | ['Q', number, number, number, number] | ['C', number, number, number, number, number, number] | ['Z'];

const KAPPA = 0.5522847498;

function ellipse(cx: number, cy: number, rx: number, ry: number): Cmd[] {
  const ox = rx * KAPPA;
  const oy = ry * KAPPA;
  return [
    ['M', cx - rx, cy],
    ['C', cx - rx, cy - oy, cx - ox, cy - ry, cx, cy - ry],
    ['C', cx + ox, cy - ry, cx + rx, cy - oy, cx + rx, cy],
    ['C', cx + rx, cy + oy, cx + ox, cy + ry, cx, cy + ry],
    ['C', cx - ox, cy + ry, cx - rx, cy + oy, cx - rx, cy],
    ['Z'],
  ];
}

function circle(cx: number, cy: number, r: number): Cmd[] {
  return ellipse(cx, cy, r, r);
}

function roundedRect(x0: number, y0: number, x1: number, y1: number, radius: number): Cmd[] {
  const r = Math.min(radius, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2);
  return [
    ['M', x0 + r, y0],
    ['L', x1 - r, y0],
    ['Q', x1, y0, x1, y0 + r],
    ['L', x1, y1 - r],
    ['Q', x1, y1, x1 - r, y1],
    ['L', x0 + r, y1],
    ['Q', x0, y1, x0, y1 - r],
    ['L', x0, y0 + r],
    ['Q', x0, y0, x0 + r, y0],
    ['Z'],
  ];
}

function mapCmds(d: Cmd[], fn: (x: number, y: number) => [number, number]): Cmd[] {
  return d.map((cmd) => {
    if (cmd[0] === 'Z') return ['Z'] as Cmd;
    const n = cmd as unknown as number[];
    const out: number[] = [];
    for (let i = 1; i < n.length; i += 2) {
      const [x, y] = fn(n[i], n[i + 1]);
      out.push(x, y);
    }
    return [cmd[0], ...out] as Cmd;
  });
}

const moved = (d: Cmd[], dx: number, dy: number) => mapCmds(d, (x, y) => [x + dx, y + dy]);
const scaled = (d: Cmd[], s: number) => mapCmds(d, (x, y) => [x * s, y * s]);
const mirrored = (d: Cmd[]) => mapCmds(d, (x, y) => [-x, y]);
const spun = (d: Cmd[], deg: number, cx = 0, cy = 0) => {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return mapCmds(d, (x, y) => [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos]);
};

/** Cmd[] → SVG path 문자열 */
export function seasonPathData(d: Cmd[]): string {
  return d
    .map((cmd) => {
      if (cmd[0] === 'Z') return 'Z';
      const n = cmd as unknown as number[];
      const nums = n.slice(1).map((value) => Math.round(value * 1000) / 1000);
      return `${cmd[0]}${nums.join(' ')}`;
    })
    .join(' ');
}

const fill = (d: Cmd[], color: string): SeasonPropPart => ({ d: seasonPathData(d), fill: color });
const line = (d: Cmd[], color: string, width = 0.14): SeasonPropPart => ({
  d: seasonPathData(d),
  stroke: color,
  strokeWidth: width,
});

// ── 크리스마스 ────────────────────────────────────────────────

function santaHatParts(): SeasonPropPart[] {
  // 챙이 아래로 살짝 기운 산타 모자 — 원뿔은 오른쪽 위로 젖혀진다.
  const cone: Cmd[] = [
    ['M', -0.82, 0.16],
    ['C', -0.66, -0.28, -0.3, -0.82, 0.24, -1.0],
    ['C', 0.52, -0.62, 0.72, -0.24, 0.86, 0.1],
    ['C', 0.36, 0.3, -0.36, 0.32, -0.82, 0.16],
    ['Z'],
  ];
  const brim: Cmd[] = [
    ['M', -0.94, 0.0],
    ['C', -0.94, -0.16, -0.86, -0.24, -0.68, -0.24],
    ['L', 0.72, -0.16],
    ['C', 0.9, -0.15, 0.98, -0.06, 0.98, 0.1],
    ['C', 0.98, 0.28, 0.88, 0.36, 0.68, 0.36],
    ['L', -0.66, 0.3],
    ['C', -0.86, 0.29, -0.94, 0.18, -0.94, 0.0],
    ['Z'],
  ];
  return [
    fill(cone, BERRY),
    fill([...moved(shrunkConeFold(), 0.06, 0.02)], BERRY_DARK),
    fill(brim, CREAM),
    fill(circle(0.35, -0.97, 0.21), CREAM),
    fill(ellipse(0.29, -1.02, 0.09, 0.06), CREAM_DIM),
  ];
}

/** 모자 원뿔의 접힘 그림자 — 아주 옅은 한 겹(베리 다크) */
function shrunkConeFold(): Cmd[] {
  return [
    ['M', -0.2, 0.1],
    ['C', -0.06, -0.2, 0.06, -0.52, 0.24, -0.78],
    ['C', 0.44, -0.5, 0.58, -0.2, 0.68, 0.06],
    ['C', 0.4, 0.14, 0.04, 0.16, -0.2, 0.1],
    ['Z'],
  ];
}

function reindeerAntlerParts(): SeasonPropPart[] {
  // 한쪽 뿔(왼쪽) — 줄기 하나에 가지 셋. 반대쪽은 좌우 반전으로 그린다.
  const stem: Cmd[] = [
    ['M', -0.2, 0.86],
    ['C', -0.34, 0.44, -0.44, 0.02, -0.46, -0.34],
    ['C', -0.48, -0.58, -0.56, -0.78, -0.72, -0.92],
  ];
  const branchOuter: Cmd[] = [
    ['M', -0.46, -0.3],
    ['C', -0.62, -0.42, -0.74, -0.5, -0.9, -0.56],
  ];
  const branchInner: Cmd[] = [
    ['M', -0.33, -0.02],
    ['C', -0.2, -0.2, -0.12, -0.3, -0.02, -0.36],
  ];
  const branchTip: Cmd[] = [
    ['M', -0.52, -0.66],
    ['C', -0.62, -0.7, -0.7, -0.72, -0.8, -0.72],
  ];
  const parts: SeasonPropPart[] = [];
  for (const side of [1, -1] as const) {
    const flip = (d: Cmd[]) => (side === 1 ? d : mirrored(d));
    parts.push(
      line(flip(stem), WOOD, 0.15),
      line(flip(branchOuter), WOOD, 0.12),
      line(flip(branchInner), WOOD, 0.12),
      line(flip(branchTip), WOOD, 0.1),
    );
  }
  // 머리띠 — 아래쪽 가는 호. 뿔이 '달린' 느낌을 준다.
  parts.push(line(
    [
      ['M', -0.62, 0.86],
      ['C', -0.28, 1.0, 0.28, 1.0, 0.62, 0.86],
    ],
    BERRY,
    0.13,
  ));
  parts.push(fill(circle(-0.66, 0.86, 0.09), GOLD_LIGHT), fill(circle(0.66, 0.86, 0.09), GOLD_LIGHT));
  return parts;
}

function rudolphNoseParts(): SeasonPropPart[] {
  return [
    fill(circle(0, 0, 0.74), BERRY),
    fill(ellipse(-0.24, -0.26, 0.26, 0.18), '#E77A8C'),
    fill(ellipse(-0.3, -0.34, 0.1, 0.06), SNOW_WHITE),
    fill(spun(ellipse(0.52, 0.46, 0.12, 0.07), -30), GOLD_LIGHT),
  ];
}

function giftSackParts(): SeasonPropPart[] {
  const body: Cmd[] = [
    ['M', -0.42, -0.28],
    ['C', -0.92, -0.02, -0.96, 0.62, -0.56, 0.86],
    ['C', -0.2, 1.06, 0.24, 1.04, 0.58, 0.82],
    ['C', 0.96, 0.58, 0.94, -0.04, 0.44, -0.28],
    ['C', 0.12, -0.42, -0.12, -0.42, -0.42, -0.28],
    ['Z'],
  ];
  const neck: Cmd[] = [
    ['M', -0.42, -0.28],
    ['C', -0.2, -0.44, 0.2, -0.44, 0.44, -0.28],
    ['C', 0.26, -0.14, -0.24, -0.14, -0.42, -0.28],
    ['Z'],
  ];
  const bow: Cmd[] = [
    ['M', 0.0, -0.34],
    ['C', -0.2, -0.6, -0.44, -0.62, -0.5, -0.44],
    ['C', -0.56, -0.24, -0.24, -0.2, 0.0, -0.34],
    ['Z'],
    ['M', 0.0, -0.34],
    ['C', 0.2, -0.6, 0.44, -0.62, 0.5, -0.44],
    ['C', 0.56, -0.24, 0.24, -0.2, 0.0, -0.34],
    ['Z'],
  ];
  return [
    fill(body, BERRY),
    fill(ellipse(-0.34, 0.2, 0.16, 0.28), BERRY_DARK),
    fill(neck, BERRY_DARK),
    fill(bow, GOLD),
    fill(circle(0, -0.34, 0.08), GOLD_LIGHT),
    fill(roundedRect(-0.5, 0.06, 0.5, 0.16, 0.05), GOLD_LIGHT),
  ];
}

function snowSledParts(): SeasonPropPart[] {
  const deck: Cmd[] = [
    ['M', -0.86, -0.02],
    ['C', -0.5, -0.14, 0.24, -0.14, 0.62, -0.04],
    ['C', 0.66, 0.1, 0.6, 0.2, 0.5, 0.2],
    ['L', -0.8, 0.16],
    ['C', -0.9, 0.16, -0.92, 0.06, -0.86, -0.02],
    ['Z'],
  ];
  const runner: Cmd[] = [
    ['M', -0.9, 0.42],
    ['C', -0.9, 0.2, -0.78, 0.08, -0.6, 0.08],
    ['L', 0.5, 0.08],
    ['C', 0.66, 0.08, 0.78, 0.18, 0.9, 0.34],
  ];
  const posts: Cmd[] = [
    ['M', -0.56, 0.06],
    ['L', -0.6, 0.34],
    ['M', 0.26, 0.06],
    ['L', 0.3, 0.3],
  ];
  return [
    fill(deck, WOOD),
    fill(roundedRect(-0.58, -0.12, 0.06, -0.02, 0.03), WOOD_LIGHT),
    fill(roundedRect(0.14, -0.12, 0.5, -0.02, 0.03), WOOD_LIGHT),
    line(posts, WOOD, 0.09),
    line(runner, CHARCOAL, 0.13),
    fill(circle(-0.6, 0.42, 0.07), GOLD_LIGHT),
  ];
}

function snowflakeParts(): SeasonPropPart[] {
  const spokes: Cmd[] = [];
  for (let i = 0; i < 6; i += 1) {
    const deg = i * 60;
    spokes.push(...spun([['M', 0, 0], ['L', 0, -0.96]] as Cmd[], deg));
  }
  const branches: Cmd[] = [];
  for (let i = 0; i < 6; i += 1) {
    const deg = i * 60;
    branches.push(
      ...spun([['M', 0, -0.62], ['L', -0.22, -0.82]] as Cmd[], deg),
      ...spun([['M', 0, -0.62], ['L', 0.22, -0.82]] as Cmd[], deg),
      ...spun([['M', 0, -0.34], ['L', -0.16, -0.5]] as Cmd[], deg),
      ...spun([['M', 0, -0.34], ['L', 0.16, -0.5]] as Cmd[], deg),
    );
  }
  const dots: Cmd[] = [];
  for (let i = 0; i < 6; i += 1) {
    dots.push(...spun(circle(0, -0.96, 0.08), i * 60));
  }
  return [line(spokes, SLATE, 0.11), line(branches, SLATE_LIGHT, 0.07), fill(dots, SLATE_LIGHT), fill(circle(0, 0, 0.12), SLATE)];
}

// ── 새해 ──────────────────────────────────────────────────────

function fireworkParts(): SeasonPropPart[] {
  const rays: Cmd[] = [];
  const tips: Cmd[] = [];
  const accents: Cmd[] = [];
  for (let i = 0; i < 10; i += 1) {
    const deg = i * 36;
    const inner = 0.24;
    const outer = i % 2 === 0 ? 0.98 : 0.8;
    rays.push(...spun([['M', 0, -inner], ['L', 0, -outer]] as Cmd[], deg));
    tips.push(...spun(i % 2 === 0 ? circle(0, -outer, 0.1) : circle(0, -outer, 0.07), deg));
    if (i % 3 === 0) accents.push(...spun(circle(0, -(outer - 0.18), 0.05), deg));
  }
  return [line(rays, GOLD, 0.1), fill(tips, CORAL), fill(accents, LAVENDER_LIGHT), fill(circle(0, 0, 0.16), GOLD_LIGHT)];
}

function partyPopperParts(): SeasonPropPart[] {
  const cone: Cmd[] = [
    ['M', -0.66, 0.86],
    ['L', -0.06, -0.18],
    ['C', 0.1, -0.42, 0.42, -0.34, 0.5, -0.08],
    ['L', -0.1, 0.9],
    ['C', -0.24, 1.0, -0.56, 0.98, -0.66, 0.86],
    ['Z'],
  ];
  const streamer: Cmd[] = [
    ['M', 0.28, -0.34],
    ['C', 0.56, -0.56, 0.5, -0.86, 0.78, -0.98],
  ];
  const bits: Cmd[] = [
    ...moved(spun(roundedRect(-0.06, -0.18, 0.06, 0.18, 0.04), 28), -0.34, -0.66),
    ...moved(spun(roundedRect(-0.05, -0.14, 0.05, 0.14, 0.03), -24), 0.06, -0.86),
    ...moved(spun(roundedRect(-0.05, -0.15, 0.05, 0.15, 0.03), 62), 0.5, -0.5),
    ...circle(-0.5, -0.42, 0.08),
    ...circle(0.22, -0.56, 0.07),
    ...circle(0.7, -0.72, 0.06),
  ];
  return [
    fill(cone, GOLD),
    fill(roundedRect(-0.64, 0.6, 0.06, 0.94, 0.1), BERRY_DARK),
    line(streamer, CORAL, 0.09),
    fill(bits, LAVENDER),
  ];
}

function confettiBurstParts(): SeasonPropPart[] {
  const a: Cmd[] = [];
  const b: Cmd[] = [];
  const c: Cmd[] = [];
  const bits: [number, number, number, number][] = [
    [-0.62, -0.5, 22, 1],
    [-0.14, -0.78, -18, 0.9],
    [0.42, -0.62, 48, 0.95],
    [0.74, -0.12, -32, 0.85],
    [-0.78, 0.14, 70, 0.8],
    [-0.24, 0.34, -12, 0.9],
    [0.26, 0.52, 34, 0.8],
    [0.6, 0.66, -46, 0.75],
    [-0.5, 0.76, 16, 0.7],
  ];
  bits.forEach(([cx, cy, deg, s], i) => {
    const piece = moved(spun(roundedRect(-0.07 * s, -0.26 * s, 0.07 * s, 0.26 * s, 0.04 * s), deg), cx, cy);
    (i % 3 === 0 ? a : i % 3 === 1 ? b : c).push(...piece);
  });
  return [fill(a, GOLD), fill(b, LAVENDER), fill(c, CORAL)];
}

// ── 설날 ──────────────────────────────────────────────────────

function bokjumeoniParts(): SeasonPropPart[] {
  const body: Cmd[] = [
    ['M', -0.34, -0.16],
    ['C', -0.78, 0.12, -0.84, 0.62, -0.5, 0.86],
    ['C', -0.2, 1.06, 0.2, 1.06, 0.5, 0.86],
    ['C', 0.84, 0.62, 0.78, 0.12, 0.34, -0.16],
    ['C', 0.14, -0.28, -0.14, -0.28, -0.34, -0.16],
    ['Z'],
  ];
  const tie: Cmd[] = [
    ['M', -0.36, -0.18],
    ['C', -0.16, -0.32, 0.16, -0.32, 0.36, -0.18],
    ['C', 0.2, -0.04, -0.2, -0.04, -0.36, -0.18],
    ['Z'],
  ];
  const tassel: Cmd[] = [
    ['M', 0, 0.92],
    ['L', 0, 1.16],
    ['M', -0.12, 0.92],
    ['L', -0.16, 1.12],
    ['M', 0.12, 0.92],
    ['L', 0.16, 1.12],
  ];
  return [
    fill(body, BERRY),
    fill(ellipse(-0.3, 0.3, 0.14, 0.26), BERRY_DARK),
    fill(tie, GOLD),
    line(tassel, GOLD, 0.08),
    fill(spun(ellipse(0.34, 0.36, 0.1, 0.06), -24), GOLD_LIGHT),
  ];
}

function hanbokBowParts(): SeasonPropPart[] {
  const loops: Cmd[] = [
    ['M', 0.0, 0.0],
    ['C', -0.34, -0.34, -0.82, -0.3, -0.84, 0.06],
    ['C', -0.86, 0.4, -0.4, 0.42, 0.0, 0.06],
    ['Z'],
    ['M', 0.0, 0.0],
    ['C', 0.34, -0.34, 0.82, -0.3, 0.84, 0.06],
    ['C', 0.86, 0.4, 0.4, 0.42, 0.0, 0.06],
    ['Z'],
  ];
  const ribbons: Cmd[] = [
    ['M', -0.12, 0.1],
    ['C', -0.3, 0.44, -0.36, 0.74, -0.26, 0.94],
    ['C', -0.1, 0.86, 0.0, 0.6, 0.02, 0.3],
    ['Z'],
    ['M', 0.12, 0.1],
    ['C', 0.3, 0.44, 0.36, 0.74, 0.26, 0.94],
    ['C', 0.1, 0.86, 0.0, 0.6, -0.02, 0.3],
    ['Z'],
  ];
  return [
    fill(loops, CORAL),
    fill(ribbons, BERRY),
    fill(circle(0, 0.04, 0.16), GOLD),
    fill(ellipse(-0.04, -0.02, 0.06, 0.04), GOLD_LIGHT),
  ];
}

// ── 목록 ──────────────────────────────────────────────────────

export const SEASON_PROPS: SeasonProp[] = [
  {
    id: 'santaHat',
    label: '산타 모자',
    labelEn: 'Santa hat',
    emoji: '🎅',
    packId: 'christmas',
    spot: 'top',
    scale: 0.18,
    parts: santaHatParts(),
  },
  {
    id: 'reindeerAntlers',
    label: '루돌프 뿔',
    labelEn: 'Reindeer antlers',
    emoji: '🦌',
    packId: 'christmas',
    spot: 'top',
    scale: 0.16,
    parts: reindeerAntlerParts(),
  },
  {
    id: 'rudolphNose',
    label: '빨간 코',
    labelEn: 'Red nose',
    emoji: '🔴',
    packId: 'christmas',
    spot: 'center',
    scale: 0.07,
    parts: rudolphNoseParts(),
  },
  {
    id: 'giftSack',
    label: '선물보따리',
    labelEn: 'Gift sack',
    emoji: '🎁',
    packId: 'christmas',
    spot: 'bottomRight',
    scale: 0.15,
    parts: giftSackParts(),
  },
  {
    id: 'snowSled',
    label: '눈썰매',
    labelEn: 'Snow sled',
    emoji: '🛷',
    packId: 'christmas',
    spot: 'bottomLeft',
    scale: 0.16,
    parts: snowSledParts(),
  },
  {
    id: 'snowflake',
    label: '눈결정',
    labelEn: 'Snowflake',
    emoji: '❄️',
    packId: 'christmas',
    spot: 'topRight',
    scale: 0.075,
    parts: snowflakeParts(),
  },
  {
    id: 'firework',
    label: '폭죽',
    labelEn: 'Firework',
    emoji: '🎆',
    packId: 'newyear',
    spot: 'topRight',
    scale: 0.15,
    parts: fireworkParts(),
  },
  {
    id: 'partyPopper',
    label: '파티 폭죽',
    labelEn: 'Party popper',
    emoji: '🎉',
    packId: 'newyear',
    spot: 'bottomLeft',
    scale: 0.14,
    parts: partyPopperParts(),
  },
  {
    id: 'confettiBurst',
    label: '새해 꽃가루',
    labelEn: 'Confetti',
    emoji: '🎊',
    packId: 'newyear',
    spot: 'top',
    scale: 0.2,
    parts: confettiBurstParts(),
  },
  {
    id: 'bokjumeoni',
    label: '복주머니',
    labelEn: 'Lucky pouch',
    emoji: '🧧',
    packId: 'lunar',
    spot: 'bottomRight',
    scale: 0.14,
    parts: bokjumeoniParts(),
  },
  {
    id: 'hanbokBow',
    label: '한복 고름',
    labelEn: 'Hanbok bow',
    emoji: '🎀',
    packId: 'lunar',
    spot: 'top',
    scale: 0.1,
    parts: hanbokBowParts(),
  },
];

export const SEASON_PROP_COUNT = SEASON_PROPS.length;

export function seasonPropById(id: string | null | undefined): SeasonProp | undefined {
  return SEASON_PROPS.find((prop) => prop.id === id);
}

export function seasonPropsForPack(packId: string): SeasonProp[] {
  return SEASON_PROPS.filter((prop) => prop.packId === packId);
}

/** 자리별 중심 좌표·기본 크기 (캔버스 한 변 대비 비율) */
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

export interface SeasonPropPlacement {
  id: SeasonPropId | string;
  spot?: SeasonPropSpot;
  /** 캔버스 한 변 대비 반지름 (없으면 소품 기본값 × 자리 배율) */
  scale?: number;
  /** 회전(도) */
  rotate?: number;
}

/**
 * 캔버스에 소품을 그린다 — 저장(PNG·GIF·APNG·ZIP) 결과에 그대로 들어간다.
 *  · 배경은 투명하게 유지한다(스티커 규격).
 *  · path 문자열을 Path2D 로 읽어 채우기/선 그리기를 parts 순서대로 반복한다.
 */
export function drawSeasonProp(
  ctx: CanvasRenderingContext2D,
  placement: SeasonPropPlacement | null | undefined,
  size: number,
) {
  if (!placement) return;
  const prop = seasonPropById(placement.id);
  if (!prop) return;
  const spot = SEASON_PROP_SPOTS[placement.spot ?? prop.spot] ?? SEASON_PROP_SPOTS.top;
  const radius = size * (placement.scale ?? prop.scale * spot.scale);
  if (!(radius > 0)) return;
  ctx.save();
  ctx.translate(size * spot.x, size * spot.y);
  ctx.rotate(((placement.rotate ?? 0) * Math.PI) / 180);
  ctx.scale(radius, radius);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const part of prop.parts) {
    if (!part.d) continue;
    const path = new Path2D(part.d);
    if (part.fill) {
      ctx.fillStyle = part.fill;
      ctx.fill(path);
    }
    if (part.stroke) {
      ctx.strokeStyle = part.stroke;
      ctx.lineWidth = part.strokeWidth ?? 0.12;
      ctx.stroke(path);
    }
  }
  ctx.restore();
}
