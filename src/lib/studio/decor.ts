// ─────────────────────────────────────────────────────────────
// 상황별 데코 (별·하트·물음표·^^·음표·Zzz·왕관·꽃·번개 … 34종)
//  · 데코는 '글자 옆을 채우는 장식'이 아니라 **한 컷에 2~3점만 남기는 절제된 포인트**다.
//    - 주 데코 1점을 머리 위/옆 한쪽에,
//    - 작은 악센트 1~2점을 머리 곁과 글자 반대편 모서리에 두어 **대각선 균형**을 만든다.
//    - 사방에 흩뿌리지 않는다. 시선은 인물 표정과 글자에 먼저 닿아야 한다.
//  · 컬러는 모티프마다 **한 계열의 톤온톤**(샴페인 골드·로즈 코랄·슬레이트 블루·
//    라벤더·차콜)만 쓴다. 노랑·보라·빨강이 한 컷에 섞이던 원색 조합은 없앴다.
//  · 도형은 부드러운 베지어 곡선의 미니멀 벡터로 다듬었다 — 날렵한 4각 스파클 ✦,
//    깔끔한 하트, 얇고 정교한 라인 아이콘. 흰 스티커 외곽선도 크기에 맞춰 얇게.
//  · 18가지 모티프(사랑·고마움·인사·궁금·웃음·응원·축하·칭찬·피곤·졸림·분노·불만·슬픔·
//    오열·놀람·돈·잘난척·무표정)마다 문구에 따라 갈리는 2~3가지 변주가 있다.
//  · 좌표는 모두 **캔버스 절대 px**. 캔버스(drawLayer)와 SVG(renderTextLayersWithDefs)가
//    같은 planDecor 결과를 그대로 그려 100% 같은 그림이 된다.
//  · 얼굴(눈·코·입) 한가운데는 비우고, 캔버스 밖으로는 잘리지 않게 클램프한다.
// ─────────────────────────────────────────────────────────────

import type { Emotion } from '@/lib/types';
import type { EffectKind } from '@/lib/studio/layers';

export type DecorKind =
  // 별·반짝이
  | 'star'
  | 'star4'
  | 'shootingStar'
  | 'sparkle'
  | 'confetti'
  // 하트
  | 'heart'
  | 'heartDouble'
  | 'heartSparkle'
  | 'heartBroken'
  // 말·글자 모양
  | 'question'
  | 'exclaim'
  | 'questionExclaim'
  | 'laughEyes'
  | 'haha'
  | 'squint'
  | 'ellipsis'
  // 음악
  | 'note8'
  | 'note16'
  // 감정
  | 'sweat'
  | 'tear'
  | 'swoosh'
  | 'anger'
  | 'steam'
  | 'flame'
  | 'lightning'
  | 'swirl'
  | 'cloud'
  | 'zzz'
  // 사물
  | 'coin'
  | 'coinRain'
  | 'crown'
  | 'flower'
  | 'clover'
  | 'dot';

export type DecorMotif =
  | 'love'
  | 'thanks'
  | 'greet'
  | 'question'
  | 'laugh'
  | 'cheer'
  | 'congrats'
  | 'praise'
  | 'tired'
  | 'sleep'
  | 'angry'
  | 'complain'
  | 'sad'
  | 'cry'
  | 'surprised'
  | 'money'
  | 'smug'
  | 'plain';

/** 데코가 놓이는 자리 — 머리 위(정수리·관자)·머리 옆·글자 모서리 */
export type DecorSlot =
  | 'crown'
  | 'crownLeft'
  | 'crownRight'
  | 'headLeft'
  | 'headRight'
  | 'templeLeft'
  | 'templeRight'
  | 'earLeft'
  | 'earRight'
  | 'cheekLeft'
  | 'cheekRight'
  | 'shoulderLeft'
  | 'shoulderRight'
  | 'shoulderFarLeft'
  | 'shoulderFarRight'
  | 'textTopRight'
  | 'textTopLeft'
  | 'textBottomLeft'
  | 'textBottomRight'
  | 'textRight'
  | 'textLeft'
  | 'textAbove'
  | 'textBelow';

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
   * false 면 머리 위·옆(장면) 데코를 건너뛰고 글자 모서리에만 작게 붙인다.
   *  · 레이어가 여러 장이면 첫 레이어만 장면 데코를 맡는다(머리 위에 겹치지 않게).
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

/** 꼭짓점을 둥글게 깎은 다각형 — 뾰족함을 부드럽게 만든다. */
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

/** 5각 별 — 카탈로그용(모티프에서는 날렵한 스파클을 쓴다) */
function starPath(): Cmd[] {
  const points: [number, number][] = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? 1 : 0.46;
    points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  return roundedPolygon(points, 0.12);
}

/** ✦ 네 갈래 스파클 — 허리가 잘록하고 끝이 날렵한 베지어 곡선 */
function sparklePath(): Cmd[] {
  return [
    ['M', 0, -1],
    ['C', 0.09, -0.34, 0.34, -0.09, 1, 0],
    ['C', 0.34, 0.09, 0.09, 0.34, 0, 1],
    ['C', -0.09, 0.34, -0.34, 0.09, -1, 0],
    ['C', -0.34, -0.09, -0.09, -0.34, 0, -1],
    ['Z'],
  ];
}

/** 정갈한 하트 — 위 두 봉우리와 아래 꼭짓점의 비율을 다듬었다. */
function heartPath(): Cmd[] {
  return [
    ['M', 0, 0.74],
    ['C', -0.24, 0.46, -1.0, 0.08, -1.0, -0.36],
    ['C', -1.0, -0.8, -0.44, -0.96, 0, -0.46],
    ['C', 0.44, -0.96, 1.0, -0.8, 1.0, -0.36],
    ['C', 1.0, 0.08, 0.24, 0.46, 0, 0.74],
    ['Z'],
  ];
}

/** 물음표 — 가는 붓 획 + 점 */
function questionShapes(): DecorPrimitive[] {
  return [
    {
      mode: 'stroke',
      width: 0.22,
      d: [
        ['M', -0.42, -0.36],
        ['C', -0.44, -0.92, 0.44, -0.94, 0.44, -0.42],
        ['C', 0.44, -0.04, -0.02, 0.0, -0.02, 0.34],
      ],
    },
    { mode: 'fill', d: ellipse(0, 0.68, 0.15, 0.15) },
  ];
}

/** 느낌표 — 가는 세로획 + 점 */
function exclaimShapes(): DecorPrimitive[] {
  return [
    {
      mode: 'stroke',
      width: 0.24,
      d: [
        ['M', 0, -0.9],
        ['L', 0, -0.04],
      ],
    },
    { mode: 'fill', d: ellipse(0, 0.62, 0.16, 0.16) },
  ];
}

/** ^^ 눈웃음 마크 — 두 개의 둥근 산 */
function laughEyesShapes(): DecorPrimitive[] {
  return [
    {
      mode: 'stroke',
      width: 0.24,
      d: [
        ['M', -0.86, 0.18],
        ['Q', -0.5, -0.44, -0.14, 0.18],
        ['M', 0.14, 0.18],
        ['Q', 0.5, -0.44, 0.86, 0.18],
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
        ...ellipse(-0.32, 0.58, 0.32, 0.23),
        ['M', -0.02, 0.58],
        ['L', -0.02, -0.8],
        ['Q', 0.54, -0.72, 0.46, -0.16],
        ['Q', 0.24, -0.44, -0.02, -0.38],
        ['Z'],
      ],
    },
  ];
}

