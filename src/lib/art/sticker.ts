import type {
  BackgroundKey,
  Emotion,
  FaceSignature,
  Palette,
  PropKey,
  StickerSpec,
  Tone,
} from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// EmotiMe · Sticker Renderer
// 절차적 SVG 생성기. API 키가 없어도 항상 동일 품질의 결과물을 낸다.
// 서버(SSR)와 클라이언트(내보내기)에서 동일하게 동작해야 하므로 순수 함수.
// ─────────────────────────────────────────────────────────────

export const EMOTIONS: Record<Emotion, { label: string; hint: string; emoji: string }> = {
  joy: { label: '기쁨', hint: 'ㅎㅎ 좋아요', emoji: '😊' },
  laugh: { label: '빵터짐', hint: 'ㅋㅋㅋ', emoji: '😂' },
  love: { label: '사랑', hint: '하트 뿅', emoji: '😍' },
  sad: { label: '슬픔', hint: 'ㅠㅠ', emoji: '😢' },
  angry: { label: '화남', hint: '화가 난다', emoji: '😠' },
  king: { label: '킹받음', hint: '킹받네', emoji: '🤬' },
  sulk: { label: '삐짐', hint: '삐졌어', emoji: '😒' },
  tired: { label: '지침', hint: '졸려·지쳐', emoji: '😴' },
  surprised: { label: '놀람', hint: '헉', emoji: '😲' },
  smug: { label: '뿌듯', hint: '그렇지', emoji: '😏' },
  cry: { label: '엉엉', hint: '울어요', emoji: '😭' },
  blank: { label: '정색', hint: '...', emoji: '😐' },
};

export const TONES: Record<Tone, { label: string; desc: string; badge: string }> = {
  '2d-cute': { label: '2D 캐릭터 버전', desc: '귀여운 외곽선, 카톡 인기 캐릭터 스타일', badge: '캐릭터' },
  caricature: { label: '실사 포토 버전', desc: '실제 인물 사진 그대로 12가지 감정 표정', badge: '실사포토' },
  doodle: { label: '힐링 낙서 버전', desc: '최고심풍 삐뚤빼뚤 손그림, 긍정 자존감 대사', badge: 'MZ원픽' },
  'office-meme': { label: '직장인 밈 버전', desc: '곽철이·루피풍 은은한 광기, 퇴근/넵 필수짤', badge: '대세' },
  'clay-3d': { label: '말랑 3D 클레이', desc: '수제 찰흙 피규어 질감, 실물 굿즈 최적화', badge: '굿즈추천' },
  'pixel-art': { label: '레트로 픽셀 버전', desc: '16비트 Y2K 다마고치 감성 도트 그래픽', badge: '레트로' },
  '3d-cartoon': { label: '3D 카툰 버전', desc: '부드러운 음영과 입체 캐릭터 질감', badge: '입체' },
  sketch: { label: '손그림 스케치', desc: '연필 질감, 다이어리 감성', badge: '' },
  mono: { label: '흑백 라인', desc: '유행하는 밈 스타일, 대사가 주인공', badge: 'MZ' },
  watercolor: { label: '수채화', desc: '번지는 색감, 감성 시즌 한정', badge: '' },
};

export const BACKGROUNDS: Record<BackgroundKey, { label: string; color: string }> = {
  transparent: { label: '투명', color: 'transparent' },
  cream: { label: '크림', color: '#FFF3DF' },
  mint: { label: '민트', color: '#DFF7EE' },
  sky: { label: '하늘', color: '#E3F2FE' },
  pink: { label: '핑크', color: '#FFE6E9' },
  lemon: { label: '레몬', color: '#FFF6CC' },
  dark: { label: '다크', color: '#26221E' },
};

export const PROPS: { key: PropKey; label: string }[] = [
  { key: 'none', label: '없음' },
  { key: 'coffee', label: '커피' },
  { key: 'laptop', label: '노트북' },
  { key: 'phone', label: '폰' },
  { key: 'tissue', label: '휴지' },
  { key: 'cake', label: '케이크' },
  { key: 'crown', label: '왕관' },
  { key: 'heart', label: '하트' },
  { key: 'sweat', label: '땀방울' },
];

const INK = '#191512';
const FONT = "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif";

export const DEFAULT_PALETTE: Palette = {
  skin: '#F6D3B3',
  skinShade: '#E8BA95',
  hair: '#332621',
  shirt: '#5AB8F5',
  accent: '#FF6B5B',
};

export const DEFAULT_SIGNATURE: FaceSignature = {
  headScale: 1,
  faceWidth: 1,
  eyeSpacing: 1,
  eyeSize: 1,
  eyeShape: 'almond',
  browWeight: 1,
  mouthWidth: 1,
  lipThickness: 1,
  noseSize: 1,
  hairStyle: 0,
  cheek: 0.6,
  jawline: 'round',
  glasses: false,
};

/** 결정적 난수 (seeded) */
export function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function signatureFromSeed(seed: number): FaceSignature {
  const rand = rng(seed);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  return {
    headScale: 0.96 + rand() * 0.08,
    faceWidth: 0.94 + rand() * 0.12,
    eyeSpacing: 0.92 + rand() * 0.18,
    eyeSize: 0.9 + rand() * 0.22,
    eyeShape: pick(['almond', 'round', 'narrow']),
    browWeight: 0.85 + rand() * 0.35,
    mouthWidth: 0.9 + rand() * 0.2,
    lipThickness: 0.85 + rand() * 0.3,
    noseSize: 0.85 + rand() * 0.3,
    hairStyle: pick([0, 1, 2, 3, 4]),
    cheek: 0.4 + rand() * 0.5,
    jawline: pick(['square', 'round', 'pointed']),
    glasses: rand() > 0.86,
  };
}

