// ─────────────────────────────────────────────────────────────
// 가격·플랜·SKU 정의 (서버/클라이언트 공용, 단일 소스)
//  · 2026-11-23 개편: 구독 중심 → '12컷 풀팩 워터마크 미리보기 + 단건 잠금 해제'.
//  · 3단 가격 매트릭스
//      ① 단건 팩 완성권  ₩5,900 (2인 케미 ₩7,900 · 반려동물 ₩6,900)
//      ② 시즌·테마 크레딧 팩 ₩9,900 ~ ₩22,000
//      ③ Creator Pro 월 이용권 ₩19,900 (32종 모션 · 상업적 이용 · 심사 시트)
//  · 서버 주문 금액은 언제나 이 표(SKUS[].price)로만 산정한다 (클라이언트 금액 불신).
// ─────────────────────────────────────────────────────────────

import type { Plan } from '@/lib/types';

export interface PlanDef {
  plan: Plan;
  name: string;
  price: number;
  credits: number;
  styles: number;
  tagline: string;
  features: string[];
  highlight?: boolean;
  watermark: boolean;
  acr: boolean; // 상업적 이용 라이선스
  goodsDiscount: number;
}

export const PLANS: Record<Plan, PlanDef> = {
  FREE: {
    plan: 'FREE',
    name: 'Free',
    price: 0,
    credits: 12,
    // 실제 허용 스타일 수는 src/lib/packs.ts 의 FREE_TONES 와 반드시 같아야 한다 (테스트로 검증).
    styles: 7,
    tagline: '12컷 전체를 워터마크로 먼저 확인',
    features: [
      '12컷 풀팩 저해상도·워터마크 미리보기',
      '스타일 7종',
      '친구 초대 1명당 3컷 무료 해제',
      '마음에 들면 단건 완성권 ₩5,900',
    ],
    watermark: true,
    acr: false,
    goodsDiscount: 0,
  },
  // 레거시 등급 — 신규 판매하지 않는다. 기존 계정·플레이 상품 호환을 위해서만 남긴다.
  PLUS: {
    plan: 'PLUS',
    name: 'Plus (레거시)',
    price: 9900,
    credits: 36,
    styles: 11,
    tagline: '기존 구독 계정용',
    features: ['월 36크레딧', '스타일 11종 전체', '워터마크 없이 저장'],
    watermark: false,
    acr: false,
    goodsDiscount: 0,
  },
  STUDIO: {
    plan: 'STUDIO',
    name: 'Creator Pro',
    price: 19900,
    credits: 120,
    styles: 11,
    tagline: '작가·브랜드·팀을 위한 월 이용권',
    features: [
      '월 120크레딧 (24컷 모션 일괄 생성)',
      '스타일 11종 전체 · 24·32컷 팩',
      '상업적 이용 라이선스',
      '카카오·라인 심사 시트 (컨셉·제목·해시태그) 자동 생성',
      '멈춘 32컷·움직이는 24컷 규격 ZIP 자동 압축·검증',
    ],
    highlight: true,
    watermark: false,
    acr: true,
    goodsDiscount: 0,
  },
};

/** 3단 가격 매트릭스 — /pricing·홈·스튜디오 잠금 화면이 같은 문장을 쓴다. */
export interface PriceTier {
  id: 'single' | 'theme' | 'creator';
  name: string;
  priceLabel: string;
  unit: string;
  tagline: string;
  points: string[];
  highlight?: boolean;
}

