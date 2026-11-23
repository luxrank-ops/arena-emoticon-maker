// ─────────────────────────────────────────────────────────────
// 드립·밈 문구 테마 7종 · 66컷 (킹받는 반전·드립)
//  · 사용자가 리서칭해 지정한 문구를 순서·문구 그대로 담는다 (수정·재정렬 금지).
//  · 대사 팩(/quotes)과 테마별 추천 대사(/presets)가 이 파일 하나를 공유한다.
//  · 감정(emotion)은 캘리그라피·복합 데코 엔진(decor.ts)의 모티프 선택에 그대로 쓰인다.
//    (예: 'laugh' → ^^·음표, 'tired' → 구름·땀, 'smug' → 별·반짝이, 'blank' → 무표정)
//  · 무결성(7테마·66줄·중복 없음·감정 유효)은 scripts/test-drip-themes.ts 가 전수 검사한다.
// ─────────────────────────────────────────────────────────────

import type { Emotion } from '@/lib/types';

export type DripThemeId =
  | 'twist-greeting'
  | 'office-yes'
  | 'food-drink'
  | 'group-chat'
  | 'dialect'
  | 'flirty'
  | 'family-cheer';

export interface DripLine {
  /** 전역 고유 id (dr-01 ~ dr-66) */
  id: string;
  themeId: DripThemeId;
  /** 컷 카드에 쓰는 짧은 이름 */
  label: string;
  labelEn: string;
  /** 말풍선에 넣는 대사 */
  line: string;
  lineEn: string;
  emotion: Emotion;
}

export interface DripTheme {
  id: DripThemeId;
  emoji: string;
  title: string;
  titleEn: string;
  tagline: string;
  taglineEn: string;
  /** 카드 강조색 (tailwind gradient) */
  accent: string;
  lines: DripLine[];
}

const line = (
  id: string,
  themeId: DripThemeId,
  label: string,
  labelEn: string,
  ko: string,
  en: string,
  emotion: Emotion,
): DripLine => ({ id, themeId, label, labelEn, line: ko, lineEn: en, emotion });

