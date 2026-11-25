// ─────────────────────────────────────────────────────────────
// 시즌팩 3종 — 크리스마스 · 2027 새해 · 설날 한복
//  · 시즌팩은 '오늘 바로 여는 상품'이 아니라 **홍보 일정에 맞춰 기대를 쌓는 상품**이다.
//    그래서 이 파일에는 (1) 공개 일정(티저·오픈·종료)과 (2) 오픈 전에 미리 심어 두는
//    AI 프롬프트·악세사리·누끼 소품 데이터를 함께 담는다.
//  · 모든 일정은 **KST 벽시계** 기준 ISO 문자열(+09:00)로 적는다 — 서버가 UTC 로 돌아도
//    같은 순간을 가리킨다. 판정 로직은 src/lib/season.ts 한 곳에만 있다.
//  · 프롬프트(prompt)는 Gemini 이미지 생성에 그대로 붙는 영어 구절이고,
//    label 은 화면에 보여 줄 한국어 이름이다. 새 문장을 지어내지 말고 사실대로만 적는다.
//  · 무결성(3팩·일정 순서·프롬프트 종류·소품 id 연결)은 scripts/test-season-packs.ts 가 전수 검사한다.
// ─────────────────────────────────────────────────────────────

export type SeasonPackId = 'christmas' | 'newyear' | 'lunar';

/** 프롬프트가 지시하는 대상 — 복장 / 소품 / 배경 / 포즈 */
export type SeasonPromptKind = 'costume' | 'prop' | 'background' | 'pose';

export interface SeasonPromptEntry {
  id: string;
  kind: SeasonPromptKind;
  /** 화면에 보여 주는 한국어 이름 */
  label: string;
  labelEn: string;
  /** Gemini 이미지 프롬프트에 그대로 붙는 영어 구절 */
  prompt: string;
}

/** AI 컷 다시 그리기의 '악세사리'와 같은 모양 — 오픈일에 그대로 목록에 합쳐 쓴다. */
export interface SeasonAccessory {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
  promptAddition: string;
  priceCredits: number;
}

export interface SeasonLineSample {
  emoji: string;
  line: string;
  lineEn: string;
}

export interface SeasonAccent {
  /** 카드 그라데이션 (tailwind from-/to- 값) */
  from: string;
  to: string;
  /** 강조 글자색 (tailwind text-* 클래스) */
  ink: string;
  /** 배경 타일 (tailwind bg-* 클래스) */
  soft: string;
}

export interface SeasonPack {
  id: SeasonPackId;
  order: number;
  emoji: string;
  /** '크리스마스 에디션' */
  title: string;
  titleEn: string;
  /** 한 줄 후킹 문구 */
  headline: string;
  headlineEn: string;
  tagline: string;
  taglineEn: string;
  cuts: number;
  priceLabel: string;
  priceLabelEn: string;
  accent: SeasonAccent;
  /** KST 기준 공개 일정 — 이 시각부터 상태가 바뀐다 */
  teaseAt: string;
  openAt: string;
  closeAt: string;
  /** /studio/photo 소품 id (src/lib/studio/season-props.ts) */
  propIds: string[];
  prompts: SeasonPromptEntry[];
  accessories: SeasonAccessory[];
  lines: SeasonLineSample[];
}