// ── 색 유틸 ───────────────────────────────────────────────────
function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}
function toHex(n: number) {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
}
function shade(hex: string, amt: number) {
  const { r, g, b } = hexToRgb(hex);
  return `#${toHex(r + amt)}${toHex(g + amt)}${toHex(b + amt)}`;
}
function gray(hex: string, lift = 10) {
  const { r, g, b } = hexToRgb(hex);
  const v = 0.3 * r + 0.59 * g + 0.11 * b;
  const n = v * 0.55 + lift * 2.2;
  return `#${toHex(n)}${toHex(n)}${toHex(n)}`;
}

// ── 감정 파라미터 ─────────────────────────────────────────────
type EyeMode = 'open' | 'happy' | 'half' | 'heart' | 'sparkle' | 'dot' | 'teary' | 'angry';
type MouthMode = 'smile' | 'grin' | 'flat' | 'frown' | 'openO' | 'smirk' | 'wavy' | 'tongue' | 'pout' | 'yell';
type BrowMode = 'neutral' | 'angry' | 'sad' | 'raised' | 'flat';

const EMOTION_FX: Record<
  Emotion,
  { eye: EyeMode; mouth: MouthMode; brow: BrowMode; fx: string[]; blush: number }
> = {
  joy: { eye: 'happy', mouth: 'smile', brow: 'raised', fx: [], blush: 0.55 },
  laugh: { eye: 'happy', mouth: 'grin', brow: 'raised', fx: ['sparkle'], blush: 0.7 },
  love: { eye: 'heart', mouth: 'smile', brow: 'raised', fx: ['heart'], blush: 0.95 },
  sad: { eye: 'teary', mouth: 'frown', brow: 'sad', fx: ['tear'], blush: 0.35 },
  angry: { eye: 'angry', mouth: 'yell', brow: 'angry', fx: ['vein'], blush: 0.5 },
  king: { eye: 'angry', mouth: 'yell', brow: 'angry', fx: ['vein', 'anger'], blush: 0.6 },
  sulk: { eye: 'half', mouth: 'pout', brow: 'flat', fx: ['sweat'], blush: 0.6 },
  tired: { eye: 'half', mouth: 'flat', brow: 'sad', fx: ['zzz'], blush: 0.3 },
  surprised: { eye: 'sparkle', mouth: 'openO', brow: 'raised', fx: ['exclaim'], blush: 0.4 },
  smug: { eye: 'half', mouth: 'smirk', brow: 'raised', fx: [], blush: 0.5 },
  cry: { eye: 'teary', mouth: 'wavy', brow: 'sad', fx: ['tear', 'sweat'], blush: 0.4 },
  blank: { eye: 'dot', mouth: 'flat', brow: 'flat', fx: ['question'], blush: 0.2 },
};