/** 물방울 — 위로 좁아지고 아래가 둥근, 땀·눈물 공용 실루엣 */
function dropShapes(): DecorPrimitive[] {
  return [
    {
      mode: 'fill',
      d: [
        ['M', 0, -1],
        ['C', 0.34, -0.46, 0.54, -0.04, 0.52, 0.3],
        ['C', 0.5, 0.72, -0.5, 0.72, -0.52, 0.3],
        ['C', -0.54, -0.04, -0.34, -0.46, 0, -1],
        ['Z'],
      ],
    },
  ];
}

/** 스우시 — 가볍게 지나가는 한 획(움직임 표시) */
function swooshShapes(): DecorPrimitive[] {
  return [
    {
      mode: 'stroke',
      width: 0.2,
      d: [
        ['M', -0.9, 0.3],
        ['C', -0.5, -0.36, 0.4, -0.52, 0.92, -0.18],
      ],
    },
  ];
}

function angerShapes(): DecorPrimitive[] {
  // 분노 마크 — 중심에서 뻗는 네 획. 가늘게 휘어 'X'가 아니라 핏대 모양으로 읽히게.
  const cmds: Cmd[] = [];
  for (let i = 0; i < 4; i += 1) {
    const angle = Math.PI / 4 + (Math.PI / 2) * i;
    const turn = angle + 0.5;
    const sx = Math.cos(angle) * 0.28;
    const sy = Math.sin(angle) * 0.28;
    const ex = Math.cos(angle) * 0.9;
    const ey = Math.sin(angle) * 0.9;
    cmds.push(['M', sx, sy]);
    cmds.push(['Q', Math.cos(turn) * 0.8, Math.sin(turn) * 0.8, ex, ey]);
  }
  return [{ mode: 'stroke', width: 0.26, d: cmds }];
}

/** 분노 스팀 — 머리 옆에서 피어오르는 세 줄기 김 */
function steamShapes(): DecorPrimitive[] {
  return [
    {
      mode: 'stroke',
      width: 0.18,
      d: [
        ['M', -0.52, 0.68],
        ['C', -0.84, 0.18, -0.24, 0.0, -0.54, -0.56],
        ['M', 0.04, 0.78],
        ['C', -0.22, 0.28, 0.36, 0.08, 0.06, -0.46],
        ['M', 0.58, 0.56],
        ['C', 0.34, 0.14, 0.86, -0.04, 0.6, -0.66],
      ],
    },
  ];
}

function flameShapes(): DecorPrimitive[] {
  // 끝이 뾰족하고 왼쪽에 한 번 물결치는 불꽃 실루엣 — 물방울과 구분되게.
  return [
    {
      mode: 'fill',
      d: [
        ['M', 0, -1],
        ['C', 0.3, -0.62, 0.58, -0.34, 0.58, 0.04],
        ['C', 0.58, 0.44, 0.32, 0.74, 0, 0.74],
        ['C', -0.32, 0.74, -0.58, 0.44, -0.58, 0.04],
        ['C', -0.58, -0.26, -0.36, -0.44, -0.24, -0.66],
        ['C', -0.08, -0.5, 0.06, -0.56, 0.06, -0.74],
        ['C', 0.06, -0.84, 0.02, -0.94, 0, -1],
        ['Z'],
      ],
    },
  ];
}

/** 피곤·슬픔 구름 — 채우지 않고 가는 선으로 그린 미니멀 구름 */
function cloudShapes(): DecorPrimitive[] {
  return [
    {
      mode: 'stroke',
      width: 0.18,
      d: [
        ['M', -0.82, 0.3],
        ['C', -1.14, 0.3, -1.16, -0.12, -0.76, -0.16],
        ['C', -0.84, -0.72, -0.18, -0.94, 0.1, -0.5],
        ['C', 0.36, -0.92, 0.98, -0.68, 0.86, -0.16],
        ['C', 1.18, -0.06, 1.14, 0.3, 0.82, 0.3],
        ['C', 0.46, 0.4, -0.46, 0.4, -0.82, 0.3],
      ],
    },
  ];
}

function coinShapes(): DecorPrimitive[] {
  return [
    { mode: 'fill', d: ellipse(0, 0, 0.9, 0.9) },
    { mode: 'stroke', width: 0.12, tone: 'light', d: ellipse(0, 0, 0.56, 0.56) },
  ];
}

function dotShapes(): DecorPrimitive[] {
  return [{ mode: 'fill', d: ellipse(0, 0, 0.85, 0.85) }];
}

// ── 모양 변형 도우미 (평행이동·회전·확대) ──────────────────────
//  모든 도형은 M/L/Q/C/Z 명령만 쓰므로 좌표를 직접 옮겨 변형한다 —
//  캔버스와 SVG 가 똑같은 path 문자열을 본다.

type Pt = [number, number];

function mapCmds(d: Cmd[], fn: (x: number, y: number) => Pt): Cmd[] {
  return d.map((cmd) => {
    if (cmd[0] === 'Z') return ['Z'] as Cmd;
    const out: number[] = [];
    const n = cmd as unknown as number[];
    for (let i = 1; i < n.length; i += 2) {
      const [x, y] = fn(n[i], n[i + 1]);
      out.push(x, y);
    }
    return [cmd[0], ...out] as unknown as Cmd;
  });
}

function moved(d: Cmd[], dx: number, dy: number, scale = 1): Cmd[] {
  return mapCmds(d, (x, y) => [x * scale + dx, y * scale + dy]);
}

