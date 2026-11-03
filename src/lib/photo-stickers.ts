import type { Emotion } from '@/lib/types';

/** 실사 스티커 팩의 고정 표정·대사 구성. 각 항목은 별도 컷으로 생성한다. */
export const PHOTO_STICKER_SCENES: { id: string; label: string; line: string; emotion: Emotion; action: string }[] = [
  { id: 'photo-hello', label: '인사', line: '안녕', emotion: 'joy', action: 'waving one hand in greeting' },
  { id: 'photo-smile', label: '미소', line: '헤헷', emotion: 'laugh', action: 'smiling warmly' },
  { id: 'photo-cry', label: '울음', line: '흑흑', emotion: 'cry', action: 'crying with small blue tear accents' },
  { id: 'photo-sleep', label: '졸림', line: '졸려', emotion: 'tired', action: 'yawning with one hand near the mouth' },
  { id: 'photo-excited', label: '신남', line: '신나', emotion: 'joy', action: 'raising both fists excitedly' },
  { id: 'photo-thanks', label: '감사', line: '고마워', emotion: 'joy', action: 'pressing palms together in gratitude' },
  { id: 'photo-love', label: '사랑', line: '사랑해', emotion: 'love', action: 'forming a heart with both hands' },
  { id: 'photo-surprise', label: '놀람', line: '헉!', emotion: 'surprised', action: 'reacting with surprise' },
  { id: 'photo-eat', label: '먹기', line: '냠냠', emotion: 'joy', action: 'eating a small bite of food with chopsticks' },
  { id: 'photo-frown', label: '찡그림', line: '으잉', emotion: 'sad', action: 'frowning in confusion' },
  { id: 'photo-shy', label: '부끄러움', line: '부끄', emotion: 'love', action: 'holding cheeks shyly with a gentle blush' },
  { id: 'photo-think', label: '생각', line: '뭐지?', emotion: 'blank', action: 'thoughtfully resting a hand on the chin' },
  { id: 'photo-wink', label: '윙크', line: '찡긋', emotion: 'smug', action: 'winking and pointing playfully' },
  { id: 'photo-cheer', label: '응원', line: '파이팅', emotion: 'joy', action: 'raising a fist in encouragement' },
  { id: 'photo-sulk', label: '삐짐', line: '삐짐', emotion: 'sulk', action: 'pouting with arms folded' },
  { id: 'photo-good', label: '좋아', line: '좋아', emotion: 'smug', action: 'giving a cheerful thumbs up' },
];
