// ─────────────────────────────────────────────────────────────
// 상황별 복합 데코 (별·반짝이·하트·물음표·느낌표·^^·음표·땀방울·스우시 …)
//  · 대사 문구 + 감정(emotion) + 이펙트(effect)를 함께 읽어 **2~3종**의 데코를 고른다.
//  · 데코는 글자 블록 바운딩 박스의 바로 옆(오른쪽 위 1~2개 · 왼쪽 아래 1개)에
//    바짝 붙어 레터링 한 덩어리처럼 흐른다 — 캔버스 구석에 띄우지 않는다.
//  · 모양은 모두 단위 좌표(-1~1)의 path 명령으로 정의해 **캔버스(drawLayer)와
//    SVG(renderTextLayersWithDefs)가 100% 같은 도형**을 그린다.
//  · 두툼한 흰 스티커 외곽선 + 딥톤/포인트 컬러 + 은은한 그림자 + 작은 하이라이트.
// ─────────────────────────────────────────────────────────────

import type { Emotion } from '@/lib/types';
import type { EffectKind } from '@/lib/studio/layers';
import { mixHex } from '@/lib/studio/caption';

export type DecorKind =
  | 'star'
  | 'sparkle'
  | 'heart'
  | 'question'
  | 'exclaim'
  | 'laughEyes'
  | 'note'
  | 'sweat'
  | 'tear'
  | 'swoosh'
  | 'anger'
  | 'flame'
  | 'coin'
  | 'dot';

export type DecorMotif =
  | 'love'
  | 'question'
  | 'laugh'
  | 'cheer'
  | 'tired'
  | 'angry'
  | 'sad'
  | 'surprised'
  | 'money'
  | 'smug'
  | 'plain';

/** path 명령 — M/L/Q/C/Z 만 쓴다(캔버스·SVG 공통, 원은 베지어로 편다). */
type Cmd = ['M' | 'L', number, number] | ['Q', number, number, number, number] | ['C', number, number, number, number, number, number] | ['Z'];

export interface DecorPrimitive {
  d: Cmd[];
  mode: 'fill' | 'stroke';
  /** stroke 모드의 단위 두께 (반지름 = 1 기준) */
  width?: number;
  tone?: 'main' | 'light';
}

export interface DecorItem {
  kind: DecorKind;
  motif: DecorMotif;
  /** 글자 블록 중심 기준 위치 (px, 회전 전) */
  x: number;
  y: number;
  /** 반지름 (px) */
  r: number;
  rotate: number;
  color: string;
  light: string;
  shapes: DecorPrimitive[];
  gloss?: Cmd[];
}

export interface DecorPlanInput {
  text: string;
  emotion?: Emotion;
  effect?: EffectKind;
  /** 글자 블록 크기·위치 (planCaption 결과) */
  width: number;
  height: number;
  fontSize: number;
  x: number;
  y: number;
  rotate: number;
  /** 캔버스 한 변 (px) — 데코가 캔버스 밖으로 나가지 않게 클램프한다 */
  canvas: number;
  /** false 면 데코를 그리지 않는다 (레이어의 decor='off') */
  enabled?: boolean;
}

// ── 도형 만들기 ────────────────────────────────────────────────

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

function norm(dx: number, dy: number) {
  const len = Math.hypot(dx, dy) || 1;
  return [dx / len, dy / len] as const;
}

/** 꼭짓점을 둥글게 깎은 다각형 — 별·반짝이의 뾰족함을 부드럽게 만든다. */
function roundedPolygon(points: readonly (readonly [number, number])[], round: number): Cmd[] {
  const cmds: Cmd[] = [];
  const n = points.length;
  for (let i = 0; i < n; i += 1) {
    const [px, py] = points[i];
    const [prevX, prevY] = points[(i - 1 + n) % n];
    const [nextX, nextY] = points[(i + 1) % n];
    const before = norm(prevX - px, prevY - py);
    const after = norm(nextX - px, nextY - py);
    const ax = px + before[0] * round;
    const ay = py + before[1] * round;
    const bx = px + after[0] * round;
    const by = py + after[1] * round;
    cmds.push([i === 0 ? 'M' : 'L', ax, ay]);
    cmds.push(['Q', px, py, bx, by]);
  }
  cmds.push(['Z']);
  return cmds;
}

