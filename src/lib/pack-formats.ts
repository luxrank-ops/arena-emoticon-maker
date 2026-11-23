// ─────────────────────────────────────────────────────────────
// 표현 형태(팩 테마) 5종 — 생성 프롬프트 · 컷 템플릿 · 기본 레이어
//  · 감정(기쁨/슬픔)만 고르던 방식을 넘어, 실제 메신저에서 쓰는 "형태"로 팩을 만든다.
//  · 같은 정의를 생성 프롬프트(서버)와 선택 UI(클라이언트)가 함께 쓴다.
// ─────────────────────────────────────────────────────────────

import type { Emotion } from '@/lib/types';
import type { EffectKind, TextLayer, TextLayerStyle } from '@/lib/studio/layers';
import type { Locale } from '@/lib/i18n/locale';
import { dripLineById } from '@/data/drip-themes';

export type PackFormatId = 'situation' | 'parody' | 'duo' | 'typo' | 'combo' | 'duo-chemi' | 'pet-meme' | 'drip';

/** API 스키마(zod)와 공유하는 런타임 목록 */
export const PACK_FORMAT_IDS = ['situation', 'parody', 'duo', 'typo', 'combo', 'duo-chemi', 'pet-meme', 'drip'] as const;

export interface FormatCut {
  id: string;
  label: string;
  labelEn: string;
  line: string;
  lineEn: string;
  emotion: Emotion;
  /** 이미지 생성 시 장면·동작 지시 (영문 프롬프트) */
  action: string;
  /** 앱에서 합성할 기본 글자 레이어 (텍스트 주인공·패러디 등) */
  textLayer?: Partial<TextLayer>;
  /** 2단 합체 콤보에서 위/아래 조각 */
  comboRole?: 'top' | 'bottom';
  comboPair?: string;
  /** 레이어 이펙트 기본값 */
  effect?: EffectKind;
}

export interface PackFormat {
  id: PackFormatId;
  label: string;
  labelEn: string;
  emoji: string;
  tagline: string;
  taglineEn: string;
  description: string;
  descriptionEn: string;
  /** 사진 2장(커플·친구·나+반려견) 필요 */
  needsSecondPhoto: boolean;
  /** 'layer' = AI는 글자 없이 그리고 앱이 한글을 합성, 'baked' = AI가 말풍선까지 그림 */
  textMode: 'layer' | 'baked';
  /** 킬러 테마 카드 (홈·만들기·프리셋 상단에 전면 배치) */
  killer?: boolean;
  /** 이 테마의 단건 잠금 해제 가격 (원) */
  unlockPrice?: number;
  cuts: FormatCut[];
  prompt: {
    /** 장면 지시 */
    scene: string;
    /** 구도 지시 */
    layout: string;
  };
}

const C = (
  id: string,
  label: string,
  line: string,
  emotion: Emotion,
  action: string,
  lineEn: string,
  labelEn = label,
  extra: Partial<FormatCut> = {},
): FormatCut => ({ id, label, labelEn, line, lineEn, emotion, action, ...extra });

// ── 1. 상황·행동 리액션 ──────────────────────────────────────
const SITUATION: FormatCut[] = [
  C('si-01', '퇴근합니다', '퇴근합니다', 'joy', 'standing with a bag over one shoulder, waving cheerfully, stepping away', 'Leaving work now'),
  C('si-02', '커피 수혈 중', '커피 수혈 중', 'tired', 'holding a takeaway coffee cup with both hands, relieved expression', 'Coffee transfusion'),
  C('si-03', '확인했습니다', '확인했습니다', 'smug', 'bowing politely with one hand on the chest, small smile', 'Got it (bows)'),
  C('si-04', '지금 출발', '지금 출발', 'surprised', 'hurrying forward with a bag, one hand raised as if saying wait', 'Leaving now'),
  C('si-05', '야근 중', '야근 중', 'tired', 'slumped at a desk with a laptop and a dim lamp, exhausted', 'Working overtime'),
  C('si-06', '회의 중', '회의 중', 'blank', 'holding a phone to the ear with a flat expression', 'In a meeting'),
  C('si-07', '점심 뭐 먹지', '점심 뭐 먹지', 'blank', 'looking up thoughtfully with a hand at the chin', "What's for lunch"),
  C('si-08', '칼퇴', '칼퇴합니다', 'joy', 'running out with a coat flapping, big grin', 'Clock-out dash'),
  C('si-09', '재택 중', '재택 중', 'tired', 'in comfortable home clothes with a laptop on the knees', 'Working from home'),
  C('si-10', '자리 비움', '자리 비웠습니다', 'blank', 'holding a small paper sign and shrugging', 'Away from desk'),
  C('si-11', '월요병', '월요병', 'sad', 'drooping under a gray cloud, sighing', 'Monday blues'),
  C('si-12', '금요일', '금요일이다!', 'laugh', 'fist pumping with a wide grin', "It's Friday!"),
  C('si-13', '연차', '연차 씀', 'smug', 'holding a small calendar and flashing a peace sign', 'Day off'),
  C('si-14', '출장', '출장 갑니다', 'surprised', 'pulling a small suitcase, waving', 'On a business trip'),
  C('si-15', '보고서', '보고서 작성 중', 'tired', 'typing on a laptop with coffee beside, focused', 'Writing a report'),
  C('si-16', '메일 확인', '메일 확인했습니다', 'joy', 'giving a thumbs up with a phone in the other hand', 'Email checked'),
  C('si-17', '전화 중', '통화 중', 'blank', 'phone at the ear, index finger raised', 'On the phone'),
  C('si-18', '충전 중', '충전 중…', 'tired', 'curled up resting with a small battery icon mood', 'Recharging'),
  C('si-19', '집 가는 중', '집 가는 중', 'joy', 'walking toward the viewer with a relaxed smile', 'Heading home'),
  C('si-20', '밥 먹는 중', '밥 먹는 중', 'joy', 'holding a spoon and a bowl, happy', 'Eating'),
  C('si-21', '잘 자요', '잘 자요', 'tired', 'waving sleepily with a small pillow', 'Good night'),
  C('si-22', '고마워요', '고마워요', 'love', 'hands together with a warm smile', 'Thank you'),
  C('si-23', '미안해요', '미안해요', 'sulk', 'apologetic bow with an embarrassed smile', 'Sorry'),
  C('si-24', '축하해요', '축하해요', 'laugh', 'clapping with happy eyes, small confetti', 'Congratulations'),
];

