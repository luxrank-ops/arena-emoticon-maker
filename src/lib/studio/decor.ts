// ─────────────────────────────────────────────────────────────
// 상황별 복합 데코 (별·반짝이·하트·물음표·느낌표·^^·음표·땀방울·구름·스팀 …)
//  · 데코는 '글자 옆 작은 포인트'가 아니라 **캔버스 위의 장면 연출**이다.
//    문구 + 감정(emotion) + 이펙트(effect)를 읽어 4~5종을 고르고,
//    - 머리 위(왕관 자리)에 글자 높이에 버금가는 **큼직한 주 데코 1~2개**
//    - 볼·어깨 옆(좌우 여백)에 중간 크기
//    - 글자 모서리에 작은 반짝이
//    로 흩어 놓아 데코가 문장의 30~40% 분량을 차지하게 만든다.
//  · 좌표는 모두 **캔버스 절대 px**(회전 전 기준 아님) — 글자를 옮겨도 머리 위
//    데코는 머리 위에 남는다. 캔버스(drawLayer)와 SVG(renderTextLayersWithDefs)가
//    같은 planDecor 결과를 그대로 그려 100% 같은 그림이 된다.
//  · 얼굴(눈·코·입) 한가운데는 비우고, 캔버스 밖으로는 잘리지 않게 클램프한다.
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
  | 'steam'
  | 'flame'
  | 'cloud'
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

/** 데코가 놓이는 자리 — 머리 위(왕관)·볼·어깨·글자 모서리 */
export type DecorSlot =
  | 'crown'
  | 'crownLeft'
  | 'crownRight'
  | 'templeLeft'
  | 'templeRight'
  | 'cheekLeft'
  | 'cheekRight'
  | 'shoulderLeft'
  | 'shoulderRight'
  | 'textTopRight'
  | 'textTopLeft'
  | 'textBottomLeft'
  | 'textBottomRight'
  | 'textRight'
  | 'textLeft';

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
  /** 놓인 자리(디버그·테스트용) */
  slot: DecorSlot;
  /** 캔버스 절대 좌표 (px) — 블록 회전과 무관 */
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
  /**
   * false 면 머리 위·볼·어깨(장면) 데코를 건너뛰고 글자 모서리 데코만 붙인다.
   *  · 레이어가 여러 장이면 첫 레이어만 장면 데코를 맡는다(머리 위에 4개가 겹치지 않게).
   */
  stage?: boolean;
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