function starPath(): Cmd[] {
  const points: [number, number][] = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? 1 : 0.47;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return roundedPolygon(points, 0.15);
}

function sparklePath(): Cmd[] {
  return [
    ['M', 0, -1],
    ['Q', 0.16, -0.16, 1, 0],
    ['Q', 0.16, 0.16, 0, 1],
    ['Q', -0.16, 0.16, -1, 0],
    ['Q', -0.16, -0.16, 0, -1],
    ['Z'],
  ];
}

function heartPath(): Cmd[] {
  return [
    ['M', 0, 0.76],
    ['C', -1.22, -0.18, -0.52, -1.12, 0, -0.36],
    ['C', 0.52, -1.12, 1.22, -0.18, 0, 0.76],
    ['Z'],
  ];
}

/** 물음표 — 굵은 붓 획 + 점 (스트로크 도형) */
function questionShapes(): DecorPrimitive[] {
  return [
    {
      mode: 'stroke',
      width: 0.3,
      d: [
        ['M', -0.48, -0.4],
        ['C', -0.48, -1.02, 0.5, -1.06, 0.5, -0.5],
        ['C', 0.5, -0.06, -0.02, -0.02, -0.02, 0.38],
      ],
    },
    { mode: 'fill', d: ellipse(0, 0.72, 0.19, 0.19) },
  ];
}

/** 느낌표 — 굵은 세로획 + 점 */
function exclaimShapes(): DecorPrimitive[] {
  return [
    {
      mode: 'stroke',
      width: 0.32,
      d: [
        ['M', 0, -0.95],
        ['L', 0, 0.02],
      ],
    },
    { mode: 'fill', d: ellipse(0, 0.64, 0.2, 0.2) },
  ];
}

/** ^^ 눈웃음 마크 — 두 개의 둥근 산 */
function laughEyesShapes(): DecorPrimitive[] {
  return [
    {
      mode: 'stroke',
      width: 0.24,
      d: [
        ['M', -0.92, 0.2],
        ['Q', -0.52, -0.52, -0.12, 0.2],
        ['M', 0.12, 0.2],
        ['Q', 0.52, -0.52, 0.92, 0.2],
      ],
    },
  ];
}

/** 음표 — 머리(타원) + 기둥 + 깃발 */
function noteShapes(): DecorPrimitive[] {
  return [
    {
      mode: 'fill',
      d: [
        ...ellipse(-0.34, 0.6, 0.34, 0.26),
        ['M', -0.02, 0.6],
        ['L', -0.02, -0.86],
        ['Q', 0.6, -0.76, 0.5, -0.18],
        ['Q', 0.28, -0.5, -0.02, -0.42],
        ['Z'],
      ],
    },
  ];
}

function dropShapes(): DecorPrimitive[] {
  return [
    {
      mode: 'fill',
      d: [
        ['M', 0, -1],
        ['C', 0.5, -0.4, 0.72, 0.05, 0.5, 0.45],
        ['C', 0.3, 0.8, -0.3, 0.8, -0.5, 0.45],
        ['C', -0.72, 0.05, -0.5, -0.4, 0, -1],
        ['Z'],
      ],
    },
  ];
}

function swooshShapes(): DecorPrimitive[] {
  return [
    {
      mode: 'fill',
      d: [
        ['M', -1, 0.26],
        ['Q', -0.15, -0.72, 1, -0.22],
        ['Q', 0.05, 0.14, -1, 0.26],
        ['Z'],
      ],
    },
  ];
}