// ── 2. 짤·뉴스·자막 패러디 ──────────────────────────────────
const PARODY: FormatCut[] = [
  C('pa-01', '속보 야근 확정', '[속보] 오늘 야근 확정', 'surprised', 'extreme close-up deadpan face filling the frame, dramatic lighting', '[BREAKING] Overtime confirmed', 'Breaking: overtime', { textLayer: { style: 'bold', bubble: 'caption', y: 0.16, size: 0.1, rotate: 0 } }),
  C('pa-02', '단독 점심 혼밥', '[단독] 점심 혼밥', 'blank', 'extreme close-up neutral face, slight zoom distortion', '[EXCLUSIVE] Lunch alone', 'Exclusive: eating alone', { textLayer: { style: 'bold', bubble: 'caption', y: 0.16, size: 0.1, rotate: 0 } }),
  C('pa-03', '극단 줌인 정색', '…진심?', 'blank', 'extreme zoomed-in deadpan face, one eyebrow slightly raised', '...seriously?', 'Extreme zoom', { textLayer: { style: 'bold', bubble: 'none', y: 0.86, size: 0.14 } }),
  C('pa-04', '자막 3초 만에', '3초 만에 왔습니다', 'surprised', 'bursting into frame from the side with motion lines', 'Here in 3 seconds', 'Arrived in 3s', { textLayer: { style: 'bold', bubble: 'caption', y: 0.18, size: 0.11 } }),
  C('pa-05', '예능 리액션', '이게 맞아?', 'surprised', 'theatrical shocked reaction with hands on cheeks', 'Is this real?', 'Variety reaction', { textLayer: { style: 'bold', bubble: 'shout', y: 0.83, size: 0.13 } }),
  C('pa-06', '드라마 자막', '그때 그 사람', 'sad', 'cinematic close-up with a tearful gaze, soft rim light', 'That person back then', 'Drama caption', { textLayer: { style: 'gothic', bubble: 'none', y: 0.87, size: 0.1 } }),
  C('pa-07', '뉴스 앵커', '현장 연결합니다', 'smug', 'news-anchor posture, serious, holding a pen', 'Live from the scene', 'News anchor', { textLayer: { style: 'bold', bubble: 'caption', y: 0.16, size: 0.1 } }),
  C('pa-08', '속보 월급', '[속보] 월급은 사라졌다', 'cry', 'shocked empty-wallet reaction, dramatic shadow', '[BREAKING] Salary gone', 'Breaking: salary', { textLayer: { style: 'bold', bubble: 'caption', y: 0.16, size: 0.095 } }),
  C('pa-09', '자막 먹방', '한 입만', 'love', 'holding a spoon close to the mouth, playful eyes', 'Just one bite', 'Mukbang caption', { textLayer: { style: 'calli', bubble: 'none', y: 0.85, size: 0.13 } }),
  C('pa-10', '충격 단독', '[충격] 이럴 수가', 'surprised', 'hands over mouth in shock, wide eyes', '[SHOCK] No way', 'Shock exclusive', { textLayer: { style: 'bold', bubble: 'caption', y: 0.16, size: 0.105 } }),
  C('pa-11', '무한도전', '무한 반복 중', 'tired', 'sighing with a spinning-arrow mood above the head', 'Looping forever', 'Infinite loop', { textLayer: { style: 'bold', bubble: 'none', y: 0.84, size: 0.12 } }),
  C('pa-12', '극장판 엔딩', '다음 화에 계속', 'smug', 'cinematic three-quarter turn, dramatic highlight', 'To be continued', 'Movie ending', { textLayer: { style: 'gothic', bubble: 'none', y: 0.87, size: 0.1 } }),
  C('pa-13', '자막 분노', '진짜 이건 아니지', 'angry', 'frowning hard with a vein-pop mood', 'This is not okay', 'Caption anger', { textLayer: { style: 'bold', bubble: 'shout', y: 0.82, size: 0.115 } }),
  C('pa-14', '속보 칼퇴', '[속보] 칼퇴 성공', 'laugh', 'running out with arms up in triumph', '[BREAKING] Escaped on time', 'Breaking: clock-out', { textLayer: { style: 'bold', bubble: 'caption', y: 0.16, size: 0.1 } }),
  C('pa-15', '인터뷰', '한마디만 하겠습니다', 'smug', 'holding a microphone-like gesture toward the viewer', 'One word, please', 'Interview', { textLayer: { style: 'gothic', bubble: 'caption', y: 0.86, size: 0.095 } }),
  C('pa-16', '자막 심쿵', '심장이 두근', 'love', 'hands over the chest with a shy smile', 'Heart fluttering', 'Caption heart', { textLayer: { style: 'calli', bubble: 'none', y: 0.85, size: 0.13 }, effect: 'heart' }),
  C('pa-17', '동공 지진', '동공 지진', 'surprised', 'extreme close-up of wide shocked eyes', 'Pupil quake', 'Pupil quake', { textLayer: { style: 'bold', bubble: 'shout', y: 0.14, size: 0.12 } }),
  C('pa-18', '정색 3단', '정색', 'blank', 'flat deadpan stare straight into the camera', 'Deadpan', 'Deadpan', { textLayer: { style: 'bold', bubble: 'none', y: 0.87, size: 0.16 } }),
  C('pa-19', '자막 감동', '이게 진짜야', 'cry', 'teary moved expression, hand on chest', 'Is this real', 'Caption tears', { textLayer: { style: 'gothic', bubble: 'caption', y: 0.16, size: 0.1 } }),
  C('pa-20', '속보 회식', '[속보] 오늘 회식', 'sad', 'slumping with a forced smile', '[BREAKING] Team dinner', 'Breaking: dinner', { textLayer: { style: 'bold', bubble: 'caption', y: 0.16, size: 0.1 } }),
  C('pa-21', '자막 폭소', 'ㅋㅋㅋㅋㅋ', 'laugh', 'laughing hard with head tilted back', 'Hahahaha', 'Caption laugh', { textLayer: { style: 'bold', bubble: 'none', y: 0.84, size: 0.16 } }),
  C('pa-22', '뉴스 클로즈업', '현장 상황입니다', 'blank', 'reporter stance with a handheld mic', 'Here at the scene', 'News close-up', { textLayer: { style: 'bold', bubble: 'caption', y: 0.16, size: 0.095 } }),
  C('pa-23', '자막 반전', '알고 보니 내 얘기', 'sulk', 'looking away with a pout', 'Turns out it was me', 'Caption twist', { textLayer: { style: 'calli', bubble: 'tape', y: 0.83, size: 0.1 } }),
  C('pa-24', '예고편', '곧 만나요', 'joy', 'waving with a bright smile, soft spotlight', 'See you soon', 'Trailer', { textLayer: { style: 'gothic', bubble: 'none', y: 0.87, size: 0.11 } }),
];

