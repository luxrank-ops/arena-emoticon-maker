import type { Emotion } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// 검증된 성공 공식 카탈로그 (SituationTemplate)
// 카카오 히트 이모티콘의 공통 문법: ①하루 동선 ②3초 판독 ③만능 컷 ④짧은 말맛
// ─────────────────────────────────────────────────────────────

export type Slot = 'morning' | 'work' | 'evening' | 'night' | 'any';
export type Category = 'work' | 'money' | 'food' | 'love' | 'social' | 'reaction' | 'celebrate' | 'sass';

export interface SituationTemplate {
  id: string;
  category: Category;
  emotion: Emotion;
  label: string;
  line: string;
  evergreen: boolean;
  slot: Slot;
  weight: number;
  keywords: string[];
}

export const CATEGORY_LABEL: Record<Category, string> = {
  work: '회사·학교',
  money: '돈·월급',
  food: '밥·카페',
  love: '연애·친구',
  social: '사과·부탁',
  reaction: '리액션',
  celebrate: '축하·기념일',
  sass: '킹받음·층',
};

export const TEMPLATES: SituationTemplate[] = [
  // ── 만능 컷 (어디든 쓰는 기본기) ──────────────────────────
  { id: 't-ok', category: 'reaction', emotion: 'joy', label: '오케이', line: 'ㅇㅋ', evergreen: true, slot: 'any', weight: 12, keywords: ['오케이', '콜', '알겠', 'ㅇㅋ', '좋아', '네'] },
  { id: 't-good', category: 'reaction', emotion: 'smug', label: '좋았어', line: '좋았어', evergreen: true, slot: 'any', weight: 11, keywords: ['좋', '굿', '최고', '완벽'] },
  { id: 't-thx', category: 'social', emotion: 'joy', label: '고마워', line: '고마워!', evergreen: true, slot: 'any', weight: 11, keywords: ['고마', '감사', '땡큐', 'thanks'] },
  { id: 't-hi', category: 'reaction', emotion: 'joy', label: '하이', line: '하이루', evergreen: true, slot: 'any', weight: 9, keywords: ['안녕', '하이', '반가'] },
  { id: 't-hmm', category: 'reaction', emotion: 'blank', label: '정색', line: '...', evergreen: true, slot: 'any', weight: 8, keywords: ['...', '흠', '글쎄'] },
  { id: 't-lol', category: 'reaction', emotion: 'laugh', label: 'ㅋㅋㅋ', line: 'ㅋㅋㅋㅋ', evergreen: true, slot: 'any', weight: 12, keywords: ['ㅋㅋ', '웃겨', '빵터', '개웃'] },
  { id: 't-bye', category: 'reaction', emotion: 'joy', label: '바이', line: '바이바이', evergreen: true, slot: 'any', weight: 7, keywords: ['잘가', '바이', '이따'] },
  { id: 't-zzz', category: 'reaction', emotion: 'tired', label: '졸림', line: '졸려...', evergreen: true, slot: 'any', weight: 9, keywords: ['졸려', '자야', '잠'] },

  // ── 회사·학교 ────────────────────────────────────────────
  { id: 't-commute', category: 'work', emotion: 'tired', label: '출근', line: '출근합니다', evergreen: false, slot: 'morning', weight: 10, keywords: ['출근', '아침', '회사'] },
  { id: 't-offwork', category: 'work', emotion: 'joy', label: '퇴근', line: '퇴근!!', evergreen: false, slot: 'evening', weight: 13, keywords: ['퇴근', '칼퇴', '집에'] },
  { id: 't-overtime', category: 'work', emotion: 'cry', label: '야근', line: '야근 각', evergreen: false, slot: 'night', weight: 10, keywords: ['야근', '늦게', '일이'] },
  { id: 't-meeting', category: 'work', emotion: 'blank', label: '회의', line: '회의 중', evergreen: false, slot: 'work', weight: 8, keywords: ['회의', '미팅', '바빠'] },
  { id: 't-email', category: 'work', emotion: 'sulk', label: '메일', line: '메일 확인 중', evergreen: false, slot: 'work', weight: 6, keywords: ['메일', '메일함', '확인'] },
  { id: 't-boss', category: 'work', emotion: 'king', label: '상사', line: '또 나야?', evergreen: false, slot: 'work', weight: 8, keywords: ['상사', '팀장', '사수'] },
  { id: 't-deadline', category: 'work', emotion: 'surprised', label: '마감', line: '마감이...!', evergreen: false, slot: 'work', weight: 8, keywords: ['마감', '데드라인', '제출'] },
  { id: 't-lunch', category: 'food', emotion: 'smug', label: '점심', line: '점심 뭐 먹지', evergreen: false, slot: 'work', weight: 9, keywords: ['점심', '밥', '메뉴'] },
  { id: 't-quit', category: 'work', emotion: 'king', label: '사직', line: '관두고 싶다', evergreen: false, slot: 'work', weight: 7, keywords: ['관두', '퇴사', '힘들'] },

  // ── 돈·월급 ─────────────────────────────────────────────
  { id: 't-payday', category: 'money', emotion: 'love', label: '월급날', line: '월급 들어왔다', evergreen: false, slot: 'any', weight: 10, keywords: ['월급', '돈', '입금'] },
  { id: 't-broke', category: 'money', emotion: 'cry', label: '텅장', line: '텅장...', evergreen: false, slot: 'evening', weight: 9, keywords: ['텅장', '돈이 없', '가난', '지출'] },
  { id: 't-buy', category: 'money', emotion: 'love', label: '지름', line: '그냥 지름', evergreen: false, slot: 'any', weight: 6, keywords: ['샀', '지름', '쇼핑', '결제'] },

  // ── 밥·카페 ─────────────────────────────────────────────
  { id: 't-hungry', category: 'food', emotion: 'sad', label: '배고파', line: '배고파아', evergreen: false, slot: 'any', weight: 10, keywords: ['배고', '밥 먹', '출출'] },
  { id: 't-coffee', category: 'food', emotion: 'tired', label: '커피', line: '커피 한 잔', evergreen: false, slot: 'morning', weight: 9, keywords: ['커피', '카페', '아아'] },
  { id: 't-chicken', category: 'food', emotion: 'laugh', label: '치킨', line: '치킨 먹자', evergreen: false, slot: 'night', weight: 8, keywords: ['치킨', '야식', '배달'] },
  { id: 't-drink', category: 'food', emotion: 'smug', label: '한잔', line: '한잔 하실?', evergreen: false, slot: 'night', weight: 7, keywords: ['술', '한잔', '소주', '맥주'] },

  // ── 연애·친구 ────────────────────────────────────────────
  { id: 't-miss', category: 'love', emotion: 'love', label: '보고파', line: '보고싶어', evergreen: false, slot: 'night', weight: 8, keywords: ['보고싶', '생각나'] },
  { id: 't-loveyou', category: 'love', emotion: 'love', label: '사랑해', line: '사랑해 ♥', evergreen: false, slot: 'any', weight: 8, keywords: ['사랑', '♥', '하트'] },
  { id: 't-hug', category: 'love', emotion: 'joy', label: '안아줘', line: '안아줘', evergreen: false, slot: 'any', weight: 7, keywords: ['안아', '위로', '토닥'] },
  { id: 't-anniv', category: 'celebrate', emotion: 'love', label: '기념일', line: '기념일인데?', evergreen: false, slot: 'any', weight: 7, keywords: ['기념일', '100일', '생일'] },

  // ── 사과·부탁 ────────────────────────────────────────────
  { id: 't-sorry', category: 'social', emotion: 'sulk', label: '미안', line: '미안미안', evergreen: false, slot: 'any', weight: 10, keywords: ['미안', '사과', 'sorry', '잘못'] },
  { id: 't-please', category: 'social', emotion: 'sulk', label: '부탁', line: '제발 한 번만', evergreen: false, slot: 'any', weight: 8, keywords: ['부탁', '제발', '해줘'] },
  { id: 't-late', category: 'social', emotion: 'surprised', label: '지각', line: '5분만!', evergreen: false, slot: 'morning', weight: 7, keywords: ['지각', '늦어', '5분'] },
  { id: 't-no', category: 'social', emotion: 'blank', label: '거절', line: '그건 좀...', evergreen: false, slot: 'any', weight: 9, keywords: ['안돼', '거절', '싫어', '못 해'] },
  { id: 't-okay', category: 'social', emotion: 'joy', label: '승낙', line: '내가 할게', evergreen: false, slot: 'any', weight: 7, keywords: ['할게', '맡겨', '내가'] },

  // ── 리액션 ──────────────────────────────────────────────
  { id: 't-wow', category: 'reaction', emotion: 'surprised', label: '헉', line: '헉', evergreen: false, slot: 'any', weight: 11, keywords: ['헉', '대박', '진짜?', '놀라'] },
  { id: 't-gasp', category: 'reaction', emotion: 'surprised', label: '충격', line: '이게 뭐야', evergreen: false, slot: 'any', weight: 7, keywords: ['충격', '뭐야', '말이 돼'] },
  { id: 't-clap', category: 'reaction', emotion: 'smug', label: '박수', line: '짝짝짝', evergreen: false, slot: 'any', weight: 6, keywords: ['박수', '짝짝', '멋지'] },
  { id: 't-thumb', category: 'reaction', emotion: 'smug', label: '엄지척', line: '굿굿', evergreen: false, slot: 'any', weight: 8, keywords: ['굿', '좋아요', '오케이'] },
  { id: 't-cryy', category: 'reaction', emotion: 'cry', label: '엉엉', line: 'ㅠㅠ', evergreen: false, slot: 'any', weight: 11, keywords: ['ㅠㅠ', '슬퍼', '울고', '힘들'] },
  { id: 't-omg', category: 'reaction', emotion: 'laugh', label: '실실', line: '이거 실화냐', evergreen: false, slot: 'any', weight: 7, keywords: ['실화', '레전드', '미쳤'] },
  { id: 't-sigh', category: 'reaction', emotion: 'tired', label: '한숨', line: '하...', evergreen: false, slot: 'any', weight: 9, keywords: ['하...', '한숨', '지친'] },

  // ── 축하·기념일 ──────────────────────────────────────────
  { id: 't-hbd', category: 'celebrate', emotion: 'laugh', label: '생일', line: '생일 축하해!', evergreen: false, slot: 'any', weight: 9, keywords: ['생일', '축하', 'happy birthday'] },
  { id: 't-cong', category: 'celebrate', emotion: 'laugh', label: '축하', line: '축하드립니다', evergreen: false, slot: 'any', weight: 8, keywords: ['축하', '합격', '승진', '취업'] },
  { id: 't-cheer', category: 'celebrate', emotion: 'joy', label: '응원', line: '할 수 있어!', evergreen: false, slot: 'any', weight: 8, keywords: ['응원', '화이팅', '파이팅', '힘내'] },
  { id: 't-newyear', category: 'celebrate', emotion: 'joy', label: '새해', line: '새해 복 많이', evergreen: false, slot: 'any', weight: 5, keywords: ['새해', '설날', '명절'] },

  // ── 킹받음·츤데레 ────────────────────────────────────────
  { id: 't-king', category: 'sass', emotion: 'king', label: '킹받음', line: '킹받네', evergreen: false, slot: 'any', weight: 12, keywords: ['킹받', '열받', '빡쳐', '화나'] },
  { id: 't-why', category: 'sass', emotion: 'angry', label: '왜그래', line: '왜 그러는데', evergreen: false, slot: 'any', weight: 9, keywords: ['왜', '이해 안', '어이없'] },
  { id: 't-sulk2', category: 'sass', emotion: 'sulk', label: '삐짐', line: '삐졌음', evergreen: false, slot: 'any', weight: 9, keywords: ['삐졌', '서운', '섭섭'] },
  { id: 't-tsun', category: 'sass', emotion: 'smug', label: '츤데레', line: '딱히 널 위해', evergreen: false, slot: 'any', weight: 6, keywords: ['딱히', '별로', '아닌데'] },
  { id: 't-hmph', category: 'sass', emotion: 'sulk', label: '흥', line: '흥', evergreen: false, slot: 'any', weight: 7, keywords: ['흥', '무시', '어쩌라고'] },
  { id: 't-done', category: 'sass', emotion: 'blank', label: '지쳤', line: '더는 못 해', evergreen: false, slot: 'night', weight: 7, keywords: ['지쳐', '못 하겠', '포기'] },
];

export const TEMPLATES_BY_ID: Record<string, SituationTemplate> = Object.fromEntries(
  TEMPLATES.map((t) => [t.id, t]),
);
