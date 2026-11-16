// ─────────────────────────────────────────────────────────────
// 움직이는 이모티콘 — 모션 템플릿 (멀티프레임)
//  · 정지 컷 한 장을 프레임별 변형(위치/크기/회전/투명도 + 파티클)으로 재생한다.
//  · 전부 수식이라 AI 호출·외부 라이브러리 없이 브라우저에서 즉시 만들 수 있다.
//  · dx/dy 는 캔버스 크기 대비 비율, rotate 는 도(degree), alpha 는 0~1.
// ─────────────────────────────────────────────────────────────

export type MotionId =
  | 'bounce'
  | 'blink'
  | 'shake'
  | 'sparkle'
  | 'heartbeat'
  | 'float'
  | 'nod'
  | 'swing';

export interface MotionTemplate {
  id: MotionId;
  label: string;
  labelEn: string;
  emoji: string;
  /** 한 번 재생에 쓰는 프레임 수 */
  frames: number;
  /** 프레임 간격(ms) */
  delayMs: number;
  hint: string;
  hintEn: string;
}

export const MOTION_TEMPLATES: MotionTemplate[] = [
  { id: 'bounce', label: '바운스', labelEn: 'Bounce', emoji: '🏀', frames: 12, delayMs: 80, hint: '통통 튀며 착지할 때 살짝 눌려요', hintEn: 'Hops with a soft squash on landing' },
  { id: 'blink', label: '깜빡임', labelEn: 'Blink', emoji: '😉', frames: 16, delayMs: 70, hint: '잠깐 눈을 감았다 뜨는 느낌', hintEn: 'A quick blink' },
  { id: 'shake', label: '흔들림', labelEn: 'Shake', emoji: '📳', frames: 8, delayMs: 60, hint: '빠르게 좌우로 부르르', hintEn: 'A fast left-right shake' },
  { id: 'sparkle', label: '반짝이', labelEn: 'Sparkle', emoji: '✨', frames: 12, delayMs: 90, hint: '반짝이가 둘레에서 톡톡', hintEn: 'Sparkles pop around the sticker' },
  { id: 'heartbeat', label: '두근두근', labelEn: 'Heartbeat', emoji: '💓', frames: 12, delayMs: 70, hint: '쿵쿵 두 번 뛰는 심장 박동', hintEn: 'A double heartbeat pulse' },
  { id: 'float', label: '둥실둥실', labelEn: 'Float', emoji: '🎈', frames: 16, delayMs: 90, hint: '천천히 떠오르며 기울어요', hintEn: 'Slow float with a gentle tilt' },
  { id: 'nod', label: '끄덕끄덕', labelEn: 'Nod', emoji: '🙂', frames: 10, delayMs: 80, hint: '고개를 두 번 끄덕여요', hintEn: 'Two small nods' },
  { id: 'swing', label: '좌우 스윙', labelEn: 'Swing', emoji: '🎐', frames: 12, delayMs: 80, hint: '시계추처럼 부드럽게 흔들려요', hintEn: 'Sways like a pendulum' },
];

export const DEFAULT_MOTION: MotionId = 'bounce';

export function motionById(id: string | null | undefined): MotionTemplate | undefined {
  return MOTION_TEMPLATES.find((item) => item.id === id);
}

export function motionIds(): MotionId[] {
  return MOTION_TEMPLATES.map((item) => item.id);
}

export interface MotionTransform {
  /** 캔버스 폭 대비 이동 비율 */
  dx: number;
  /** 캔버스 높이 대비 이동 비율 */
  dy: number;
  scaleX: number;
  scaleY: number;
  /** 도 단위 */
  rotate: number;
  alpha: number;
}

const IDENTITY: MotionTransform = { dx: 0, dy: 0, scaleX: 1, scaleY: 1, rotate: 0, alpha: 1 };

const TAU = Math.PI * 2;

