'use client';

// ─────────────────────────────────────────────────────────────
// 선택한 프리셋·큐레이션 패키지를 만들기 화면까지 들고 가는 임시 보관 (탭 단위)
//  · 로그인·서버 저장 없이 sessionStorage 에만 둔다.
//  · 만들기 화면은 이 값을 읽어 '프리셋' 구성으로 미리 채운다.
// ─────────────────────────────────────────────────────────────

import { isCurationPackageId } from '@/data/curation-packages';

export const PRESET_PICK_KEY = 'emotihak:preset-pick:v1';
export const PACKAGE_PICK_KEY = 'emotihak:package-pick:v1';

export function rememberPresetPick(id: number | null) {
  try {
    if (id === null) sessionStorage.removeItem(PRESET_PICK_KEY);
    else sessionStorage.setItem(PRESET_PICK_KEY, String(id));
  } catch {
    /* 저장소를 쓸 수 없으면 URL 파라미터만으로 동작한다 */
  }
}

export function rememberedPresetPick(): number | null {
  try {
    const raw = sessionStorage.getItem(PRESET_PICK_KEY);
    const id = raw ? Number(raw) : NaN;
    return Number.isInteger(id) && id >= 1 && id <= 150 ? id : null;
  } catch {
    return null;
  }
}

/** ?preset=21 처럼 URL 로도 넘길 수 있게 한다 (공유 링크·뒤로가기 대비) */
export function presetPickFromSearch(search: string): number | null {
  const value = new URLSearchParams(search).get('preset');
  const id = value ? Number(value) : NaN;
  return Number.isInteger(id) && id >= 1 && id <= 150 ? id : null;
}

/** /presets 의 "이 패키지로 팩 만들기" — 고른 큐레이션 패키지를 만들기 화면까지 들고 간다. */
export function rememberPackagePick(id: string | null) {
  try {
    if (id === null) sessionStorage.removeItem(PACKAGE_PICK_KEY);
    else sessionStorage.setItem(PACKAGE_PICK_KEY, id);
  } catch {
    /* 저장소를 쓸 수 없으면 URL 파라미터만으로 동작한다 */
  }
}

export function rememberedPackagePick(): string | null {
  try {
    const raw = sessionStorage.getItem(PACKAGE_PICK_KEY);
    return raw && isCurationPackageId(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** ?package=office-survival 처럼 URL 로도 넘길 수 있게 한다 */
export function packagePickFromSearch(search: string): string | null {
  const value = new URLSearchParams(search).get('package');
  return isCurationPackageId(value) ? value : null;
}
