// ─────────────────────────────────────────────────────────────
// 추천 큐레이션 패키지 3종 (직장인 생존 24 · 달달 꽁냥 커플 24 · 만능 일상 & 병맛 티키타카 32)
//  · 사용자가 지정한 순번·마스터 ID 를 그대로 유지한다 (재정렬·중복 금지).
//  · 각 컷의 대사·표정·포즈·이펙트는 emoticon-presets-150.ts 의 원본을 그대로 쓴다.
//    여기에는 '기획 의도'(어떤 상황에서 쓰는 컷인지)만 얹는다.
//  · 무결성(24·24·32, 중복 없음, 순서 일치, 원본 일치)은
//    scripts/test-curation-packages.ts 가 전수로 검사한다.
// ─────────────────────────────────────────────────────────────

import { PRESET_CATEGORIES, presetById, type EmoticonPreset } from './emoticon-presets-150';

export type CurationPackageId = 'office-survival' | 'couple-sweet' | 'daily-meme';

export interface CurationCut {
  /** 마스터 프리셋 ID (1~150) — 원본 순서 그대로 */
  presetId: number;
  /** 기획 의도: 이 컷을 쓰는 상황 */
  intent: string;
  intentEn: string;
}

export interface CurationPackage {
  id: CurationPackageId;
  emoji: string;
  /** 24 또는 32 */
  count: 24 | 32;
  title: string;
  titleEn: string;
  /** 목록 카드에 쓰는 한 줄 소개 */
  tagline: string;
  taglineEn: string;
  /** 컨셉 설명 */
  concept: string;
  conceptEn: string;
  /** 카드 강조색 (tailwind gradient) */
  accent: string;
  cuts: CurationCut[];
}