// ── 렌더러 ────────────────────────────────────────────────────
export function renderSticker(spec: StickerSpec): string {
  const tone = spec.tone;
  const t = TONE_STYLE[tone];
  const p = normalizePalette(spec.palette, tone);
  const sg = applyToneSignature(spec.signature, tone);
  const fx = EMOTION_FX[spec.emotion];
  const k = Math.max(0, Math.min(100, spec.intensity)) / 100;
  const rand = rng(spec.seed);

  const cx = 512;
  const cy = 402 - (sg.headScale - 1) * 40;
  const rx = 232 * sg.faceWidth * sg.headScale;
  const ry = 250 * sg.headScale;
  const eyeY = cy - 6;
  const eyeDx = 92 * sg.eyeSpacing * sg.headScale;
  const mouthY = cy + 108 * sg.headScale;
  const lash = p.hair;

  const parts: string[] = [];
  parts.push(`<defs>${defs(tone, p)}</defs>`);

  // 배경
  const bg = BACKGROUNDS[spec.background];
  if (spec.background !== 'transparent') {
    const bgColor = tone === 'mono' ? '#F1EEE9' : bg.color;
    parts.push(`<rect width="1024" height="1024" fill="${bgColor}"/>`);
    if (tone === 'watercolor') {
      parts.push(
        `<circle cx="300" cy="300" r="230" fill="${p.accent}" opacity="0.10"/>` +
          `<circle cx="740" cy="360" r="190" fill="${p.shirt}" opacity="0.12"/>` +
          `<circle cx="520" cy="820" r="260" fill="${p.hair}" opacity="0.07"/>`,
      );
    }
    if (tone === '3d-cartoon') {
      parts.push(`<circle cx="512" cy="430" r="330" fill="#FFFFFF" opacity="0.35"/>`);
    }
  }

  parts.push(`<g ${t.filter ? 'filter="url(#wobble)"' : ''}>`);

  // 뒤머리
  if (sg.hairStyle === 1 || sg.hairStyle === 4) {
    parts.push(
      `<ellipse cx="${cx}" cy="${cy + 26}" rx="${rx * 1.14}" ry="${ry * 1.12}" fill="${p.hair}" stroke="${t.ink}" stroke-width="${t.sw}"/>`,
    );
    if (sg.hairStyle === 1) {
      parts.push(
        `<path d="M ${cx - rx * 1.12} ${cy} L ${cx - rx * 1.12} ${cy + ry * 0.92} Q ${cx - rx * 1.12} ${cy + ry * 1.05} ${cx - rx * 0.92} ${cy + ry * 1.05} L ${cx - rx * 0.55} ${cy + ry * 1.05} Q ${cx - rx * 0.8} ${cy + ry * 0.5} ${cx - rx * 0.82} ${cy} Z" fill="${p.hair}" stroke="${t.ink}" stroke-width="${t.sw}"/>`,
        `<path d="M ${cx + rx * 1.12} ${cy} L ${cx + rx * 1.12} ${cy + ry * 0.92} Q ${cx + rx * 1.12} ${cy + ry * 1.05} ${cx + rx * 0.92} ${cy + ry * 1.05} L ${cx + rx * 0.55} ${cy + ry * 1.05} Q ${cx + rx * 0.8} ${cy + ry * 0.5} ${cx + rx * 0.82} ${cy} Z" fill="${p.hair}" stroke="${t.ink}" stroke-width="${t.sw}"/>`,
      );
    }
    if (sg.hairStyle === 4) {
      parts.push(
        `<path d="M ${cx + rx * 1.05} ${cy + ry * 0.2} Q ${cx + rx * 1.5} ${cy + ry * 0.5} ${cx + rx * 1.32} ${cy + ry * 1.15} Q ${cx + rx * 1.05} ${cy + ry * 0.95} ${cx + rx * 0.98} ${cy + ry * 0.55} Z" fill="${p.hair}" stroke="${t.ink}" stroke-width="${t.sw}"/>`,
      );
    }
  }

  // 몸통
  const bodyTop = cy + ry * 0.94;
  const shoulder = tone === 'caricature' ? 250 : 300;
  parts.push(
    `<path d="M ${cx - shoulder} 1024 C ${cx - shoulder} ${bodyTop + 10} ${cx - shoulder * 0.55} ${bodyTop - 40} ${cx} ${bodyTop - 40} C ${cx + shoulder * 0.55} ${bodyTop - 40} ${cx + shoulder} ${bodyTop + 10} ${cx + shoulder} 1024 Z" fill="${t.useGradient ? 'url(#bodyGrad)' : p.shirt}" stroke="${t.ink}" stroke-width="${t.sw * 1.15}"/>`,
  );
  // 옷깃
  parts.push(
    `<path d="M ${cx - 92} ${bodyTop - 34} Q ${cx} ${bodyTop + 66} ${cx + 92} ${bodyTop - 34}" fill="none" stroke="${t.ink}" stroke-width="${t.sw * 0.9}" opacity="${t.flatten ? 0.5 : 0.85}"/>`,
  );

  // 목
  parts.push(
    `<rect x="${cx - 62}" y="${cy + ry * 0.72}" width="124" height="${ry * 0.3}" rx="46" fill="${p.skinShade}" stroke="${t.ink}" stroke-width="${t.sw}"/>`,
  );

  // 귀
  parts.push(
    `<ellipse cx="${cx - rx + 6}" cy="${cy + 34}" rx="40" ry="58" fill="${p.skin}" stroke="${t.ink}" stroke-width="${t.sw}"/>`,
    `<ellipse cx="${cx + rx - 6}" cy="${cy + 34}" rx="40" ry="58" fill="${p.skin}" stroke="${t.ink}" stroke-width="${t.sw}"/>`,
  );

  // 얼굴 (턱선 형태 반영)
  let facePath: string;
  if (sg.jawline === 'square') {
    facePath =
      `<rect x="${cx - rx}" y="${cy - ry}" width="${rx * 2}" height="${ry * 1.9}" rx="${Math.min(rx, ry) * 0.35}" ` +
      `fill="${t.useGradient ? 'url(#faceGrad)' : p.skin}" stroke="${t.ink}" stroke-width="${t.sw * 1.15}"/>`;
  } else if (sg.jawline === 'pointed') {
    facePath =
      `<path d="M ${cx - rx} ${cy} Q ${cx - rx * 0.7} ${cy - ry} ${cx} ${cy - ry * 1.05} Q ${cx + rx * 0.7} ${cy - ry} ${cx + rx} ${cy} ` +
      `Q ${cx + rx * 0.7} ${cy + ry * 0.9} ${cx} ${cy + ry * 1.0} Q ${cx - rx * 0.7} ${cy + ry * 0.9} ${cx - rx} ${cy} Z" ` +
      `fill="${t.useGradient ? 'url(#faceGrad)' : p.skin}" stroke="${t.ink}" stroke-width="${t.sw * 1.15}"/>`;
  } else {
    facePath =
      `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${t.useGradient ? 'url(#faceGrad)' : p.skin}" stroke="${t.ink}" stroke-width="${t.sw * 1.15}"/>`;
  }
  parts.push(facePath);

  // 앞머리
  parts.push(renderHairFront(cx, cy, rx, ry, p, sg, t, rand));
  if (sg.hairStyle === 2) {
    parts.push(
      `<circle cx="${cx}" cy="${cy - ry * 1.02}" r="78" fill="${p.hair}" stroke="${t.ink}" stroke-width="${t.sw}"/>`,
      `<path d="M ${cx - 44} ${cy - ry * 0.96} Q ${cx} ${cy - ry * 1.22} ${cx + 46} ${cy - ry * 0.98}" fill="none" stroke="${t.highlight}" stroke-width="${t.sw}" opacity="0.5" stroke-linecap="round"/>`,
    );
  }
  if (sg.hairStyle === 3) {
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * (1.12 + i * 0.13);
      parts.push(
        `<circle cx="${cx + Math.cos(a) * rx * 0.92}" cy="${cy + Math.sin(a) * ry * 0.92}" r="${46 - i * 2}" fill="${p.hair}" stroke="${t.ink}" stroke-width="${t.sw * 0.8}"/>`,
      );
    }
  }

  // 눈썹
  parts.push(
    renderBrow(cx - eyeDx, eyeY, -1, fx.brow, sg, t, k),
    renderBrow(cx + eyeDx, eyeY, 1, fx.brow, sg, t, k),
  );

  // 눈
  parts.push(
    renderEye(cx - eyeDx, eyeY, fx.eye, sg, p, t, k, lash, -1),
    renderEye(cx + eyeDx, eyeY, fx.eye, sg, p, t, k, lash, 1),
  );

  // 안경
  if (sg.glasses) {
    parts.push(
      `<g fill="none" stroke="${t.ink}" stroke-width="${t.sw * 0.85}" opacity="0.9">` +
        `<rect x="${cx - eyeDx - 66}" y="${eyeY - 52}" width="132" height="104" rx="34"/>` +
        `<rect x="${cx + eyeDx - 66}" y="${eyeY - 52}" width="132" height="104" rx="34"/>` +
        `<path d="M ${cx - eyeDx + 66} ${eyeY - 6} L ${cx + eyeDx - 66} ${eyeY - 6}"/>` +
        `</g>`,
    );
  }

  // 코
  const noseScale = tone === 'caricature' ? 1.9 * sg.noseSize : 1 * sg.noseSize;
  parts.push(
    tone === 'caricature'
      ? `<ellipse cx="${cx + 8}" cy="${mouthY - 44}" rx="${26 * noseScale}" ry="${20 * noseScale}" fill="${p.skinShade}" stroke="${t.ink}" stroke-width="${t.sw * 0.8}"/>`
      : `<path d="M ${cx - 14 * noseScale} ${mouthY - 62 * noseScale} Q ${cx} ${mouthY - 44 * noseScale} ${cx + 14 * noseScale} ${mouthY - 64 * noseScale}" fill="none" stroke="${t.ink}" stroke-width="${t.sw * 0.8 * noseScale}" stroke-linecap="round" opacity="0.75"/>`,
  );

  // 입
  parts.push(renderMouth(cx, mouthY, fx.mouth, sg, t, k, p));

  // 볼
  const blushAlpha = Math.min(0.55, (fx.blush * sg.cheek * (0.5 + k * 0.7)) / 1.4);
  if (tone !== 'mono') {
    parts.push(
      `<ellipse cx="${cx - rx * 0.62}" cy="${cy + 74}" rx="52" ry="${26 + k * 8}" fill="${p.accent}" opacity="${blushAlpha.toFixed(2)}"/>`,
      `<ellipse cx="${cx + rx * 0.62}" cy="${cy + 74}" rx="52" ry="${26 + k * 8}" fill="${p.accent}" opacity="${blushAlpha.toFixed(2)}"/>`,
    );
  }

  // 감정 이펙트
  parts.push(renderFx(fx.fx, spec, cx, cy, rx, ry, eyeY, eyeDx, p, t, k));

  // 소품
  parts.push(renderProp(spec.prop, cx, cy, rx, ry, p, t));

  parts.push('</g>');

  // 대사 (필터 밖 → 텍스트 선명도 유지)
  if (spec.line.trim()) parts.push(renderLine(spec, t));

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024" role="img" aria-label="${escapeAttr(EMOTIONS[spec.emotion].label)} 이모티콘">` +
    parts.join('') +
    `</svg>`;
  return svg;
}

