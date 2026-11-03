'use client';

// ─────────────────────────────────────────────────────────────
// 브라우저 측 사진 보관 & 생성 요청 도우미
//  · 사진은 이 탭의 sessionStorage 에만 머문다 (탭을 닫으면 사라짐).
//  · 서버에는 "생성 요청" 때만 본문으로 전송되고, 응답 후 서버가 버린다.
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

/** 사진 자체를 복사하지 않고 시트·팩을 같은 탭의 사진에 연결한다. */
export function linkPhoto(from: PhotoScope, to: PhotoScope) {
  try {
    const id = sessionStorage.getItem(scopeKey(from));
    if (!id || !sessionStorage.getItem(dataKey(id))) throw new Error('missing photo');
    const old = sessionStorage.getItem(scopeKey(to));
    sessionStorage.setItem(scopeKey(to), id);
    removeIfUnused(old);
  } catch {
    throw new Error('사진을 연결하지 못했어요. 같은 사진을 다시 선택해 주세요');
  }
}

export type RenderTarget =
  | { kind: 'frame'; frameId: string; force?: boolean; accessoryIds?: string[] }
  | { kind: 'sheet'; sheetId: string; variantKey: string };

/** 컷/시안 1장 생성. 성공 시 이미지 URL */
export async function renderImage(target: RenderTarget, photo: string): Promise<string> {
  const res = await fetch('/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo, target }),
  });
  const json = (await res.json().catch(() => null)) as
    | { ok: true; imageUrl: string }
    | { ok: false; error?: { message?: string } }
    | null;
  if (!res.ok || !json || json.ok !== true) {
    throw new Error(
      (json && 'error' in json && json.error?.message) || 'AI 생성에 실패했어요. 다시 시도해 주세요',
    );
  }
  return json.imageUrl;
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
