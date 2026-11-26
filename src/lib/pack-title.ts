// ─────────────────────────────────────────────────────────────
// 팩 제목의 컷 수 정합성
//  · 무료 12컷 미리보기는 24컷 큐레이션 패키지의 앞 12컷만 담는다.
//    그런데 제목은 패키지 기본 제목("기본 고빈도 24컷")을 그대로 물려받아
//    12컷 팩이 24컷 상품처럼 보이는 문제가 있었다.
//  · 저장 시점(createPack)과 표시 시점(내 팩 목록·팩 헤더) 모두에서 실제 컷 수로 맞춘다.
//    → 이미 만들어진 팩도 화면에서는 바로 올바른 제목으로 보인다.
// ─────────────────────────────────────────────────────────────

import { curationPackageById } from '@/data/curation-packages';
import type { Locale } from '@/lib/i18n/locale';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 큐레이션 제목의 컷 수 표기를 실제 팩 크기로 바꾼다.
 *  · "기본 고빈도 24컷" + 12 → "기본 고빈도 12컷"
 *  · "Everyday High-Frequency 24" + 12 → "Everyday High-Frequency 12"
 *  · 제목에 컷 수가 없으면(예: "직장인 생존 패키지") 뒤에 실제 컷 수를 붙인다.
 */
export function curationTitleForSize(title: string, packageCount: number, size: number, locale: Locale = 'ko'): string {
  if (size === packageCount) return title;
  const trimmed = title.trim();
  const ko = trimmed.replace(new RegExp(`${escapeRegExp(String(packageCount))}\\s*컷`), `${size}컷`);
  if (ko !== trimmed) return ko;
  const en = trimmed.replace(new RegExp(`(^|[^0-9])${escapeRegExp(String(packageCount))}(?![0-9])`), `$1${size}`);
  if (en !== trimmed) return en;
  return locale === 'en' ? `${trimmed} · ${size} cuts` : `${trimmed} · ${size}컷`;
}

/**
 * 화면에 보일 팩 제목 — 큐레이션 패키지 팩이면 실제 컷 수를 반영한다.
 * 사용자가 직접 붙인 제목(패키지 기본 제목과 다른 값)은 그대로 둔다.
 */
export function packDisplayTitle(
  pack: { title: string; size: number; curationPackageId?: string; locale?: Locale },
  locale: Locale = 'ko',
): string {
  const pkg = curationPackageById(pack.curationPackageId);
  if (!pkg || pack.size === pkg.count) return pack.title;
  const defaultTitles = [pkg.title, pkg.titleEn];
  if (!defaultTitles.includes(pack.title.trim())) return pack.title;
  return curationTitleForSize(locale === 'en' ? pkg.titleEn : pkg.title, pkg.count, pack.size, locale);
}
