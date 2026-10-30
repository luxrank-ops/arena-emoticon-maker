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
    styles: 2,
    tagline: '일단 내 얼굴로 만들어보기',
    features: ['월 12크레딧 (12컷)', '스타일 2종', 'PNG 내보내기', '워터마크 포함', 'Daily Brief 미포함'],
    watermark: true,
    acr: false,
    goodsDiscount: 0,
  },
  PLUS: {
    plan: 'PLUS',
    name: 'Plus',
    price: 9900,
    credits: 36,
    styles: 6,
    tagline: '매일 쓰는 사람을 위한 플랜',
    features: [
      '월 36크레딧 (36컷)',
      '스타일 6종 전체',
      'GIF 애니메이션',
      '워터마크 제거',
      'Daily Face Brief 매일 아침',
      'Chat-to-Sticker 무제한',
    ],
    highlight: true,
    watermark: false,
    acr: false,
    goodsDiscount: 10,
  },
  STUDIO: {
    plan: 'STUDIO',
    name: 'Studio',
    price: 24900,
    credits: 120,
    styles: 6,
    tagline: '작가·브랜드·팀을 위한 플랜',
    features: [
      '월 120크레딧 (120컷)',
      '카카오 제안 규격 패키저',
      '상업적 이용 라이선스',
      '굿즈 20% 할인',
      '브랜드 워터마크 제거',
      '우선 생성 큐',
    ],
    watermark: false,
    acr: true,
    goodsDiscount: 20,
  },
};

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
    desc: '월 36크레딧 · 스타일 6종 · Daily Brief',
  },
  'plan-studio-monthly': {
    sku: 'plan-studio-monthly',
    kind: 'subscription',
    title: 'Studio 월간 구독',
    price: 24900,
    credits: 120,
    plan: 'STUDIO',
    desc: '월 120크레딧 · 카톡 패키저 · 상업 라이선스',
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
  return n.toLocaleString('ko-KR');
}

export function useCredits(plan: Plan, size: number) {
  const def = PLANS[plan];
  const cost = packCost(size);
  return { cost, affordable: def.credits >= 0 && cost > 0 };
}