function normalizePalette(p: Palette, tone: Tone): Palette {
  if (tone === 'mono') {
    return {
      skin: gray(p.skin, 26),
      skinShade: gray(p.skinShade, 18),
      hair: gray(p.hair, 0),
      shirt: gray(p.shirt, 20),
      accent: gray(p.accent, 8),
    };
  }
  if (tone === 'watercolor') {
    return {
      ...p,
      skin: shade(p.skin, 6),
      skinShade: shade(p.skinShade, 4),
    };
  }
  return p;
}

function applyToneSignature(s: FaceSignature, tone: Tone): FaceSignature {
  if (tone === 'caricature') {
    return {
      ...s,
      headScale: s.headScale * 1.12,
      faceWidth: s.faceWidth * 1.04,
      mouthWidth: s.mouthWidth * 1.2,
      eyeSize: s.eyeSize * 1.08,
    };
  }
  return s;
}

interface ToneStyle {
  sw: number;
  ink: string;
  stroke: string;
  highlight: string;
  useGradient: boolean;
  filter: boolean;
  flatten: boolean;
}
const TONE_STYLE: Record<Tone, ToneStyle> = {
  '2d-cute': { sw: 15, ink: INK, stroke: `stroke="${INK}"`, highlight: '#FFFFFF', useGradient: false, filter: false, flatten: false },
  '3d-cartoon': { sw: 11, ink: '#2A211B', stroke: `stroke="#2A211B"`, highlight: '#FFFFFF', useGradient: true, filter: false, flatten: false },
  sketch: { sw: 17, ink: '#3A332C', stroke: `stroke="#3A332C"`, highlight: '#FFFFFF', useGradient: false, filter: true, flatten: false },
  mono: { sw: 18, ink: '#141414', stroke: `stroke="#141414"`, highlight: '#FFFFFF', useGradient: false, filter: false, flatten: false },
  watercolor: { sw: 0, ink: '#6B5B4F', stroke: 'stroke="none"', highlight: '#FFFFFF', useGradient: true, filter: false, flatten: true },
  caricature: { sw: 18, ink: INK, stroke: `stroke="${INK}"`, highlight: '#FFFFFF', useGradient: false, filter: false, flatten: false },
  doodle: { sw: 20, ink: '#111111', stroke: `stroke="#111111"`, highlight: '#FFFD82', useGradient: false, filter: false, flatten: false },
  'office-meme': { sw: 16, ink: '#222222', stroke: `stroke="#222222"`, highlight: '#FFFFFF', useGradient: false, filter: false, flatten: false },
  'clay-3d': { sw: 10, ink: '#3E2F26', stroke: `stroke="#3E2F26"`, highlight: '#FFFFFF', useGradient: true, filter: false, flatten: false },
  'pixel-art': { sw: 14, ink: '#000000', stroke: `stroke="#000000"`, highlight: '#FFFFFF', useGradient: false, filter: false, flatten: true },
};

function defs(tone: Tone, p: Palette) {
  let d = '';
  if (tone === '3d-cartoon') {
    d += `<radialGradient id="faceGrad" cx="36%" cy="28%" r="78%">
      <stop offset="0%" stop-color="${shade(p.skin, 22)}"/><stop offset="62%" stop-color="${p.skin}"/><stop offset="100%" stop-color="${p.skinShade}"/>
    </radialGradient>
    <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${shade(p.shirt, 26)}"/><stop offset="100%" stop-color="${shade(p.shirt, -26)}"/>
    </linearGradient>`;
  }
  if (tone === 'watercolor') {
    d += `<radialGradient id="faceGrad" cx="42%" cy="32%" r="80%">
      <stop offset="0%" stop-color="${shade(p.skin, 16)}"/><stop offset="100%" stop-color="${shade(p.skin, -10)}"/>
    </radialGradient>
    <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${shade(p.shirt, 10)}"/><stop offset="100%" stop-color="${shade(p.shirt, -18)}"/>
    </linearGradient>`;
  }
  if (tone === 'sketch') {
    d += `<filter id="wobble" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="7" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`;
  }
  if (tone === 'watercolor') {
    d += `<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>`;
  }
  return d;
}