/** 분노 스팀 — 머리 옆에서 피어오르는 세 줄기 김 */
function steamShapes(): DecorPrimitive[] {
  return [
    {
      mode: 'stroke',
      width: 0.24,
      d: [
        ['M', -0.56, 0.72],
        ['C', -0.9, 0.2, -0.26, 0.02, -0.58, -0.6],
        ['M', 0.06, 0.82],
        ['C', -0.24, 0.3, 0.4, 0.1, 0.08, -0.5],
        ['M', 0.62, 0.6],
        ['C', 0.36, 0.16, 0.94, -0.04, 0.66, -0.72],
      ],
    },
  ];
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

/** 피곤·슬픔 구름 — 세 덩이 뭉게구름을 한 덩어리 실루엣으로 */
function cloudShapes(): DecorPrimitive[] {
  return [
    {
      mode: 'fill',
      d: [
        ['M', -0.86, 0.32],
        ['C', -1.2, 0.32, -1.22, -0.14, -0.76, -0.2],
        ['C', -0.88, -0.78, -0.14, -0.98, 0.12, -0.5],
        ['C', 0.42, -0.98, 1.06, -0.72, 0.9, -0.16],
        ['C', 1.26, -0.06, 1.22, 0.34, 0.84, 0.34],
        ['C', 0.5, 0.44, -0.5, 0.44, -0.86, 0.32],
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
  steam: () => ({ shapes: steamShapes() }),
  flame: () => ({ shapes: flameShapes(), gloss: ellipse(0, 0.34, 0.16, 0.22) }),
  cloud: () => ({ shapes: cloudShapes() }),
  coin: () => ({ shapes: coinShapes() }),
  dot: () => ({ shapes: dotShapes() }),
};

/** 도형이 반지름 r 인 원 안에서 실제로 칠하는 면적 비율(πr² 대비) — 데코 분량 계산용 */
const INK_RATIO: Record<DecorKind, number> = {
  star: 0.36,
  sparkle: 0.38,
  heart: 0.72,
  question: 0.44,
  exclaim: 0.5,
  laughEyes: 0.2,
  note: 0.34,
  sweat: 0.42,
  tear: 0.42,
  swoosh: 0.22,
  anger: 0.19,
  steam: 0.17,
  flame: 0.42,
  cloud: 0.7,
  coin: 0.86,
  dot: 0.72,
};

/** 글자 크기 대비 반지름 상한 — 주 데코가 캔버스를 집어삼키지 않게 */
const MAX_R: Record<DecorKind, number> = {
  star: 0.78,
  sparkle: 0.72,
  heart: 0.75,
  question: 0.75,
  exclaim: 0.72,
  laughEyes: 0.8,
  note: 0.62,
  sweat: 0.55,
  tear: 0.55,
  swoosh: 0.5,
  anger: 0.75,
  steam: 0.6,
  flame: 0.62,
  cloud: 0.68,
  coin: 0.6,
  dot: 0.3,
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
  steam: { main: '#8B7A6B', light: '#CFC0B2' },
  flame: { main: '#EE7318', light: '#FFC24D' },
  cloud: { main: '#8E9BB0', light: '#E1E7F1' },
  coin: { main: '#D9A31B', light: '#FFDC6A' },
  dot: { main: '#E9A013', light: '#FFD766' },
};

// ── 어떤 데코를 고를지 — 문구 → 이펙트 → 감정 ─────────────────────

interface MotifItem {
  kind: DecorKind;
  slot: DecorSlot;
  /** 주 데코(머리 위 큰 것) · 곁 데코 · 옆 데코 · 모서리 점 */
  role: 'hero' | 'sub' | 'side' | 'accent';
  /** 글자 크기 대비 반지름 */
  scale: number;
  rotate: number;
}

/** 역할별 상한 — [MAX_R 배수, 캔버스 대비] */
const ROLE_CAP: Record<MotifItem['role'], [number, number]> = {
  hero: [1, 0.115],
  sub: [0.64, 0.072],
  side: [0.6, 0.07],
  accent: [0.42, 0.046],
};

const MOTIFS: Record<DecorMotif, MotifItem[]> = {
  // 사랑 — 머리 위 큰 하트 + 왕관 옆 반짝이 + 볼 옆 하트 둘 + 글자 모서리 반짝이
  love: [
    { kind: 'heart', slot: 'crown', role: 'hero', scale: 0.66, rotate: -10 },
    { kind: 'sparkle', slot: 'crownRight', role: 'sub', scale: 0.36, rotate: 0 },
    { kind: 'heart', slot: 'cheekRight', role: 'side', scale: 0.36, rotate: 14 },
    { kind: 'heart', slot: 'cheekLeft', role: 'accent', scale: 0.3, rotate: -12 },
    { kind: 'sparkle', slot: 'textTopRight', role: 'accent', scale: 0.2, rotate: 8 },
  ],
  // 궁금·당황 — 머리 위 물음표 + 옆 느낌표 + 볼 옆 땀방울 + 반짝이 둘
  question: [
    { kind: 'question', slot: 'crown', role: 'hero', scale: 0.68, rotate: 10 },
    { kind: 'exclaim', slot: 'crownRight', role: 'sub', scale: 0.38, rotate: 8 },
    { kind: 'sweat', slot: 'templeLeft', role: 'side', scale: 0.4, rotate: -8 },
    { kind: 'sparkle', slot: 'crownLeft', role: 'accent', scale: 0.22, rotate: 0 },
    { kind: 'sparkle', slot: 'textTopRight', role: 'accent', scale: 0.18, rotate: 0 },
  ],
  // 웃음 — 머리 위 ^^ + 왕관 옆 별 + 볼 옆 음표 + 별·반짝이
  laugh: [
    { kind: 'laughEyes', slot: 'crown', role: 'hero', scale: 0.74, rotate: -4 },
    { kind: 'star', slot: 'crownLeft', role: 'sub', scale: 0.4, rotate: -10 },
    { kind: 'note', slot: 'cheekRight', role: 'side', scale: 0.34, rotate: 8 },
    { kind: 'star', slot: 'cheekLeft', role: 'accent', scale: 0.22, rotate: 8 },
    { kind: 'sparkle', slot: 'textTopRight', role: 'accent', scale: 0.18, rotate: 0 },
  ],
  // 응원·기쁨 — 머리 위 큰 별 + 반짝이 + 볼 옆 느낌표 + 반짝이 둘
  cheer: [
    { kind: 'star', slot: 'crown', role: 'hero', scale: 0.74, rotate: -8 },
    { kind: 'sparkle', slot: 'crownRight', role: 'sub', scale: 0.42, rotate: 0 },
    { kind: 'exclaim', slot: 'templeLeft', role: 'side', scale: 0.36, rotate: -6 },
    { kind: 'sparkle', slot: 'cheekRight', role: 'accent', scale: 0.26, rotate: 0 },
    { kind: 'sparkle', slot: 'textTopLeft', role: 'accent', scale: 0.18, rotate: 0 },
  ],
  // 피곤 — 머리 위 구름 + 볼 옆 땀방울 둘 + 왕관 옆 별 + 모서리 별
  tired: [
    { kind: 'cloud', slot: 'crown', role: 'hero', scale: 0.66, rotate: 0 },
    { kind: 'sweat', slot: 'templeRight', role: 'side', scale: 0.42, rotate: 8 },
    { kind: 'sweat', slot: 'templeLeft', role: 'accent', scale: 0.28, rotate: -10 },
    { kind: 'star', slot: 'crownLeft', role: 'sub', scale: 0.3, rotate: -12 },
    { kind: 'star', slot: 'textTopRight', role: 'accent', scale: 0.18, rotate: -8 },
  ],
  // 분노 — 머리 위 분노 마크 + 양쪽 관자놀이 스팀 + 반짝이 + 모서리 느낌표
  angry: [
    { kind: 'anger', slot: 'crown', role: 'hero', scale: 0.72, rotate: -6 },
    { kind: 'steam', slot: 'templeRight', role: 'side', scale: 0.46, rotate: 8 },
    { kind: 'steam', slot: 'templeLeft', role: 'side', scale: 0.4, rotate: -8 },
    { kind: 'sparkle', slot: 'crownLeft', role: 'accent', scale: 0.26, rotate: 0 },
    { kind: 'exclaim', slot: 'textTopRight', role: 'accent', scale: 0.3, rotate: 8 },
  ],
  // 슬픔 — 머리 위 구름 + 볼 옆 눈물 둘 + 반짝이 + 모서리 별
  sad: [
    { kind: 'cloud', slot: 'crown', role: 'hero', scale: 0.66, rotate: 0 },
    { kind: 'tear', slot: 'cheekRight', role: 'side', scale: 0.38, rotate: 6 },
    { kind: 'tear', slot: 'cheekLeft', role: 'accent', scale: 0.28, rotate: -8 },
    { kind: 'sparkle', slot: 'crownRight', role: 'sub', scale: 0.3, rotate: 0 },
    { kind: 'star', slot: 'textTopRight', role: 'accent', scale: 0.18, rotate: -10 },
  ],
  // 놀람 — 머리 위 큰 느낌표 + 반짝이 + 볼 옆 땀 + 반짝이 + 모서리 반짝이
  surprised: [
    { kind: 'exclaim', slot: 'crown', role: 'hero', scale: 0.72, rotate: -4 },
    { kind: 'sparkle', slot: 'crownRight', role: 'sub', scale: 0.4, rotate: 0 },
    { kind: 'sweat', slot: 'templeLeft', role: 'side', scale: 0.4, rotate: -10 },
    { kind: 'sparkle', slot: 'crownLeft', role: 'accent', scale: 0.24, rotate: 0 },
    { kind: 'sparkle', slot: 'textTopLeft', role: 'accent', scale: 0.18, rotate: 0 },
  ],
  // 돈 — 머리 위 동전 + 왕관 옆 별 + 볼 옆 반짝이 + 볼 옆 동전 + 모서리 반짝이
  money: [
    { kind: 'coin', slot: 'crown', role: 'hero', scale: 0.58, rotate: -8 },
    { kind: 'star', slot: 'crownRight', role: 'sub', scale: 0.38, rotate: -10 },
    { kind: 'sparkle', slot: 'cheekLeft', role: 'side', scale: 0.38, rotate: 0 },
    { kind: 'coin', slot: 'cheekRight', role: 'accent', scale: 0.26, rotate: 10 },
    { kind: 'sparkle', slot: 'textTopRight', role: 'accent', scale: 0.18, rotate: 0 },
  ],
  // 잘난척 — 머리 위 별 + 볼 옆 반짝이 + 왕관 옆 음표 + 반짝이 둘
  smug: [
    { kind: 'star', slot: 'crown', role: 'hero', scale: 0.68, rotate: -12 },
    { kind: 'sparkle', slot: 'cheekRight', role: 'sub', scale: 0.36, rotate: 6 },
    { kind: 'note', slot: 'crownLeft', role: 'side', scale: 0.32, rotate: 10 },
    { kind: 'sparkle', slot: 'cheekLeft', role: 'accent', scale: 0.24, rotate: 0 },
    { kind: 'sparkle', slot: 'textTopLeft', role: 'accent', scale: 0.18, rotate: 0 },
  ],
  // 무표정 — 머리 위 별 + 반짝이 + 볼 옆 음표 + 반짝이 둘
  plain: [
    { kind: 'star', slot: 'crown', role: 'hero', scale: 0.62, rotate: -10 },
    { kind: 'sparkle', slot: 'crownRight', role: 'sub', scale: 0.36, rotate: 0 },
    { kind: 'note', slot: 'cheekLeft', role: 'side', scale: 0.3, rotate: 6 },
    { kind: 'sparkle', slot: 'cheekRight', role: 'accent', scale: 0.26, rotate: 0 },
    { kind: 'sparkle', slot: 'textTopRight', role: 'accent', scale: 0.2, rotate: 0 },
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
  // 감정을 직접 고른 경우엔 그 감정이 먼저다 — 화난 얼굴에 "또 야근이야?" 라고 썼는데
  // 물음표만 보고 물음표 데코가 붙으면 상황과 어긋난다.
  if (emotion && EMOTION_FIRST.includes(emotion)) return EMOTION_MOTIF[emotion];
  const clean = text.trim();
  for (const rule of TEXT_RULES) {
    if (rule.pattern.test(clean)) return rule.motif;
  }
  return EMOTION_MOTIF[(emotion ?? 'blank') as Emotion] ?? 'plain';
}

/** 문구보다 감정을 먼저 믿는 감정들 (웃음·화남·슬픔·피곤·사랑·놀람) */
const EMOTION_FIRST: Emotion[] = ['love', 'laugh', 'angry', 'king', 'sad', 'cry', 'tired', 'sulk', 'surprised'];

/** 데코 모티프에 쓰이는 아이콘 종류(중복 제거) — 보고·테스트용 */
export function decorKindsOf(motif: DecorMotif): DecorKind[] {
  return [...new Set(MOTIFS[motif].map((item) => item.kind))];
}

/** 모티프가 놓는 자리들 — 보고·테스트용 */
export function decorSlotsOf(motif: DecorMotif): DecorSlot[] {
  return MOTIFS[motif].map((item) => item.slot);
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

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** 캔버스 비율 좌표 — 머리 위(왕관)·볼·어깨는 캐릭터 기준 고정 자리 */
const STAGE: Record<
  'crown' | 'crownLeft' | 'crownRight' | 'templeLeft' | 'templeRight' | 'cheekLeft' | 'cheekRight' | 'shoulderLeft' | 'shoulderRight',
  [number, number]
> = {
  crown: [0.5, 0.108],
  crownLeft: [0.28, 0.08],
  crownRight: [0.72, 0.08],
  templeLeft: [0.242, 0.315],
  templeRight: [0.758, 0.315],
  cheekLeft: [0.215, 0.525],
  cheekRight: [0.785, 0.525],
  shoulderLeft: [0.175, 0.665],
  shoulderRight: [0.825, 0.665],
};

function isStageSlot(slot: DecorSlot): slot is keyof typeof STAGE {
  return slot in STAGE;
}

/** 얼굴 한가운데(눈·코·입)는 비운다 — 캔버스 비율 박스 */
const FACE = { x0: 0.33, x1: 0.67, y0: 0.275, y1: 0.63 };

/** 자리가 막히면 옮겨 갈 다음 자리들 */
const ALTERNATES: Record<DecorSlot, DecorSlot[]> = {
  crown: ['crownRight', 'crownLeft', 'templeRight', 'shoulderRight', 'cheekRight', 'textBottomRight'],
  crownLeft: ['crownRight', 'shoulderLeft', 'templeLeft', 'cheekLeft', 'textBottomLeft'],
  crownRight: ['crownLeft', 'shoulderRight', 'templeRight', 'cheekRight', 'textBottomRight'],
  templeLeft: ['cheekLeft', 'crownLeft', 'shoulderLeft', 'textTopLeft'],
  templeRight: ['cheekRight', 'crownRight', 'shoulderRight', 'textTopRight'],
  cheekLeft: ['templeLeft', 'shoulderLeft', 'crownLeft', 'textTopLeft'],
  cheekRight: ['templeRight', 'shoulderRight', 'crownRight', 'textTopRight'],
  shoulderLeft: ['cheekLeft', 'textBottomLeft', 'crownLeft'],
  shoulderRight: ['cheekRight', 'textBottomRight', 'crownRight'],
  textTopRight: ['textRight', 'textBottomRight', 'crownRight'],
  textTopLeft: ['textLeft', 'textBottomLeft', 'crownLeft'],
  textBottomLeft: ['textLeft', 'shoulderLeft', 'textBottomRight'],
  textBottomRight: ['textRight', 'shoulderRight', 'textBottomLeft'],
  textRight: ['textTopRight', 'textBottomRight', 'shoulderRight'],
  textLeft: ['textTopLeft', 'textBottomLeft', 'shoulderLeft'],
};

/** 장면 데코가 꺼진 레이어는 같은 아이콘을 글자 모서리로 옮겨 붙인다 */
const TEXT_ONLY_SLOT: Record<DecorSlot, DecorSlot> = {
  crown: 'textBottomRight',
  crownLeft: 'textBottomLeft',
  crownRight: 'textBottomRight',
  templeLeft: 'textBottomLeft',
  templeRight: 'textBottomRight',
  cheekLeft: 'textBottomLeft',
  cheekRight: 'textBottomRight',
  shoulderLeft: 'textBottomLeft',
  shoulderRight: 'textBottomRight',
  textTopRight: 'textTopRight',
  textTopLeft: 'textTopLeft',
  textBottomLeft: 'textBottomLeft',
  textBottomRight: 'textBottomRight',
  textRight: 'textRight',
  textLeft: 'textLeft',
};

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function hitsRect(rect: Rect, cx: number, cy: number, r: number) {
  const reach = r * 1.12;
  return cx + reach > rect.x0 && cx - reach < rect.x1 && cy + reach > rect.y0 && cy - reach < rect.y1;
}

/** 글자 블록 모서리 자리 — 블록 회전을 반영해 절대 좌표로 */
function textAnchor(slot: DecorSlot, r: number, block: { x: number; y: number; hw: number; hh: number; rotate: number }): [number, number] {
  let dx = 0;
  let dy = 0;
  switch (slot) {
    case 'textTopRight':
      dx = block.hw + r * 0.8;
      dy = -block.hh - r * 0.62;
      break;
    case 'textTopLeft':
      dx = -block.hw - r * 0.78;
      dy = -block.hh - r * 0.66;
      break;
    case 'textBottomLeft':
      dx = -block.hw - r * 0.7;
      dy = block.hh + r * 0.58;
      break;
    case 'textBottomRight':
      dx = block.hw + r * 0.74;
      dy = block.hh + r * 0.6;
      break;
    case 'textRight':
      dx = block.hw + r * 0.92;
      dy = -block.hh * 0.2;
      break;
    default:
      dx = -block.hw - r * 0.92;
      dy = -block.hh * 0.2;
      break;
  }
  const rad = (block.rotate * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [block.x + cos * dx - sin * dy, block.y + sin * dx + cos * dy];
}

/** 데코가 실제로 칠하는 면적(px²) */
export function decorInkArea(items: DecorItem[]): number {
  return items.reduce((sum, item) => sum + INK_RATIO[item.kind] * Math.PI * item.r * item.r, 0);
}

/** 글자 잉크 면적 추정(px²) — 글자 폭 × 글자 크기 × 한글 채움률 */
export function captionInkArea(width: number, fontSize: number): number {
  return Math.max(1, width * fontSize * 0.56);
}

/** 데코가 글자 잉크의 몇 배인지 — 1 근처면 데코가 글자만큼 존재감을 갖는다 */
export function decorCoverage(items: DecorItem[], width: number, fontSize: number): number {
  return decorInkArea(items) / captionInkArea(width, fontSize);
}

/**
 * 대사·감정·이펙트를 읽어 캔버스 위 복합 데코를 계획한다.
 *  · 반환 좌표는 캔버스 절대 px — 두 렌더러가 변환 없이 그대로 그린다.
 *  · 주 데코(머리 위)는 글자 높이에 버금가는 크기, 보조 데코가 곁을 채운다.
 */
export function planDecor(input: DecorPlanInput): DecorItem[] {
  if (input.enabled === false) return [];
  const text = input.text.trim();
  if (!text) return [];
  const canvas = Math.max(64, input.canvas);
  const fs = Math.max(6, input.fontSize);
  const hw = Math.max(fs * 0.5, input.width / 2);
  const hh = Math.max(fs * 0.62, input.height / 2);
  const block = { x: input.x, y: input.y, hw, hh, rotate: Number.isFinite(input.rotate) ? input.rotate : 0 };
  const motif = decorMotifFor(text, input.emotion, input.effect);
  const seed = hash(`${text}|${input.emotion ?? ''}|${motif}`);
  const stage = input.stage !== false;

  // 장면 데코를 맡지 않은 레이어는 큰 장식 없이 글자 아래 두 점만 (위 레이어 글자를 가리지 않게).
  const specs = (stage ? MOTIFS[motif] : MOTIFS[motif].slice(0, 2)).map((spec) => ({
    ...spec,
    slot: stage ? spec.slot : TEXT_ONLY_SLOT[spec.slot],
    scale: stage ? spec.scale : spec.scale * 0.72,
  }));

  // 데코 분량 — 글자 블록 넓이의 30~40%를 목표로 전체 반지름을 한 번에 키운다.
  const blockArea = Math.max(1, input.width * input.height);
  const baseArea = specs.reduce((sum, spec) => sum + INK_RATIO[spec.kind] * Math.PI * (fs * spec.scale) ** 2, 0);
  const scale = clamp(Math.sqrt((blockArea * 0.3) / baseArea), 1, 1.35);

  const textRect: Rect = {
    x0: block.x - hw - canvas * 0.012,
    y0: block.y - hh - canvas * 0.012,
    x1: block.x + hw + canvas * 0.012,
    y1: block.y + hh + canvas * 0.012,
  };
  const faceRect: Rect = {
    x0: FACE.x0 * canvas,
    y0: FACE.y0 * canvas,
    x1: FACE.x1 * canvas,
    y1: FACE.y1 * canvas,
  };

  const placed: { x: number; y: number; r: number }[] = [];
  const items: DecorItem[] = [];

  specs.forEach((spec, index) => {
    const cap = ROLE_CAP[spec.role];
    const r = clamp(
      Math.min(fs * spec.scale * scale, fs * MAX_R[spec.kind] * cap[0], canvas * cap[1]),
      Math.max(7, canvas * 0.012),
      canvas * 0.2,
    );
    // 가로는 하트(±1.22r)·별(±1r)가 모두 들어가게, 세로는 캔버스 위 여백을 살려 조금 좁게.
    const marginX = r * 1.5 + 4;
    const marginY = r * 1.28 + 4;
    const restX = (value: number) => Math.max(marginX, Math.min(canvas - marginX, value));
    const restY = (value: number) => Math.max(marginY, Math.min(canvas - marginY, value));

    let chosen: [number, number] | null = null;
    const candidates = [spec.slot, ...ALTERNATES[spec.slot]];
    for (const slot of candidates) {
      // 장면 데코를 맡지 않은 레이어는 머리 위·볼 자리로 옮겨가지 않는다.
      if (!stage && isStageSlot(slot)) continue;
      const jitterX = (noise(seed, index * 2) - 0.5) * fs * 0.08;
      const jitterY = (noise(seed, index * 2 + 1) - 0.5) * fs * 0.08;
      let px: number;
      let py: number;
      if (isStageSlot(slot)) {
        px = STAGE[slot][0] * canvas + jitterX;
        py = STAGE[slot][1] * canvas + jitterY;
      } else {
        const [ax, ay] = textAnchor(slot, r, block);
        px = ax + jitterX * 0.6;
        py = ay + jitterY * 0.6;
      }
      px = restX(px);
      py = restY(py);
      // 얼굴은 절대 비운다. 글자와 겹치는 장면 데코도 피한다(글자는 읽혀야 한다).
      if (hitsRect(faceRect, px, py, r)) continue;
      if (isStageSlot(slot) && hitsRect(textRect, px, py, r)) continue;
      if (placed.some((p) => Math.hypot(p.x - px, p.y - py) < (p.r + r) * 0.92)) continue;
      chosen = [px, py];
      break;
    }
    if (!chosen) {
      // 모든 자리가 막히면 원래 자리에서 캔버스 안으로만 밀어 넣는다.
      const slot = candidates[0];
      const px = isStageSlot(slot) ? STAGE[slot][0] * canvas : textAnchor(slot, r, block)[0];
      const py = isStageSlot(slot) ? STAGE[slot][1] * canvas : textAnchor(slot, r, block)[1];
      chosen = [clamp(px, marginX, canvas - marginX), clamp(py, marginY, canvas - marginY)];
    }

    const [x, y] = chosen;
    placed.push({ x, y, r });
    const shape = SHAPES[spec.kind]();
    const palette = PALETTE[spec.kind];
    const tint = input.emotion ? mixHex(palette.main, EMOTION_TINT[input.emotion], 0.16) : palette.main;
    items.push({
      kind: spec.kind,
      motif,
      slot: candidates[0],
      x,
      y,
      r,
      rotate: spec.rotate + (noise(seed, 90 + index) - 0.5) * 10,
      color: tint,
      light: mixHex(palette.light, tint, 0.2),
      shapes: shape.shapes,
      gloss: shape.gloss,
    });
  });

  return items;
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
    const paint = prim.tone === 'light' ? item.light : color;
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

/** 데코 묶음을 캔버스 절대 좌표에 그린다 (글자 레이어와 같은 캔버스 위) */
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
      const paint = prim.tone === 'light' ? item.light : color;
      const strokeWidth = ((prim.mode === 'fill' ? 0.08 : prim.width ?? 0.26) + inflate).toFixed(3);
      if (prim.mode === 'fill') {
        return `<path d="${pathData(prim.d)}" fill="${paint}" fill-opacity="${fillAlpha}" stroke="${paint}" stroke-width="${strokeWidth}"/>`;
      }
      return `<path d="${pathData(prim.d)}" fill="none" stroke="${paint}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join('');
}

/** 데코 묶음을 SVG 로 — 캔버스와 같은 절대 좌표·회전·반지름 */
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
        `<g data-decor="${item.kind}" data-slot="${item.slot}" transform="${transform}">` +
        `<g transform="translate(0 0.1)" opacity="0.16">${svgPass(item, '#191512', 0.2)}</g>` +
        `<g>${svgPass(item, '#FFFDFA', 0.24)}</g>` +
        `<g>${svgPass(item, item.color, 0)}</g>` +
        gloss +
        `</g>`
      );
    })
    .join('');
}