export const CURATION_PACKAGES: CurationPackage[] = [
  {
    id: 'office-survival',
    emoji: '💼',
    count: 24,
    title: '직장인 생존 패키지',
    titleEn: 'Office Survival Kit',
    tagline: '상사에게는 매너, 동기에게는 짠내 — 5:5 황금 비율 24컷',
    taglineEn: 'Manners for the boss, shared misery for your coworkers — 24 cuts in a 50:50 mix',
    concept:
      '상사·동료와의 매너 있는 소통과 동기들끼리 몰래 쓰는 짠내 나는 애환을 5:5 황금 비율로 배합한 실용 세트',
    conceptEn:
      'A practical set that blends 50:50 polite workplace manners for bosses and colleagues with the bitter-sweet grievances you only share with coworkers at your level.',
    accent: 'from-cyber to-primary',
    cuts: [
      { presetId: 47, intent: '출근 첫 대면, 상사·거래처에 보내는 정중한 첫인사', intentEn: 'First polite greeting of the day to a boss or client' },
      { presetId: 4, intent: '지시·수정 요청을 흔쾌히 받아들이는 척하는 업무용 미소', intentEn: 'The office smile that accepts yet another revision request' },
      { presetId: 49, intent: '지시 확인·업무 수령을 각 잡고 보고하는 답장', intentEn: 'Crisp acknowledgment that a task has been received' },
      { presetId: 51, intent: '동료 기획·보고가 잘 나왔을 때 상사도 보낼 수 있는 칭찬', intentEn: 'Praise a colleague’s deck that is safe to send even upward' },
      { presetId: 84, intent: '결재·승인 요청을 눈치 보며 정중히 재촉하기', intentEn: 'Politely nudging an approval request that is still waiting' },
      { presetId: 66, intent: '만원 지하철에서 보내는 출근 인증 (동기 전용)', intentEn: 'Commute check-in from a packed subway car (coworkers only)' },
      { presetId: 71, intent: '오전 회의 전 커피 타임, 동기 단톡방 커피 인증', intentEn: 'Morning coffee run before the first meeting' },
      { presetId: 86, intent: '점심 메뉴를 못 정할 때 단톡방 투표 유도', intentEn: 'Kicking off the lunch-menu debate in the team chat' },
      { presetId: 68, intent: '마감 직전 집중 모드 — 지금은 말 걸지 말라는 신호', intentEn: 'Heads-down deadline mode: do not interrupt signal' },
      { presetId: 85, intent: '갑자기 밀려든 업무·추가 요청에 대한 경악', intentEn: 'Panic when urgent work lands on top of everything else' },
      { presetId: 88, intent: '길고 지루한 회의 중 무표정 리액션', intentEn: 'Blank-faced reaction during a very long meeting' },
      { presetId: 77, intent: '점심 후 나른한 오후, 동기끼리만 쓰는 딴짓 고백', intentEn: 'Post-lunch slacking confession, only for close coworkers' },
      { presetId: 31, intent: '예상 못 한 질문·실수를 들켰을 때의 식은땀', intentEn: 'Cold sweat when an unexpected question catches you out' },
      { presetId: 25, intent: '억울한 지시·무리한 요구를 꾹 삼키는 참음', intentEn: 'Swallowing an unfair instruction while holding it in' },
      { presetId: 23, intent: '황당한 공지·지시에 말을 아끼는 정색', intentEn: 'Speechless face at an absurd announcement' },
      { presetId: 17, intent: '점심 직후·야근 끝의 배터리 방전', intentEn: 'Battery dead right after lunch or at the end of overtime' },
      { presetId: 76, intent: '야근 중 귀가 시간을 묻는 답장 (동기끼리만)', intentEn: 'Overtime check-in about when anyone gets to go home' },
      { presetId: 67, intent: '정시 퇴근 성공을 알리는 환호', intentEn: 'Celebrating a clean on-the-dot clock-out' },
      { presetId: 78, intent: '월급 입금 알림에 잠깐 행복해지는 순간', intentEn: 'The brief joy of the payday deposit notification' },
      { presetId: 79, intent: '월급 다음 날 자동이체로 텅 빈 통장', intentEn: 'Empty account the day after payday bills go out' },
      { presetId: 80, intent: '회식 자리의 억지 건배 — 집에 가고 싶은 속내', intentEn: 'Forced team-dinner toast with “I want to go home” underneath' },
      { presetId: 89, intent: '금요일 오후, 주말 시작을 알리는 불금 인증', intentEn: 'Friday afternoon, announcing the weekend has started' },
      { presetId: 81, intent: '연차·휴가 승인 뒤 인증샷, 부재 알림', intentEn: 'Day-off proof and out-of-office notice once leave is approved' },
      { presetId: 90, intent: '일요일 밤, 월요일 걱정에 대한 마지막 리액션', intentEn: 'Sunday night dread about Monday morning' },
    ],
  },
  {
    id: 'couple-sweet',
    emoji: '💗',
    count: 24,
    title: '달달 꽁냥 커플 패키지',
    titleEn: 'Sweet Couple Kit',
    tagline: '애정 표현부터 삐짐·화해까지, 연인 전용 24컷',
    taglineEn: 'From affection to sulking and making up — 24 cuts made for couples',
    concept:
      '연인 간의 애정 표현, 귀여운 삐짐과 화해, 데이트 약속 등 로맨틱하고 애교 넘치는 소통에 특화된 세트',
    conceptEn:
      'Built for couples: affection, cute sulking and making up, date plans and playful, romantic banter.',
    accent: 'from-primary to-sky',
    cuts: [
      { presetId: 46, intent: '아침 첫 인사, 만나기 직전 들뜬 하이', intentEn: 'Good-morning hello or an excited wave just before meeting' },
      { presetId: 6, intent: '하루 한 번 애정 표현, 고백 리액션', intentEn: 'The daily “I love you” and answering a confession' },
      { presetId: 61, intent: '답장 대신 하트 날리기, 깜짝 이벤트', intentEn: 'Firing a heart instead of a reply, or a surprise gesture' },
      { presetId: 7, intent: '상대 사진·메시지에 심쿵한 순간', intentEn: 'Heart-thump moment over their photo or message' },
      { presetId: 62, intent: '힘든 날 위로의 포옹, 만나서 안기', intentEn: 'A comforting hug on a hard day, or the reunion squeeze' },
      { presetId: 63, intent: '잘 자 인사, 굿나잇 뽀뽀', intentEn: 'Goodnight kiss before bed' },
      { presetId: 64, intent: '칭찬·애정 표현, 기분 좋아 보일 때 쓰다듬기', intentEn: 'Head pat when they deserve praise or look pleased' },
      { presetId: 10, intent: '연락이 뜸할 때 보고 싶다는 표현', intentEn: 'Saying you miss them during a quiet stretch' },
      { presetId: 65, intent: '잠깐의 안부, 답장 기다릴 때 콕 찌르기', intentEn: 'A quick poke to check in while waiting for a reply' },
      { presetId: 111, intent: '답장이 늦을 때 서운함 반쯤 섞인 재촉', intentEn: 'Half-playful nudge when a reply is slow' },
      { presetId: 112, intent: '바로 온 답장에 기뻐하는 리액션', intentEn: 'Delighted reaction to an instant reply' },
      { presetId: 9, intent: '부탁·데이트 요청에 쓰는 애교', intentEn: 'Cute pleading for a date or a favour' },
      { presetId: 8, intent: '칭찬·애정 공세에 쑥스러운 반응', intentEn: 'Getting shy under a wave of compliments' },
      { presetId: 22, intent: '서운한 일에 귀엽게 토라지기', intentEn: 'Cute sulking over something small' },
      { presetId: 26, intent: '다른 약속·칭찬에 애교 섞인 질투', intentEn: 'Playful jealousy over their other plans or praise' },
      { presetId: 149, intent: '화해 빌기, 진짜 잘못했을 때의 대형 사과', intentEn: 'The full apology when you really messed up' },
      { presetId: 117, intent: '서운해하는 상대 다독이기', intentEn: 'Comforting a partner who feels hurt' },
      { presetId: 70, intent: '데이트 밥약속, 맛집 인증', intentEn: 'Booking dinner together or showing off the food' },
      { presetId: 75, intent: '데이트에 늦을 때 헐레벌떡 달려가는 중', intentEn: 'Rushing to a date, running late' },
      { presetId: 120, intent: '다음 데이트·기념일 약속 잡기', intentEn: 'Pinky-promising the next date or anniversary' },
      { presetId: 113, intent: '둘만의 비밀, 서프라이즈 예고', intentEn: 'Sharing a secret or teasing a surprise' },
      { presetId: 125, intent: '상대가 뭘 잘했을 때 주접급 칭찬', intentEn: 'Over-the-top praise when they nailed something' },
      { presetId: 135, intent: '커플 여행 출발 인증', intentEn: 'Departure shot for a trip together' },
      { presetId: 42, intent: '늦은 밤 통화 마무리, 잘 자 인사', intentEn: 'Wrapping a late-night call with goodnight' },
    ],
  },
  {
    id: 'daily-meme',
    emoji: '🎭',
    count: 32,
    title: '만능 일상 & 병맛 티키타카 패키지',
    titleEn: 'Everyday & Meme Tiki-Taka Kit',
    tagline: '친구·가족·단톡방 어디에나, 핵심 감정 + 병맛 리액션 32컷',
    taglineEn: 'Essential emotions plus meme reactions — 32 cuts for friends, family and group chats',
    concept:
      '친구, 가족, 단톡방 등 어디서든 호불호 없이 쓸 수 있는 핵심 감정과 유쾌한 병맛 리액션을 꽉 채운 볼륨형 세트',
    conceptEn:
      'A volume set packed with the core emotions anyone can use with friends, family and group chats, plus gleefully over-the-top meme reactions.',
    accent: 'from-mint to-cyber',
    cuts: [
      { presetId: 46, intent: '단톡방 첫 인사, 새로 들어온 사람에게 하이', intentEn: 'Opening hello in a group chat or welcoming someone new' },
      { presetId: 52, intent: '약속·요청을 짧게 수락하는 OK', intentEn: 'A short OK to accept a plan or request' },
      { presetId: 53, intent: '동의·맞장구 기본 리액션', intentEn: 'The default nod of agreement' },
      { presetId: 114, intent: '상대 말이 정확할 때 팩폭 인정', intentEn: 'Admitting a friend called it exactly right' },
      { presetId: 54, intent: '거절·반대를 단호하게 끊기', intentEn: 'Firmly turning something down' },
      { presetId: 50, intent: '생일·감사 인사를 선물로 대신하기', intentEn: 'Handing over a gift instead of a thank-you note' },
      { presetId: 1, intent: '좋은 소식에 만세 환호', intentEn: 'Cheering over good news' },
      { presetId: 3, intent: '단톡방 웃긴 짤·썰에 빵터짐', intentEn: 'Cracking up at a funny post in the group chat' },
      { presetId: 2, intent: '해냈을 때 으쓱하는 뿌듯함', intentEn: 'A proud little “nailed it”' },
      { presetId: 143, intent: '너무 좋아 승천하는 과장 리액션', intentEn: 'Over-the-top bliss at something great' },
      { presetId: 11, intent: '억울·슬픔을 과장해서 오열', intentEn: 'Exaggerated wailing over sadness or injustice' },
      { presetId: 13, intent: '상처받았을 때 마음 상함', intentEn: 'Feeling stung by a remark' },
      { presetId: 16, intent: '계획이 무너졌을 때 좌절', intentEn: 'Despair when plans fall apart' },
      { presetId: 18, intent: '아무것도 하기 싫은 날의 귀찮음', intentEn: 'A can’t-be-bothered day' },
      { presetId: 19, intent: '멍때리다 영혼이 가출한 순간', intentEn: 'Zoning out so hard the soul leaves' },
      { presetId: 21, intent: '빡칠 때의 과장된 분노', intentEn: 'Exaggerated rage when something is infuriating' },
      { presetId: 142, intent: '답답해서 벽 치고 싶을 때', intentEn: 'So frustrated you want to punch a wall' },
      { presetId: 145, intent: '분노 레이저를 쏘는 병맛 과장', intentEn: 'Firing rage lasers, meme-style' },
      { presetId: 30, intent: '대박 사건에 경악', intentEn: 'Shock at a wild turn of events' },
      { presetId: 33, intent: '과거 흑역사를 떠올리며 이불킥', intentEn: 'Cringing at an old embarrassing moment' },
      { presetId: 144, intent: '창피해서 쥐구멍에 숨고 싶을 때', intentEn: 'Wanting to sink into the floor from embarrassment' },
      { presetId: 36, intent: '새 소식·링크에 궁금증 폭발', intentEn: 'Curiosity over fresh news or a link' },
      { presetId: 37, intent: '앞뒤가 안 맞는 말에 의심', intentEn: 'Suspicion at a story that does not add up' },
      { presetId: 116, intent: '싸움·사건을 관전하며 팝콘각', intentEn: 'Grabbing popcorn for the drama unfolding' },
      { presetId: 124, intent: '대화가 끊겨 어색해질 때 갑분싸', intentEn: 'The awkward silence when a chat dies' },
      { presetId: 56, intent: '친구 시험·목표를 향한 응원', intentEn: 'Cheering a friend on for an exam or goal' },
      { presetId: 59, intent: '생일 축하 단톡방 도배', intentEn: 'Filling the group chat with birthday wishes' },
      { presetId: 40, intent: '밥약속 잡기, 배고픔 호소', intentEn: 'Setting up a meal or complaining about hunger' },
      { presetId: 91, intent: '밤에 야식 유혹을 참지 못할 때', intentEn: 'Losing the battle against a late-night snack' },
      { presetId: 96, intent: '택배 도착 알림에 설렘', intentEn: 'Excitement when the parcel finally arrives' },
      { presetId: 147, intent: '답하기 곤란한 상황에서 줄행랑', intentEn: 'Bolting from a question you would rather not answer' },
      { presetId: 150, intent: '대화 마무리·퇴장 인사', intentEn: 'Wrapping up the chat and bowing out' },
    ],
  },
];