function renderHairFront(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  p: Palette,
  sg: FaceSignature,
  t: ToneStyle,
  rand: () => number,
) {
  const top = cy - ry * 0.94;
  const wiggle = (rand() - 0.5) * 20;
  const fringe =
    `M ${cx - rx * 1.02} ${cy - ry * 0.18} ` +
    `C ${cx - rx * 1.06} ${top + 40} ${cx - rx * 0.5} ${top - 40} ${cx} ${top - 34 + wiggle} ` +
    `C ${cx + rx * 0.5} ${top - 40} ${cx + rx * 1.06} ${top + 40} ${cx + rx * 1.02} ${cy - ry * 0.18} ` +
    `C ${cx + rx * 0.72} ${cy - ry * 0.34} ${cx + rx * 0.46} ${cy - ry * 0.5} ${cx + rx * 0.1} ${cy - ry * 0.44} ` +
    `C ${cx - rx * 0.3} ${cy - ry * 0.38} ${cx - rx * 0.62} ${cy - ry * 0.5} ${cx - rx * 0.78} ${cy - ry * 0.26} ` +
    `C ${cx - rx * 0.86} ${cy - ry * 0.08} ${cx - rx * 0.94} ${cy - ry * 0.16} ${cx - rx * 1.02} ${cy - ry * 0.18} Z`;
  return (
    `<path d="${fringe}" fill="${p.hair}" stroke="${t.ink}" stroke-width="${t.sw}"/>` +
    (t.useGradient
      ? `<path d="M ${cx - rx * 0.5} ${cy - ry * 0.72} Q ${cx} ${cy - ry * 0.9} ${cx + rx * 0.42} ${cy - ry * 0.74}" fill="none" stroke="${t.highlight}" stroke-width="10" opacity="0.45" stroke-linecap="round"/>`
      : '')
  );
}

function renderBrow(
  x: number,
  eyeY: number,
  side: number,
  mode: BrowMode,
  sg: FaceSignature,
  t: ToneStyle,
  k: number,
) {
  const w = 52;
  const sw = (t.sw * 1.05 * sg.browWeight).toFixed(1);
  const y = eyeY - 78;
  let d = '';
  if (mode === 'angry') {
    d = `M ${x - side * w} ${y - 14 - 12 * k} L ${x + side * w} ${y + 6 + 10 * k}`;
  } else if (mode === 'sad') {
    d = `M ${x - side * w} ${y + 8} L ${x + side * w} ${y - 10}`;
  } else if (mode === 'raised') {
    d = `M ${x - side * w} ${y + 4} Q ${x} ${y - 26 - 6 * k} ${x + side * w} ${y + 2}`;
  } else if (mode === 'flat') {
    d = `M ${x - side * w} ${y} L ${x + side * w} ${y - 2}`;
  } else {
    d = `M ${x - side * w} ${y + 2} Q ${x} ${y - 12} ${x + side * w} ${y - 4}`;
  }
  return `<path d="${d}" fill="none" stroke="${t.ink}" stroke-width="${sw}" stroke-linecap="round"/>`;
}

function renderEye(
  x: number,
  y: number,
  mode: EyeMode,
  sg: FaceSignature,
  p: Palette,
  t: ToneStyle,
  k: number,
  lash: string,
  side: number,
) {
  const ex = 46 * sg.eyeSize;
  const ey =
    sg.eyeShape === 'round'
      ? 46 * sg.eyeSize
      : sg.eyeShape === 'narrow'
      ? 30 * sg.eyeSize
      : 40 * sg.eyeSize;
  const iris = '#4A3628';
  const white = '#FFFDFA';

  const openEye = (scale = 1) =>
    `<ellipse cx="${x}" cy="${y}" rx="${ex * scale}" ry="${ey * scale}" fill="${white}" stroke="${t.ink}" stroke-width="${t.sw * 0.85}"/>` +
    `<circle cx="${x + side * 2}" cy="${y + 4}" r="${22 * sg.eyeSize * scale}" fill="${iris}"/>` +
    `<circle cx="${x + side * 2}" cy="${y + 4}" r="${11 * sg.eyeSize * scale}" fill="#1B1613"/>` +
    `<circle cx="${x + side * 2 - 7}" cy="${y - 4}" r="${6.5 * sg.eyeSize}" fill="${white}"/>`;

  switch (mode) {
    case 'happy':
      return `<path d="M ${x - ex} ${y + 12} Q ${x} ${y - ey * 1.25} ${x + ex} ${y + 12}" fill="none" stroke="${t.ink}" stroke-width="${t.sw * 1.15}" stroke-linecap="round"/>`;
    case 'half':
      return (
        openEye() +
        `<path d="M ${x - ex - 4} ${y - 6} L ${x + ex + 4} ${y - 14}" stroke="${t.ink}" stroke-width="${t.sw * 1.1}" stroke-linecap="round"/>`
      );
    case 'angry':
      return (
        openEye(0.94) +
        `<path d="M ${x - ex - 2} ${y - ey * 0.72} L ${x + ex + 2} ${y - ey * 0.06}" stroke="${t.ink}" stroke-width="${t.sw * 1.4 * 1.4}" stroke-linecap="round"/>`
      );
    case 'teary':
      return (
        openEye(1.02) +
        `<path d="M ${x - ex * 0.7} ${y + ey * 0.4} Q ${x} ${y + ey * 1.5} ${x + ex * 0.7} ${y + ey * 0.4}" fill="#8FD3F4" opacity="0.85"/>`
      );
    case 'heart': {
      const s = 0.62 * sg.eyeSize;
      return `<path transform="translate(${x} ${y}) scale(${s})" d="M0 32 C -34 8 -44 -12 -28 -26 C -14 -38 -2 -30 0 -20 C 2 -30 14 -38 28 -26 C 44 -12 34 8 0 32 Z" fill="${p.accent}" stroke="${t.ink}" stroke-width="${14}" stroke-linejoin="round"/>`;
    }
    case 'sparkle': {
      const s = 0.9 * sg.eyeSize;
      return (
        `<circle cx="${x}" cy="${y}" r="${ey * 0.9}" fill="${white}" stroke="${t.ink}" stroke-width="${t.sw * 0.85}"/>` +
        `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -30 L9 -9 L30 0 L9 9 L0 30 L-9 9 L-30 0 L-9 -9 Z" fill="#FFCF4D" stroke="${t.ink}" stroke-width="8"/>`
      );
    }
    case 'dot':
      return (
        `<circle cx="${x}" cy="${y}" r="${13 * sg.eyeSize}" fill="${t.ink}"/>` +
        `<circle cx="${x - 4}" cy="${y - 4}" r="4" fill="${white}"/>`
      );
    default:
      return openEye();
  }
}