function angerShapes(): DecorPrimitive[] {
  const cmds: Cmd[] = [];
  for (let i = 0; i < 4; i += 1) {
    const angle = Math.PI / 4 + (Math.PI / 2) * i;
    cmds.push(['M', Math.cos(angle) * 0.34, Math.sin(angle) * 0.34]);
    cmds.push(['L', Math.cos(angle) * 1, Math.sin(angle) * 1]);
  }
  return [{ mode: 'stroke', width: 0.26, d: cmds }];
}

function flameShapes(): DecorPrimitive[] {
  return [
    {
      mode: 'fill',
      d: [
        ['M', 0, -1],
        ['C', 0.62, -0.34, 0.82, 0.06, 0.6, 0.44],
        ['C', 0.38, 0.86, -0.38, 0.86, -0.6, 0.44],
        ['C', -0.82, 0.06, -0.5, -0.38, 0, -1],
        ['Z'],
      ],
    },
  ];
}

function coinShapes(): DecorPrimitive[] {
  return [
    { mode: 'fill', d: ellipse(0, 0, 0.94, 0.94) },
    { mode: 'stroke', width: 0.14, tone: 'light', d: ellipse(0, 0, 0.58, 0.58) },
  ];
}

function dotShapes(): DecorPrimitive[] {
  return [{ mode: 'fill', d: ellipse(0, 0, 0.9, 0.9) }];
}

interface ShapeSpec {
  shapes: DecorPrimitive[];
  gloss?: Cmd[];
}

const SHAPES: Record<DecorKind, () => ShapeSpec> = {
  star: () => ({ shapes: [{ mode: 'fill', d: starPath() }], gloss: ellipse(-0.26, -0.34, 0.2, 0.12) }),
  sparkle: () => ({ shapes: [{ mode: 'fill', d: sparklePath() }] }),
  heart: () => ({ shapes: [{ mode: 'fill', d: heartPath() }], gloss: ellipse(-0.36, -0.3, 0.22, 0.13) }),
  question: () => ({ shapes: questionShapes() }),
  exclaim: () => ({ shapes: exclaimShapes() }),
  laughEyes: () => ({ shapes: laughEyesShapes() }),
  note: () => ({ shapes: noteShapes() }),
  sweat: () => ({ shapes: dropShapes(), gloss: ellipse(-0.12, 0.02, 0.12, 0.2) }),
  tear: () => ({ shapes: dropShapes(), gloss: ellipse(-0.12, 0.02, 0.12, 0.2) }),
  swoosh: () => ({ shapes: swooshShapes() }),
  anger: () => ({ shapes: angerShapes() }),
  flame: () => ({ shapes: flameShapes(), gloss: ellipse(0, 0.34, 0.16, 0.22) }),
  coin: () => ({ shapes: coinShapes() }),
  dot: () => ({ shapes: dotShapes() }),
};

// ── 컬러 (카톡 스티커처럼 명도를 낮춘 딥톤 + 밝은 포인트) ──────────

const PALETTE: Record<DecorKind, { main: string; light: string }> = {
  star: { main: '#E9A013', light: '#FFD766' },
  sparkle: { main: '#E9A013', light: '#FFE08A' },
  heart: { main: '#E23A5F', light: '#FF91AA' },
  question: { main: '#4453B2', light: '#8E9BEC' },
  exclaim: { main: '#E04A2F', light: '#FF9273' },
  laughEyes: { main: '#8A4A2A', light: '#C98457' },
  note: { main: '#7B4BC9', light: '#B392F0' },
  sweat: { main: '#3F9BD6', light: '#A6DCF7' },
  tear: { main: '#3F9BD6', light: '#A6DCF7' },
  swoosh: { main: '#E0573A', light: '#FF9C7E' },
  anger: { main: '#C93A2B', light: '#F2796A' },
  flame: { main: '#EE7318', light: '#FFC24D' },
  coin: { main: '#D9A31B', light: '#FFDC6A' },
  dot: { main: '#E9A013', light: '#FFD766' },
};

// ── 어떤 데코를 고를지 — 문구 → 이펙트 → 감정 ─────────────────────

type Anchor = 'topRight' | 'rightUpper' | 'topLeft' | 'bottomLeft' | 'bottomRight' | 'rightMid';