function spin(d: Cmd[], deg: number, cx = 0, cy = 0): Cmd[] {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return mapCmds(d, (x, y) => [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos]);
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

function heartAt(cx: number, cy: number, s: number): Cmd[] {
  return moved(heartPath(), cx, cy, s);
}

function ellipseAt(cx: number, cy: number, rx: number, ry: number, deg = 0): Cmd[] {
  return spin(ellipse(cx, cy, rx, ry), deg, cx, cy);
}

/** 4각 반짝이 별 — 날렵한 각에 끝만 살짝 둥글게 */
function star4Path(): Cmd[] {
  const points: Pt[] = [
    [0, -1],
    [0.24, -0.24],
    [1, 0],
    [0.24, 0.24],
    [0, 1],
    [-0.24, 0.24],
    [-1, 0],
    [-0.24, -0.24],
  ];
  return roundedPolygon(points, 0.05);
}

/** 별 + 흘러내리는 꼬리 — 유성 */
function shootingStarShapes(): DecorPrimitive[] {
  return [
    { mode: 'fill', d: moved(starPath(), 0.34, -0.36, 0.54) },
    {
      mode: 'stroke',
      width: 0.12,
      d: [
        ['M', -0.9, 0.66],
        ['Q', -0.3, 0.3, 0.0, 0.08],
        ['M', -0.52, 0.84],
        ['Q', 0.02, 0.52, 0.28, 0.36],
      ],
    },
  ];
}

/** 두 알 하트 — 겹치지 않게 나란히 */
function heartDoubleShapes(): DecorPrimitive[] {
  return [
    { mode: 'fill', d: heartAt(-0.34, 0.14, 0.6) },
    { mode: 'fill', tone: 'light', d: heartAt(0.36, -0.08, 0.66) },
  ];
}

/** 반짝하트 — 하트 + 모서리 반짝이 */
function heartSparkleShapes(): DecorPrimitive[] {
  return [
    { mode: 'fill', d: heartAt(-0.08, 0.1, 0.78) },
    { mode: 'fill', tone: 'light', d: moved(sparklePath(), 0.74, -0.72, 0.3) },
  ];
}

/** 깨진 하트 — 하트 가운데에 밝은 금 */
function heartBrokenShapes(): DecorPrimitive[] {
  return [
    { mode: 'fill', d: heartPath() },
    {
      mode: 'stroke',
      width: 0.14,
      tone: 'light',
      d: [
        ['M', 0.1, -0.62],
        ['L', -0.1, -0.08],
        ['L', 0.12, 0.06],
        ['L', -0.06, 0.64],
      ],
    },
  ];
}

/** ?! — 물음표와 느낌표를 나란히 */
function questionExclaimShapes(): DecorPrimitive[] {
  return [
    ...questionShapes().map((prim) => ({ ...prim, d: moved(prim.d, -0.34, -0.02, 0.56) })),
    ...exclaimShapes().map((prim) => ({ ...prim, d: moved(prim.d, 0.5, 0.04, 0.58) })),
  ];
}

/** ㅎㅎ — 받침 없는 ㅎ 두 글자 */
function hahaShapes(): DecorPrimitive[] {
  const bars: Cmd[] = [];
  for (const cx of [-0.48, 0.48]) {
    bars.push(['M', cx - 0.2, -0.76], ['L', cx + 0.2, -0.76]);
    bars.push(['M', cx - 0.25, -0.54], ['L', cx + 0.25, -0.54]);
  }
  const rings: Cmd[] = [...ellipse(-0.48, 0.14, 0.3, 0.3), ...ellipse(0.48, 0.14, 0.3, 0.3)];
  return [
    { mode: 'stroke', width: 0.12, d: bars },
    { mode: 'stroke', width: 0.14, d: rings },
  ];
}

/** >< — 눈감고 웃는 부등호 눈 */
function squintShapes(): DecorPrimitive[] {
  return [
    {
      mode: 'stroke',
      width: 0.18,
      d: [
        ['M', -0.88, -0.38],
        ['L', -0.3, 0.02],
        ['L', -0.88, 0.42],
        ['M', 0.88, -0.38],
        ['L', 0.3, 0.02],
        ['L', 0.88, 0.42],
      ],
    },
  ];
}

/** … — 가운데 점 세 개 */
function ellipsisShapes(): DecorPrimitive[] {
  return [
    {
      mode: 'fill',
      d: [...ellipse(-0.5, 0.34, 0.15, 0.15), ...ellipse(0, 0.34, 0.15, 0.15), ...ellipse(0.5, 0.34, 0.15, 0.15)],
    },
  ];
}

/** 16분 음표 — 머리 둘 + 두 줄 기둥 */
function note16Shapes(): DecorPrimitive[] {
  return [
    { mode: 'fill', d: [...ellipse(-0.58, 0.56, 0.28, 0.21), ...ellipse(0.38, 0.38, 0.28, 0.21)] },
    {
      mode: 'stroke',
      width: 0.11,
      d: [
        ['M', -0.32, 0.54],
        ['L', -0.32, -0.7],
        ['M', 0.64, 0.36],
        ['L', 0.64, -0.86],
        ['M', -0.32, -0.7],
        ['L', 0.64, -0.86],
        ['M', -0.32, -0.48],
        ['L', 0.64, -0.64],
      ],
    },
  ];
}

/** 번개 — 지그재그 번개 */
function lightningShapes(): DecorPrimitive[] {
  const points: Pt[] = [
    [0.14, -1],
    [-0.46, 0.06],
    [-0.04, 0.06],
    [-0.28, 1],
    [0.52, -0.14],
    [0.06, -0.14],
  ];
  return [{ mode: 'fill', d: roundedPolygon(points, 0.03) }];
}

/** 소용돌이 — 바깥으로 감기는 가는 나선 */
function swirlShapes(): DecorPrimitive[] {
  const pts: Pt[] = [];
  const steps = 64;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const angle = t * Math.PI * 2 * 2.05;
    const radius = 0.1 + 0.82 * t;
    pts.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
  }
  const d: Cmd[] = [['M', pts[0][0], pts[0][1]]];
  for (let i = 1; i < pts.length; i += 1) d.push(['L', pts[i][0], pts[i][1]]);
  return [{ mode: 'stroke', width: 0.13, d }];
}

/** Zzz — 작은 Z 세 개가 위로 커지는 졸림 표시 */
function zzzShapes(): DecorPrimitive[] {
  const d: Cmd[] = [];
  const letters: [number, number, number][] = [
    [-0.5, 0.52, 0.28],
    [0.04, 0.0, 0.4],
    [0.56, -0.5, 0.52],
  ];
  for (const [cx, cy, size] of letters) {
    const a = size * 0.5;
    const b = size * 0.42;
    d.push(['M', cx - a, cy - b], ['L', cx + a, cy - b], ['L', cx - a, cy + b], ['L', cx + a, cy + b]);
  }
  return [{ mode: 'stroke', width: 0.12, d }];
}

/** 돈 — 동전 세 닢이 살짝 흩어진 모양 */
function coinRainShapes(): DecorPrimitive[] {
  return [
    {
      mode: 'fill',
      d: [...ellipse(0.24, -0.44, 0.44, 0.44), ...ellipse(-0.52, 0.3, 0.26, 0.26), ...ellipse(0.4, 0.58, 0.22, 0.22)],
    },
    {
      mode: 'stroke',
      width: 0.1,
      tone: 'light',
      d: [...ellipse(0.24, -0.44, 0.26, 0.26), ...ellipse(-0.52, 0.3, 0.14, 0.14)],
    },
  ];
}

/** 왕관 — 세 뿔, 낮고 넓게 */
function crownShapes(): DecorPrimitive[] {
  const points: Pt[] = [
    [-0.92, 0.46],
    [-0.96, -0.36],
    [-0.46, 0.0],
    [0, -0.78],
    [0.46, 0.0],
    [0.96, -0.36],
    [0.92, 0.46],
  ];
  return [{ mode: 'fill', d: roundedPolygon(points, 0.05) }];
}

/** 꽃 — 꽃잎 다섯 장 + 꽃술 */
function flowerShapes(): DecorPrimitive[] {
  const petals: Cmd[] = [];
  for (let i = 0; i < 5; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    petals.push(...ellipseAt(Math.cos(angle) * 0.44, Math.sin(angle) * 0.44, 0.3, 0.46, (angle * 180) / Math.PI + 90));
  }
  return [
    { mode: 'fill', d: petals },
    { mode: 'fill', tone: 'light', d: ellipse(0, 0, 0.2, 0.2) },
  ];
}

/** 네잎클로버 */
function cloverShapes(): DecorPrimitive[] {
  return [
    {
      mode: 'fill',
      d: [...ellipse(-0.36, -0.36, 0.36, 0.36), ...ellipse(0.36, -0.36, 0.36, 0.36), ...ellipse(-0.36, 0.36, 0.36, 0.36), ...ellipse(0.36, 0.36, 0.36, 0.36)],
    },
    { mode: 'fill', tone: 'light', d: ellipse(0, 0, 0.16, 0.16) },
  ];
}

/** 색종이 — 흩날리는 가는 사각 조각 다섯 */
function confettiShapes(): DecorPrimitive[] {
  const main: Cmd[] = [];
  const light: Cmd[] = [];
  const bits: [number, number, number, number][] = [
    [-0.52, -0.5, 26, 0.86],
    [0.2, -0.66, -22, 0.8],
    [0.6, -0.06, 62, 0.76],
    [-0.26, 0.4, -16, 0.7],
    [0.42, 0.56, 24, 0.78],
  ];
  bits.forEach(([cx, cy, deg, s], i) => {
    const piece = moved(spin(roundedRect(-0.08 * s, -0.38 * s, 0.08 * s, 0.38 * s, 0.05 * s), deg), cx, cy);
    (i % 2 === 0 ? main : light).push(...piece);
  });
  return [
    { mode: 'fill', d: main },
    { mode: 'fill', tone: 'light', d: light },
  ];
}

interface ShapeSpec {
  shapes: DecorPrimitive[];
  gloss?: Cmd[];
}

