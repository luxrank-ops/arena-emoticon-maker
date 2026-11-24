import type { Locale } from '@/lib/i18n/locale';

/**
 * 앱 전역 이동 구조의 단일 정의.
 *  · 상단 탭(SiteNav)과 하단 고정 바(BottomNav)가 같은 목록·같은 활성 판정을 쓰게 해
 *    두 곳의 현재 위치 표시가 어긋나지 않게 한다.
 *  · 하단 바는 모바일에서 한 번의 탭으로 닿아야 하는 4개 주요 위치 + 전체메뉴(≡) 시트로 구성한다.
 *    나머지 기능은 모두 시트 안에서 한 줄 설명과 함께 한 번에 찾아갈 수 있다.
 */
export type NavKey =
  | 'home'
  | 'create'
  | 'packs'
  | 'reply'
  | 'menu'
  | 'quotes'
  | 'presets'
  | 'brief'
  | 'goods'
  | 'pricing'
  | 'help';

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
  create: { key: 'create', href: '/studio', ko: '만들기', en: 'Create', primary: true },
  packs: { key: 'packs', href: '/studio/packs', ko: '내 팩', en: 'My packs', primary: true },
  reply: { key: 'reply', href: '/reply', ko: '톡 답장', en: 'Reply', primary: true },
  menu: { key: 'menu', href: '/studio', ko: '전체메뉴', en: 'Menu', primary: true },
  quotes: { key: 'quotes', href: '/quotes', ko: '대사', en: 'Quotes', primary: false },
  presets: { key: 'presets', href: '/presets', ko: '프리셋 150', en: 'Presets 150', primary: false },
  brief: { key: 'brief', href: '/brief', ko: '오늘의 브리핑', en: 'Daily brief', primary: false },
  goods: { key: 'goods', href: '/goods', ko: '굿즈', en: 'Goods', primary: false },
  pricing: { key: 'pricing', href: '/pricing', ko: '요금제', en: 'Pricing', primary: false },
  help: { key: 'help', href: '/support', ko: '고객센터', en: 'Help', primary: false },
};

/** 하단 고정 바 순서 (5개 이내 — 모바일 한 줄에 아이콘+라벨이 들어가는 폭) */
export const BOTTOM_NAV_KEYS: NavKey[] = ['home', 'create', 'packs', 'reply', 'menu'];

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

/**
 * 전체메뉴(≡) 시트에 담기는 모든 기능.
 *  · 각 항목에 한 줄 설명을 붙여 "어디에 뭐가 있는지" 한 화면에서 찾게 한다.
 *  · 순서는 실제로 많이 쓰는 순서(제작 → 콘텐츠 → 보관 → 결제·도움말).
 */
export type MenuEntry = {
  key: NavKey;
  href: string;
  emoji: string;
  ko: string;
  en: string;
  descKo: string;
  descEn: string;
};

export const MENU_SHEET: MenuEntry[] = [
  {
    key: 'create',
    href: '/studio/photo',
    emoji: '📸',
    ko: '내 사진 바로 스티커',
    en: 'Photo sticker, no AI',
    descKo: 'AI 없이 사진 그대로, 배경만 떼서 바로 저장',
    descEn: 'Cut the background out and save instantly',
  },
  {
    key: 'create',
    href: '/studio/upload',
    emoji: '🎨',
    ko: 'AI 캐릭터 만들기',
    en: 'AI character pack',
    descKo: '내 얼굴로 웹툰·인형 화풍 12컷',
    descEn: 'Turn your photo into a 12-cut pack',
  },
  {
    key: 'quotes',
    href: '/quotes',
    emoji: '💬',
    ko: '대사·드립',
    en: 'Lines & jokes',
    descKo: '영화·드라마 무드 한 줄로 만들기',
    descEn: 'Make stickers from a single line',
  },
  {
    key: 'presets',
    href: '/presets',
    emoji: '🗂️',
    ko: '프리셋 150',
    en: 'Presets 150',
    descKo: '표정·포즈·대사 150종 골라 담기',
    descEn: '150 expressions, poses and lines',
  },
  {
    key: 'brief',
    href: '/brief',
    emoji: '☀️',
    ko: '오늘의 브리핑',
    en: 'Daily brief',
    descKo: '오늘 쓸 컷과 대사 추천',
    descEn: "Today's picks for your chats",
  },
  {
    key: 'packs',
    href: '/studio/packs',
    emoji: '📦',
    ko: '내 팩',
    en: 'My packs',
    descKo: '만든 팩 확인·편집·내려받기',
    descEn: 'Review, edit and download your packs',
  },
  {
    key: 'reply',
    href: '/reply',
    emoji: '💌',
    ko: '톡 답장',
    en: 'Reply',
    descKo: '대화에 어울리는 답장 컷 찾기',
    descEn: 'Find the right reply sticker',
  },
  {
    key: 'goods',
    href: '/goods',
    emoji: '🛍️',
    ko: '굿즈',
    en: 'Goods',
    descKo: '최애 3컷으로 실물 만들기',
    descEn: 'Turn 3 cuts into real goods',
  },
  {
    key: 'pricing',
    href: '/pricing',
    emoji: '💳',
    ko: '요금제',
    en: 'Pricing',
    descKo: '완성권·크레딧·Creator Pro',
    descEn: 'Completions, credits, Creator Pro',
  },
  {
    key: 'help',
    href: '/guide',
    emoji: '📖',
    ko: '사용 설명서',
    en: 'Korean user guide',
    descKo: '실제 화면으로 기능과 저장 방법 확인',
    descEn: 'Learn the app with real-screen walkthroughs',
  },
  {
    key: 'help',
    href: '/support',
    emoji: '🛟',
    ko: '고객센터',
    en: 'Help',
    descKo: '문의·환불·계정 삭제 안내',
    descEn: 'Support, refunds, account deletion',
  },
];

/** 전체메뉴 시트가 맡는 보조 화면 — 이 경로에 있을 때 하단 '전체메뉴' 탭을 켜 둔다. */
const MENU_SHEET_PATHS: string[] = [
  '/quotes',
  '/presets',
  '/brief',
  '/goods',
  '/pricing',
  '/guide',
  '/support',
  '/terms',
  '/privacy',
  '/refund',
  '/account-deletion',
  '/billing',
  '/settings',
];

/** 로케일 접두어(/en)를 뗀 경로로 현재 위치를 판정한다. */
export function isNavActive(key: NavKey, pathname: string): boolean {
  const path = pathname || '/';
  switch (key) {
    case 'home':
      return path === '/';
    // 만들기 허브(/studio)와 그 아래 제작 화면(사진·AI 업로드·시트·편집기)을 모두 '만들기'로 본다.
    case 'create':
      return (
        path === '/studio' ||
        path === '/studio/upload' ||
        path.startsWith('/studio/upload/') ||
        path === '/studio/photo' ||
        path.startsWith('/studio/photo/') ||
        path === '/studio/sheet' ||
        path.startsWith('/studio/sheet/') ||
        path.startsWith('/editor')
      );
    // /studio/pack(단일 팩 보기)과 /studio/packs(목록)를 함께 '내 팩'으로 본다.
    case 'packs':
      return path === '/studio/pack' || path.startsWith('/studio/pack/') || path === '/studio/packs' || path.startsWith('/studio/packs/');
    case 'reply':
      return path === '/reply' || path.startsWith('/reply/');
    case 'menu':
      return MENU_SHEET_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
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
      return ['/guide', '/support', '/terms', '/privacy', '/refund', '/account-deletion'].some((p) => path === p || path.startsWith(`${p}/`));
    default:
      return false;
  }
}
