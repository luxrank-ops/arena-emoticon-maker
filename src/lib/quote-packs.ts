import type { Emotion, Tone } from '@/lib/types';

export interface QuoteLine {
  id: string;
  label: string;
  line: string;
  emotion: Emotion;
}

export interface QuotePack {
  id: string;
  title: string;
  genre: string;
  tagline: string;
  description: string;
  emoji: string;
  tone: Tone;
  accent: string;
  priceCredits: number;
  lines: QuoteLine[];
  rights: {
    kind: 'ORIGINAL';
    reviewedAt: string;
    note: string;
  };
}

export interface QuotePackView extends Omit<QuotePack, 'lines'> {
  lines: QuoteLine[];
  lineCount: number;
  access: 'FULL' | 'PREVIEW';
}

const ORIGINAL_RIGHTS = {
  kind: 'ORIGINAL' as const,
  reviewedAt: '2026-11-05',
  note: '이모티학을 위해 작성한 오리지널 문구입니다. 특정 작품의 대사, 작품명, 캐릭터 또는 배우 초상을 사용하지 않습니다.',
};

/**
 * Genre moods only — no copied movie/drama lines or recognizable character IP.
 * A future licensed pack needs separate written license evidence before it is added here.
 */
export const QUOTE_PACKS: QuotePack[] = [
  {
    id: 'daily-cuts',
    title: '오늘의 한 컷',
    genre: '일상 드라마',
    tagline: '평범한 오늘도 주인공처럼',
    description: '위로, 자신감, 사랑, 휴식을 담은 무료 6컷 팩.',
    emoji: '🌤️',
    tone: '2d-cute',
    accent: '#FFCF4D',
    priceCredits: 0,
    rights: ORIGINAL_RIGHTS,
    lines: [
      { id: 'daily-01', label: '자기 응원', line: '오늘도 나는 내 편', emotion: 'joy' },
      { id: 'daily-02', label: '현재 집중', line: '잠깐, 지금이 제일 중요해', emotion: 'surprised' },
      { id: 'daily-03', label: '다시 시작', line: '괜찮아, 다시 하면 돼', emotion: 'sad' },
      { id: 'daily-04', label: '자신감', line: '나 지금 좀 멋진데?', emotion: 'smug' },
      { id: 'daily-05', label: '마음의 대답', line: '마음이 먼저 대답했어', emotion: 'love' },
      { id: 'daily-06', label: '하루 마무리', line: '오늘은 여기까지', emotion: 'tired' },
    ],
  },
  {
    id: 'film-romance',
    title: '필름 로맨스',
    genre: '로맨스 영화 무드',
    tagline: '두 사람의 장면이 오래 남도록',
    description: '설렘, 고백, 그리움을 부드러운 영화 한 장면처럼.',
    emoji: '🎞️',
    tone: 'watercolor',
    accent: '#FF8B94',
    priceCredits: 6,
    rights: ORIGINAL_RIGHTS,
    lines: [
      { id: 'romance-01', label: '설렘', line: '내 하루에 네가 들어왔어', emotion: 'love' },
      { id: 'romance-02', label: '반가운 우연', line: '오늘의 우연이 반가웠으면 해', emotion: 'joy' },
      { id: 'romance-03', label: '미소', line: '네가 웃으면 내 하루도 반짝여', emotion: 'joy' },
      { id: 'romance-04', label: '고백', line: '어제와는 다른 고백을 할래', emotion: 'love' },
      { id: 'romance-05', label: '같은 방향', line: '우리 같은 방향으로 걸을래?', emotion: 'love' },
      { id: 'romance-06', label: '빠져듦', line: '이게 설렘이면 나 완전 빠졌어', emotion: 'love' },
      { id: 'romance-07', label: '그리움', line: '네 이름에 마음이 먼저 젖어', emotion: 'cry' },
      { id: 'romance-08', label: '다음 장면', line: '우리의 다음 장면도 기대할게', emotion: 'joy' },
    ],
  },
  {
    id: 'office-sitcom',
    title: '오피스 시트콤',
    genre: '직장 코미디 드라마',
    tagline: '회의와 퇴근 사이, 웃긴 내가 주인공',
    description: '월요일, 커피, 회의, 퇴근을 시트콤 한 컷으로.',
    emoji: '☕',
    tone: '3d-cartoon',
    accent: '#5AB8F5',
    priceCredits: 6,
    rights: ORIGINAL_RIGHTS,
    lines: [
      { id: 'office-01', label: '퇴근 응원', line: '오늘도 무사히 퇴근합시다', emotion: 'joy' },
      { id: 'office-02', label: '당당함', line: '제 몫은 제가 챙기겠습니다', emotion: 'smug' },
      { id: 'office-03', label: '회의와 커피', line: '회의는 짧게, 커피는 진하게', emotion: 'tired' },
      { id: 'office-04', label: '시스템 탓', line: '제가 아니라 시스템이 그래요', emotion: 'blank' },
      { id: 'office-05', label: '월요일', line: '월요일은 나도 아직 준비 중', emotion: 'tired' },
      { id: 'office-06', label: '메모 완료', line: '네? 방금 그 말, 메모했습니다', emotion: 'surprised' },
      { id: 'office-07', label: '퇴근 후 주인공', line: '퇴근 후엔 제가 주인공입니다', emotion: 'smug' },
      { id: 'office-08', label: '점심 먼저', line: '일단 침착하고 점심부터', emotion: 'joy' },
    ],
  },
  {
    id: 'fantasy-epic',
    title: '판타지 극장',
    genre: '모험 판타지 무드',
    tagline: '막막한 순간에도 한 걸음 더',
    description: '용기, 계약, 반전, 새벽의 승리를 담은 모험 팩.',
    emoji: '🗡️',
    tone: 'clay-3d',
    accent: '#7C6BFF',
    priceCredits: 6,
    rights: ORIGINAL_RIGHTS,
    lines: [
      { id: 'fantasy-01', label: '의지', line: '이 검보다 내 의지가 먼저다', emotion: 'king' },
      { id: 'fantasy-02', label: '운명 극복', line: '운명은 내가 다시 쓰겠다', emotion: 'angry' },
      { id: 'fantasy-03', label: '작은 불씨', line: '작은 불씨가 세상을 바꿔요', emotion: 'joy' },
      { id: 'fantasy-04', label: '다른 차원', line: '문이 닫히면 다른 차원을 열죠', emotion: 'smug' },
      { id: 'fantasy-05', label: '용기', line: '겁나도, 나는 한 걸음 더', emotion: 'surprised' },
      { id: 'fantasy-06', label: '계약 종료', line: '우리의 계약은 여기까지다', emotion: 'blank' },
      { id: 'fantasy-07', label: '모험가의 배고픔', line: '용보다 무서운 건 내 배고픔', emotion: 'laugh' },
      { id: 'fantasy-08', label: '새벽의 승리', line: '새벽이 오면 우리가 이긴다', emotion: 'joy' },
    ],
  },
  {
    id: 'noir-mystery',
    title: '느와르 미스터리',
    genre: '범죄·추리 영화 무드',
    tagline: '침착한 한마디가 사건을 바꿉니다',
    description: '증거, 질문, 반전을 차가운 추리극 분위기로.',
    emoji: '🕵️',
    tone: 'mono',
    accent: '#6B615A',
    priceCredits: 8,
    rights: ORIGINAL_RIGHTS,
    lines: [
      { id: 'noir-01', label: '증거', line: '증거는 침묵보다 정확합니다', emotion: 'blank' },
      { id: 'noir-02', label: '긴 밤', line: '오늘 밤은 쉽게 끝나지 않겠네', emotion: 'tired' },
      { id: 'noir-03', label: '표정의 단서', line: '거짓말은 표정이 먼저 알려줘', emotion: 'blank' },
      { id: 'noir-04', label: '마지막 질문', line: '마지막 질문입니다. 어디 있었죠?', emotion: 'blank' },
      { id: 'noir-05', label: '우연의 규칙', line: '우연이 세 번이면 계획이죠', emotion: 'smug' },
      { id: 'noir-06', label: '비와 흔적', line: '비가 오면 흔적은 더 선명해져', emotion: 'sad' },
      { id: 'noir-07', label: '끝까지 듣기', line: '나는 끝까지 듣는 사람입니다', emotion: 'angry' },
      { id: 'noir-08', label: '반전', line: '이제 반전은 내가 만들 차례야', emotion: 'smug' },
    ],
  },
];

export function quotePackById(id: string): QuotePack | undefined {
  return QUOTE_PACKS.find((pack) => pack.id === id);
}

/** Locked packs expose only two public sample lines to the browser. */
export function quotePackView(pack: QuotePack, fullAccess: boolean): QuotePackView {
  return {
    ...pack,
    lines: fullAccess ? pack.lines : pack.lines.slice(0, 2),
    lineCount: pack.lines.length,
    access: fullAccess ? 'FULL' : 'PREVIEW',
  };
}