interface MotifItem {
  kind: DecorKind;
  anchor: Anchor;
  /** 글자 크기 대비 반지름 */
  r: number;
  rotate: number;
}

const MOTIFS: Record<DecorMotif, MotifItem[]> = {
  love: [
    { kind: 'heart', anchor: 'topRight', r: 0.26, rotate: -12 },
    { kind: 'sparkle', anchor: 'rightUpper', r: 0.13, rotate: 8 },
    { kind: 'heart', anchor: 'bottomLeft', r: 0.14, rotate: 16 },
  ],
  question: [
    { kind: 'question', anchor: 'topRight', r: 0.26, rotate: 12 },
    { kind: 'sweat', anchor: 'bottomRight', r: 0.15, rotate: -10 },
    { kind: 'sparkle', anchor: 'topLeft', r: 0.1, rotate: 0 },
  ],
  laugh: [
    { kind: 'laughEyes', anchor: 'topRight', r: 0.3, rotate: -6 },
    { kind: 'star', anchor: 'bottomLeft', r: 0.16, rotate: -12 },
    { kind: 'note', anchor: 'topLeft', r: 0.14, rotate: 8 },
  ],
  cheer: [
    { kind: 'sparkle', anchor: 'topRight', r: 0.24, rotate: 0 },
    { kind: 'exclaim', anchor: 'bottomLeft', r: 0.17, rotate: -8 },
    { kind: 'star', anchor: 'topLeft', r: 0.11, rotate: 12 },
  ],
  tired: [
    { kind: 'sweat', anchor: 'topRight', r: 0.18, rotate: 12 },
    { kind: 'swoosh', anchor: 'bottomLeft', r: 0.2, rotate: -6 },
    { kind: 'dot', anchor: 'topLeft', r: 0.08, rotate: 0 },
  ],
  angry: [
    { kind: 'anger', anchor: 'topRight', r: 0.22, rotate: -8 },
    { kind: 'flame', anchor: 'bottomLeft', r: 0.16, rotate: -6 },
    { kind: 'dot', anchor: 'rightMid', r: 0.08, rotate: 0 },
  ],
  sad: [
    { kind: 'tear', anchor: 'bottomRight', r: 0.15, rotate: -4 },
    { kind: 'dot', anchor: 'topLeft', r: 0.08, rotate: 0 },
    { kind: 'star', anchor: 'topRight', r: 0.15, rotate: -10 },
  ],
  surprised: [
    { kind: 'exclaim', anchor: 'topRight', r: 0.24, rotate: -6 },
    { kind: 'sweat', anchor: 'bottomLeft', r: 0.14, rotate: -12 },
    { kind: 'sparkle', anchor: 'topLeft', r: 0.1, rotate: 0 },
  ],
  money: [
    { kind: 'coin', anchor: 'topRight', r: 0.2, rotate: -8 },
    { kind: 'star', anchor: 'bottomLeft', r: 0.16, rotate: -10 },
    { kind: 'sparkle', anchor: 'topLeft', r: 0.1, rotate: 0 },
  ],
  smug: [
    { kind: 'star', anchor: 'topRight', r: 0.22, rotate: -14 },
    { kind: 'sparkle', anchor: 'rightUpper', r: 0.12, rotate: 6 },
    { kind: 'dot', anchor: 'bottomLeft', r: 0.08, rotate: 0 },
  ],
  plain: [
    { kind: 'star', anchor: 'topRight', r: 0.18, rotate: -12 },
    { kind: 'note', anchor: 'bottomLeft', r: 0.12, rotate: 6 },
    { kind: 'sparkle', anchor: 'topLeft', r: 0.09, rotate: 0 },
  ],
};

const EFFECT_MOTIF: Record<EffectKind, DecorMotif | null> = {
  none: null,
  heart: 'love',
  sparkle: 'cheer',
  sweat: 'tired',
  anger: 'angry',
  money: 'money',
  flame: 'angry',
};

