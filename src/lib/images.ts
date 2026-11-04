import { KAKAO_RULES } from '@/lib/packager';
import { firestoreImageDelete, firestoreImageGet, firestoreImagePut, hasFirestore } from '@/lib/firestore';

export { KAKAO_RULES };
export const IMAGE_ID_PATTERN = /^img_[a-f0-9]{32}$/;

const memoryImages = new Map<string, { userId: string; data: Uint8Array }>();

function getKV(): any {
  if (typeof globalThis !== 'undefined' && (globalThis as any).STORE_KV) return (globalThis as any).STORE_KV;
  if (typeof process !== 'undefined' && (process.env as any)?.STORE_KV) return (process.env as any).STORE_KV;
  return null;
}

export function newImageId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `img_${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export async function saveImage(id: string, userId: string, data: Uint8Array): Promise<void> {
  const kv = getKV();
  if (kv) {
    const b64 = uint8ToBase64(data);
    await kv.put(`img:${id}`, JSON.stringify({ userId, data: b64 }));
    return;
  }
  if (hasFirestore()) {
    const b64 = uint8ToBase64(data);
    await firestoreImagePut(id, userId, b64);
    return;
  }
  memoryImages.set(id, { userId, data });
}

export async function deleteImage(id: string): Promise<void> {
  if (!IMAGE_ID_PATTERN.test(id)) return;
  const kv = getKV();
  if (kv) {
    await kv.delete(`img:${id}`);
    return;
  }
  if (hasFirestore()) { await firestoreImageDelete(id); return; }
  memoryImages.delete(id);
}

export async function loadImage(id: string): Promise<{ userId: string; data: Uint8Array } | null> {
  if (!IMAGE_ID_PATTERN.test(id)) return null;
  const kv = getKV();
  if (kv) {
    const raw = await kv.get(`img:${id}`);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return { userId: parsed.userId, data: base64ToUint8(parsed.data) };
    } catch {
      return null;
    }
  }
  if (hasFirestore()) {
    const doc = await firestoreImageGet(id);
    return doc ? { userId: doc.userId, data: base64ToUint8(doc.data) } : null;
  }
  const mem = memoryImages.get(id);
  return mem ? { userId: mem.userId, data: mem.data } : null;
}

function uint8ToBase64(data: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < data.length; i += chunk) {
    const slice = data.subarray(i, Math.min(i + chunk, data.length));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
