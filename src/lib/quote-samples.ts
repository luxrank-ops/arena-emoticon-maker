import type { Emotion, Tone } from '@/lib/types';

/**
 * 대사 팩 미리보기용 샘플 컷 — 실제 사진으로 만든 12감정 실사 카톡 이모티콘 컷(사진 톤 + 흰 외곽선 스티커).
 *  · 그림에 글자를 굽지 않고, 대사는 앱의 캘리그라피 레이어(textLayers)가 그 위에 얹는다.
 *  · 감정을 바꾸면 같은 인물의 다른 표정 컷으로 바뀌므로 '감정·배경 바꾸기'가 그대로 동작한다.
 *  · 파일: public/samples/quote-photo/<감정>.webp (512×512 · 투명 배경 WebP)
 */
export const SAMPLE_CUTS: Record<Emotion, string> = {
  joy: '/samples/quote-photo/joy.webp',
  laugh: '/samples/quote-photo/laugh.webp',
  love: '/samples/quote-photo/love.webp',
  sad: '/samples/quote-photo/sad.webp',
  angry: '/samples/quote-photo/angry.webp',
  king: '/samples/quote-photo/king.webp',
  sulk: '/samples/quote-photo/sulk.webp',
  tired: '/samples/quote-photo/tired.webp',
  surprised: '/samples/quote-photo/surprised.webp',
  smug: '/samples/quote-photo/smug.webp',
  cry: '/samples/quote-photo/cry.webp',
  blank: '/samples/quote-photo/blank.webp',
};

/**
 * 화풍별 대표 샘플 컷 — 같은 인물을 화풍만 바꿔 만든 컷(투명 배경 WebP).
 * 대사 팩마다 자기 화풍(pack.tone)의 컷을 보여 줘서, 팩을 바꾸면 그림체가 확실히 달라진다.
 */
export const TONAL_SAMPLE_CUTS: Partial<Record<Tone, string>> = {
  '2d-cute': '/samples/tone-2d-cute.webp',
  caricature: '/samples/tone-caricature.webp',
  '3d-cartoon': '/samples/tone-3d-cartoon.webp',
  'clay-3d': '/samples/tone-clay-3d.webp',
  doodle: '/samples/tone-doodle.webp',
  'office-meme': '/samples/tone-office-meme.webp',
  'pixel-art': '/samples/tone-pixel-art.webp',
  sketch: '/samples/tone-sketch.webp',
  mono: '/samples/tone-mono.webp',
  watercolor: '/samples/tone-watercolor.webp',
};

/**
 * 해당 감정(또는 화풍)의 샘플 컷 경로 (없으면 undefined → 절차적 SVG 캐릭터로 그린다).
 * · 화풍을 주면 그 화풍의 대표 컷을 쓴다 — 대사 팩 미리보기는 팩마다 다른 그림체로 보인다.
 * · 화풍이 없을 때는 감정별 실사 컷(12종)을 쓴다.
 */
export function sampleCutFor(emotion: Emotion, tone?: Tone): string | undefined {
  if (tone && TONAL_SAMPLE_CUTS[tone]) return TONAL_SAMPLE_CUTS[tone];
  return SAMPLE_CUTS[emotion];
}
