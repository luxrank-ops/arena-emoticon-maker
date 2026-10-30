import type { BackgroundKey, Emotion, Palette, PropKey, StickerSpec, Tone } from '@/lib/types';
import { signatureFromSeed } from '@/lib/art/sticker';

const PALETTES: Palette[] = [
  { skin: '#F6D3B3', skinShade: '#E8BA95', hair: '#332621', shirt: '#5AB8F5', accent: '#FF6B5B' },
  { skin: '#EFCBA7', skinShade: '#DDAE86', hair: '#1F1A17', shirt: '#0FB48A', accent: '#FF8A7A' },
  { skin: '#E7BE99', skinShade: '#D2A47C', hair: '#4A2F22', shirt: '#7C6BFF', accent: '#FFCF4D' },
  { skin: '#FBE0C6', skinShade: '#EFC7A4', hair: '#7A4A2B', shirt: '#FF6B5B', accent: '#0FB48A' },
];

const LINES = ['ㅇㅋ', '킹받네', '출근합니다', '퇴근!!', '고마워!', '배고파아', '월급 들어왔다', 'ㅋㅋㅋㅋ'];

export function sampleSpec(i: number, overrides: Partial<StickerSpec> = {}): StickerSpec {
  const emotions: Emotion[] = ['joy', 'king', 'love', 'tired', 'laugh', 'sulk', 'sad', 'smug'];
  return {
    seed: 1000 + i * 37,
    tone: '2d-cute',
    palette: PALETTES[i % PALETTES.length],
    signature: { ...signatureFromSeed(5 + i * 3), hairStyle: i % 5 },
    emotion: emotions[i % emotions.length],
    intensity: 78,
    prop: 'none',
    background: 'transparent',
    line: LINES[i % LINES.length],
    linePosition: 'bottom',
    ...overrides,
  };
}

export function styleSample(tone: Tone, i = 0): StickerSpec {
  return sampleSpec(i + 2, {
    tone,
    emotion: (['joy', 'laugh', 'love', 'surprised', 'tired', 'king'] as Emotion[])[i % 6],
    background: 'transparent',
    line: ['오늘도 화이팅', '빵터짐', '하트뿅', '헉', '졸려...', '킹받네'][i % 6],
  });
}

export function propSample(emotion: Emotion, prop: PropKey, background: BackgroundKey, i = 0): StickerSpec {
  return sampleSpec(i + 1, { emotion, prop, background, line: ' ' });
}