const SHAPES: Record<DecorKind, () => ShapeSpec> = {
  star: () => ({ shapes: [{ mode: 'fill', d: starPath() }], gloss: ellipse(-0.24, -0.3, 0.16, 0.1) }),
  star4: () => ({ shapes: [{ mode: 'fill', d: star4Path() }], gloss: ellipse(-0.14, -0.44, 0.08, 0.14) }),
  shootingStar: () => ({ shapes: shootingStarShapes() }),
  sparkle: () => ({ shapes: [{ mode: 'fill', d: sparklePath() }] }),
  confetti: () => ({ shapes: confettiShapes() }),
  heart: () => ({ shapes: [{ mode: 'fill', d: heartPath() }], gloss: ellipse(-0.34, -0.32, 0.2, 0.11) }),
  heartDouble: () => ({ shapes: heartDoubleShapes() }),
  heartSparkle: () => ({ shapes: heartSparkleShapes() }),
  heartBroken: () => ({ shapes: heartBrokenShapes() }),
  question: () => ({ shapes: questionShapes() }),
  exclaim: () => ({ shapes: exclaimShapes() }),
  questionExclaim: () => ({ shapes: questionExclaimShapes() }),
  laughEyes: () => ({ shapes: laughEyesShapes() }),
  haha: () => ({ shapes: hahaShapes() }),
  squint: () => ({ shapes: squintShapes() }),
  ellipsis: () => ({ shapes: ellipsisShapes() }),
  note8: () => ({ shapes: noteShapes() }),
  note16: () => ({ shapes: note16Shapes() }),
  sweat: () => ({ shapes: dropShapes(), gloss: ellipse(-0.12, 0.0, 0.1, 0.17) }),
  tear: () => ({ shapes: dropShapes(), gloss: ellipse(-0.12, 0.0, 0.1, 0.17) }),
  swoosh: () => ({ shapes: swooshShapes() }),
  anger: () => ({ shapes: angerShapes() }),
  steam: () => ({ shapes: steamShapes() }),
  flame: () => ({ shapes: flameShapes(), gloss: ellipse(0, 0.32, 0.13, 0.18) }),
  lightning: () => ({ shapes: lightningShapes() }),
  swirl: () => ({ shapes: swirlShapes() }),
  cloud: () => ({ shapes: cloudShapes() }),
  zzz: () => ({ shapes: zzzShapes() }),
  coin: () => ({ shapes: coinShapes() }),
  coinRain: () => ({ shapes: coinRainShapes() }),
  crown: () => ({ shapes: crownShapes() }),
  flower: () => ({ shapes: flowerShapes() }),
  clover: () => ({ shapes: cloverShapes() }),
  dot: () => ({ shapes: dotShapes() }),
};

/** 도형은 한 번만 만들어 재사용한다 (계획이 여러 번 돌아도 같은 그림) */
const SHAPE_CACHE = new Map<DecorKind, ShapeSpec>();

function shapeOf(kind: DecorKind): ShapeSpec {
  let shape = SHAPE_CACHE.get(kind);
  if (!shape) {
    shape = SHAPES[kind]();
    SHAPE_CACHE.set(kind, shape);
  }
  return shape;
}

interface Extent {
  x: number;
  y: number;
}

/** 흰 스티커 외곽선 여유 (단위 반지름) */
const OUTLINE_PAD = 0.16;

/**
 * 도형이 흰 스티커 외곽선까지 포함해 실제로 차지하는 반경(반지름 r 기준 배수).
 *  · 얼굴 회피·캔버스 클램프·자리 겹침 판정에 이 값을 쓴다 —
 *    하트(±1.0r)나 ?! 처럼 가로로 넓은 도형도 눈·볼을 미리 비켜 간다.
 */
const EXTENT: Record<DecorKind, Extent> = (() => {
  const out = {} as Record<DecorKind, Extent>;
  for (const kind of Object.keys(SHAPES) as DecorKind[]) {
    const { shapes } = shapeOf(kind);
    let mx = 0;
    let my = 0;
    for (const prim of shapes) {
      const pad = prim.mode === 'fill' ? OUTLINE_PAD + 0.04 : (prim.width ?? 0.24) / 2 + OUTLINE_PAD;
      for (const cmd of prim.d) {
        const n = cmd as unknown as number[];
        for (let i = 1; i < n.length; i += 2) {
          mx = Math.max(mx, Math.abs(n[i]) + pad);
          my = Math.max(my, Math.abs(n[i + 1]) + pad);
        }
      }
    }
    out[kind] = { x: Math.max(1, mx * 1.02), y: Math.max(1, my * 1.02) };
  }
  return out;
})();

/** 도형이 반지름 r 인 원 안에서 실제로 칠하는 면적 비율(πr² 대비) — 데코 분량 계산용 */
const INK_RATIO: Record<DecorKind, number> = {
  star: 0.34,
  star4: 0.26,
  shootingStar: 0.2,
  sparkle: 0.3,
  confetti: 0.16,
  heart: 0.68,
  heartDouble: 0.56,
  heartSparkle: 0.6,
  heartBroken: 0.62,
  question: 0.36,
  exclaim: 0.36,
  questionExclaim: 0.34,
  laughEyes: 0.14,
  haha: 0.18,
  squint: 0.14,
  ellipsis: 0.2,
  note8: 0.3,
  note16: 0.26,
  sweat: 0.36,
  tear: 0.36,
  swoosh: 0.18,
  anger: 0.15,
  steam: 0.12,
  flame: 0.38,
  lightning: 0.28,
  swirl: 0.11,
  cloud: 0.16,
  zzz: 0.12,
  coin: 0.8,
  coinRain: 0.46,
  crown: 0.44,
  flower: 0.5,
  clover: 0.56,
  dot: 0.66,
};

/** 글자 크기 대비 반지름 상한 — 주 데코가 캔버스를 집어삼키지 않게 */
const MAX_R: Record<DecorKind, number> = {
  star: 0.7,
  star4: 0.64,
  shootingStar: 0.72,
  sparkle: 0.66,
  confetti: 0.72,
  heart: 0.68,
  heartDouble: 0.74,
  heartSparkle: 0.72,
  heartBroken: 0.68,
  question: 0.68,
  exclaim: 0.66,
  questionExclaim: 0.72,
  laughEyes: 0.72,
  haha: 0.64,
  squint: 0.72,
  ellipsis: 0.6,
  note8: 0.56,
  note16: 0.6,
  sweat: 0.5,
  tear: 0.5,
  swoosh: 0.46,
  anger: 0.66,
  steam: 0.54,
  flame: 0.56,
  lightning: 0.62,
  swirl: 0.54,
  cloud: 0.6,
  zzz: 0.54,
  coin: 0.52,
  coinRain: 0.62,
  crown: 0.6,
  flower: 0.6,
  clover: 0.58,
  dot: 0.26,
};

// ── 컬러 — 한 계열의 톤온톤(모던 포인트 컬러) ──────────────────

type DecorTone = 'gold' | 'coral' | 'slate' | 'lavender' | 'charcoal';

/** 절제된 5가지 톤 — main(채움) + light(하이라이트). 한 컷에는 한 계열만 쓴다. */
export const DECOR_TONES: Record<DecorTone, { main: string; light: string }> = {
  gold: { main: '#E0B45C', light: '#F4DFAE' },
  coral: { main: '#E46B7A', light: '#F5B7BE' },
  slate: { main: '#6B87B0', light: '#C0CEE0' },
  lavender: { main: '#8C7BC8', light: '#CFC6EC' },
  charcoal: { main: '#4B5263', light: '#A6ADBB' },
};

/** 테스트·문서가 참조하는 전체 데코 컬러 목록 */
export const DECOR_PALETTE: string[] = [...new Set(Object.values(DECOR_TONES).map((tone) => tone.main))];

/**
 * 모티프별 톤 — 한 컷 안의 모든 데코는 이 한 계열의 main/light 만 쓴다.
 *  · 노랑·보라·빨강이 섞이던 원색 조합 대신, 컷마다 하나의 세련된 포인트 컬러.
 */