function renderMouth(
  cx: number,
  my: number,
  mode: MouthMode,
  sg: FaceSignature,
  t: ToneStyle,
  k: number,
  p: Palette,
) {
  const w = 168 * sg.mouthWidth;
  const h = 52 * (0.6 + k * 0.8) * sg.lipThickness;
  const half = w / 2;
  const dark = '#48211F';
  const tongue = '#F0726A';

  switch (mode) {
    case 'smile':
      return `<path d="M ${cx - half} ${my} Q ${cx} ${my + h * 1.15} ${cx + half} ${my}" fill="none" stroke="${t.ink}" stroke-width="${t.sw * 1.2}" stroke-linecap="round"/>`;
    case 'grin':
    case 'yell': {
      const g = mode === 'yell' ? 1.35 : 1;
      return (
        `<path d="M ${cx - half * g} ${my - 8} Q ${cx} ${my - 34 * g} ${cx + half * g} ${my - 8} Q ${cx + half * 0.5 * g} ${my + h * 1.7 * g} ${cx} ${my + h * 1.8 * g} Q ${cx - half * 0.5 * g} ${my + h * 1.7 * g} ${cx - half * g} ${my - 8} Z" fill="${dark}" stroke="${t.ink}" stroke-width="${t.sw}" stroke-linejoin="round"/>` +
        `<ellipse cx="${cx}" cy="${my + h * 1.32 * g}" rx="${half * 0.52 * g}" ry="${h * 0.3 * g}" fill="${tongue}"/>`
      );
    }
    case 'flat':
      return `<path d="M ${cx - half * 0.55} ${my + 6} L ${cx + half * 0.55} ${my + 6}" fill="none" stroke="${t.ink}" stroke-width="${t.sw * 1.1}" stroke-linecap="round"/>`;
    case 'frown':
      return `<path d="M ${cx - half * 0.8} ${my + 22} Q ${cx} ${my - 24} ${cx + half * 0.8} ${my + 22}" fill="none" stroke="${t.ink}" stroke-width="${t.sw * 1.15}" stroke-linecap="round"/>`;
    case 'openO':
      return (
        `<ellipse cx="${cx}" cy="${my + 10}" rx="${26 + k * 16}" ry="${34 + k * 20}" fill="${dark}" stroke="${t.ink}" stroke-width="${t.sw}"/>` +
        `<ellipse cx="${cx}" cy="${my + 24 + k * 12}" rx="${14 + k * 8}" ry="${10 + k * 6}" fill="${tongue}"/>`
      );
    case 'smirk':
      return `<path d="M ${cx - half * 0.72} ${my + 12} Q ${cx - 10} ${my + 40} ${cx + half * 0.78} ${my - 14}" fill="none" stroke="${t.ink}" stroke-width="${t.sw * 1.15}" stroke-linecap="round"/>`;
    case 'wavy':
      return `<path d="M ${cx - half * 0.7} ${my + 8} q ${w * 0.12} -22 ${w * 0.24} 0 t ${w * 0.24} 0 t ${w * 0.24} 0 t ${w * 0.24} 0" fill="none" stroke="${t.ink}" stroke-width="${t.sw * 1.1}" stroke-linecap="round"/>`;
    case 'tongue':
      return (
        `<path d="M ${cx - half * 0.8} ${my} Q ${cx} ${my + 56} ${cx + half * 0.8} ${my}" fill="none" stroke="${t.ink}" stroke-width="${t.sw * 1.15}" stroke-linecap="round"/>` +
        `<path d="M ${cx + 6} ${my + 26} q 30 6 22 34 q -22 10 -34 -12 z" fill="${tongue}" stroke="${t.ink}" stroke-width="8" transform="rotate(-12 ${cx + 20} ${my + 40})"/>`
      );
    case 'pout':
      return (
        `<ellipse cx="${cx}" cy="${my + 16}" rx="${30 * sg.mouthWidth}" ry="22" fill="${dark}" stroke="${t.ink}" stroke-width="${t.sw * 0.9}"/>` +
        `<path d="M ${cx - 62} ${my - 6} Q ${cx} ${my - 22} ${cx + 62} ${my - 6}" fill="none" stroke="${t.ink}" stroke-width="${t.sw * 0.7}" opacity="0.5" stroke-linecap="round"/>`
      );
    default:
      return `<path d="M ${cx - half * 0.8} ${my} Q ${cx} ${my + h} ${cx + half * 0.8} ${my}" fill="none" stroke="${t.ink}" stroke-width="${t.sw * 1.15}" stroke-linecap="round"/>`;
  }
}

