import type { Emotion } from '@/lib/types';

/** 독창적인 일상 반응 프리셋. 특정 캐릭터나 인기 순위를 복제하지 않는다. */
export const COMIC_EXPRESSIONS: { id: string; label: string; emoji: string; emotion: Emotion; line: string; action: string }[] = [
  { id: 'burst-laugh', label: '빵 터짐', emoji: '🤣', emotion: 'laugh', line: 'ㅋㅋㅋㅋ', action: 'bursting into laughter with crinkled eyes and a hand near the mouth' },
  { id: 'awkward-smile', label: '어색한 미소', emoji: '😅', emotion: 'smug', line: '하하...', action: 'giving an awkward tight smile with a small sweat drop' },
  { id: 'speechless', label: '말문 막힘', emoji: '😶', emotion: 'blank', line: '할말잃음', action: 'staring silently with a deadpan expression' },
  { id: 'shocked', label: '충격', emoji: '😱', emotion: 'surprised', line: '실화야?', action: 'looking shocked with wide eyes and hands at the cheeks' },
  { id: 'annoyed', label: '킹받음', emoji: '😤', emotion: 'king', line: '킹받네', action: 'showing playful frustration with furrowed brows and a small puff of steam' },
  { id: 'pout', label: '토라짐', emoji: '😗', emotion: 'sulk', line: '삐졌어', action: 'pouting and folding arms with a sideways glance' },
  { id: 'ugly-cry', label: '엉엉 울기', emoji: '😭', emotion: 'cry', line: '엉엉', action: 'crying comically with large tear drops' },
  { id: 'tired', label: '방전', emoji: '🪫', emotion: 'tired', line: '방전...', action: 'slumping sleepily with droopy eyes and a tiny low battery symbol' },
  { id: 'excited', label: '들뜸', emoji: '🤩', emotion: 'joy', line: '신난다!', action: 'raising both fists with an excited smile' },
  { id: 'love', label: '심쿵', emoji: '😍', emotion: 'love', line: '심쿵', action: 'smiling affectionately with small hearts around the face' },
  { id: 'smug', label: '뿌듯', emoji: '😎', emotion: 'smug', line: '나 좀 해', action: 'smirking confidently and giving a thumbs up' },
  { id: 'suspicious', label: '의심', emoji: '🤨', emotion: 'blank', line: '수상한데?', action: 'raising one eyebrow and giving a skeptical sideways glance' },
  { id: 'sorry', label: '급사과', emoji: '🙏', emotion: 'sulk', line: '미안해', action: 'apologizing with palms together and an embarrassed expression' },
  { id: 'please', label: '간절한 부탁', emoji: '🥺', emotion: 'sad', line: '제발요', action: 'pleading with hands clasped and hopeful eyes' },
  { id: 'cheer', label: '열혈 응원', emoji: '💪', emotion: 'joy', line: '파이팅!', action: 'cheering with one fist raised and a determined smile' },
  { id: 'clap', label: '폭풍 박수', emoji: '👏', emotion: 'laugh', line: '짝짝짝', action: 'clapping enthusiastically with a delighted smile' },
  { id: 'hungry', label: '배고픔', emoji: '🍚', emotion: 'sad', line: '밥 줘', action: 'looking hungry and holding the stomach with a playful expression' },
  { id: 'yum', label: '맛있음', emoji: '😋', emotion: 'joy', line: '냠냠', action: 'enjoying a small bite with a satisfied smile' },
  { id: 'sleepy', label: '꾸벅꾸벅', emoji: '😴', emotion: 'tired', line: '졸려...', action: 'yawning sleepily with one hand near the mouth' },
  { id: 'runaway', label: '도망가자', emoji: '💨', emotion: 'surprised', line: '도망가!', action: 'making a playful hurried escape gesture while keeping the face visible' },
  { id: 'thinking', label: '고민 중', emoji: '🤔', emotion: 'blank', line: '음...', action: 'thinking with a hand resting on the chin' },
  { id: 'celebrate', label: '축하 폭죽', emoji: '🎉', emotion: 'laugh', line: '축하해!', action: 'celebrating joyfully with a few small confetti accents' },
  { id: 'nope', label: '단호한 거절', emoji: '🙅', emotion: 'angry', line: '안 돼!', action: 'making a clear but playful no gesture with crossed forearms' },
  { id: 'okay', label: '쿨한 수락', emoji: '👌', emotion: 'joy', line: '오케이', action: 'giving an okay hand sign with a relaxed smile' },
];
export const comicExpressionById = (id: string) => COMIC_EXPRESSIONS.find((item) => item.id === id);
