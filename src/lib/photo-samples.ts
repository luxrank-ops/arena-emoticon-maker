import type { Emotion } from '@/lib/types';
import type { TextLayerStyle } from '@/lib/studio/layers';

/**
 * 실사 사진 기반 샘플 — 앱이 지향하는 결과물을 그대로 보여 준다.
 *  · 사람·커플·팀: 사진 누끼 + 흰 외곽선 + 캘리그라피 한 줄 (512×512 투명 WebP).
 *  · 반려동물: 털 끝이 뭉개지지 않도록 **누끼를 따지 않고** 원본 배경을 살린 채
 *    둥근 사진 프레임(흰 얇은 보더 + 부드러운 그림자)으로 마감한다(2026-11-27 사용자 피드백).
 *  · `source` 는 누끼 전 원본 사진 — '원본 → 스티커' 흐름을 보여 줄 때 쓴다.
 *  · 대사(line)는 그림에 굽지 않고 앱의 캘리그라피 레이어로 얹는다(Sticker + textLayers).
 *
 * ⚠️ 이 폴더의 반려동물·커플·팀 사진은 앱 화면용으로 생성한 실사풍 예시 사진이며,
 *    실제 고객이나 모델의 사진이 아니다. (public/samples/photo/README.md 참고)
 */
export interface PhotoSampleCut {
  src: string;
  /** 스티커에 얹는 대사(ko/en) */
  line: { ko: string; en: string };
  alt: { ko: string; en: string };
  emotion: Emotion;
  /** 대사 글자체 — 없으면 기본(동글 손글씨) */
  style?: TextLayerStyle;
  /** 대사 잉크색 — 없으면 감정 기본색. 반려동물 샘플은 사진 위에서 또렷하게 보이도록 짙은 잉크를 쓴다 */
  ink?: string;
}

export interface PhotoSampleGroup {
  /** 원본 사진(누끼 전) */
  source: { src: string; alt: { ko: string; en: string } };
  cuts: PhotoSampleCut[];
}

export const PHOTO_SAMPLES: Record<'pet' | 'couple' | 'team', PhotoSampleGroup> = {
  pet: {
    source: { src: '/samples/photo/src-dog.webp', alt: { ko: '반려견 원본 사진 예시', en: 'Sample pet photo' } },
    cuts: [
      {
        src: '/samples/photo/pet-dog-sit.webp',
        line: { ko: '오늘 늦게 와?', en: 'Home late?' },
        alt: { ko: '오늘 늦게 와? 시츄 실사 사진 스티커 예시', en: 'Home late pet photo sticker sample' },
        emotion: 'sulk',
        style: 'round',
        ink: '#241C14',
      },
      {
        src: '/samples/photo/pet-dog-beg.webp',
        line: { ko: '지금 뭐 먹어?', en: 'What are you eating?' },
        alt: { ko: '지금 뭐 먹어? 시츄 실사 사진 스티커 예시', en: 'What are you eating pet photo sticker sample' },
        emotion: 'surprised',
        style: 'meme',
        ink: '#241C14',
      },
      {
        src: '/samples/photo/pet-dog-look.webp',
        line: { ko: '나 좀 봐줘', en: 'Look at me' },
        alt: { ko: '나 좀 봐줘 시츄 실사 사진 스티커 예시', en: 'Look at me pet photo sticker sample' },
        emotion: 'love',
        style: 'brush',
        ink: '#241C14',
      },
    ],
  },
  couple: {
    source: { src: '/samples/photo/src-couple.webp', alt: { ko: '커플 원본 사진 예시', en: 'Sample couple photo' } },
    cuts: [
      {
        src: '/samples/photo/couple-hug.webp',
        line: { ko: '좋아해', en: 'Love you' },
        alt: { ko: '좋아해 커플 실사 스티커 예시', en: 'Love you couple sticker sample' },
        emotion: 'love',
      },
      {
        src: '/samples/photo/couple-sulk.webp',
        line: { ko: '삐짐', en: 'Sulking' },
        alt: { ko: '삐짐 커플 실사 스티커 예시', en: 'Sulking couple sticker sample' },
        emotion: 'sulk',
      },
      {
        src: '/samples/photo/couple-heart.webp',
        line: { ko: '뽀뽀 갈겨', en: 'Smooch' },
        alt: { ko: '뽀뽀 갈겨 커플 실사 스티커 예시', en: 'Smooch couple sticker sample' },
        emotion: 'laugh',
      },
    ],
  },
  team: {
    source: { src: '/samples/photo/src-team.webp', alt: { ko: '팀 원본 사진 예시', en: 'Sample team photo' } },
    cuts: [
      {
        src: '/samples/photo/team-laugh.webp',
        line: { ko: '점심 뭐 먹지', en: 'Lunch?' },
        alt: { ko: '점심 뭐 먹지 팀 실사 스티커 예시', en: 'Lunch team sticker sample' },
        emotion: 'laugh',
      },
      {
        src: '/samples/photo/team-tired.webp',
        line: { ko: '몸만 출근', en: 'Body at work' },
        alt: { ko: '몸만 출근 팀 실사 스티커 예시', en: 'Body at work team sticker sample' },
        emotion: 'tired',
      },
      {
        src: '/samples/photo/team-cheer.webp',
        line: { ko: '칼퇴한다', en: 'Clock out' },
        alt: { ko: '칼퇴한다 팀 실사 스티커 예시', en: 'Clock out team sticker sample' },
        emotion: 'joy',
      },
    ],
  },
};