const TEXT_RULES: { motif: DecorMotif; pattern: RegExp }[] = [
  { motif: 'question', pattern: /[?？]|왜|뭐|어디|누구|언제|어떻게|진짜|설마|당황|황당|메모/ },
  { motif: 'love', pattern: /사랑|좋아|고마|반했|설렘|심쿵|하트|애정|그리|네가|너야|고백|마음/ },
  { motif: 'laugh', pattern: /ㅋㅋ|ㅎㅎ|\^\^|웃|빵터|폭소|재밌|신나|즐거|웃겨|낄낄/ },
  { motif: 'cheer', pattern: /[!！]|화이팅|파이팅|힘내|최고|짱|가자|응원|축하|당첨|성공|합시다|해보자|할\s?수|출발/ },
  { motif: 'surprised', pattern: /헉|깜짝|놀라|대박|헐|어머|당첨/ },
  { motif: 'tired', pattern: /피곤|졸려|퇴근|지쳐|힘들|야근|월요일|쉬고|잠와/ },
  { motif: 'angry', pattern: /화나|빡|짜증|열받|분노|손절|싫어|미워/ },
  { motif: 'sad', pattern: /슬퍼|울|속상|눈물|괜찮아|그리움|외로/ },
  { motif: 'money', pattern: /월급|돈|부자|결제|지갑|용돈|루팡|적립/ },
];

const EMOTION_MOTIF: Record<Emotion, DecorMotif> = {
  joy: 'cheer',
  laugh: 'laugh',
  love: 'love',
  sad: 'sad',
  cry: 'sad',
  angry: 'angry',
  king: 'angry',
  sulk: 'tired',
  tired: 'tired',
  surprised: 'surprised',
  smug: 'smug',
  blank: 'plain',
};

export function decorMotifFor(text: string, emotion?: Emotion, effect?: EffectKind): DecorMotif {
  if (effect && effect !== 'none' && EFFECT_MOTIF[effect]) return EFFECT_MOTIF[effect] as DecorMotif;
  const clean = text.trim();
  for (const rule of TEXT_RULES) {
    if (rule.pattern.test(clean)) return rule.motif;
  }
  return EMOTION_MOTIF[(emotion ?? 'blank') as Emotion] ?? 'plain';
}

/** 데코 모티프에 쓰이는 아이콘 종류(중복 제거) — 보고·테스트용 */
export function decorKindsOf(motif: DecorMotif): DecorKind[] {
  return [...new Set(MOTIFS[motif].map((item) => item.kind))];
}

// ── 배치 ──────────────────────────────────────────────────────

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function noise(seed: number, index: number): number {
  let x = (seed + Math.imul(index + 1, 2654435761)) >>> 0;
  x ^= x << 13;
  x >>>= 0;
  x ^= x >>> 17;
  x ^= x << 5;
  x >>>= 0;
  return x / 4294967296;
}

