import type { Locale } from '@/lib/i18n/locale';

/**
 * 앱 전역 이동 구조의 단일 정의.
 *  · 상단 탭(SiteNav)과 하단 고정 바(BottomNav)가 같은 목록·같은 활성 판정을 쓰게 해
 *    두 곳의 현재 위치 표시가 어긋나지 않게 한다.
 *  · 하단 바는 모바일에서 한 번의 탭으로 닿아야 하는 5개 주요 위치만 담는다.
 */
export type NavKey = 'home' | 'create' | 'packs' | 'reply' | 'quotes' | 'presets' | 'brief' | 'goods' | 'pricing' | 'help';

export type NavItem = {
  key: NavKey;
  href: string;
  ko: string;
  en: string;
  /** 하단 고정 바에 들어가는 주요 위치 */
  primary: boolean;
};

export const NAV_ITEMS: Record<NavKey, NavItem> = {
  home: { key: 'home', href: '/', ko: '홈', en: 'Home', primary: true },
  create: { key: 'create', href: '/studio/upload', ko: '만들기', en: 'Create', primary: true },
  packs: { key: 'packs', href: '/studio/packs', ko: '내 팩', en: 'My packs', primary: true },
  reply: { key: 'reply', href: '/reply', ko: '톡 답장', en: 'Reply', primary: true },
  quotes: { key: 'quotes', href: '/quotes', ko: '대사', en: 'Quotes', primary: true },
  presets: { key: 'presets', href: '/presets', ko: '프리셋 150', en: 'Presets 150', primary: false },
  brief: { key: 'brief', href: '/brief', ko: '오늘의 브리핑', en: 'Daily brief', primary: false },
  goods: { key: 'goods', href: '/goods', ko: '굿즈', en: 'Goods', primary: false },
  pricing: { key: 'pricing', href: '/pricing', ko: '요금제', en: 'Pricing', primary: false },
  help: { key: 'help', href: '/support', ko: '고객센터', en: 'Help', primary: false },
};

/** 하단 고정 바 순서 (5개 이내 — 모바일 한 줄에 아이콘+라벨이 들어가는 폭) */
export const BOTTOM_NAV_KEYS: NavKey[] = ['home', 'create', 'packs', 'reply', 'quotes'];

const HEADER_NAV_KEYS: Record<Locale, NavKey[]> = {
  ko: ['home', 'create', 'packs', 'reply', 'quotes', 'presets', 'brief', 'goods', 'pricing'],
  en: ['home', 'create', 'packs', 'reply', 'quotes', 'presets', 'help'],
};

export function headerNav(locale: Locale): NavItem[] {
  return HEADER_NAV_KEYS[locale].map((key) => NAV_ITEMS[key]);
}

export function bottomNav(): NavItem[] {
  return BOTTOM_NAV_KEYS.map((key) => NAV_ITEMS[key]);
}

export function navLabel(item: NavItem, locale: Locale): string {
  return locale === 'en' ? item.en : item.ko;
}

/** 로케일 접두어(/en)를 뗀 경로로 현재 위치를 판정한다. */
export function isNavActive(key: NavKey, pathname: string): boolean {
  const path = pathname || '/';
  switch (key) {
    case 'home':
      return path === '/';
    case 'create':
      return path === '/studio/upload' || path.startsWith('/studio/upload/') || path === '/studio/sheet' || path.startsWith('/editor');
    // /studio/pack(단일 팩 보기)과 /studio/packs(목록)를 함께 '내 팩'으로 본다.
    case 'packs':
      return path === '/studio/pack' || path.startsWith('/studio/pack/') || path === '/studio/packs' || path.startsWith('/studio/packs/');
    case 'reply':
      return path === '/reply' || path.startsWith('/reply/');
    case 'quotes':
      return path === '/quotes' || path.startsWith('/quotes/');
    case 'presets':
      return path === '/presets' || path.startsWith('/presets/');
    case 'brief':
      return path === '/brief' || path.startsWith('/brief/');
    case 'goods':
      return path === '/goods' || path.startsWith('/goods/');
    case 'pricing':
      return path === '/pricing' || path.startsWith('/pricing/');
    case 'help':
      return ['/support', '/terms', '/privacy', '/refund', '/account-deletion'].some((p) => path === p || path.startsWith(`${p}/`));
    default:
      return false;
  }
}