/** t 는 0 이상 1 미만의 루프 위치 */
function phase(t: number) {
  if (!Number.isFinite(t)) return 0;
  const wrapped = t % 1;
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

export function motionTransformAt(id: MotionId, t: number): MotionTransform {
  const p = phase(t);
  switch (id) {
    case 'bounce': {
      const hop = Math.abs(Math.sin(Math.PI * p));
      return { dx: 0, dy: -0.055 * hop, scaleX: 1 + 0.03 * hop, scaleY: 1 - 0.03 * hop, rotate: 0, alpha: 1 };
    }
    case 'blink': {
      // 0.42~0.58 구간에서만 빠르게 감았다 뜬다.
      const center = 0.5;
      const width = 0.09;
      const d = Math.abs(p - center);
      const amount = d >= width ? 0 : 1 - d / width;
      const eased = amount * amount * (3 - 2 * amount);
      return { dx: 0, dy: 0, scaleX: 1 + 0.015 * eased, scaleY: 1 - 0.12 * eased, rotate: 0, alpha: 1 };
    }
    case 'shake': {
      const wave = Math.sin(TAU * 3 * p);
      return { dx: 0.022 * wave, dy: 0, scaleX: 1, scaleY: 1, rotate: 1.4 * wave, alpha: 1 };
    }
    case 'sparkle': {
      const bob = Math.sin(TAU * p);
      return { dx: 0.004 * bob, dy: -0.012 * bob, scaleX: 1 + 0.006 * bob, scaleY: 1 + 0.006 * bob, rotate: 0.6 * bob, alpha: 1 };
    }
    case 'heartbeat': {
      const beat = Math.pow(Math.max(0, Math.sin(TAU * 2 * p)), 3);
      return { dx: 0, dy: 0, scaleX: 1 + 0.05 * beat, scaleY: 1 + 0.05 * beat, rotate: 0, alpha: 1 };
    }
    case 'float': {
      const wave = Math.sin(TAU * p);
      return { dx: 0.006 * wave, dy: -0.026 * wave, scaleX: 1, scaleY: 1, rotate: 1.8 * wave, alpha: 1 - 0.04 * Math.max(0, wave) };
    }
    case 'nod': {
      const wave = Math.max(0, Math.sin(TAU * 2 * p));
      return { dx: 0, dy: 0.018 * wave, scaleX: 1, scaleY: 1 - 0.018 * wave, rotate: 0, alpha: 1 };
    }
    case 'swing': {
      const wave = Math.sin(TAU * p);
      return { dx: 0.008 * wave, dy: 0, scaleX: 1, scaleY: 1, rotate: 3.5 * wave, alpha: 1 };
    }
    default:
      return IDENTITY;
  }
}

export type ParticleKind = 'sparkle' | 'heart' | 'sweat' | 'coin' | 'flame';

export interface MotionParticle {
  kind: ParticleKind;
  /** 캔버스 크기 대비 중심 좌표 */
  x: number;
  y: number;
  /** 캔버스 크기 대비 반지름 */
  r: number;
  alpha: number;
}

/**
 * 프레임별 장식 파티클. 위치는 수식으로 고정되어 같은 t 에서 항상 같다.
 * (미리보기와 내보내기가 같은 그림을 그리도록 순수 함수로 둔다)
 */
export function motionParticlesAt(id: MotionId, t: number): MotionParticle[] {
  const p = phase(t);
  if (id === 'sparkle') {
    return Array.from({ length: 6 }, (_, i) => {
      const local = (p + i / 6) % 1;
      const angle = i * (TAU / 6) + p * TAU * 0.15;
      const radius = 0.34 + 0.05 * Math.sin(TAU * local);
      return {
        kind: 'sparkle' as ParticleKind,
        x: 0.5 + Math.cos(angle) * radius,
        y: 0.5 + Math.sin(angle) * radius * 0.82,
        r: 0.018 + 0.016 * (1 - local),
        alpha: Math.sin(Math.PI * local),
      };
    });
  }
  if (id === 'heartbeat') {
    return Array.from({ length: 3 }, (_, i) => {
      const local = (p + i / 3) % 1;
      return {
        kind: 'heart' as ParticleKind,
        x: 0.5 + (i - 1) * 0.22,
        y: 0.24 - local * 0.12,
        r: 0.03 + 0.012 * (1 - local),
        alpha: Math.sin(Math.PI * local) * 0.9,
      };
    });
  }
  if (id === 'bounce') {
    // 착지 지점의 작은 먼지
    const land = p < 0.08 || p > 0.92 ? 1 - Math.min(p, 1 - p) / 0.08 : 0;
    return land > 0 ? [0.32, 0.5, 0.68].map((x) => ({ kind: 'sparkle' as ParticleKind, x, y: 0.9, r: 0.014, alpha: land * 0.5 })) : [];
  }
  return [];
}

/** 내보내기·미리보기 공용: 모션 한 주기의 프레임 수 */
export function motionFrameCount(id: MotionId): number {
  return motionById(id)?.frames ?? 12;
}

/** 모션 GIF/APNG 의 1회 재생 길이(ms) */
export function motionDurationMs(id: MotionId): number {
  const template = motionById(id);
  return template ? template.frames * template.delayMs : 960;
}