// ── 3. 2인·반려 케미 ────────────────────────────────────────
const DUO: FormatCut[] = [
  C('du-01', '하이파이브', '하이파이브!', 'laugh', 'two people giving a high five, both smiling at each other', 'High five!'),
  C('du-02', '삐짐', '나 삐졌어', 'sulk', 'one person pouting with arms crossed while the other looks apologetic', "I'm sulking"),
  C('du-03', '어깨동무', '우리 사이', 'joy', 'two people with arms around each other’s shoulders, friendly', 'Best buds'),
  C('du-04', '손 흔들기', '안녕!', 'joy', 'both waving at the viewer, cheerful', 'Hi there!'),
  C('du-05', '같이 웃기', 'ㅋㅋㅋ 같이', 'laugh', 'both laughing together, heads tilted toward each other', 'Laughing together'),
  C('du-06', '손가락 하트', '사랑해', 'love', 'both making finger hearts toward the viewer', 'Love you'),
  C('du-07', '등 두드리기', '잘했어', 'smug', 'one comforting the other with a pat on the back', 'Good job'),
  C('du-08', '마주보기', '눈 맞춤', 'love', 'facing each other with warm eye contact and soft smiles', 'Eye contact'),
  C('du-09', '밀당', '먼저 연락해', 'sulk', 'one leaning away playfully, the other reaching out', 'Text me first'),
  C('du-10', '같이 응원', '파이팅!', 'joy', 'both raising fists in a cheer', 'Fighting!'),
  C('du-11', '한숨 공유', '같이 힘들다', 'tired', 'both slumped side by side, exhausted but together', 'Tired together'),
  C('du-12', '같이 먹기', '한 입씩', 'love', 'sharing a snack, holding spoons toward each other', 'Share a bite'),
  C('du-13', '셀카', '한 컷!', 'joy', 'posing for a selfie, cheek to cheek', 'One shot!'),
  C('du-14', '투덜투덜', '또 너야?', 'blank', 'one side-eyeing while the other grins awkwardly', 'You again?'),
  C('du-15', '포옹', '안아줄게', 'love', 'warm hugging pose, both comforted', 'Let me hug you'),
  C('du-16', '같이 출근', '같이 가자', 'smug', 'walking side by side with bags, matching strides', "Let's go together"),
  C('du-17', '눈치 게임', '눈치 보는 중', 'surprised', 'both glancing sideways nervously', 'Awkward glance'),
  C('du-18', '같이 박수', '짝짝짝', 'laugh', 'both clapping enthusiastically', 'Clap clap'),
  C('du-19', '등 돌리기', '토라짐', 'sulk', 'both turned away from each other but peeking back', 'Turned away'),
  C('du-20', '같이 점프', '신난다!', 'joy', 'both jumping with joy', 'So excited!'),
  C('du-21', '머리 쓰다듬', '잘 자라', 'love', 'one patting the other’s head affectionately', 'Good kid'),
  C('du-22', '같이 한숨', '하…', 'tired', 'both exhaling a long sigh, shoulders dropped', 'Sigh...'),
  C('du-23', '같이 약속', '약속해', 'smug', 'linking pinky fingers together, sincere faces', 'Promise'),
  C('du-24', '같이 웃음', '오늘도 화이팅', 'joy', 'both grinning at the camera, bright and warm', 'Cheer up today'),
];

