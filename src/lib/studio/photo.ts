'use client';

import type { PreparedIdentity } from '@/lib/ai/consistency';
import type { SubjectKind } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// 브라우저 측 사진 보관 & 생성 요청 도우미
//  · 사진은 이 탭의 sessionStorage 에만 머문다 (탭을 닫으면 사라짐).
//  · 서버에는 사전 확인과 생성 요청 시 본문으로 전송되고, 원본은 저장하지 않는다.
//  · 생성 결과(컷 이미지)만 서버에 남는다.
// ─────────────────────────────────────────────────────────────

const PREFIX = 'emotime:photo:v2:';
const MAX_SIDE = 1024;
export type PhotoScope = 'draft' | `sheet:${string}` | `pack:${string}`;

/** 사진 파일 → 최대 1024px JPEG data URL (용량·전송량 절약, EXIF 방향 반영) */
export async function compressPhotoFile(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('사진을 처리할 수 없어요');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', 0.9);
}

const scopeKey = (scope: PhotoScope) => `${PREFIX}scope:${scope}`;
const dataKey = (id: string) => `${PREFIX}data:${id}`;

/** 스코프가 사진을 공유하므로 연결이 남아 있을 때에는 사진을 지우지 않는다. */
function removeIfUnused(id: string | null) {
  if (!id) return;
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(`${PREFIX}scope:`) && sessionStorage.getItem(key) === id) return;
  }
  sessionStorage.removeItem(dataKey(id));
  sessionStorage.removeItem(`${PREFIX}guidance:${id}`);
  sessionStorage.removeItem(`${PREFIX}guidance:${id}:pet`);
}

export function savePhoto(dataUrl: string, scope: PhotoScope) {
  const id = crypto.randomUUID();
  try {
    const old = sessionStorage.getItem(scopeKey(scope));
    sessionStorage.setItem(dataKey(id), dataUrl);
    try {
      sessionStorage.setItem(scopeKey(scope), id);
    } catch (error) {
      sessionStorage.removeItem(dataKey(id));
      throw error;
    }
    removeIfUnused(old);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('emotime:consistency-updated'));
  } catch {
    throw new Error('사진을 임시 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요');
  }
}

export function loadPhoto(scope: PhotoScope): string | null {
  try {
    const id = sessionStorage.getItem(scopeKey(scope));
    return id ? sessionStorage.getItem(dataKey(id)) : null;
  } catch {
    return null;
  }
}

/** 현재 스코프의 임시 사진 식별자. 분석 정보가 다른 사진과 섞이지 않도록 사용한다. */
export function photoScopeId(scope: PhotoScope): string | null {
  try { return sessionStorage.getItem(scopeKey(scope)); } catch { return null; }
}

/** 사진 자체를 복사하지 않고 시트·팩을 같은 탭의 사진에 연결한다. */
export function linkPhoto(from: PhotoScope, to: PhotoScope) {
  try {
    const id = sessionStorage.getItem(scopeKey(from));
    if (!id || !sessionStorage.getItem(dataKey(id))) throw new Error('missing photo');
    const old = sessionStorage.getItem(scopeKey(to));
    sessionStorage.setItem(scopeKey(to), id);
    removeIfUnused(old);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('emotime:consistency-updated'));
  } catch {
    throw new Error('사진을 연결하지 못했어요. 같은 사진을 다시 선택해 주세요');
  }
}

export type RenderTarget =
  | { kind: 'frame'; frameId: string; force?: boolean; accessoryIds?: string[] }
  | { kind: 'sheet'; sheetId: string; variantKey: string };

// 같은 사진의 병렬 시안/컷 요청은 준비 작업을 공유한다.
const preparing = new Map<string, Promise<PreparedIdentity>>();
const PREPARED_TTL_MS = 60 * 60_000;