const MOTIF_TONE: Record<DecorMotif, DecorTone> = {
  love: 'coral',
  thanks: 'gold',
  greet: 'gold',
  question: 'slate',
  laugh: 'gold',
  cheer: 'gold',
  congrats: 'gold',
  praise: 'gold',
  tired: 'slate',
  sleep: 'slate',
  angry: 'charcoal',
  complain: 'charcoal',
  sad: 'slate',
  cry: 'slate',
  surprised: 'gold',
  money: 'gold',
  smug: 'lavender',
  plain: 'charcoal',
};

const KIND_TONE: Record<DecorKind, DecorTone> = {
  star: 'gold',
  star4: 'gold',
  shootingStar: 'gold',
  sparkle: 'gold',
  confetti: 'gold',
  heart: 'coral',
  heartDouble: 'coral',
  heartSparkle: 'coral',
  heartBroken: 'coral',
  question: 'slate',
  exclaim: 'slate',
  questionExclaim: 'slate',
  laughEyes: 'charcoal',
  haha: 'charcoal',
  squint: 'charcoal',
  ellipsis: 'charcoal',
  note8: 'lavender',
  note16: 'lavender',
  sweat: 'slate',
  tear: 'slate',
  swoosh: 'coral',
  anger: 'charcoal',
  steam: 'charcoal',
  flame: 'coral',
  lightning: 'gold',
  swirl: 'lavender',
  cloud: 'slate',
  zzz: 'slate',
  coin: 'gold',
  coinRain: 'gold',
  crown: 'gold',
  flower: 'coral',
  clover: 'lavender',
  dot: 'charcoal',
};

// ── 어떤 데코를 고를지 — 문구 → 이펙트 → 감정 ─────────────────────

/** 주 데코를 두는 곳 — 머리 위 가운데 또는 한쪽(위) */
type HeroAnchor = 'crown' | 'side';

interface MotifVariant {
  /** 이 변주를 고르는 문구 힌트 (없으면 문구 해시로 고른다) */
  when?: RegExp;
  /** [아이콘, 자리, 글자 크기 대비 반지름, 기울기] */
  hero: [DecorKind, HeroAnchor, number, number];
  /** [아이콘, 글자 크기 대비 반지름, 기울기] — 0~2점, 작고 조용하게 */
  accents: [DecorKind, number, number][];
}

const v = (when: RegExp | null, hero: MotifVariant['hero'], accents: MotifVariant['accents']): MotifVariant => ({
  when: when ?? undefined,
  hero,
  accents,
});

/**
 * 모티프별 문구 변주 — 같은 감정·테마라도 대사가 다르면 다른 문양 조합이 나온다.
 *  · 한 컷 2~3점: 주 데코 1점 + 작은 악센트 1~2점. 그 이상은 붙이지 않는다.
 */
const MOTIFS: Record<DecorMotif, MotifVariant[]> = {
  love: [
    v(/보고|그리|안아|기다/, ['heart', 'side', 0.46, -4], [['sparkle', 0.2, 0]]),
    v(/설렘|심쿵|두근|반했|첫사랑/, ['heartSparkle', 'side', 0.44, -3], [['sparkle', 0.19, 0]]),
    v(null, ['heart', 'crown', 0.46, -3], [['sparkle', 0.19, 0]]),
  ],
  thanks: [
    v(/생일|선물|케이크/, ['flower', 'side', 0.44, 3], [['sparkle', 0.19, 0]]),
    v(/도움|덕분|역시|살렸/, ['heart', 'side', 0.44, -3], [['sparkle', 0.18, 0]]),
    v(null, ['flower', 'crown', 0.44, 4], [['heart', 0.15, -6]]),
  ],
  greet: [
    v(/아침|굿모닝|근|모닝/, ['star4', 'side', 0.44, -3], [['sparkle', 0.19, 0]]),
    v(/잘\s?자|굿나잇|안녕히|꿈/, ['note8', 'side', 0.42, -3], [['star4', 0.15, 0]]),
    v(null, ['sparkle', 'crown', 0.44, 0], [['heart', 0.15, 6]]),
  ],
  question: [
    v(/헷갈|당황|황당|어라|뭐지/, ['questionExclaim', 'crown', 0.44, 3], [['sparkle', 0.17, 0]]),
    v(/메모|확인|물어|알려/, ['question', 'side', 0.42, -3], [['ellipsis', 0.15, 0]]),
    v(null, ['question', 'crown', 0.46, 4], [['sweat', 0.18, 6]]),
  ],
  laugh: [
    v(/ㅋㅋ|ㅎㅎ|빵터|폭소|웃겨|재밌|낄낄/, ['laughEyes', 'crown', 0.5, -2], [['sparkle', 0.19, 0]]),
    v(/[><]|꺄|히히|깔깔/, ['squint', 'crown', 0.44, 0], [['note8', 0.17, 5]]),
    v(/썰|드립|킹받|즐거/, ['note8', 'side', 0.42, -4], [['sparkle', 0.19, 0]]),
  ],
  cheer: [
    v(/화이팅|파이팅|힘내|응원|가자|해보자|출발|할\s?수/, ['star4', 'side', 0.46, -4], [['sparkle', 0.2, 0]]),
    v(/[!！]|짱|성공|좋아|신나/, ['sparkle', 'crown', 0.46, 0], [['star4', 0.16, -6]]),
    v(null, ['sparkle', 'crown', 0.44, -4], [['note8', 0.16, 5]]),
  ],
  congrats: [
    v(/축하|합격|당첨|해냈|성공|생일/, ['crown', 'crown', 0.44, -3], [['sparkle', 0.2, 0], ['heart', 0.13, 8]]),
    v(/기념|1주년|개업|첫|시작/, ['sparkle', 'side', 0.44, 0], [['star4', 0.17, -6], ['heart', 0.13, 6]]),
    v(/로또|잭팟|횡재|돈/, ['crown', 'crown', 0.42, -3], [['coin', 0.19, 0]]),
  ],
  praise: [
    v(/최고|짱|멋지|잘했|훌륭|천재|완벽|대단/, ['star4', 'side', 0.46, -5], [['sparkle', 0.2, 0]]),
    v(/역시|예상|그럴 줄|당연/, ['sparkle', 'crown', 0.44, -3], [['star4', 0.16, -5]]),
    v(/박수|짝짝|칭찬/, ['crown', 'crown', 0.44, -3], [['sparkle', 0.19, 0]]),
  ],
  tired: [
    v(/피곤|지쳐|힘들|야근|월요일|퇴근/, ['cloud', 'crown', 0.44, 0], [['sweat', 0.2, 6]]),
    v(/녹초|방전|지침|쓰러/, ['swirl', 'side', 0.4, 0], [['sweat', 0.19, 6]]),
    v(/한숨|숨|쉬고|쉬자/, ['steam', 'crown', 0.4, 0], [['ellipsis', 0.15, 0]]),
  ],
  sleep: [
    v(/졸려|잠와|자야|굿나잇|잘자|꿈/, ['zzz', 'side', 0.42, -4], [['cloud', 0.17, 0]]),
    v(/새벽|밤샘|불면|잠이/, ['zzz', 'crown', 0.4, -4], [['star4', 0.15, 0]]),
  ],
  angry: [
    v(/미워|싫어|배신|손절/, ['anger', 'crown', 0.4, -3], [['steam', 0.18, 0]]),
    v(/킹받|폭발|뿔났|빡쳐/, ['flame', 'side', 0.4, -3], [['anger', 0.16, 0]]),
    v(null, ['anger', 'crown', 0.4, -3], [['steam', 0.18, 0], ['exclaim', 0.14, 0]]),
  ],
  complain: [
    v(/뭐래|어쩌라고|또야|왜\s?또/, ['question', 'crown', 0.4, 3], [['ellipsis', 0.15, 0]]),
    v(/답답|막막|갑갑/, ['swirl', 'crown', 0.38, 0], [['ellipsis', 0.15, 0]]),
    v(null, ['ellipsis', 'crown', 0.38, 0], [['swirl', 0.17, 0]]),
  ],
  sad: [
    v(/울|눈물|엉엉|서러|억울/, ['tear', 'side', 0.4, -3], [['cloud', 0.17, 0]]),
    v(/실망|아쉬|안타|속상/, ['cloud', 'crown', 0.4, 0], [['tear', 0.17, 5]]),
    v(null, ['cloud', 'crown', 0.4, 0], [['tear', 0.17, 0]]),
  ],
  cry: [
    v(/서러|억울|대성통곡|오열/, ['cloud', 'crown', 0.4, 0], [['tear', 0.19, 0]]),
    v(null, ['tear', 'side', 0.4, -3], [['cloud', 0.17, 0]]),
  ],
  surprised: [
    v(/진짜|실화|말도 안|누가/, ['questionExclaim', 'crown', 0.44, 3], [['sparkle', 0.19, 0]]),
    v(/어\?|갑자기|순간|갑작/, ['exclaim', 'side', 0.42, 3], [['sparkle', 0.17, 0]]),
    v(null, ['exclaim', 'crown', 0.44, -2], [['sweat', 0.18, -6]]),
  ],
  money: [
    v(/돈벼락|로또|잭팟|횡재/, ['coinRain', 'crown', 0.4, -3], [['sparkle', 0.17, 0]]),
    v(/월급날|급여|보너스|정산/, ['coin', 'side', 0.4, -4], [['sparkle', 0.17, 0]]),
    v(null, ['coin', 'crown', 0.42, -4], [['sparkle', 0.17, 0]]),
  ],
  smug: [
    v(/잘난|천재|완벽|1등|일등/, ['crown', 'crown', 0.4, -4], [['sparkle', 0.17, 0]]),
    v(/흥|그럼 그렇지|예상|뻔하/, ['note8', 'side', 0.4, 5], [['ellipsis', 0.15, 0]]),
    v(null, ['star4', 'side', 0.42, -6], [['sparkle', 0.17, 0]]),
  ],
  plain: [
    v(/ㅡㅡ|무표정|심드렁|쩝/, ['ellipsis', 'crown', 0.36, 0], []),
    v(null, ['sparkle', 'crown', 0.4, -4], [['ellipsis', 0.14, 0]]),
  ],
};