// ── 4. 글자 주인공(타이포) ──────────────────────────────────
const TYPO: FormatCut[] = [
  C('ty-01', '읽씹 금지', '읽씹 금지', 'angry', 'small character peeking from the bottom-right corner, most of the canvas left empty', 'No read-and-ignore', '읽씹 금지', { textLayer: { style: 'stamp', bubble: 'none', x: 0.5, y: 0.46, size: 0.2, rotate: -8 } }),
  C('ty-02', '완전 인정', '완전 인정', 'smug', 'character peeking from the top-left corner, big empty middle', 'Totally agree', '완전 인정', { textLayer: { style: 'bold', bubble: 'none', x: 0.5, y: 0.5, size: 0.2, rotate: -4 } }),
  C('ty-03', '소맥 각', '소맥 각?', 'love', 'character peeking from the right edge, winking', 'Soju-beer time?', '소맥 각?', { textLayer: { style: 'calli', bubble: 'none', x: 0.46, y: 0.46, size: 0.22, rotate: -6 } }),
  C('ty-04', '오늘만 살자', '오늘만 살자', 'laugh', 'small character hanging on the bottom edge, arms up', 'Live for today', '오늘만 살자', { textLayer: { style: 'bold', bubble: 'none', x: 0.5, y: 0.44, size: 0.16, rotate: 3 } }),
  C('ty-05', '눈치 없음', '눈치 좀', 'blank', 'character barely peeking from a corner with a flat stare', 'Read the room', '눈치 좀', { textLayer: { style: 'gothic', bubble: 'none', x: 0.5, y: 0.5, size: 0.2, rotate: 0 } }),
  C('ty-06', '연락 두절', '연락 두절', 'tired', 'character lying flat at the bottom edge, phone nearby', 'Out of reach', '연락 두절', { textLayer: { style: 'bold', bubble: 'none', x: 0.5, y: 0.42, size: 0.19, rotate: -3 } }),
  C('ty-07', '잠수 탈게', '잠수 탈게', 'surprised', 'character diving out of the bottom edge, only the head visible', 'Going dark', '잠수 탈게', { textLayer: { style: 'calli', bubble: 'none', x: 0.5, y: 0.44, size: 0.18, rotate: -5 } }),
  C('ty-08', '월급 루팡', '월급 루팡', 'smug', 'character peeking with a sly grin from the corner', 'Salary thief', '월급 루팡', { textLayer: { style: 'stamp', bubble: 'none', x: 0.5, y: 0.48, size: 0.19, rotate: 6 }, effect: 'money' }),
  C('ty-09', '칼퇴 요정', '칼퇴 요정', 'joy', 'character peeking from the top-right with sparkles', 'Clock-out fairy', '칼퇴 요정', { textLayer: { style: 'calli', bubble: 'none', x: 0.48, y: 0.46, size: 0.19, rotate: -7 }, effect: 'sparkle' }),
  C('ty-10', '회식 불참', '회식 불참', 'blank', 'character half hidden behind the bottom edge, waving a small hand', 'Skipping dinner', '회식 불참', { textLayer: { style: 'bold', bubble: 'none', x: 0.5, y: 0.46, size: 0.19, rotate: 0 } }),
  C('ty-11', '내일의 나', '내일의 나에게', 'tired', 'character peeking from the left edge, sleepy', 'To tomorrow me', '내일의 나에게', { textLayer: { style: 'calli', bubble: 'none', x: 0.5, y: 0.48, size: 0.15, rotate: -3 } }),
  C('ty-12', '점심값 내가', '점심값 내가', 'smug', 'character leaning in from the right edge with a confident grin', 'Lunch is on me', '점심값 내가', { textLayer: { style: 'stamp', bubble: 'none', x: 0.5, y: 0.46, size: 0.18, rotate: -5 } }),
  C('ty-13', '답장해', '답장 좀', 'sulk', 'character peeking from the bottom-left, pouting', 'Answer me', '답장 좀', { textLayer: { style: 'bold', bubble: 'none', x: 0.5, y: 0.44, size: 0.21, rotate: 2 } }),
  C('ty-14', '야근 손절', '야근 손절', 'angry', 'character peeking with an angry brow from the corner', 'No more overtime', '야근 손절', { textLayer: { style: 'bold', bubble: 'none', x: 0.5, y: 0.46, size: 0.19, rotate: -2 }, effect: 'anger' }),
  C('ty-15', '집 가고 싶다', '집 가고 싶다', 'sad', 'character drooping at the bottom edge', 'Wanna go home', '집 가고 싶다', { textLayer: { style: 'calli', bubble: 'none', x: 0.5, y: 0.46, size: 0.16, rotate: -4 } }),
  C('ty-16', '졸립다', '졸립다…', 'tired', 'character yawning while peeking from a corner', 'Sleepy...', '졸립다…', { textLayer: { style: 'calli', bubble: 'none', x: 0.5, y: 0.44, size: 0.21, rotate: -6 } }),
  C('ty-17', '커피 필수', '커피 필수', 'tired', 'character peeking with a coffee cup, half hidden', 'Coffee required', '커피 필수', { textLayer: { style: 'bold', bubble: 'none', x: 0.5, y: 0.46, size: 0.19, rotate: 0 } }),
  C('ty-18', '급함', '급함', 'surprised', 'character rushing past the bottom edge, motion lines', 'In a hurry', '급함', { textLayer: { style: 'stamp', bubble: 'none', x: 0.5, y: 0.5, size: 0.26, rotate: 8 } }),
  C('ty-19', '합의 봄', '합의 봄', 'smug', 'character peeking with a calm smile from the right edge', "Let's agree", '합의 봄', { textLayer: { style: 'calli', bubble: 'none', x: 0.5, y: 0.48, size: 0.22, rotate: -7 } }),
  C('ty-20', '당첨', '당첨!', 'laugh', 'character peeking with both hands up from the bottom', 'Jackpot!', '당첨!', { textLayer: { style: 'bold', bubble: 'none', x: 0.5, y: 0.44, size: 0.24, rotate: -4 }, effect: 'sparkle' }),
  C('ty-21', '밥값', '밥값 하자', 'joy', 'character leaning from a corner with a cheerful grin', "Let's eat", '밥값 하자', { textLayer: { style: 'gothic', bubble: 'none', x: 0.5, y: 0.48, size: 0.18, rotate: 0 } }),
  C('ty-22', '연봉 협상', '연봉 협상', 'angry', 'character peeking with a serious frown from the bottom-right', 'Salary talk', '연봉 협상', { textLayer: { style: 'stamp', bubble: 'none', x: 0.5, y: 0.46, size: 0.18, rotate: -6 } }),
  C('ty-23', '오케이', '오케이', 'joy', 'character giving an OK sign while peeking from a corner', 'Okay', '오케이', { textLayer: { style: 'bold', bubble: 'none', x: 0.5, y: 0.48, size: 0.22, rotate: 0 } }),
  C('ty-24', '퇴근', '퇴근!', 'laugh', 'character sprinting out of the bottom edge, arms raised', 'Clock out!', '퇴근!', { textLayer: { style: 'bold', bubble: 'none', x: 0.5, y: 0.42, size: 0.26, rotate: -5 }, effect: 'sparkle' }),
];

