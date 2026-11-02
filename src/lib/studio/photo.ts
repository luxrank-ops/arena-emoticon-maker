'use client';

// ─────────────────────────────────────────────────────────────
// 브라우저 측 사진 보관 & 생성 요청 도우미
//  · 사진은 이 탭의 sessionStorage 에만 머문다 (탭을 닫으면 사라짐).
//  · 서버에는 "생성 요청" 때만 본문으로 전송되고, 응답 후 서버가 버린다.
//  · 생성 결과(컷 이미지)만 서버에 남는다.
// ─────────────────────────────────────────────────────────────

const KEY = 'emotime:photo';
const MAX_SIDE = 1024;

/** 사진 파일 → 최대 768px JPEG data URL (용량·전송량 절약, EXIF 방향 반영) */
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

export function savePhoto(dataUrl: string) {
  try {
    sessionStorage.setItem(KEY, dataUrl);
  } catch {
    throw new Error('사진을 임시 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요');
  }
}

export function loadPhoto(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function hasPhoto(): boolean {
  return !!loadPhoto();
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
