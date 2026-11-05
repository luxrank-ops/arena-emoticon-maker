const RETRY_KEY = 'emotime:studio:retry:v1';

export interface StudioRetry {
  target: 'character';
  photoId: string;
  code: string;
  createdAt: number;
}

export function saveStudioRetry(value: StudioRetry) {
  try { sessionStorage.setItem(RETRY_KEY, JSON.stringify(value)); } catch { /* the in-memory retry button still works */ }
}

export function loadStudioRetry(photoId: string | null): StudioRetry | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(RETRY_KEY) || 'null') as StudioRetry | null;
    if (!value || value.target !== 'character' || !photoId || value.photoId !== photoId || value.createdAt < Date.now() - 60 * 60_000) return null;
    return value;
  } catch { return null; }
}

export function clearStudioRetry() {
  try { sessionStorage.removeItem(RETRY_KEY); } catch { /* optional storage */ }
}