export const PRICE_TIERS: PriceTier[] = [
  {
    id: 'single',
    name: '단건 팩 완성권',
    priceLabel: '5,900원',
    unit: '/팩',
    tagline: '12컷 전체를 본 뒤, 마음에 드는 팩 하나만',
    points: [
      '12컷 잠금 해제 (2인 케미 7,900원 · 반려동물 6,900원)',
      '고화질 · 투명 PNG · 워터마크 제거',
      '카카오·라인 규격 ZIP 내보내기',
      '구독 없음 · 1회 결제',
    ],
    highlight: true,
  },
  {
    id: 'theme',
    name: '시즌·테마 크레딧 팩',
    priceLabel: '9,900 ~ 22,000원',
    unit: '/팩',
    tagline: '여러 팩을 만들 때 쓰는 무기한 크레딧',
    points: [
      '30 · 48 · 80크레딧 (1컷 = 1크레딧)',
      '소멸 없음 · 시즌 테마 컷 구성',
      '12컷 미리보기 → 잠금 해제에 함께 사용',
      '크레딧으로 만든 팩도 잠금 해제 대상',
    ],
  },
  {
    id: 'creator',
    name: 'Creator Pro',
    priceLabel: '19,900원',
    unit: '/월',
    tagline: '작가·마케터를 위한 상업 라이선스',
    points: [
      '월 120크레딧 · 24컷 모션 일괄 생성',
      '상업적 이용 라이선스',
      '카카오·라인 심사 시트 자동 생성',
      '모든 팩 잠금 해제 포함 (워터마크 없음)',
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// 요금제·스토어 표기에서 실제와 다르게 읽히지 않도록 함께 노출하는 안내
//  · 심사·환불 리스크를 줄이기 위해 요금제 화면과 스토어 문구가 같은 문장을 쓴다.
//  · 새 기능을 실제로 배포한 뒤에만 이 목록에서 해당 줄을 지운다.
// ─────────────────────────────────────────────────────────────
export const PLAN_DISCLOSURES = [
  '스타일 수는 실제로 고를 수 있는 화풍 수입니다 (무료 7종 · 유료 11종).',
  '무료 미리보기는 12컷 전체를 저해상도·반투명 워터마크로 보여 주며, 단건 팩 완성권 결제 후 고화질·투명 PNG와 ZIP 내보내기가 열립니다.',
  '카카오 이모티콘 스튜디오 제안 규격은 2026년 기준 멈춘 이모티콘(PNG) 32컷 · 움직이는 이모티콘(GIF·APNG) 24컷이며, 규격은 360×360·개당 150KB(78×78 아이콘 16KB)이고, 생성형 AI로 만든 이모티콘의 제안은 카카오 정책상 제한됩니다. 이 서비스는 카카오 스튜디오 출품을 대행하거나 보장하지 않고, 내 대화방에 보낼 수 있는 PNG·GIF 저장을 제공합니다.',
  '매일 아침 푸시 알림은 준비 중입니다. Daily Face Brief는 접속해서 보는 화면으로 제공됩니다.',
  '움직이는 이모티콘은 360×360 투명 GIF 또는 APNG로 저장합니다. 카카오 스튜디오 제안 규격(멈춘 32컷 · 움직이는 24컷)은 앱이 자동 검증·압축해 ZIP으로 묶어 드리지만, 출품 심사는 직접 진행해야 합니다.',
  'Creator Pro 는 1개월 이용권으로 판매하며 자동 갱신되지 않습니다. 만료 후에는 잠금 해제한 팩의 내보내기 권한이 그대로 유지됩니다.',
  '굿즈 주문·배송은 준비 중입니다.',
];

export type SkuKind = 'subscription' | 'credits' | 'goods' | 'unlock';

export interface Sku {
  sku: string;
  kind: SkuKind;
  title: string;
  price: number;
  credits: number;
  plan: Plan | null;
  desc: string;
  /** 요금제 화면 노출 여부 (레거시 SKU 는 숨긴다) */
  visible?: boolean;
  /** 단건 잠금 해제 대상 표기 */
  unlockFor?: 'pack' | 'duo' | 'pet';
  /** 월 이용권 일수 */
  days?: number;
}

/** 단건 팩 완성권 — 무료 미리보기 팩을 잠금 해제한다. */
export const PACK_UNLOCK_SKUS = ['pack-unlock-single', 'pack-unlock-duo', 'pack-unlock-pet'] as const;
export type PackUnlockSku = (typeof PACK_UNLOCK_SKUS)[number];

/**
 * 교환권(무료 지급 경로)으로 발급할 수 있는 팩 완성권.
 *  · PG 계약 전에는 운영자가 교환권으로 잠금을 열어 준다.
 *  · 2인 케미·반려동물 완성권은 생성 원가가 더 드는 상품이라 무료 지급에서 뺀다(남용 방지).
 *  · docs/FREE-PAYMENT-PLAYBOOK.md §4 참고.
 */
export const REDEEMABLE_UNLOCK_SKUS: PackUnlockSku[] = ['pack-unlock-single'];

/** 교환권으로 지급 가능한 크레딧 팩 — 가장 작은 팩부터 (원가 통제) */
export const REDEEMABLE_CREDIT_SKUS = ['credits-theme-9900'] as const;

/** 교환권 지급이 허용된 SKU 전체 */
export function redeemableSkus(): string[] {
  return [...REDEEMABLE_UNLOCK_SKUS, ...REDEEMABLE_CREDIT_SKUS, 'plan-creator-monthly'];
}

export const SKUS: Record<string, Sku> = {
  'pack-unlock-single': {
    sku: 'pack-unlock-single',
    kind: 'unlock',
    title: '단건 팩 완성권',
    price: 5900,
    credits: 0,
    plan: null,
    desc: '12컷 잠금 해제 · 고화질·투명 PNG·무워터마크·ZIP',
    visible: true,
    unlockFor: 'pack',
  },
  'pack-unlock-duo': {
    sku: 'pack-unlock-duo',
    kind: 'unlock',
    title: '2인 케미 팩 완성권',
    price: 7900,
    credits: 0,
    plan: null,
    desc: '커플·친구 12컷 잠금 해제 · 고화질·투명 PNG·ZIP',
    visible: true,
    unlockFor: 'duo',
  },
  'pack-unlock-pet': {
    sku: 'pack-unlock-pet',
    kind: 'unlock',
    title: '반려동물 집사 밈 팩 완성권',
    price: 6900,
    credits: 0,
    plan: null,
    desc: '반려동물 12컷 잠금 해제 · 고화질·투명 PNG·ZIP',
    visible: true,
    unlockFor: 'pet',
  },
  'plan-creator-monthly': {
    sku: 'plan-creator-monthly',
    kind: 'subscription',
    title: 'Creator Pro 1개월 이용권',
    price: 19900,
    credits: 120,
    plan: 'STUDIO',
    desc: '월 120크레딧 · 24컷 모션 · 상업 라이선스 · 심사 시트',
    visible: true,
    days: 30,
  },
  'credits-theme-9900': {
    sku: 'credits-theme-9900',
    kind: 'credits',
    title: '시즌 크레딧 30팩',
    price: 9900,
    credits: 30,
    plan: null,
    desc: '무기한 30크레딧 (30컷) · 시즌 테마',
    visible: true,
  },
  'credits-theme-14900': {
    sku: 'credits-theme-14900',
    kind: 'credits',
    title: '테마 크레딧 48팩',
    price: 14900,
    credits: 48,
    plan: null,
    desc: '무기한 48크레딧 (48컷) · 12컷 팩 4개',
    visible: true,
  },
  'credits-theme-22000': {
    sku: 'credits-theme-22000',
    kind: 'credits',
    title: '시즌·테마 크레딧 80팩',
    price: 22000,
    credits: 80,
    plan: null,
    desc: '무기한 80크레딧 (80컷) · 32컷 팩 2개 + 16컷',
    visible: true,
  },
  // 레거시 크레딧 — 기존 주문 복구·플레이 상품 호환용
  'credits-20': {
    sku: 'credits-20',
    kind: 'credits',
    title: '크레딧 20팩',
    price: 4900,
    credits: 20,
    plan: null,
    desc: '무기한 20크레딧 (20컷)',
  },
  'credits-60': {
    sku: 'credits-60',
    kind: 'credits',
    title: '크레딧 60팩',
    price: 12900,
    credits: 60,
    plan: null,
    desc: '무기한 60크레딧 (60컷)',
  },
};

/** 화면에 노출하는 SKU (레거시 제외) */
export function visibleSkus(kind?: SkuKind): Sku[] {
  return Object.values(SKUS).filter((item) => item.visible !== false && (!kind || item.kind === kind));
}

/** 팩 구성에 맞는 잠금 해제 SKU — 2인 케미 7,900 · 반려동물 6,900 · 그 외 5,900 */
export function unlockSkuForPack(format?: string | null, subjectKind?: string | null): PackUnlockSku {
  if (format === 'duo' || format === 'duo-chemi') return 'pack-unlock-duo';
  if (subjectKind === 'pet' || format === 'pet-meme') return 'pack-unlock-pet';
  return 'pack-unlock-single';
}

export function unlockPriceOf(sku: string): number {
  return SKUS[sku]?.price ?? SKUS['pack-unlock-single'].price;
}

export interface GoodsDef {
  sku: string;
  name: string;
  price: number;
  desc: string;
  emoji: string;
  colors: string;
}

export const GOODS: GoodsDef[] = [
  { sku: 'goods-acrylic', name: '아크릴 스탠드', price: 14900, desc: '15cm · 투명 아크릴 · 1컷', emoji: '🖼️', colors: 'from-sky/30 to-cream' },
  { sku: 'goods-photocard', name: '포토카드 5장', price: 12900, desc: '55×85mm · 5컷 세트', emoji: '💌', colors: 'from-pink/60 to-cream' },
  { sku: 'goods-mug', name: '머그컵', price: 18900, desc: '350ml · 승화 인쇄 · 1컷', emoji: '☕', colors: 'from-lemon/50 to-cream' },
  { sku: 'goods-sticker', name: '미니 스티커팩', price: 6900, desc: '12컷 · 방수 · 다꾸용', emoji: '✨', colors: 'from-mint/40 to-cream' },
];

/** 잠금 해제 직후 굿즈 번들 할인 (아크릴 키링·방수 스티커 3번들) */
export const GOODS_BUNDLE_DISCOUNT = 20;

export const CREDITS_PER_FRAME = 1;
export const PACK_SIZES = [12, 24, 32] as const;

export function packCost(size: number) {
  return size * CREDITS_PER_FRAME;
}

export function won(n: number) {
  return n.toLocaleString('en-US');
}

export function useCredits(plan: Plan, size: number) {
  const def = PLANS[plan];
  const cost = packCost(size);
  return { cost, affordable: def.credits >= 0 && cost > 0 };
}