export const DRIP_THEMES: DripTheme[] = [
  {
    id: 'twist-greeting',
    emoji: '🙃',
    title: '반전 인사·리액션',
    titleEn: 'Twist greetings & reactions',
    tagline: '인사인데 인사 같지 않은 10컷',
    taglineEn: 'Ten greetings that are not really greetings',
    accent: 'from-primary to-sky',
    lines: [
      line('dr-01', 'twist-greeting', '생존 신고', 'Survival report', '생존 신고합니다', 'Reporting in: still alive', 'smug'),
      line('dr-02', 'twist-greeting', '영혼 로딩', 'Soul loading', '눈은 떴고 영혼은 로딩 중', 'Eyes open, soul still loading', 'tired'),
      line('dr-03', 'twist-greeting', '은혜 월급날', 'Payday gratitude', '은혜는 월급날 갚겠음', 'I will repay the favor on payday', 'smug'),
      line('dr-04', 'twist-greeting', '절 받으세요', 'Accept my bow', '절 받으세요', 'Please accept my deepest bow', 'smug'),
      line('dr-05', 'twist-greeting', '입이 방정', 'Loose lips', '제 입이 방정입니다', 'My mouth has no filter', 'smug'),
      line('dr-06', 'twist-greeting', '양심 가출', 'Conscience on leave', '양심이 잠깐 가출함', 'My conscience stepped out briefly', 'blank'),
      line('dr-07', 'twist-greeting', '인생 치트키', 'Life cheat code', '인생 치트키 쓰셨네', 'You used a life cheat code', 'surprised'),
      line('dr-08', 'twist-greeting', '내일부턴 모름', 'Not tomorrow', '내일 나 찾는 사람 모름', 'If you look for me tomorrow, no you did not', 'smug'),
      line('dr-09', 'twist-greeting', '꿈에서도 출근', 'No work in dreams', '꿈에서도 출근 금지', 'No clocking in, even in my dreams', 'tired'),
      line('dr-10', 'twist-greeting', '어떻게든 되겠지', 'It will work out', '어떻게든 되겠지 뭐', 'It will somehow work out, probably', 'blank'),
    ],
  },
  {
    id: 'office-yes',
    emoji: '💼',
    title: '직장인 넵티콘·생존',
    titleEn: 'Office "yep" survival kit',
    tagline: '넵! 하고 영혼은 퇴근한 12컷',
    taglineEn: 'Twelve cuts where the body says yes and the soul clocks out',
    accent: 'from-cyber to-primary',
    lines: [
      line('dr-11', 'office-yes', '영혼 없는 넵', 'Soulless yes', '넵! (영혼 없음)', 'Yep! (soul not included)', 'blank'),
      line('dr-12', 'office-yes', '네? 제가요?', 'Me, really?', '네? 제가요? 왜요?', 'Sorry? Me? Why me?', 'surprised'),
      line('dr-13', 'office-yes', '알겠습니다', 'Noted, allegedly', '알겠습니다 (모르겠음)', 'Understood (I have no idea)', 'blank'),
      line('dr-14', 'office-yes', '몸만 출근', 'Body only', '몸만 출근했습니다', 'Only my body showed up for work', 'tired'),
      line('dr-15', 'office-yes', '월요일 원망', 'Monday blame', '월요일 누가 만들었냐', 'Who invented Monday, seriously', 'angry'),
      line('dr-16', 'office-yes', '퇴근 버튼', 'Clock-out button', '퇴근 버튼 고장남', 'The clock-out button is broken', 'tired'),
      line('dr-17', 'office-yes', '무시하고 퇴근', 'Ignoring it', '무시하고 퇴근 시작', 'Ignoring all of it and leaving now', 'joy'),
      line('dr-18', 'office-yes', '월급 루팡', 'Salary thief', '월급 루팡 출동', 'Salary thief, reporting for duty', 'smug'),
      line('dr-19', 'office-yes', '월급 로그아웃', 'Salary logout', '월급 로그인·로그아웃', 'Salary logged in and immediately out', 'sad'),
      line('dr-20', 'office-yes', '안 들림', 'Not going in', '들어는 있는데 안 들림', 'It goes in, but it does not land', 'blank'),
      line('dr-21', 'office-yes', '나 칭찬해', 'Praise me', '오늘의 나 칭찬해', 'Today me deserves a compliment', 'joy'),
      line('dr-22', 'office-yes', '자유의 몸', 'Free at last', '자유의 몸이다!', 'I am a free person now!', 'joy'),
    ],
  },
  {
    id: 'food-drink',
    emoji: '🍗',
    title: '식사·카페·야식·술자리',
    titleEn: 'Meals, coffee & drinks',
    tagline: '점심부터 한잔까지, 배고픈 순간 10컷',
    taglineEn: 'Ten cuts from lunch decisions to one more round',
    accent: 'from-sky to-mint',
    lines: [
      line('dr-23', 'food-drink', '점심 뭐 먹지', 'What for lunch', '오늘 점심 뭐 먹지', 'What are we eating today', 'blank'),
      line('dr-24', 'food-drink', '치킨 시킬까', 'Order chicken?', '치킨 시킬까?', 'Should we order chicken?', 'joy'),
      line('dr-25', 'food-drink', '야식은 내일부터', 'Late-night menu', '야식은 내일부터 참자', 'Let us hold off on late-night food, starting tomorrow', 'tired'),
      line('dr-26', 'food-drink', '0칼로리', 'Zero calories', '맛있게 먹으면 0칼로리', 'If it tastes good, it is zero calories', 'laugh'),
      line('dr-27', 'food-drink', '다이어트 내일', 'Diet tomorrow', '다이어트는 내일부터', 'The diet starts tomorrow', 'joy'),
      line('dr-28', 'food-drink', '커피 수혈', 'Coffee IV', '커피 수혈 시급', 'Urgent: coffee transfusion needed', 'tired'),
      line('dr-29', 'food-drink', '얼죽아', 'Iced americano', '얼죽아 출동', 'Iced americano gang, on the move', 'smug'),
      line('dr-30', 'food-drink', '한잔 콜', 'Drink call', '한잔 콜?', 'One drink, who is in?', 'joy'),
      line('dr-31', 'food-drink', '적셔보자', 'Let us wet', '적셔보자!', 'Let us wet our throats!', 'laugh'),
      line('dr-32', 'food-drink', '내돈내산', 'Paid it myself', '내돈내산 찐맛집', 'A real gem, paid with my own money', 'smug'),
    ],
  },
  {
    id: 'group-chat',
    emoji: '💬',
    title: '단톡방 티키타카·거절',
    titleEn: 'Group chat banter & refusals',
    tagline: '읽씹부터 거절까지, 단톡방 10컷',
    taglineEn: 'Ten cuts from read-and-ignore to a clean no',
    accent: 'from-primary to-lemon',
    lines: [
      line('dr-33', 'group-chat', '살아는 있지', 'Still alive?', '살아는 있지?', 'You still alive in there?', 'blank'),
      line('dr-34', 'group-chat', '읽씹 감지', 'Read-ignore', '읽씹 감지됨', 'Read-and-ignore detected', 'angry'),
      line('dr-35', 'group-chat', '답장 버튼', 'Reply button', '답장 버튼 고장 났냐', 'Is your reply button broken?', 'angry'),
      line('dr-36', 'group-chat', '3초 삐짐', 'Three-second sulk', '3초 안에 안 오면 삐짐', 'No reply in three seconds and I am sulking', 'sulk'),
      line('dr-37', 'group-chat', '응 안가', 'Nope, not going', '응~ 안가', 'Nope, not going', 'smug'),
      line('dr-38', 'group-chat', '아무것도 안 함', 'Doing nothing', '아무것도 안 하고 싶다', 'I want to do absolutely nothing', 'tired'),
      line('dr-39', 'group-chat', '배꼽 실종', 'Missing belly button', '배꼽 실종됨', 'My belly button is missing from laughing', 'laugh'),
      line('dr-40', 'group-chat', '웃음 참기', 'Holding laughter', '웃음 참기 실패', 'Failed to hold back the laughter', 'laugh'),
      line('dr-41', 'group-chat', '썰렁 패딩', 'Cringe jacket', '썰렁해서 패딩 입음', 'It got so cold I put a puffer on', 'blank'),
      line('dr-42', 'group-chat', '이게 맞아', 'Is this right', '이게 맞아..?', 'Is this really right...?', 'surprised'),
    ],
  },
  {
    id: 'dialect',
    emoji: '🌊',
    title: '찰진 사투리 드립',
    titleEn: 'Busan dialect quips',
    tagline: '부산 사투리로 찰지게 8컷',
    taglineEn: 'Eight cuts with proper Busan flavor',
    accent: 'from-mint to-sky',
    lines: [
      line('dr-43', 'dialect', '밥 뭇나', 'Did you eat?', '밥 뭇나?', 'Did you eat? (Busan)', 'love'),
      line('dr-44', 'dialect', '오다 주웠다', 'Picked it up', '오다 주웠다', 'Found this on the way over', 'joy'),
      line('dr-45', 'dialect', '억수로 고맙다', 'Mighty thanks', '억수로 고맙다', 'Thanks a mighty lot', 'love'),
      line('dr-46', 'dialect', '단디 해라', 'Do it right', '단디 해라', 'Do it properly, you hear', 'smug'),
      line('dr-47', 'dialect', '와 그리노', 'Why like that', '와 그리노', 'Why are you like that?', 'surprised'),
      line('dr-48', 'dialect', '쪼까 봐주쇼', 'Cut me slack', '쪼까 봐주쇼', 'Cut me a little slack, please', 'sulk'),
      line('dr-49', 'dialect', '아따 참말로', 'Well, truly', '아따 참말로잉~', 'Well, would you look at that~', 'laugh'),
      line('dr-50', 'dialect', '내 편 맞제', 'On my side?', '내 편 맞제?', 'You are on my side, right?', 'love'),
    ],
  },
  {
    id: 'flirty',
    emoji: '💘',
    title: '능청 주접·커플',
    titleEn: 'Cheeky flirting & couples',
    tagline: '주접인데 미워할 수 없는 8컷',
    taglineEn: 'Eight cuts too cheesy to hate',
    accent: 'from-sky to-primary',
    lines: [
      line('dr-51', 'flirty', '심심함 폭발', 'Boredom bomb', '심심함 폭발 직전', 'About to explode from boredom', 'tired'),
      line('dr-52', 'flirty', '얼굴 보여줘', 'Show your face', '얼굴 보여줘 사기치지 말고', 'Show me your face, no catfishing', 'love'),
      line('dr-53', 'flirty', '귀여워서 문제', 'Too cute', '오늘도 귀여워서 문제', 'Cute again today, which is a problem', 'love'),
      line('dr-54', 'flirty', '뽀뽀 갈겨', 'Smack a kiss', '뽀뽀 갈겨!', 'Planting a kiss on you!', 'love'),
      line('dr-55', 'flirty', '푹 빠졌지', 'Falling for me', '나한테 푹 빠졌지?', 'You are totally into me, right?', 'smug'),
      line('dr-56', 'flirty', '내 편은 너뿐', 'Only you', '내 편은 너뿐', 'You are the only one on my side', 'love'),
      line('dr-57', 'flirty', '착하게 살게요', 'I will be good', '봐주시면 착하게 살게요', 'Let me off and I will live a good life', 'smug'),
      line('dr-58', 'flirty', '주인공 너야', 'You are the star', '오늘 주인공 너야 너', 'Today the main character is you, yes you', 'joy'),
    ],
  },
  {
    id: 'family-cheer',
    emoji: '🎉',
    title: '가족·안부·축하 센스',
    titleEn: 'Family, check-ins & cheers',
    tagline: '단톡방 어른들도 웃는 8컷',
    taglineEn: 'Eight cuts even the family chat will love',
    accent: 'from-lemon to-primary',
    lines: [
      line('dr-59', 'family-cheer', '단톡 살아있나', 'Chat alive?', '이 단톡 살아있나요?', 'Is this group chat still alive?', 'blank'),
      line('dr-60', 'family-cheer', '건강이 최고', 'Health first', '건강이 최고입니다', 'Health is the best, truly', 'joy'),
      line('dr-61', 'family-cheer', '복 쓸어 담기', 'Sweep the luck', '복 다 쓸어 담으세요', 'Sweep up all the luck for yourself', 'joy'),
      line('dr-62', 'family-cheer', '양손 무겁게', 'Heavy hands', '양손 무겁게 갈게요', 'I will come with both hands full', 'joy'),
      line('dr-63', 'family-cheer', '박수 짝짝짝', 'Clap clap', '박수 짝짝짝', 'Clap clap clap', 'laugh'),
      line('dr-64', 'family-cheer', '돈벼락', 'Money shower', '돈벼락 맞으세요', 'May a money shower hit you', 'joy'),
      line('dr-65', 'family-cheer', '로또 1등', 'Lotto win', '로또 1등 기원', 'Praying for that lotto jackpot', 'joy'),
      line('dr-66', 'family-cheer', '행복한 하루', 'Happy day', '행복한 하루 되세요', 'Have a happy day', 'love'),
    ],
  },
];

export const DRIP_THEME_COUNT = DRIP_THEMES.length;

export const DRIP_LINES: DripLine[] = DRIP_THEMES.flatMap((theme) => theme.lines);

export const DRIP_LINE_COUNT = DRIP_LINES.length;

/** 대사 팩(/quotes) id — 앱 안에서 이 테마를 가리킬 때 쓴다 */
export const DRIP_PACK_ID = 'drip-twist';

export function dripThemeById(id: string | null | undefined): DripTheme | undefined {
  return DRIP_THEMES.find((theme) => theme.id === id);
}

export function dripLineById(id: string | null | undefined): DripLine | undefined {
  return DRIP_LINES.find((item) => item.id === id);
}

export function dripLinesOf(themeId: DripThemeId): DripLine[] {
  return DRIP_LINES.filter((item) => item.themeId === themeId);
}