// ── 5. 이펙트·연속 합체(콤보) ────────────────────────────────
const COMBO_PAIRS: [string, string, string, string, Emotion, string][] = [
  ['cb-01', '불타는 야근', '불타는 야근', '야근 불태웠다', 'angry', 'standing in front of roaring flames with a determined look'],
  ['cb-02', '돈다발 폭격', '돈다발 폭격', '돈이 비처럼', 'laugh', 'surrounded by a shower of falling banknotes, arms wide'],
  ['cb-03', '하트 폭격', '하트 폭격', '하트 세례', 'love', 'blushing while dozens of hearts burst around the head'],
  ['cb-04', '번개 충격', '번개 충격', '번개 맞았다', 'surprised', 'lit by a bolt of lightning, hair standing up'],
  ['cb-05', '별가루', '별가루', '반짝반짝', 'joy', 'glowing with floating star dust, gentle smile'],
  ['cb-06', '눈물 폭포', '눈물 폭포', '눈물이 폭포수', 'cry', 'crying with a comic waterfall of tears'],
  ['cb-07', '불꽃 승리', '불꽃 승리', '이겼다!', 'laugh', 'fist raised with fireworks bursting behind'],
  ['cb-08', '얼음 정지', '얼음 정지', '얼음 땡', 'blank', 'frozen in place with frost and ice crystals around'],
  ['cb-09', '연기 자욱', '연기 자욱', '머리 터짐', 'angry', 'steam bursting from the head with a wry scowl'],
  ['cb-10', '무지개', '무지개', '기분 최고', 'joy', 'rainbow arcs behind a delighted face'],
  ['cb-11', '별빛', '별빛', '별이 쏟아져', 'love', 'standing under a shower of shooting stars'],
  ['cb-12', '폭발', '폭발', '폭발 직전', 'king', 'explosive burst of light behind an intense expression'],
];

const COMBO: FormatCut[] = COMBO_PAIRS.flatMap(([id, label, labelEn, line, emotion, action]) => {
  const top = C(`${id}-top`, label, line, emotion, `upper half of a vertical two-panel combo: ${action}; the subject is anchored to the bottom edge so the picture continues into the panel below`, line, labelEn, {
    comboRole: 'top' as const,
    comboPair: `${id}-bottom`,
    effect: emotion === 'love' ? ('heart' as EffectKind) : emotion === 'king' || emotion === 'angry' ? ('flame' as EffectKind) : ('sparkle' as EffectKind),
  });
  const bottom = C(`${id}-bottom`, `${label} 2`, `${line}!`, emotion, `lower half of the same vertical two-panel combo: ${action}, framed from the top edge so it connects to the panel above`, `${line}!`, `${labelEn} 2`, {
    comboRole: 'bottom' as const,
    comboPair: `${id}-top`,
    textLayer: { style: 'bold', bubble: 'none', y: 0.2, size: 0.12 },
  });
  return [top, bottom];
});


// ── KILLER 1. 커플·단톡방 '2인 케미 팩' (12컷) ─────────────────
//  · 커플·친구 사진 2장으로 만드는 2인 상호작용 전용 컷. 단톡방에서 바로 쓰는 대사로 맞췄다.
const DUO_CHEMI: FormatCut[] = [
  C('dc-01', '퇴근 치맥 콜', '퇴근 후 치맥 콜?', 'laugh', 'two friends grinning and raising imaginary beer glasses toward each other, one holding a phone', 'Chi-maek after work?', 'Chi-maek call', { textLayer: { style: 'calli', bubble: 'none', y: 0.85, size: 0.115 } }),
  C('dc-02', '야근 살려줘', '야근 중 살려줘', 'cry', 'one slumped at a desk with a laptop while the other reaches out a hand to rescue them', 'Save me, overtime', 'Save me', { textLayer: { style: 'bold', bubble: 'shout', y: 0.83, size: 0.12 } }),
  C('dc-03', '삐짐 vs 달래기', '삐짐 vs 달래기', 'sulk', 'one turned away pouting with crossed arms while the other offers a small gift with an apologetic smile', 'Sulk vs soothe', 'Sulk vs soothe', { textLayer: { style: 'bold', bubble: 'none', y: 0.85, size: 0.105 } }),
  C('dc-04', '밥 먹었어', '밥은 먹었어?', 'love', 'one holding a warm bowl toward the other, caring expression', 'Did you eat?', 'Did you eat', { textLayer: { style: 'calli', bubble: 'none', y: 0.85, size: 0.115 } }),
  C('dc-05', '한잔하자', '오늘 한잔하자', 'joy', 'two clinking small glasses together, happy eyes', "Let's grab a drink", 'Drink together', { textLayer: { style: 'calli', bubble: 'none', y: 0.85, size: 0.115 } }),
  C('dc-06', '눈치 게임', '눈치 보는 중', 'surprised', 'both glancing sideways at each other nervously, shoulders raised', 'Reading the room', 'Awkward glance', { textLayer: { style: 'bold', bubble: 'none', y: 0.84, size: 0.11 } }),
  C('dc-07', '같이 가자', '퇴근 같이 가자', 'smug', 'both walking side by side with bags, matching strides', "Let's leave together", 'Leave together', { textLayer: { style: 'bold', bubble: 'none', y: 0.85, size: 0.115 } }),
  C('dc-08', '칼퇴 성공', '칼퇴 성공!', 'laugh', 'both sprinting out with arms up in triumph', 'Clocked out!', 'Clocked out', { textLayer: { style: 'bold', bubble: 'none', y: 0.84, size: 0.135 }, effect: 'sparkle' }),
  C('dc-09', '좀 도와줘', '이거 좀 도와줘', 'tired', 'one buried under papers while the other rolls up sleeves to help', 'Help me out', 'Help me', { textLayer: { style: 'calli', bubble: 'none', y: 0.85, size: 0.11 } }),
  C('dc-10', '미안해', '나 잘못했어', 'sad', 'one bowing with hands together while the other softens with a small smile', "I'm sorry", 'Sorry', { textLayer: { style: 'calli', bubble: 'none', y: 0.85, size: 0.115 } }),
  C('dc-11', '고마워', '진짜 고마워', 'love', 'both hugging briefly with warm smiles', 'Thank you', 'Thank you', { textLayer: { style: 'calli', bubble: 'none', y: 0.85, size: 0.115 } }),
  C('dc-12', '우리 사이', '우리 사이 이 정도', 'smug', 'two bumping fists with confident grins', 'We go way back', 'Best buds', { textLayer: { style: 'bold', bubble: 'none', y: 0.85, size: 0.105 } }),
];