/** 역할별 상한 — [MAX_R 배수, 캔버스 대비] */
const ROLE_CAP: Record<'hero' | 'accent', [number, number]> = {
  hero: [1, 0.075],
  accent: [1, 0.032],
};

const EFFECT_MOTIF: Record<EffectKind, DecorMotif | null> = {
  none: null,
  heart: 'love',
  sparkle: 'cheer',
  sweat: 'tired',
  anger: 'angry',
  money: 'money',
  flame: 'angry',
  star: 'cheer',
  crown: 'praise',
  flower: 'thanks',
  party: 'congrats',
  zzz: 'sleep',
  question: 'question',
};

// 구체적인 상황(축하·고마움·칭찬)이 막연한 물음표보다 먼저 읽히게 순서를 잡는다.
const TEXT_RULES: { motif: DecorMotif; pattern: RegExp }[] = [
  { motif: 'love', pattern: /사랑|좋아|반했|설렘|심쿵|두근|하트|애정|그리|네가|너야|고백|마음/ },
  { motif: 'congrats', pattern: /축하|합격|당첨|해냈|기념|생일|개업|1주년|로또|잭팟/ },
  { motif: 'thanks', pattern: /고마|감사|땡큐|thank|도움|덕분|살렸/i },
  { motif: 'praise', pattern: /칭찬|박수|짝짝|멋지|잘했|훌륭|천재|완벽|대단/ },
  { motif: 'greet', pattern: /안녕|하이|반가|어서\s?와|왔어|출근|아침|모닝|잘\s?자|안녕히/ },
  { motif: 'laugh', pattern: /ㅋㅋ|ㅎㅎ|\^\^|[><]|웃|빵터|폭소|재밌|신나|즐거|웃겨|낄낄|꺄/ },
  { motif: 'cheer', pattern: /[!！]|화이팅|파이팅|힘내|최고|짱|가자|응원|해보자|할\s?수|출발/ },
  { motif: 'question', pattern: /[?？]|왜|뭐|어디|누구|언제|어떻게|설마|당황|황당|헷갈|메모/ },
  { motif: 'surprised', pattern: /헉|깜짝|놀라|대박|헐|어머|실화|말도\s?안/ },
  { motif: 'tired', pattern: /피곤|지쳐|힘들|야근|월요일|쉬고|녹초|방전|한숨/ },
  { motif: 'sleep', pattern: /졸려|잠와|잠이|불면|밤샘|굿나잇/ },
  { motif: 'angry', pattern: /화나|빡|짜증|열받|분노|손절|미워|싫어|킹받|뿔났/ },
  { motif: 'complain', pattern: /귀찮|하기\s?싫|하기싫|지겨|답답|막막|어쩌라고|뭐래/ },
  { motif: 'cry', pattern: /엉엉|오열|대성통곡|억울/ },
  { motif: 'sad', pattern: /슬퍼|울|속상|눈물|괜찮아|그리움|외로|실망|아쉬|안타|서러/ },
  { motif: 'money', pattern: /월급|돈|부자|결제|지갑|용돈|루팡|적립|급여|보너스/ },
];

