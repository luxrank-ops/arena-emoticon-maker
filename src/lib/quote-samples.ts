import type { Emotion } from '@/lib/types';

/**
 * 대사 팩 미리보기용 샘플 컷 — 실제 사진으로 만든 12감정 컷(2D 캐릭터 화풍).
 *  · 그림에 글자를 굽지 않고, 대사는 앱의 캘리그라피 레이어(textLayers)가 그 위에 얹는다.
 *  · 감정을 바꾸면 같은 인물의 다른 표정 컷으로 바뀌므로 '감정·배경 바꾸기'가 그대로 동작한다.
 *  · 파일: public/samples/cut/<감정>.webp (512×512 · 투명 배경 WebP)
 */
export const SAMPLE_CUTS: Record<Emotion, string> = {
  joy: '/samples/cut/joy.webp',
  laugh: '/samples/cut/laugh.webp',
  love: '/samples/cut/love.webp',
  sad: '/samples/cut/sad.webp',
  angry: '/samples/cut/angry.webp',
  king: '/samples/cut/king.webp',
  sulk: '/samples/cut/sulk.webp',
  tired: '/samples/cut/tired.webp',
  surprised: '/samples/cut/surprised.webp',
  smug: '/samples/cut/smug.webp',
  cry: '/samples/cut/cry.webp',
  blank: '/samples/cut/blank.webp',
};

/** 해당 감정의 샘플 컷 경로 (없으면 undefined → 절차적 SVG 캐릭터로 그린다). */
export function sampleCutFor(emotion: Emotion): string | undefined {
  return SAMPLE_CUTS[emotion];
}