// ── KILLER 2. 반려동물(AI 펫) 집사 밈 팩 (12컷) ────────────────
//  · 강아지·고양이 사진 1장으로 만드는 한국형 집사 밈 전용 컷.
const PET_MEME: FormatCut[] = [
  C('pm-01', '간식 내놔', '간식 내놔', 'angry', 'staring straight at the camera with an impatient expectant look, small paw raised toward the viewer', 'Give me a treat', 'Treat, now', { textLayer: { style: 'bold', bubble: 'shout', y: 0.84, size: 0.13 } }),
  C('pm-02', '산책 가자', '산책 가자', 'laugh', 'perking up with ears forward, body leaning excitedly toward the door', "Let's walk!", 'Walk time', { textLayer: { style: 'bold', bubble: 'none', y: 0.85, size: 0.13 }, effect: 'sparkle' }),
  C('pm-03', '집사야 일해라', '집사야 일해라', 'smug', 'sitting regally with a commanding look, chin slightly raised', 'Slave, go to work', 'Work, human', { textLayer: { style: 'gothic', bubble: 'none', y: 0.85, size: 0.105 } }),
  C('pm-04', '밥 줘', '밥 줘', 'sad', 'looking up with big pleading eyes at an empty bowl', 'Feed me', 'Feed me', { textLayer: { style: 'calli', bubble: 'none', y: 0.85, size: 0.14 } }),
  C('pm-05', '누가 방귀 꼈어', '누가 방귀 꼈어', 'surprised', 'sniffing the air with a suspicious side-eye, nose wrinkled', 'Who farted?', 'Who farted', { textLayer: { style: 'bold', bubble: 'none', y: 0.85, size: 0.1 } }),
  C('pm-06', '안아줘', '안아줘', 'love', 'reaching both front paws toward the viewer for a hug', 'Hold me', 'Hug me', { textLayer: { style: 'calli', bubble: 'none', y: 0.85, size: 0.13 } }),
  C('pm-07', '같이 자자', '같이 자자', 'tired', 'curled up in a cozy blanket, eyes half closed', "Let's sleep", 'Sleep with me', { textLayer: { style: 'calli', bubble: 'none', y: 0.85, size: 0.12 } }),
  C('pm-08', '뭐 해', '뭐 해', 'blank', 'staring blankly at the camera, deadpan', 'What are you doing', 'What now', { textLayer: { style: 'bold', bubble: 'none', y: 0.85, size: 0.14 } }),
  C('pm-09', '칭찬해 줘', '칭찬해 줘', 'joy', 'sitting proudly with chest out, waiting for praise', 'Praise me', 'Praise me', { textLayer: { style: 'calli', bubble: 'none', y: 0.85, size: 0.12 }, effect: 'heart' }),
  C('pm-10', '화났어', '나 화났어', 'angry', 'turned away with a dramatic huff, tail flicking', "I'm mad", 'Angry', { textLayer: { style: 'bold', bubble: 'none', y: 0.85, size: 0.12 }, effect: 'anger' }),
  C('pm-11', '한 번만 더', '한 번만 더', 'love', 'pawing at the treat jar with a hopeful look', 'Just one more', 'One more', { textLayer: { style: 'calli', bubble: 'none', y: 0.85, size: 0.12 } }),
  C('pm-12', '출근하기 싫어', '출근하기 싫어', 'tired', 'flopped on the floor dramatically, refusing to move', "Don't wanna go", 'No work', { textLayer: { style: 'bold', bubble: 'none', y: 0.85, size: 0.11 } }),
];

// ── 드립·반전 티키타카 24컷 (drip-themes 66줄 중 사진 팩용 24컷) ───
//  · 문구·감정·영문은 src/data/drip-themes.ts 한 곳에서 가져온다(중복 정의 금지).
//  · 여기에는 사진으로 그릴 장면 지시(action)와 글자 레이어 기본값만 얹는다.
const DRIP_CUT_IDS = [
  'dr-01', 'dr-11', 'dr-33', 'dr-43', 'dr-53', 'dr-23',
  'dr-14', 'dr-34', 'dr-62', 'dr-07', 'dr-28', 'dr-39',
  'dr-03', 'dr-15', 'dr-18', 'dr-22', 'dr-26', 'dr-31',
  'dr-42', 'dr-44', 'dr-46', 'dr-54', 'dr-64', 'dr-10',
] as const;

const DRIP_ACTIONS: Record<string, string> = {
  'dr-01': 'standing at attention with a casual two-finger salute and a small relieved smile, as if reporting back to life',
  'dr-11': 'sitting stiffly upright with a wide mechanical smile and hollow eyes, one robotic thumbs up',
  'dr-33': 'leaning toward the viewer with a flat skeptical stare, holding a phone loosely',
  'dr-43': 'holding a warm rice bowl toward the viewer with a caring, cheerful look',
  'dr-53': 'cheek-to-cheek selfie pose making a small finger heart, playful pout',
  'dr-23': 'chin resting on one hand, eyes looking up empty and thoughtful, a coffee cup on the desk',
  'dr-14': 'sitting at a desk completely limp with the head dropped to one side, a faint ghost-like soul drifting out',
  'dr-34': 'staring at a phone with narrowed eyes and a dark shadow over the face',
  'dr-62': 'walking in with both arms full of gift bags and a bright polite smile',
  'dr-07': 'pointing at the viewer with a delighted impressed face, small sparkles around',
  'dr-28': 'holding an iced coffee cup with both hands like a life-saving IV, drained expression',
  'dr-39': 'laughing hard while holding the belly, head tilted back, tears of laughter',
  'dr-03': 'bowing with hands together in thanks, one sly eye open, a single coin glinting nearby',
  'dr-15': 'frowning furiously at a wall calendar with a clenched fist',
  'dr-18': 'tiptoeing forward with a sly grin and a coffee cup, sneaking away from the desk',
  'dr-22': 'striding out with a bag over one shoulder, arms wide, triumphant grin',
  'dr-26': 'cheerfully biting into a snack with full cheeks, sparkles of joy',
  'dr-31': 'raising a glass toward the viewer with a delighted grin',
  'dr-42': 'squinting with a doubtful head tilt and a slightly crooked mouth',
  'dr-44': 'holding up a small found treasure with a proud, surprised smile',
  'dr-46': 'pointing a firm finger with a serious encouraging nod',
  'dr-54': 'puckering lips and leaning toward the viewer, small hearts floating',
  'dr-64': 'arms open wide under a shower of falling coins, laughing',
  'dr-10': 'leaning back with both hands behind the head, relaxed half-smile',
};