/** 홈·영문 랜딩 히어로 콜라주 — 실사 컷 3장(반려동물·커플·팀)을 겹쳐 보여 준다. */
export const HERO_PHOTO_CUTS = [
  { src: '/samples/photo/pet-dog-sit.webp', label: { ko: '반려동물', en: 'Pets' } },
  { src: '/samples/photo/couple-heart.webp', label: { ko: '커플', en: 'Couple' } },
  { src: '/samples/photo/team-cheer.webp', label: { ko: '팀', en: 'Team' } },
] as const;

/**
 * 화풍 타일 — '실사 짤'(사진 누끼, 무료)이 맨 앞, 그다음 실사 포토, 나머지는 무료 AI 화풍.
 *  · 홈·영문 랜딩의 STYLE LIBRARY 가 이 순서를 그대로 쓴다.
 *  · 실사 짤 타일만 사진 누끼 컷을 쓰고, 나머지는 그 화풍의 대표 컷(tone-*.webp)을 쓴다.
 */
export const STYLE_TILES = [
  { src: '/samples/photo/pet-dog-sit.webp', tone: 'photo-sticker' as const, label: { ko: '실사 짤', en: 'Photo cut' }, badge: { ko: '무료 · 사진 그대로', en: 'Free · no AI' } },
  { src: '/samples/tone-caricature.webp', tone: 'caricature' as const, label: { ko: '실사 포토', en: 'Photo look' } },
  { src: '/samples/tone-2d-cute.webp', tone: '2d-cute' as const, label: { ko: '2D 캐릭터', en: '2D character' } },
  { src: '/samples/tone-doodle.webp', tone: 'doodle' as const, label: { ko: '힐링 낙서', en: 'Doodle' } },
  { src: '/samples/tone-office-meme.webp', tone: 'office-meme' as const, label: { ko: '직장인 밈', en: 'Office meme' } },
  { src: '/samples/tone-clay-3d.webp', tone: 'clay-3d' as const, label: { ko: '말랑 3D', en: 'Clay 3D' } },
  { src: '/samples/tone-pixel-art.webp', tone: 'pixel-art' as const, label: { ko: '레트로 픽셀', en: 'Pixel art' } },
] as const;

/** /waitlist · /quotes 상단에 놓는 '내 얼굴 실사 짤' 예시 — 12감정 실사 컷 재사용. */
export const FACE_PHOTO_CUTS = [
  { src: '/samples/quote-photo/joy.webp', line: { ko: '고마워!', en: 'Thank you!' }, emotion: 'joy' as const },
  { src: '/samples/quote-photo/laugh.webp', line: { ko: 'ㅋㅋㅋ', en: 'LOL' }, emotion: 'laugh' as const },
  { src: '/samples/quote-photo/love.webp', line: { ko: '심쿵', en: 'Heart eyes' }, emotion: 'love' as const },
  { src: '/samples/quote-photo/king.webp', line: { ko: '킹받네', en: 'Seriously?!' }, emotion: 'king' as const },
] as const;
