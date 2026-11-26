import type { Metadata } from 'next';
import { getLocale } from '@/lib/i18n/server';
import { localizedPath } from '@/lib/i18n/locale';

/**
 * 페이지별 자기 참조 canonical + ko/en 대체 링크.
 *  · Next 의 metadata 는 shallow merge 라, 페이지가 alternates 를 정의하면 layout 의 languages 를 덮어쓴다.
 *    그래서 canonical 과 languages 를 한 곳에서 같이 만든다.
 *  · path 는 로케일 없는 경로('/pricing')를 넘긴다. /en 으로 들어온 요청은 canonical 도 /en/... 이 된다.
 */
export async function pageMetadata(input: {
  path: string;
  title?: string;
  description?: string;
}): Promise<Metadata> {
  return {
    ...(input.title ? { title: input.title } : {}),
    ...(input.description ? { description: input.description } : {}),
    alternates: await pageAlternates(input.path),
  };
}

/** canonical + ko/en 대체 링크만 필요할 때 (이미 title·description 을 직접 만드는 페이지) */
export async function pageAlternates(path: string): Promise<Metadata['alternates']> {
  const locale = await getLocale();
  const koPath = path || '/';
  const enPath = koPath === '/' ? '/en' : `/en${koPath}`;
  return {
    canonical: localizedPath(locale, koPath),
    languages: { 'ko-KR': koPath, 'en-US': enPath },
  };
}