const DRIP_STYLE: Partial<Record<Emotion, TextLayerStyle>> = {
  love: 'calli',
  joy: 'calli',
  laugh: 'bold',
  surprised: 'bold',
  angry: 'bold',
  smug: 'stamp',
  blank: 'stamp',
  tired: 'gothic',
  sad: 'gothic',
  sulk: 'calli',
};

const DRIP_EFFECT: Record<string, EffectKind> = {
  'dr-18': 'money',
  'dr-64': 'money',
  'dr-53': 'heart',
  'dr-54': 'heart',
  'dr-07': 'sparkle',
  'dr-22': 'sparkle',
};

const DRIP: FormatCut[] = DRIP_CUT_IDS.map((id) => {
  const item = dripLineById(id);
  if (!item) throw new Error(`drip-themes 에 ${id} 가 없습니다`);
  const length = item.line.length;
  const size = length <= 5 ? 0.14 : length <= 8 ? 0.125 : length <= 11 ? 0.11 : 0.1;
  const effect = DRIP_EFFECT[id];
  return C(id, item.label, item.line, item.emotion, DRIP_ACTIONS[id], item.lineEn, item.labelEn, {
    textLayer: { style: DRIP_STYLE[item.emotion] ?? 'bold', bubble: 'none', x: 0.5, y: 0.85, size, rotate: 0 },
    ...(effect ? { effect } : {}),
  });
});

