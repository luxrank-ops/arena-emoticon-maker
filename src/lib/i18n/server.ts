import { headers } from 'next/headers';
import { LOCALE_HEADER, normalizeLocale, type Locale } from '@/lib/i18n/locale';

/** Middleware derives this from the public URL; direct API/header spoofing cannot switch a Korean URL to English. */
export async function getLocale(): Promise<Locale> {
  const requestHeaders = await headers();
  return normalizeLocale(requestHeaders.get(LOCALE_HEADER));
}
