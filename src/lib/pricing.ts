// ─────────────────────────────────────────────────────────────
// 가격·플랜·SKU 정의 (서버/클라이언트 공용, 단일 소스)
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
    tagline: '일단 내 얼굴로 만들어보기',
    features: ['월 12크레딧 (12컷)', '스타일 7종', '12컷 팩', '내 대화방용 PNG 저장 (워터마크 포함)'],
    watermark: true,
    acr: false,
    goodsDiscount: 0,
  },
  PLUS: {
    plan: 'PLUS',
    name: 'Plus',
    price: 9900,
    credits: 36,
    styles: 11,
    tagline: '매일 쓰는 사람을 위한 플랜',
    features: [
      '월 36크레딧 (36컷)',
      '스타일 11종 전체',
      '24컷 팩',
      '워터마크 없이 내 대화방용 PNG·GIF 저장',
      'Daily Face Brief 하루 8컷 추천',
    ],
    highlight: true,
    watermark: false,
    acr: false,
    goodsDiscount: 0,
  },
  STUDIO: {
    plan: 'STUDIO',
    name: 'Studio',
    price: 24900,
    credits: 120,
    styles: 11,
    tagline: '작가·브랜드·팀을 위한 플랜',
    features: [
      '월 120크레딧 (120컷)',
      '스타일 11종 전체 · 24컷 팩',
      '상업적 이용 라이선스',
      '워터마크 없이 저장',
      '360×360 PNG ZIP 번들 (라이선스·규격 정보 포함)',
    ],
    watermark: false,
    acr: true,
    goodsDiscount: 0,
  },
};

// ─────────────────────────────────────────────────────────────
// 요금제·스토어 표기에서 실제와 다르게 읽히지 않도록 함께 노출하는 안내
//  · 심사·환불 리스크를 줄이기 위해 요금제 화면과 스토어 문구가 같은 문장을 쓴다.
//  · 새 기능을 실제로 배포한 뒤에만 이 목록에서 해당 줄을 지운다.
// ─────────────────────────────────────────────────────────────
export const PLAN_DISCLOSURES = [
  '스타일 수는 실제로 고를 수 있는 화풍 수입니다 (무료 7종 · 유료 11종).',
  '카카오 이모티콘 스튜디오 제안 규격은 2026년 기준 32종·360×360·개당 150KB(78×78 아이콘 16KB)이며, 생성형 AI로 만든 이모티콘의 제안은 카카오 정책상 제한됩니다. 이 서비스는 카카오 스튜디오 출품을 대행하거나 보장하지 않고, 내 대화방에 보낼 수 있는 PNG·GIF 저장을 제공합니다.',
  '매일 아침 푸시 알림은 준비 중입니다. Daily Face Brief는 접속해서 보는 화면으로 제공됩니다.',
  'GIF는 내 대화방용으로 저장하는 움직이는 그림이며, 카카오·라인 이모티콘 스튜디오 제출 규격(WebP·APNG)으로 변환하지는 않습니다.',
  '굿즈 주문·배송은 준비 중입니다.',
] as const;

export interface Sku {
  sku: string;
  kind: 'subscription' | 'credits' | 'goods';
  title: string;
  price: number;
  credits: number;
  plan: Plan | null;
  desc: string;
}

export const SKUS: Record<string, Sku> = {
  'plan-plus-monthly': {
    sku: 'plan-plus-monthly',
    kind: 'subscription',
    title: 'Plus 월간 구독',
    price: 9900,
    credits: 36,
    plan: 'PLUS',
    desc: '월 36크레딧 · 스타일 11종 · 24컷 팩',
  },
  'plan-studio-monthly': {
    sku: 'plan-studio-monthly',
    kind: 'subscription',
    title: 'Studio 월간 구독',
    price: 24900,
    credits: 120,
    plan: 'STUDIO',
    desc: '월 120크레딧 · 상업 라이선스 · ZIP 번들',
  },
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
    desc: '무기한 60크레딧 (60컷) · 12% 할인',
  },
};

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

export const CREDITS_PER_FRAME = 1;
export const PACK_SIZES = [12, 24] as const;

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