export const PACK_FORMATS: PackFormat[] = [
  {
    id: 'drip',
    label: '드립·반전 티키타카',
    labelEn: 'Deadpan drip pack',
    emoji: '😏',
    tagline: '킹받는 반전·드립 24컷 — 넵티콘부터 사투리까지',
    taglineEn: '24 deadpan drip cuts, from soulless yes to Busan quips',
    description: '사진 1장으로 만드는 드립·밈 24컷. “생존 신고합니다”, “몸만 출근했습니다”, “월급 루팡 출동”, “밥 뭇나?”처럼 단톡방에서 바로 쓰는 반전 드립 대사로 맞췄습니다. 66컷 전체는 대사 스튜디오(/quotes)에서 고를 수 있어요.',
    descriptionEn: 'Twenty-four deadpan meme cuts from one photo: survival report, salary thief, Busan “did you eat?”. The full 66 lines live in the quote studio.',
    needsSecondPhoto: false,
    textMode: 'layer',
    cuts: DRIP,
    prompt: {
      scene: 'a deadpan comic reaction that matches the caption: a flat or sly face doing an everyday gesture (salute, stiff thumbs up, holding a rice bowl, laughing while holding the belly, leaning back relaxed). Korean internet meme energy, natural and readable, at most one small prop',
      layout: 'one person from the chest up, centered, expression and gesture fully visible and not cropped',
    },
  },
  {
    id: 'duo-chemi',
    label: '2인 케미 팩',
    labelEn: 'Duo chemistry pack',
    emoji: '💞',
    tagline: '커플·단톡방 12컷 — 치맥 콜부터 삐짐까지',
    taglineEn: '12 couple & group-chat cuts',
    description: '커플·친구 사진 2장으로 만드는 12컷. “퇴근 후 치맥 콜?”, “야근 중 살려줘”, “삐짐 vs 달래기”처럼 2인 상호작용 전용 대사로 맞췄습니다.',
    descriptionEn: 'Twelve two-person cuts from two photos: after-work drinks, overtime rescue, sulking vs soothing.',
    needsSecondPhoto: true,
    textMode: 'layer',
    killer: true,
    unlockPrice: 7900,
    cuts: DUO_CHEMI,
    prompt: {
      scene: 'two people interacting naturally with each other in a warm everyday scene that fits the caption (toasting drinks, rescuing a tired coworker, pouting while being comforted). The first person comes from the first reference photo, the second person comes from the second reference photo',
      layout: 'both people fully visible side by side at the same scale, facing each other or the viewer, centered with space between them',
    },
  },
  {
    id: 'pet-meme',
    label: '반려동물 집사 밈 팩',
    labelEn: 'Pet butler meme pack',
    emoji: '🐾',
    tagline: '강아지·고양이 12컷 — 간식 내놔부터 방귀까지',
    taglineEn: '12 pet-butler meme cuts',
    description: '강아지·고양이 사진 1장으로 만드는 12컷. “간식 내놔”, “산책 가자”, “집사야 일해라”, “밥 줘”, “누가 방귀 꼈어” 같은 한국형 집사 밈 전용 대사로 맞췄습니다.',
    descriptionEn: 'Twelve pet-butler memes from one dog or cat photo: treats, walks, feed me, who farted.',
    needsSecondPhoto: false,
    textMode: 'layer',
    killer: true,
    unlockPrice: 6900,
    cuts: PET_MEME,
    prompt: {
      scene: 'the pet acting out a funny everyday butler-meme moment that fits the caption (demanding a treat, begging for a walk, commanding its human, sniffing suspiciously)',
      layout: 'the pet centered and fully visible from ears to paws, expressive face toward the viewer, simple clean background',
    },
  },
  {
    id: 'situation',
    label: '상황·행동 리액션',
    labelEn: 'Situations & actions',
    emoji: '🏃',
    tagline: '퇴근·야근·커피까지, 메신저 실사용 컷',
    taglineEn: 'Real messenger moments',
    description: '“퇴근합니다”, “커피 수혈 중”, “확인했습니다(꾸벅)”처럼 대화에서 바로 쓰는 행동·인사 컷 24종입니다.',
    descriptionEn: 'Everyday work and life actions you actually send: leaving work, coffee refills, a polite bow.',
    needsSecondPhoto: false,
    textMode: 'layer',
    cuts: SITUATION,
    prompt: {
      scene: 'a clear, readable everyday action or greeting that people send in chat. Show the gesture plainly (waving, bowing, thumbs up, holding a coffee cup, leaving with a bag) with at most one small prop',
      layout: 'one person from the chest up, centered, the gesture fully visible and not cropped',
    },
  },
  {
    id: 'parody',
    label: '짤·뉴스·자막 패러디',
    labelEn: 'Meme & news captions',
    emoji: '📰',
    tagline: '극단 줌인 정색 + [속보] 자막',
    taglineEn: 'Extreme zoom + breaking news',
    description: '예능·뉴스 자막 스타일의 패러디 컷입니다. 극단 줌인 정색 표정과 [속보] 자막 바를 앱에서 합성합니다.',
    descriptionEn: 'Variety-show and news caption parody cuts with extreme zoom-in deadpan faces and caption bars.',
    needsSecondPhoto: false,
    textMode: 'layer',
    cuts: PARODY,
    prompt: {
      scene: 'a dramatic meme reaction: extreme close-up of a deadpan, shocked or exasperated face with strong cinematic lighting and slightly exaggerated zoom',
      layout: 'face fills most of the square frame, cropped tight above the eyebrows and below the chin, no props, no background scene',
    },
  },
  {
    id: 'duo',
    label: '2인·반려 케미',
    labelEn: 'Duo chemistry',
    emoji: '🤝',
    tagline: '사진 2장으로 하이파이브·삐짐',
    taglineEn: 'Two photos, one chemistry',
    description: '커플·친구·나+반려견 사진 2장으로 하이파이브, 삐짐, 어깨동무 같은 2인 상호작용 컷을 만듭니다.',
    descriptionEn: 'Upload two photos and generate two-person interactions: high fives, pouting, arms around shoulders.',
    needsSecondPhoto: true,
    textMode: 'layer',
    cuts: DUO,
    prompt: {
      scene: 'two people interacting naturally with each other (high five, hugging, pouting, waving together). The first person comes from the first reference photo, the second person comes from the second reference photo',
      layout: 'both people fully visible side by side at the same scale, facing each other or the viewer, centered with space between them',
    },
  },
  {
    id: 'typo',
    label: '글자 주인공(타이포)',
    labelEn: 'Typography hero',
    emoji: '🔤',
    tagline: '큼직한 도장·손글씨가 주인공',
    taglineEn: 'Big lettering takes the stage',
    description: '캐릭터는 구석에 작게 빼꼼, “읽씹 금지”·“완전 인정” 같은 큼직한 도장·손글씨가 주인공인 포맷입니다.',
    descriptionEn: 'The character peeks from a corner while big stamp or handwriting lettering takes the stage.',
    needsSecondPhoto: false,
    textMode: 'layer',
    cuts: TYPO,
    prompt: {
      scene: 'the character peeks into the frame from one corner with a small expressive face, leaving the center of the canvas mostly empty for large lettering',
      layout: 'the character occupies only about one quarter of the canvas in a corner; the rest is clean empty white space; no text of any kind',
    },
  },
  {
    id: 'combo',
    label: '이펙트·2단 합체',
    labelEn: 'Effects & combos',
    emoji: '💥',
    tagline: '불꽃·돈다발 + 위아래 이어지는 콤보',
    taglineEn: 'Fire, money rain, stackable combos',
    description: '불타는 배경·돈다발·하트 폭격 이펙트 컷과, 두 개를 연달아 보내면 위아래 그림이 이어지는 2단 합체 콤보입니다.',
    descriptionEn: 'Effect cuts (fire, money rain, heart barrage) plus two-panel combos that connect when sent together.',
    needsSecondPhoto: false,
    textMode: 'layer',
    cuts: COMBO,
    prompt: {
      scene: 'a dramatic effect scene: flames, a shower of banknotes, bursting hearts, lightning or fireworks behind the person, cinematic and comic',
      layout: 'the subject is anchored to the shared edge of the panel so the two stacked panels form one continuous picture',
    },
  },
];

/** 컷의 기본 글자 레이어 (문구는 컷 대사가 기본값) */
export function defaultLayerOf(cut: FormatCut): Partial<TextLayer> | null {
  if (!cut.textLayer) return null;
  return { text: cut.line, ...cut.textLayer };
}

export function packFormatById(id: string | null | undefined): PackFormat | undefined {
  return PACK_FORMATS.find((format) => format.id === id);
}

export function isPackFormatId(id: string | null | undefined): id is PackFormatId {
  return !!packFormatById(id);
}

/** 팩 크기(12/16/24)에 맞춰 컷을 고른다. 모자라면 반복하지 않고 가능한 만큼만 돌려준다. */
export function formatCuts(formatId: PackFormatId, size: number, locale: Locale = 'ko'): FormatCut[] {
  const format = packFormatById(formatId);
  if (!format) return [];
  return format.cuts.slice(0, Math.max(1, size)).map((cut) => ({
    ...cut,
    label: locale === 'en' ? cut.labelEn : cut.label,
    line: locale === 'en' ? cut.lineEn : cut.line,
  }));
}

export function formatCutByTemplate(templateId: string): { format: PackFormat; cut: FormatCut } | null {
  if (!templateId.startsWith('fmt-')) return null;
  for (const format of PACK_FORMATS) {
    const cut = format.cuts.find((item) => `fmt-${format.id}-${item.id}` === templateId);
    if (cut) return { format, cut };
  }
  return null;
}

/** 컷의 서버 측 장면 지시 (combo 는 위/아래 역할까지) */
export function cutSceneAction(templateId: string): string | undefined {
  const found = formatCutByTemplate(templateId);
  if (!found) return undefined;
  return found.cut.action;
}

export function formatShortSummary(format: PackFormat): string {
  return `${format.emoji} ${format.label} · ${format.cuts.length}컷 구성`;
}