const PACKAGE_BY_ID = new Map<string, CurationPackage>(CURATION_PACKAGES.map((pkg) => [pkg.id, pkg]));

export const CURATION_PACKAGE_COUNT = CURATION_PACKAGES.length;

export function curationPackageById(id: string | null | undefined): CurationPackage | undefined {
  if (!id) return undefined;
  return PACKAGE_BY_ID.get(id);
}

export function isCurationPackageId(value: unknown): value is CurationPackageId {
  return typeof value === 'string' && PACKAGE_BY_ID.has(value);
}

/** 패키지의 마스터 ID 배열 (순서 그대로) — 팩 만들기의 presetIds 로 바로 넘긴다. */
export function curationPackagePresetIds(id: CurationPackageId | string): number[] {
  const pkg = curationPackageById(id);
  return pkg ? pkg.cuts.map((cut) => cut.presetId) : [];
}

export interface CurationCutView extends CurationCut {
  /** 1부터 시작하는 순번 */
  order: number;
  preset: EmoticonPreset;
}

/** 화면용: 순번 + 원본 프리셋(대사·표정·포즈·이펙트)까지 붙인 컷 목록 */
export function curationPackageCuts(pkg: CurationPackage): CurationCutView[] {
  return pkg.cuts
    .map((cut, index) => {
      const preset = presetById(cut.presetId);
      return preset ? { ...cut, order: index + 1, preset } : null;
    })
    .filter((cut): cut is CurationCutView => !!cut);
}

/** 패키지 안에 실제로 등장하는 카테고리와 컷 수 (패키지 내부 필터용) */
export function curationPackageCategories(pkg: CurationPackage): { label: string; labelEn: string; emoji: string; count: number }[] {
  const seen = new Map<string, { label: string; labelEn: string; emoji: string; count: number }>();
  for (const cut of curationPackageCuts(pkg)) {
    const key = cut.preset.category;
    const found = seen.get(key);
    if (found) found.count += 1;
    else {
      const category = PRESET_CATEGORIES.find((item) => item.label === key);
      seen.set(key, { label: key, labelEn: category?.labelEn ?? cut.preset.categoryEn, emoji: category?.emoji ?? '•', count: 1 });
    }
  }
  return [...seen.values()];
}