export const SEASON_PACKS: SeasonPack[] = [
  {
    id: 'christmas',
    order: 1,
    emoji: '🎄',
    title: '크리스마스 에디션',
    titleEn: 'Christmas Edition',
    headline: '산타 모자 쓰고, 루돌프 코 달고',
    headlineEn: 'Santa hat on, reindeer nose ready',
    tagline: '산타 복장 · 루돌프 뿔 · 썰매 · 선물보따리까지 12컷',
    taglineEn: '12 cuts with Santa outfit, antlers, a sled and a gift sack',
    cuts: 12,
    priceLabel: '12컷 · 완성권 5,900원',
    priceLabelEn: '12 cuts · ₩5,900',
    accent: {
      from: 'from-[#C2405A]',
      to: 'to-[#6E29F5]',
      ink: 'text-[#B3324A]',
      soft: 'bg-[#FDF1F2]',
    },
    // 티저 12/01 → 정식 오픈 12/11 (KST)
    teaseAt: '2026-12-01T00:00:00+09:00',
    openAt: '2026-12-11T00:00:00+09:00',
    closeAt: '2027-01-07T00:00:00+09:00',
    propIds: ['santaHat', 'reindeerAntlers', 'rudolphNose', 'giftSack', 'snowSled', 'snowflake'],
    prompts: [
      {
        id: 'xmas-costume-santa',
        kind: 'costume',
        label: '산타 복장',
        labelEn: 'Santa outfit',
        prompt:
          'wearing a cozy red Santa suit with white fur trim, a black belt with a gold buckle, and a soft red Santa hat with a white pom-pom',
      },
      {
        id: 'xmas-costume-knit',
        kind: 'costume',
        label: '니트 크리스마스 룩',
        labelEn: 'Christmas knit',
        prompt:
          'wearing a cream knitted sweater with a small reindeer pattern and a red scarf, cozy winter mood',
      },
      {
        id: 'xmas-costume-antler',
        kind: 'costume',
        label: '루돌프 뿔 머리띠',
        labelEn: 'Reindeer antlers',
        prompt:
          'wearing a soft brown reindeer antler headband with a shiny red nose cover, no other costume change',
      },
      {
        id: 'xmas-prop-gift',
        kind: 'prop',
        label: '선물 상자',
        labelEn: 'Gift box',
        prompt: 'holding a small wrapped gift box with a red satin ribbon in front of the chest',
      },
      {
        id: 'xmas-prop-sack',
        kind: 'prop',
        label: '선물보따리',
        labelEn: 'Gift sack',
        prompt: 'carrying a large red gift sack with a gold drawstring over one shoulder',
      },
      {
        id: 'xmas-prop-sled',
        kind: 'prop',
        label: '눈썰매',
        labelEn: 'Snow sled',
        prompt: 'sitting on a wooden snow sled with red runners on a gentle snowy slope',
      },
      {
        id: 'xmas-bg-tree',
        kind: 'background',
        label: '트리·전구 배경',
        labelEn: 'Tree & fairy lights',
        prompt:
          'background is a softly blurred decorated Christmas tree with warm fairy lights and falling snow, shallow depth of field',
      },
      {
        id: 'xmas-bg-street',
        kind: 'background',
        label: '눈 내리는 거리',
        labelEn: 'Snowy street',
        prompt: 'background is a snowy night street with falling snowflakes and warm window lights',
      },
      {
        id: 'xmas-pose-sled',
        kind: 'pose',
        label: '썰매 타는 포즈',
        labelEn: 'Sledding pose',
        prompt: 'leaning forward on a sled with both hands gripping the rope, joyful laughing expression',
      },
    ],
    accessories: [
      {
        id: 'season-xmas-santa-hat',
        name: '산타 모자',
        nameEn: 'Santa hat',
        emoji: '🎅',
        promptAddition: 'wearing a soft red Santa hat with a white fur brim and pom-pom',
        priceCredits: 1,
      },
      {
        id: 'season-xmas-antlers',
        name: '루돌프 뿔·빨간 코',
        nameEn: 'Reindeer antlers',
        emoji: '🦌',
        promptAddition: 'wearing brown reindeer antlers with a shiny red nose',
        priceCredits: 1,
      },
      {
        id: 'season-xmas-gift-sack',
        name: '선물보따리',
        nameEn: 'Gift sack',
        emoji: '🎁',
        promptAddition: 'holding a red gift sack full of wrapped presents',
        priceCredits: 2,
      },
    ],
    lines: [
      { emoji: '🎄', line: '메리 크리스마스!', lineEn: 'Merry Christmas!' },
      { emoji: '🎁', line: '선물은 내가 들고 갈게', lineEn: 'I will bring the presents' },
      { emoji: '🦌', line: '루돌프 코 빨개졌잖아', lineEn: 'Rudolph, your nose is glowing' },
      { emoji: '🛷', line: '썰매 타고 갈까?', lineEn: 'Sled ride?' },
    ],
  },
  {
    id: 'newyear',
    order: 2,
    emoji: '🎆',
    title: '2027 새해 카운트다운',
    titleEn: '2027 New Year Countdown',
    headline: '새해 첫 컷은 폭죽과 함께',
    headlineEn: 'Start 2027 with fireworks',
    tagline: '카운트다운 · 폭죽 · 파티 12컷',
    taglineEn: '12 cuts with countdown, fireworks and party mood',
    cuts: 12,
    priceLabel: '12컷 · 완성권 5,900원',
    priceLabelEn: '12 cuts · ₩5,900',
    accent: {
      from: 'from-[#6E29F5]',
      to: 'to-[#FF9F5A]',
      ink: 'text-primary-dark',
      soft: 'bg-[#F3EEFF]',
    },
    // 티저 12/18 → 정식 오픈 12/26 (KST)
    teaseAt: '2026-12-18T00:00:00+09:00',
    openAt: '2026-12-26T00:00:00+09:00',
    closeAt: '2027-01-20T00:00:00+09:00',
    propIds: ['firework', 'partyPopper', 'confettiBurst'],
    prompts: [
      {
        id: 'ny-costume-party',
        kind: 'costume',
        label: '새해 파티 룩',
        labelEn: 'New Year party look',
        prompt:
          'wearing a sparkly gold party outfit with a shiny party hat and a small glittering bow tie',
      },
      {
        id: 'ny-prop-popper',
        kind: 'prop',
        label: '파티 폭죽',
        labelEn: 'Party popper',
        prompt: 'holding a party popper with colorful confetti bursting out of it',
      },
      {
        id: 'ny-prop-sign',
        kind: 'prop',
        label: '2027 사인',
        labelEn: '2027 sign',
        prompt: 'holding up a small glowing sign that reads 2027, minimal clean design',
      },
      {
        id: 'ny-bg-fireworks',
        kind: 'background',
        label: '도시 폭죽 밤하늘',
        labelEn: 'City fireworks',
        prompt:
          'background is a night city skyline with colorful fireworks blooming and warm bokeh lights',
      },
      {
        id: 'ny-bg-countdown',
        kind: 'background',
        label: '카운트다운 파티',
        labelEn: 'Countdown party',
        prompt:
          'background is a countdown party with falling golden confetti, glowing bokeh and a soft dark blue night tone',
      },
      {
        id: 'ny-pose-countdown',
        kind: 'pose',
        label: '카운트다운 포즈',
        labelEn: 'Countdown pose',
        prompt: 'raising both hands for a countdown celebration, excited open-mouth expression',
      },
    ],
    accessories: [
      {
        id: 'season-ny-party-hat',
        name: '새해 파티 고깔',
        nameEn: 'Party hat',
        emoji: '🥳',
        promptAddition: 'wearing a shiny gold party hat with a small pompom',
        priceCredits: 1,
      },
      {
        id: 'season-ny-popper',
        name: '파티 폭죽',
        nameEn: 'Party popper',
        emoji: '🎉',
        promptAddition: 'holding a party popper bursting with golden confetti',
        priceCredits: 2,
      },
      {
        id: 'season-ny-glasses',
        name: '2027 숫자 안경',
        nameEn: '2027 glasses',
        emoji: '🤓',
        promptAddition: 'wearing novelty 2027 number glasses on the face, clean minimal design',
        priceCredits: 2,
      },
    ],
    lines: [
      { emoji: '🎆', line: '새해 복 많이 받아!', lineEn: 'Happy New Year!' },
      { emoji: '🕛', line: '3… 2… 1!', lineEn: '3... 2... 1!' },
      { emoji: '💫', line: '2027년엔 다 잘 될 거야', lineEn: '2027 is our year' },
      { emoji: '🥂', line: '짠! 새해 첫 잔', lineEn: 'Cheers to the new year' },
    ],
  },
  {
    id: 'lunar',
    order: 3,
    emoji: '🧧',
    title: '설날 한복 에디션',
    titleEn: 'Lunar New Year Hanbok',
    headline: '한복 입고 세배하는 나',
    headlineEn: 'Bowing in hanbok',
    tagline: '한복 · 복주머니 · 전통 배경 12컷',
    taglineEn: '12 cuts with hanbok, lucky pouch and a hanok backdrop',
    cuts: 12,
    priceLabel: '12컷 · 완성권 5,900원',
    priceLabelEn: '12 cuts · ₩5,900',
    accent: {
      from: 'from-[#8C7BC8]',
      to: 'to-[#C2405A]',
      ink: 'text-[#6B4FA8]',
      soft: 'bg-[#F6F2FC]',
    },
    // 티저 01/10 → 정식 오픈 01/20 (KST)
    teaseAt: '2027-01-10T00:00:00+09:00',
    openAt: '2027-01-20T00:00:00+09:00',
    closeAt: '2027-02-28T00:00:00+09:00',
    propIds: ['bokjumeoni', 'hanbokBow'],
    prompts: [
      {
        id: 'lunar-costume-hanbok',
        kind: 'costume',
        label: '여성 한복',
        labelEn: 'Hanbok (chima)',
        prompt:
          'wearing a traditional Korean hanbok with a pastel jeogori and a long chima skirt, silk texture and a norigae tassel',
      },
      {
        id: 'lunar-costume-hanbok-male',
        kind: 'costume',
        label: '남성 한복',
        labelEn: 'Hanbok (baji)',
        prompt:
          'wearing a traditional Korean hanbok with a muted jeogori and baji trousers, clean modern styling',
      },
      {
        id: 'lunar-prop-pouch',
        kind: 'prop',
        label: '복주머니',
        labelEn: 'Lucky pouch',
        prompt: 'holding a silk bokjumeoni lucky pouch with a gold tassel in both hands',
      },
      {
        id: 'lunar-prop-fan',
        kind: 'prop',
        label: '부채',
        labelEn: 'Folding fan',
        prompt: 'holding a traditional paper folding fan half open',
      },
      {
        id: 'lunar-bg-hanok',
        kind: 'background',
        label: '한옥 마당',
        labelEn: 'Hanok courtyard',
        prompt:
          'background is a hanok courtyard with dark roof tiles, a paper lantern and a persimmon tree in winter',
      },
      {
        id: 'lunar-bg-table',
        kind: 'background',
        label: '차례상',
        labelEn: 'Ritual table',
        prompt:
          'background is a warm indoor setting with a low traditional table and soft paper lantern light',
      },
      {
        id: 'lunar-pose-sebae',
        kind: 'pose',
        label: '세배 포즈',
        labelEn: 'Sebae bow',
        prompt: 'performing a traditional sebae deep bow with hands together, respectful bright expression',
      },
    ],
    accessories: [
      {
        id: 'season-lunar-pouch',
        name: '복주머니',
        nameEn: 'Lucky pouch',
        emoji: '🧧',
        promptAddition: 'holding a red silk bokjumeoni lucky pouch with a gold tassel',
        priceCredits: 2,
      },
      {
        id: 'season-lunar-norigae',
        name: '한복 노리개',
        nameEn: 'Norigae',
        emoji: '🎀',
        promptAddition: 'wearing a traditional norigae tassel ornament on the hanbok',
        priceCredits: 1,
      },
      {
        id: 'season-lunar-gat',
        name: '전통 갓',
        nameEn: 'Traditional hat',
        emoji: '🎩',
        promptAddition: 'wearing a traditional black horsehair gat hat',
        priceCredits: 2,
      },
    ],
    lines: [
      { emoji: '🧧', line: '새해 복 많이 받으세요', lineEn: 'Happy Lunar New Year' },
      { emoji: '🙇', line: '세배 받으세요', lineEn: 'Here is my New Year bow' },
      { emoji: '💰', line: '복주머니 여기 있어요', lineEn: 'Your lucky pouch is here' },
      { emoji: '🏮', line: '차례 지내고 올게', lineEn: 'Off to the family rite' },
    ],
  },
];

export const SEASON_PACK_COUNT = SEASON_PACKS.length;

export function seasonPackById(id: string | null | undefined): SeasonPack | undefined {
  return SEASON_PACKS.find((pack) => pack.id === id);
}

/** 오픈일이 지난 팩부터 앞에 — 홈·허브 노출 순서 */
export function seasonPackOrder(): SeasonPack[] {
  return [...SEASON_PACKS].sort((a, b) => a.order - b.order);
}

/** 모든 시즌 악세사리 (오픈 판정은 src/lib/season.ts) */
export const SEASON_ACCESSORIES: SeasonAccessory[] = SEASON_PACKS.flatMap((pack) => pack.accessories);

export function seasonAccessoryById(id: string | null | undefined): SeasonAccessory | undefined {
  return SEASON_ACCESSORIES.find((item) => item.id === id);
}

/** 악세사리 id → 어느 시즌팩인지 */
export function seasonPackOfAccessory(id: string): SeasonPack | undefined {
  return SEASON_PACKS.find((pack) => pack.accessories.some((item) => item.id === id));
}
