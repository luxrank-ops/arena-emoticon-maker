export const LOCALES = ['ko', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ko';
export const LOCALE_HEADER = 'x-emotihak-locale';

export function normalizeLocale(value: string | null | undefined): Locale {
  return value === 'en' ? 'en' : DEFAULT_LOCALE;
}

export function localeFromPathname(pathname: string): Locale {
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'ko';
}

export function withoutLocalePrefix(pathname: string): string {
  if (pathname === '/en' || pathname === '/en/') return '/';
  if (pathname.startsWith('/en/')) return pathname.slice(3) || '/';
  return pathname;
}

/** Prefix only local application paths; keep protocols, mailto, anchors and already-localized paths intact. */
export function localizedPath(locale: Locale, href: string): string {
  if (locale === 'ko' || !href.startsWith('/') || href.startsWith('//') || href === '/en' || href.startsWith('/en/')) return href;
  const match = href.match(/^([^?#]*)(.*)$/);
  const pathname = match?.[1] ?? href;
  const suffix = match?.[2] ?? '';
  return `${pathname === '/' ? '/en' : `/en${pathname}`}${suffix}`;
}

/** Keep Korean and English copy adjacent while shared strings move into dictionaries incrementally. */
export function tr(locale: Locale, korean: string, english: string): string {
  return locale === 'en' ? english : korean;
}