function renderFx(
  fx: string[],
  spec: StickerSpec,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  eyeY: number,
  eyeDx: number,
  p: Palette,
  t: ToneStyle,
  k: number,
) {
  const out: string[] = [];
  const drop = (x: number, y: number, s: number, color: string, rot = 0) =>
    `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" d="M0 -34 C 14 -12 26 4 26 16 C 26 32 12 44 0 44 C -12 44 -26 32 -26 16 C -26 4 -14 -12 0 -34 Z" fill="${color}" stroke="${t.ink}" stroke-width="7"/>`;

  for (const f of fx) {
    if (f === 'tear') {
      out.push(drop(cx - eyeDx + 18, eyeY + 54, 0.66, '#8FD3F4', -8));
      out.push(drop(cx + eyeDx - 18, eyeY + 62, 0.56, '#8FD3F4', 8));
    }
    if (f === 'sweat') {
      out.push(drop(cx + rx * 0.92, cy - ry * 0.42 + 20, 0.72, '#8FD3F4', 12));
    }
    if (f === 'vein') {
      out.push(
        `<g stroke="${p.accent}" stroke-width="12" stroke-linecap="round" fill="none" transform="translate(${cx + rx * 0.8} ${cy - ry * 0.6})">` +
          `<path d="M-26 -14 L-8 0 L-26 14"/><path d="M10 -14 L28 0 L10 14"/></g>`,
      );
    }
    if (f === 'anger') {
      out.push(
        `<g stroke="${p.accent}" stroke-width="10" stroke-linecap="round" opacity="0.85">` +
          `<path d="M ${cx - rx * 1.12} ${cy - 20} L ${cx - rx * 1.34} ${cy - 60}"/>` +
          `<path d="M ${cx - rx * 1.18} ${cy + 30} L ${cx - rx * 1.46} ${cy + 20}"/>` +
          `<path d="M ${cx + rx * 1.12} ${cy - 20} L ${cx + rx * 1.34} ${cy - 60}"/>` +
          `<path d="M ${cx + rx * 1.18} ${cy + 30} L ${cx + rx * 1.46} ${cy + 20}"/></g>`,
      );
    }
    if (f === 'heart') {
      const heart = (x: number, y: number, s: number, c: string) =>
        `<path transform="translate(${x} ${y}) scale(${s})" d="M0 32 C -34 8 -44 -12 -28 -26 C -14 -38 -2 -30 0 -20 C 2 -30 14 -38 28 -26 C 44 -12 34 8 0 32 Z" fill="${c}" stroke="${t.ink}" stroke-width="10" stroke-linejoin="round"/>`;
      out.push(heart(cx + rx * 1.02, cy - ry * 0.62, 0.62, p.accent));
      out.push(heart(cx - rx * 1.06, cy - ry * 0.46, 0.44, '#FF9CB1'));
      out.push(heart(cx + rx * 0.86, cy + ry * 0.18, 0.34, '#FF9CB1'));
    }
    if (f === 'sparkle') {
      const star = (x: number, y: number, s: number) =>
        `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -34 L9 -9 L34 0 L9 9 L0 34 L-9 9 L-34 0 L-9 -9 Z" fill="#FFCF4D" stroke="${t.ink}" stroke-width="8"/>`;
      out.push(star(cx + rx * 1.04, cy - ry * 0.74, 0.62));
      out.push(star(cx - rx * 1.08, cy - ry * 0.5, 0.46));
      out.push(star(cx + rx * 0.94, cy + ry * 0.34, 0.34));
    }
    if (f === 'zzz') {
      out.push(
        `<g fill="${t.ink}" font-family="${FONT}" font-weight="800">` +
          `<text x="${cx + rx * 0.94}" y="${cy - ry * 0.86}" font-size="64">Z</text>` +
          `<text x="${cx + rx * 1.12}" y="${cy - ry * 1.08}" font-size="46">z</text>` +
          `<text x="${cx + rx * 1.24}" y="${cy - ry * 1.24}" font-size="32">z</text></g>`,
      );
    }
    if (f === 'exclaim') {
      out.push(
        `<g fill="${p.accent}" stroke="${t.ink}" stroke-width="7" font-family="${FONT}" font-weight="900">` +
          `<text x="${cx + rx * 1.02}" y="${cy - ry * 0.72}" font-size="104">!</text></g>`,
      );
    }
    if (f === 'question') {
      out.push(
        `<text x="${cx + rx * 1.0}" y="${cy - ry * 0.74}" font-size="100" font-family="${FONT}" font-weight="900" fill="${t.ink}">?</text>`,
      );
    }
  }
  // 강도가 높을수록 이펙트가 커진다
  if (k > 0.75 && (spec.emotion === 'angry' || spec.emotion === 'king')) {
    out.push(
      `<circle cx="${cx}" cy="${cy}" r="${rx * 1.55}" fill="none" stroke="${p.accent}" stroke-width="10" opacity="0.35" stroke-dasharray="26 22"/>`,
    );
  }
  return out.join('');
}