function anchorAt(anchor: Anchor, hw: number, hh: number, fs: number): [number, number] {
  switch (anchor) {
    case 'topRight':
      // 글자 끝(오른쪽 위 모서리)에 바짝 — 글자를 감싸는 첫 점
      return [hw + fs * 0.12, -hh - fs * 0.16];
    case 'rightUpper':
      // 오른쪽 위 모서리에서 살짝 오른쪽 아래(시선이 이어지는 자리)
      return [hw + fs * 0.34, -hh + fs * 0.22];
    case 'topLeft':
      return [-hw - fs * 0.06, -hh - fs * 0.06];
    case 'bottomLeft':
      return [-hw - fs * 0.12, hh - fs * 0.08];
    case 'bottomRight':
      return [hw + fs * 0.1, hh - fs * 0.06];
    case 'rightMid':
    default:
      return [hw + fs * 0.3, 0];
  }
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * 대사·감정·이펙트를 읽어 글자 블록에 붙는 복합 데코를 계획한다.
 *  · 반환 좌표는 블록 중심 기준(회전 전), 렌더러는 블록과 같은 회전으로 그린다.
 */
export function planDecor(input: DecorPlanInput): DecorItem[] {
  if (input.enabled === false) return [];
  const text = input.text.trim();
  if (!text) return [];
  const fs = Math.max(6, input.fontSize);
  const hw = input.width / 2;
  const hh = input.height / 2;
  const motif = decorMotifFor(text, input.emotion, input.effect);
  const seed = hash(`${text}|${input.emotion ?? ''}|${motif}`);
  const rad = (input.rotate * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return MOTIFS[motif].map((spec, index) => {
    const [baseX, baseY] = anchorAt(spec.anchor, hw, hh, fs);
    // 손글씨 리듬과 같은 결정적 흔들림 — 미리보기와 다운로드가 항상 같다.
    let dx = baseX + (noise(seed, index * 2) - 0.5) * fs * 0.1;
    let dy = baseY + (noise(seed, index * 2 + 1) - 0.5) * fs * 0.1;
    const r = fs * spec.r;

    // 블록 회전을 반영한 캔버스 좌표에서 클램프 → 데코가 캔버스 밖으로 잘리지 않는다.
    const absX = input.x + cos * dx - sin * dy;
    const absY = input.y + sin * dx + cos * dy;
    const margin = r * 1.5 + 4;
    const clampedX = clamp(absX, margin, input.canvas - margin);
    const clampedY = clamp(absY, margin, input.canvas - margin);
    if (clampedX !== absX || clampedY !== absY) {
      const lx = clampedX - input.x;
      const ly = clampedY - input.y;
      dx = cos * lx + sin * ly;
      dy = -sin * lx + cos * ly;
    }

    const shape = SHAPES[spec.kind]();
    const palette = PALETTE[spec.kind];
    const tint = input.emotion ? mixHex(palette.main, EMOTION_TINT[input.emotion], 0.16) : palette.main;
    return {
      kind: spec.kind,
      motif,
      x: dx,
      y: dy,
      r,
      rotate: spec.rotate + (noise(seed, 90 + index) - 0.5) * 8,
      color: tint,
      light: mixHex(palette.light, tint, 0.2),
      shapes: shape.shapes,
      gloss: shape.gloss,
    };
  });
}

/** 데코를 감정 잉크 쪽으로 살짝 물들여 글자와 한 몸처럼 보이게 한다. */
const EMOTION_TINT: Record<Emotion, string> = {
  joy: '#D8443C',
  laugh: '#D2680F',
  love: '#D42F66',
  sad: '#2F63B4',
  cry: '#24509A',
  angry: '#BE2A1E',
  king: '#9E1418',
  sulk: '#5A4C7E',
  tired: '#3F4E6B',
  surprised: '#BC7A05',
  smug: '#166B4E',
  blank: '#232A36',
};

// ── 캔버스 렌더러 ──────────────────────────────────────────────

function tracePath(ctx: CanvasRenderingContext2D, d: Cmd[], scale: number) {
  ctx.beginPath();
  for (const cmd of d) {
    if (cmd[0] === 'M') ctx.moveTo(cmd[1] * scale, cmd[2] * scale);
    else if (cmd[0] === 'L') ctx.lineTo(cmd[1] * scale, cmd[2] * scale);
    else if (cmd[0] === 'Q') ctx.quadraticCurveTo(cmd[1] * scale, cmd[2] * scale, cmd[3] * scale, cmd[4] * scale);
    else if (cmd[0] === 'C')
      ctx.bezierCurveTo(
        cmd[1] * scale,
        cmd[2] * scale,
        cmd[3] * scale,
        cmd[4] * scale,
        cmd[5] * scale,
        cmd[6] * scale,
      );
    else ctx.closePath();
  }
}

/** 한 겹(그림자/흰 테두리/컬러)을 그린다 */
function paintItem(
  ctx: CanvasRenderingContext2D,
  item: DecorItem,
  color: string,
  alpha: number,
  inflate: number,
) {
  ctx.globalAlpha = alpha;
  for (const prim of item.shapes) {
    tracePath(ctx, prim.d, item.r);
    const paint = prim.mode === 'fill' && prim.tone === 'light' ? item.light : color;
    if (prim.mode === 'fill') {
      ctx.fillStyle = paint;
      ctx.fill();
      ctx.strokeStyle = paint;
      ctx.lineWidth = (0.08 + inflate) * item.r;
      ctx.stroke();
    } else {
      ctx.strokeStyle = paint;
      ctx.lineWidth = ((prim.width ?? 0.26) + inflate) * item.r;
      ctx.stroke();
    }
  }
}

/** 데코 묶음을 캔버스에 그린다 (글자 레이어와 같은 회전 안에서 호출) */
export function drawDecor(ctx: CanvasRenderingContext2D, items: DecorItem[]) {
  if (!items.length) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const item of items) {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate((item.rotate * Math.PI) / 180);
    // 1) 은은한 그림자 (살짝 아래로)
    ctx.save();
    ctx.translate(0, item.r * 0.1);
    paintItem(ctx, item, '#191512', 0.16, 0.2);
    ctx.restore();
    // 2) 두툼한 흰 스티커 외곽선
    paintItem(ctx, item, '#FFFDFA', 1, 0.24);
    // 3) 딥톤 컬러
    paintItem(ctx, item, item.color, 1, 0);
    // 4) 하이라이트
    if (item.gloss) {
      tracePath(ctx, item.gloss, item.r);
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

// ── SVG 렌더러 ────────────────────────────────────────────────

export function pathData(d: Cmd[]): string {
  return d
    .map((cmd) => {
      const n = cmd as unknown as number[];
      const op = cmd[0];
      if (op === 'Z') return 'Z';
      if (op === 'M' || op === 'L') return `${op} ${n[1].toFixed(3)} ${n[2].toFixed(3)}`;
      if (op === 'Q')
        return `Q ${n[1].toFixed(3)} ${n[2].toFixed(3)} ${n[3].toFixed(3)} ${n[4].toFixed(3)}`;
      return `C ${n[1].toFixed(3)} ${n[2].toFixed(3)} ${n[3].toFixed(3)} ${n[4].toFixed(3)} ${n[5].toFixed(3)} ${n[6].toFixed(3)}`;
    })
    .join(' ');
}

function svgPass(item: DecorItem, color: string, inflate: number, fillAlpha = 1) {
  return item.shapes
    .map((prim) => {
      const paint = prim.mode === 'fill' && prim.tone === 'light' ? item.light : color;
      const strokeWidth = ((prim.mode === 'fill' ? 0.08 : prim.width ?? 0.26) + inflate).toFixed(3);
      if (prim.mode === 'fill') {
        return `<path d="${pathData(prim.d)}" fill="${paint}" fill-opacity="${fillAlpha}" stroke="${paint}" stroke-width="${strokeWidth}"/>`;
      }
      return `<path d="${pathData(prim.d)}" fill="none" stroke="${paint}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join('');
}

/** 데코 묶음을 SVG 로 (글자 그룹과 같은 transform 을 caller 가 준다) */
export function renderDecorSvg(items: DecorItem[]): string {
  if (!items.length) return '';
  return items
    .map((item) => {
      const transform =
        `translate(${item.x.toFixed(1)} ${item.y.toFixed(1)}) ` +
        `rotate(${item.rotate.toFixed(2)}) scale(${item.r.toFixed(2)})`;
      const gloss = item.gloss
        ? `<path d="${pathData(item.gloss)}" fill="#FFFFFF" fill-opacity="0.34"/>`
        : '';
      return (
        `<g data-decor="${item.kind}" transform="${transform}">` +
        `<g transform="translate(0 0.1)" opacity="0.16">${svgPass(item, '#191512', 0.2)}</g>` +
        `<g>${svgPass(item, '#FFFDFA', 0.24)}</g>` +
        `<g>${svgPass(item, item.color, 0)}</g>` +
        gloss +
        `</g>`
      );
    })
    .join('');
}