export async function ensurePhotoConsistency(photo: string, scope: PhotoScope, subjectKind: SubjectKind = 'person'): Promise<PreparedIdentity> {
  const id = sessionStorage.getItem(scopeKey(scope));
  if (!id || sessionStorage.getItem(dataKey(id)) !== photo) throw new Error('사진이 변경됐어요. 같은 사진으로 다시 시작해 주세요.');
  const profileKey = `${PREFIX}guidance:${id}${subjectKind === 'pet' ? ':pet' : ''}`;
  try {
    const raw = sessionStorage.getItem(profileKey);
    if (raw) {
      const cached = JSON.parse(raw) as PreparedIdentity;
      if (cached.createdAt > Date.now() - PREPARED_TTL_MS && cached.createdAt <= Date.now() && /^[a-f0-9]{64}$/.test(cached.token)) return cached;
    }
  } catch { /* 손상된 캐시는 다시 준비한다 */ }
  const existing = preparing.get(profileKey);
  if (existing) return existing;
  const task = (async () => {
    const res = await fetch('/api/face/consistency', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photo, consent: true, subjectKind }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.prepared) throw new Error(json?.error?.message ?? '일관성 준비를 완료하지 못했어요.');
    if (sessionStorage.getItem(scopeKey(scope)) !== id || sessionStorage.getItem(dataKey(id)) !== photo) throw new Error('준비 중 사진이 변경됐어요. 다시 시작해 주세요.');
    try {
      sessionStorage.setItem(profileKey, JSON.stringify(json.prepared));
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('emotime:consistency-updated'));
    }
    catch { throw new Error('일관성 기준을 임시 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.'); }
    return json.prepared as PreparedIdentity;
  })();
  preparing.set(profileKey, task);
  try { return await task; } finally { preparing.delete(profileKey); }
}

/** 현재 사진의 준비 방식(유효기간이 끝난 경우 제외). */
export function photoConsistencyMethod(scope: PhotoScope, subjectKind: SubjectKind = 'person'): 'ai' | 'basic' | null {
  try {
    const id = sessionStorage.getItem(scopeKey(scope));
    if (!id) return null;
    const prepared = JSON.parse(sessionStorage.getItem(`${PREFIX}guidance:${id}${subjectKind === 'pet' ? ':pet' : ''}`) || 'null') as PreparedIdentity | null;
    if (!prepared || prepared.createdAt <= Date.now() - PREPARED_TTL_MS || prepared.createdAt > Date.now()) return null;
    return prepared.method ?? 'ai';
  } catch { return null; }
}

/** 이미지 생성 전에 사진 준비가 끝나야 요청한다. */
export async function renderImage(target: RenderTarget, photo: string, scope: PhotoScope, subjectKind: SubjectKind = 'person'): Promise<string> {
  let consistency = await ensurePhotoConsistency(photo, scope, subjectKind);
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch('/api/render', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo, target, consistency }),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok: true; imageUrl: string }
      | { ok: false; error?: { code?: string; message?: string } }
      | null;
    if (res.ok && json && json.ok === true) return json.imageUrl;
    if (attempt === 0 && json && 'error' in json && json.error?.code === 'CONSISTENCY_REQUIRED') {
      // 인증 세션이 바뀌었거나 준비가 만료됐을 때만 이미지 생성 전에 다시 준비한다.
      const id = sessionStorage.getItem(scopeKey(scope));
      if (id) sessionStorage.removeItem(`${PREFIX}guidance:${id}${subjectKind === 'pet' ? ':pet' : ''}`);
      consistency = await ensurePhotoConsistency(photo, scope, subjectKind);
      continue;
    }
    throw new Error((json && 'error' in json && json.error?.message) || 'AI 생성에 실패했어요. 다시 시도해 주세요');
  }
  throw new Error('사진의 일관성 준비를 완료하지 못했어요.');
}

/** 동시 실행 개수를 제한해 목록을 처리한다 (Gemini 과호출 방지) */
export async function runLimited<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await worker(item);
    }
  });
  await Promise.all(runners);
}