function renderProp(prop: PropKey, cx: number, cy: number, rx: number, ry: number, p: Palette, t: ToneStyle) {
  const S = t.sw;
  const stroke = `stroke="${t.ink}" stroke-width="${S}" stroke-linejoin="round"`;
  switch (prop) {
    case 'coffee':
      return (
        `<g transform="translate(96 742) rotate(-8)">` +
        `<rect x="0" y="24" width="128" height="120" rx="20" fill="#FFFFFF" ${stroke}/>` +
        `<rect x="0" y="24" width="128" height="34" fill="#E9D9C7" ${stroke}/>` +
        `<path d="M128 62 q46 10 40 44 q-6 32 -44 30" fill="none" ${stroke}/>` +
        `<path d="M34 6 q10 -18 0 -34 M66 6 q10 -18 0 -34" stroke="${t.ink}" stroke-width="${S * 0.7}" fill="none" opacity="0.5" stroke-linecap="round"/>` +
        `</g>`
      );
    case 'laptop':
      return (
        `<g transform="translate(668 706)">` +
        `<rect x="0" y="0" width="220" height="140" rx="14" fill="#3B3833" ${stroke}/>` +
        `<rect x="14" y="14" width="192" height="112" rx="8" fill="${p.shirt}" opacity="0.9"/>` +
        `<rect x="-30" y="140" width="280" height="24" rx="12" fill="#D8D2CA" ${stroke}/>` +
        `</g>`
      );
    case 'phone':
      return (
        `<g transform="translate(762 700) rotate(10)">` +
        `<rect x="0" y="0" width="132" height="212" rx="26" fill="#2A2622" ${stroke}/>` +
        `<rect x="12" y="22" width="108" height="168" rx="14" fill="${p.shirt}" opacity="0.92"/>` +
        `<circle cx="66" cy="202" r="6" fill="#B9B2AA"/>` +
        `</g>`
      );
    case 'tissue':
      return (
        `<g transform="translate(96 800) rotate(-4)">` +
        `<rect x="0" y="30" width="150" height="96" rx="14" fill="${p.accent}" ${stroke}/>` +
        `<path d="M28 32 q22 -46 46 -16 q20 -34 48 -4 l0 22 z" fill="#FFFFFF" ${stroke}/>` +
        `</g>`
      );
    case 'cake':
      return (
        `<g transform="translate(96 742)">` +
        `<rect x="0" y="34" width="152" height="100" rx="16" fill="#FFF3DF" ${stroke}/>` +
        `<rect x="0" y="62" width="152" height="20" fill="${p.accent}" opacity="0.85"/>` +
        `<path d="M0 34 q19 -22 38 0 q19 -22 38 0 q19 -22 38 0 q19 -22 38 0" fill="#FFFFFF" ${stroke}/>` +
        `<rect x="70" y="-8" width="12" height="42" fill="${p.shirt}" ${stroke}/>` +
        `<path d="M76 -12 q6 -18 12 0 q-6 12 -12 0" fill="#FFCF4D" ${stroke}/>` +
        `</g>`
      );
    case 'crown':
      return (
        `<g transform="translate(${cx} ${cy - ry * 0.92})">` +
        `<path d="M-92 26 L-92 -26 L-46 4 L0 -44 L46 4 L92 -26 L92 26 Z" fill="#FFCF4D" ${stroke}/>` +
        `<circle cx="0" cy="8" r="9" fill="${p.accent}"/></g>`
      );
    case 'heart':
      return `<path transform="translate(120 760) scale(1.5)" d="M0 32 C -34 8 -44 -12 -28 -26 C -14 -38 -2 -30 0 -20 C 2 -30 14 -38 28 -26 C 44 -12 34 8 0 32 Z" fill="${p.accent}" ${stroke}/>`;
    case 'sweat':
      return `<path transform="translate(790 300) scale(1.6)" d="M0 -34 C 14 -12 26 4 26 16 C 26 32 12 44 0 44 C -12 44 -26 32 -26 16 C -26 4 -14 -12 0 -34 Z" fill="#8FD3F4" ${stroke}/>`;
    default:
      return '';
  }
}

/** 글자 폭 추정치 (한글·이모지 = 1em, 그 외 = 0.5em). 웹픈트가 아니라 보수적 추정. */
function estimatedTextWidth(text: string, size: number) {
  let em = 0;
  for (const ch of text) {
    em += /[\u1100-\u11FF\u2E80-\uA4CF\uA960-\uA97F\uAC00-\uD7FF\uF900-\uFAFF\uFF00-\uFF60]/.test(ch) || /[\u{1F000}-\u{1FAFF}]/u.test(ch)
      ? 1
      : 0.52;
  }
  return em * size;
}

function renderLine(spec: StickerSpec, t: ToneStyle) {
  const text = spec.line.trim().slice(0, 34);
  const chars = [...text].length;
  const size = chars <= 7 ? 66 : chars <= 11 ? 58 : chars <= 16 ? 48 : chars <= 22 ? 40 : 34;
  // 말풍선(band)은 항상 텍스트보다 넓게. 여백(24px)을 확보해도 1024px 를 넘지 않도록 폭을 캡업.
  const textW = estimatedTextWidth(text, size);
  const bandW = Math.min(940, Math.max(280, textW + 96));
  // 캡업된 폭에 맞춰 글자 크기를 한 번 더 줄인다 (텍스트가 band 밖으로 삐져나가지 않게)
  const fittedSize = textW > bandW - 56 ? Math.floor((size * (bandW - 56)) / Math.max(1, textW)) : size;
  const y = spec.linePosition === 'top' ? 40 : 866;
  const h = fittedSize + 50;
  const band = `<rect x="${512 - bandW / 2}" y="${y}" width="${bandW}" height="${h}" rx="${h / 2.6}" fill="#FFFDFA" stroke="${t.ink}" stroke-width="${Math.max(6, t.sw * 0.7)}" opacity="0.97"/>`;
  const baseline = y + h / 2 + fittedSize * 0.36;
  // 폰트가 달라도(폰트 누락·대체 글꼴) 밴드 밖으로 넘치지 않도록, 넘칠 때만 textLength 로 폭을 강제한다.
  const avail = bandW - 56;
  const fittedW = estimatedTextWidth(text, fittedSize);
  const lenAttr = fittedW > avail ? ` textLength="${Math.round(avail)}" lengthAdjust="spacingAndGlyphs"` : '';
  const textEl = `<text x="512" y="${baseline}" text-anchor="middle" font-family="${FONT}" font-size="${fittedSize}" font-weight="800" fill="${INK}" letter-spacing="-0.5"${lenAttr}>${escapeXml(text)}</text>`;
  return band + textEl;
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
function escapeAttr(s: string) {
  return escapeXml(s);
}

/** 썸네일용 data URL (서버/클라이언트 공용) */
export function svgToDataUrl(svg: string) {
  const encoded =
    typeof window === 'undefined'
      ? Buffer.from(svg, 'utf8').toString('base64')
      : btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}
