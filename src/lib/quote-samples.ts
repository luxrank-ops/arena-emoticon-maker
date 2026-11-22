import type { Emotion } from '@/lib/types';

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

/** 해당 감정의 샘플 컷 경로 (없으면 undefined → 절차적 SVG 캐릭터로 그린다). */
export function sampleCutFor(emotion: Emotion): string | undefined {
  return SAMPLE_CUTS[emotion];
}