const EMOTION_MOTIF: Record<Emotion, DecorMotif> = {
  joy: 'cheer',
  laugh: 'laugh',
  love: 'love',
  sad: 'sad',
  cry: 'cry',
  angry: 'angry',
  king: 'angry',
  sulk: 'complain',
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

/**
 * 문구에 맞는 변주를 고른다 — 키워드가 맞으면 그 변주, 아니면 문구 해시로.
 *  · 같은 모티프 안에서도 대사가 다르면 문양·자리가 달라진다.
 */
export function decorVariantFor(text: string, motif: DecorMotif): number {
  const variants = MOTIFS[motif];
  const clean = text.trim();
  const hit = variants.findIndex((variant) => (variant.when ? variant.when.test(clean) : false));
  if (hit >= 0) return hit;
  return hash(`${clean}|${motif}`) % variants.length;
}

/**
 * 변주의 자리 — 데코는 **머리 주변 한쪽에만** 모아 둔다(글자 영역은 비워 시인성 확보).
 *  · 주 데코: 머리 위 한쪽(또는 가운데)
 *  · 악센트 1: 같은 쪽 머리 곁(조금 아래)
 *  · 악센트 2: 반대쪽 정수리(작게) — 위쪽에서 대각선 균형만 잡는다
 */
function slotsFor(variant: MotifVariant, side: 'left' | 'right'): DecorSlot[] {
  const centered = variant.hero[1] === 'crown';
  const hero: DecorSlot = centered ? 'crown' : side === 'right' ? 'crownRight' : 'crownLeft';
  const slots: DecorSlot[] = [hero];
  if (variant.accents[0]) slots.push(side === 'right' ? 'headRight' : 'headLeft');
  if (variant.accents[1]) {
    // 세 점일 때는 반대쪽에 작게 하나 — 위쪽에서만 균형을 잡고 글자 영역은 비워 둔다.
    slots.push(centered ? (side === 'right' ? 'headLeft' : 'headRight') : side === 'right' ? 'crownLeft' : 'crownRight');
  }
  return slots;
}

/** 데코 모티프에 쓰이는 아이콘 종류(중복 제거) — 보고·테스트용 */
export function decorKindsOf(motif: DecorMotif): DecorKind[] {
  return [
    ...new Set(
      MOTIFS[motif].flatMap((variant) => [variant.hero[0], ...variant.accents.map((accent) => accent[0])]),
    ),
  ];
}

/** 모티프가 놓는 자리들(오른쪽 기준) — 보고·테스트용 */
export function decorSlotsOf(motif: DecorMotif): DecorSlot[] {
  return MOTIFS[motif].flatMap((variant) => slotsFor(variant, 'right'));
}

/** 모티프의 변주 수 — 보고·테스트용 */
export function decorVariantsOf(motif: DecorMotif): number {
  return MOTIFS[motif].length;
}

/** 특정 변주가 놓는 자리들 — 보고·테스트용 */
export function decorVariantSlotsOf(motif: DecorMotif, index: number): DecorSlot[] {
  const variant = MOTIFS[motif][index];
  return variant ? slotsFor(variant, 'right') : [];
}

/** 전체 아이콘 종류 — 편집기·문서가 쓸 수 있는 카탈로그 */
export const DECOR_KINDS = Object.keys(SHAPES) as DecorKind[];

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

/** 캔버스 비율 좌표 — 머리 위(정수리·한쪽)·머리 옆은 캐릭터 기준 고정 자리 */
const STAGE: Record<
  | 'crown'
  | 'crownLeft'
  | 'crownRight'
  | 'headLeft'
  | 'headRight'
  | 'templeLeft'
  | 'templeRight'
  | 'earLeft'
  | 'earRight'
  | 'cheekLeft'
  | 'cheekRight'
  | 'shoulderLeft'
  | 'shoulderRight'
  | 'shoulderFarLeft'
  | 'shoulderFarRight',
  [number, number]
> = {
  crown: [0.5, 0.108],
  crownLeft: [0.315, 0.088],
  crownRight: [0.685, 0.088],
  headLeft: [0.248, 0.225],
  headRight: [0.752, 0.225],
  templeLeft: [0.242, 0.315],
  templeRight: [0.758, 0.315],
  earLeft: [0.16, 0.44],
  earRight: [0.84, 0.44],
  cheekLeft: [0.245, 0.545],
  cheekRight: [0.755, 0.545],
  shoulderLeft: [0.19, 0.675],
  shoulderRight: [0.81, 0.675],
  shoulderFarLeft: [0.105, 0.72],
  shoulderFarRight: [0.895, 0.72],
};

function isStageSlot(slot: DecorSlot): slot is keyof typeof STAGE {
  return slot in STAGE;
}

/** 얼굴 한가운데(눈·코·입)는 비운다 — 캔버스 비율 박스 */
const FACE = { x0: 0.33, x1: 0.67, y0: 0.275, y1: 0.63 };

/** 자리가 막히면 옮겨 갈 다음 자리들 — 가까운 정갈한 자리로만 */
const ALTERNATES: Record<DecorSlot, DecorSlot[]> = {
  crown: ['crownRight', 'crownLeft', 'headRight', 'headLeft'],
  crownLeft: ['crownRight', 'crown', 'headLeft'],
  crownRight: ['crownLeft', 'crown', 'headRight'],
  headLeft: ['crownLeft', 'templeLeft', 'shoulderLeft'],
  headRight: ['crownRight', 'templeRight', 'shoulderRight'],
  templeLeft: ['headLeft', 'cheekLeft', 'earLeft'],
  templeRight: ['headRight', 'cheekRight', 'earRight'],
  earLeft: ['templeLeft', 'shoulderFarLeft', 'headLeft'],
  earRight: ['templeRight', 'shoulderFarRight', 'headRight'],
  cheekLeft: ['earLeft', 'templeLeft', 'shoulderLeft'],
  cheekRight: ['earRight', 'templeRight', 'shoulderRight'],
  shoulderLeft: ['cheekLeft', 'shoulderFarLeft', 'templeLeft'],
  shoulderRight: ['cheekRight', 'shoulderFarRight', 'templeRight'],
  shoulderFarLeft: ['shoulderLeft', 'earLeft', 'cheekLeft'],
  shoulderFarRight: ['shoulderRight', 'earRight', 'cheekRight'],
  textTopRight: ['textBottomRight', 'textRight', 'textAbove'],
  textTopLeft: ['textBottomLeft', 'textLeft', 'textAbove'],
  textBottomLeft: ['textTopLeft', 'textLeft', 'textBelow'],
  textBottomRight: ['textTopRight', 'textRight', 'textBelow'],
  textRight: ['textTopRight', 'textBottomRight', 'shoulderFarRight'],
  textLeft: ['textTopLeft', 'textBottomLeft', 'shoulderFarLeft'],
  textAbove: ['textTopRight', 'textTopLeft', 'textBottomRight'],
  textBelow: ['textBottomRight', 'textBottomLeft', 'textTopRight'],
};

/** 장면 데코를 맡지 않은 레이어가 쓰는 글자 모서리 자리 */
const TEXT_CORNER: DecorSlot[] = ['textTopLeft', 'textTopRight', 'textBottomLeft', 'textBottomRight'];

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function hitsRect(rect: Rect, cx: number, cy: number, r: number, ext: Extent = { x: 1.1, y: 1.1 }) {
  const reachX = r * ext.x;
  const reachY = r * ext.y;
  return cx + reachX > rect.x0 && cx - reachX < rect.x1 && cy + reachY > rect.y0 && cy - reachY < rect.y1;
}

/**
 * 얼굴 박스에 걸린 데코를 가장 가까운 바깥으로 밀어낸다.
 *  · 얼굴(눈·코·입)은 어떤 경우에도 가리지 않는다 — 대체 자리가 모두 막혔을 때의 마지막 안전장치.
 */
function pushOffFace(
  x: number,
  y: number,
  r: number,
  ext: Extent,
  canvas: number,
  marginX: number,
  marginY: number,
): [number, number] {
  const face: Rect = { x0: FACE.x0 * canvas, y0: FACE.y0 * canvas, x1: FACE.x1 * canvas, y1: FACE.y1 * canvas };
  const gap = 6;
  const options: [number, number][] = [
    [clamp(face.x0 - r * ext.x - gap, marginX, canvas - marginX), y],
    [clamp(face.x1 + r * ext.x + gap, marginX, canvas - marginX), y],
    [x, clamp(face.y0 - r * ext.y - gap, marginY, canvas - marginY)],
    [x, clamp(face.y1 + r * ext.y + gap, marginY, canvas - marginY)],
  ];
  const free = options.find(([ox, oy]) => !hitsRect(face, ox, oy, r, ext));
  return free ?? options[3];
}

/** 글자 블록 모서리 자리 — 블록 회전을 반영해 절대 좌표로 */
function textAnchor(slot: DecorSlot, r: number, block: { x: number; y: number; hw: number; hh: number; rotate: number }): [number, number] {
  let dx = 0;
  let dy = 0;
  switch (slot) {
    case 'textTopRight':
      dx = block.hw + r * 0.96;
      dy = -block.hh - r * 0.78;
      break;
    case 'textTopLeft':
      dx = -block.hw - r * 0.94;
      dy = -block.hh - r * 0.8;
      break;
    case 'textBottomLeft':
      dx = -block.hw - r * 0.68;
      dy = block.hh + r * 0.56;
      break;
    case 'textBottomRight':
      dx = block.hw + r * 0.72;
      dy = block.hh + r * 0.58;
      break;
    case 'textRight':
      dx = block.hw + r * 0.9;
      dy = -block.hh * 0.2;
      break;
    case 'textAbove':
      dx = block.hw * 0.34;
      dy = -block.hh - r * 1.1;
      break;
    case 'textBelow':
      dx = -block.hw * 0.34;
      dy = block.hh + r * 1.1;
      break;
    default:
      dx = -block.hw - r * 0.9;
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

interface PlacedSpec {
  kind: DecorKind;
  slot: DecorSlot;
  role: 'hero' | 'accent';
  scale: number;
  rotate: number;
}

/**
 * 대사·감정·이펙트를 읽어 캔버스 위 데코를 계획한다.
 *  · 반환 좌표는 캔버스 절대 px — 두 렌더러가 변환 없이 그대로 그린다.
 *  · 한 컷 2~3점: 머리 위 한쪽의 주 데코 + 머리 곁/글자 반대편 모서리의 작은 악센트.
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
  const variant = MOTIFS[motif][decorVariantFor(text, motif)];
  const side: 'left' | 'right' = hash(`${text}|side`) % 2 === 0 ? 'right' : 'left';
  const slots = slotsFor(variant, side);

  // 2~3점만 — 주 데코 1점 + 작은 악센트 1~2점. 그 이상은 붙이지 않는다.
  const specs: PlacedSpec[] = [
    { kind: variant.hero[0], slot: slots[0], role: 'hero', scale: variant.hero[2], rotate: variant.hero[3] },
    ...variant.accents.map((accent, index) => ({
      kind: accent[0] as DecorKind,
      slot: slots[index + 1] ?? TEXT_CORNER[index % TEXT_CORNER.length],
      role: 'accent' as const,
      scale: accent[1],
      rotate: accent[2],
    })),
  ];

  // 장면 데코를 맡지 않은 레이어는 큰 장식 없이 글자 모서리에 작은 점만 (앞 레이어 글자를 가리지 않게).
  const active: PlacedSpec[] = stage
    ? specs
    : (specs.length > 1 ? specs.slice(1) : specs).slice(0, 2).map((spec, index) => ({
        ...spec,
        slot: TEXT_CORNER[(index + (side === 'right' ? 0 : 1)) % TEXT_CORNER.length],
        scale: spec.scale * 0.62,
      }));

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

  active.forEach((spec, index) => {
    const cap = ROLE_CAP[spec.role];
    const r = clamp(
      Math.min(fs * spec.scale, fs * MAX_R[spec.kind] * cap[0], canvas * cap[1]),
      Math.max(6, canvas * 0.008),
      canvas * 0.16,
    );
    // 도형마다 실제 크기가 다르다(하트는 가로로 넓고, ㅎㅎ는 가로로 길다) —
    //  그 실측 반경으로 여백·얼굴 회피·겹침을 판정해 눈·볼을 확실히 비킨다.
    const measured = EXTENT[spec.kind];
    const ext = { x: Math.max(1.16, measured.x), y: Math.max(1.12, measured.y) };
    const marginX = r * ext.x + 4;
    const marginY = r * ext.y + 4;
    const restX = (value: number) => Math.max(marginX, Math.min(canvas - marginX, value));
    const restY = (value: number) => Math.max(marginY, Math.min(canvas - marginY, value));

    let chosen: [number, number] | null = null;
    const candidates = [spec.slot, ...ALTERNATES[spec.slot]];
    for (const slot of candidates) {
      // 장면 데코를 맡지 않은 레이어는 머리 위·볼 자리로 옮겨가지 않는다.
      if (!stage && isStageSlot(slot)) continue;
      const jitterX = (noise(seed, index * 2) - 0.5) * fs * 0.06;
      const jitterY = (noise(seed, index * 2 + 1) - 0.5) * fs * 0.06;
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
      if (hitsRect(faceRect, px, py, r, ext)) continue;
      if (isStageSlot(slot) && hitsRect(textRect, px, py, r, ext)) continue;
      if (placed.some((p) => Math.hypot(p.x - px, p.y - py) < (p.r + r) * 1.05)) continue;
      chosen = [px, py];
      break;
    }
    if (!chosen) {
      // 모든 자리가 막히면 원래 자리에서 캔버스 안으로만 밀어 넣고, 얼굴만은 반드시 벗어난다.
      const slot = candidates[0];
      const px = isStageSlot(slot) ? STAGE[slot][0] * canvas : textAnchor(slot, r, block)[0];
      const py = isStageSlot(slot) ? STAGE[slot][1] * canvas : textAnchor(slot, r, block)[1];
      const cxp = clamp(px, marginX, canvas - marginX);
      const cyp = clamp(py, marginY, canvas - marginY);
      chosen = hitsRect(faceRect, cxp, cyp, r, ext)
        ? pushOffFace(cxp, cyp, r, ext, canvas, marginX, marginY)
        : [cxp, cyp];
    }

    const [x, y] = chosen;
    placed.push({ x, y, r });
    const shape = shapeOf(spec.kind);
    const tone = DECOR_TONES[MOTIF_TONE[motif]];
    items.push({
      kind: spec.kind,
      motif,
      slot: candidates[0],
      x,
      y,
      r,
      rotate: spec.rotate + (noise(seed, 90 + index) - 0.5) * 6,
      color: tone.main,
      light: tone.light,
      shapes: shape.shapes,
      gloss: shape.gloss,
    });
  });

  return items;
}

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

/** 흰 스티커 외곽선 두께 (단위 반지름) — 데코 크기에 비례해 얇고 정교하게 */
const OUTLINE_INFLATE = 0.16;

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
      ctx.lineWidth = (0.06 + inflate) * item.r;
      ctx.stroke();
    } else {
      ctx.strokeStyle = paint;
      ctx.lineWidth = ((prim.width ?? 0.22) + inflate) * item.r;
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
    // 1) 얕은 그림자 (살짝 아래로)
    ctx.save();
    ctx.translate(0, item.r * 0.07);
    paintItem(ctx, item, '#191512', 0.12, 0.14);
    ctx.restore();
    // 2) 얇고 정교한 흰 스티커 외곽선
    paintItem(ctx, item, '#FFFDFA', 1, OUTLINE_INFLATE);
    // 3) 톤온톤 컬러
    paintItem(ctx, item, item.color, 1, 0);
    // 4) 하이라이트
    if (item.gloss) {
      tracePath(ctx, item.gloss, item.r);
      ctx.globalAlpha = 0.26;
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
      const strokeWidth = ((prim.mode === 'fill' ? 0.06 : prim.width ?? 0.22) + inflate).toFixed(3);
      if (prim.mode === 'fill') {
        return `<path d="${pathData(prim.d)}" fill="${paint}" fill-opacity="${fillAlpha}" stroke="${paint}" stroke-width="${strokeWidth}"/>`;
      }
      return `<path d="${pathData(prim.d)}" fill="none" stroke="${paint}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join('');
}

/** 아이콘 한 개를 그리는 SVG (편집기 미리보기·문서용) */
export function decorIconSvg(kind: DecorKind, size = 64): string {
  const shape = shapeOf(kind);
  const tone = DECOR_TONES[KIND_TONE[kind]];
  const item: DecorItem = {
    kind,
    motif: 'plain',
    slot: 'crown',
    x: size / 2,
    y: size / 2,
    r: size * 0.32,
    rotate: 0,
    color: tone.main,
    light: tone.light,
    shapes: shape.shapes,
    gloss: shape.gloss,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${renderDecorSvg([item])}</svg>`;
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
        ? `<path d="${pathData(item.gloss)}" fill="#FFFFFF" fill-opacity="0.26"/>`
        : '';
      return (
        `<g data-decor="${item.kind}" data-slot="${item.slot}" transform="${transform}">` +
        `<g transform="translate(0 0.07)" opacity="0.12">${svgPass(item, '#191512', 0.14)}</g>` +
        `<g>${svgPass(item, '#FFFDFA', OUTLINE_INFLATE)}</g>` +
        `<g>${svgPass(item, item.color, 0)}</g>` +
        gloss +
        `</g>`
      );
    })
    .join('');
}
