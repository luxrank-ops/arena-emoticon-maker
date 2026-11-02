import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { firestoreImageDelete, firestoreImageGet, firestoreImagePut, hasFirestore } from '@/lib/firestore';

// ─────────────────────────────────────────────────────────────
// 생성 이미지 저장소 (서버 전용)
//  · Gemini 가 준 PNG 를 512px WebP 로 줄여 저장한다 (문서 1 MiB 상한 안쪽).
//  · 운영: Firestore 문서 (emotime_images/<id>). 로컬: 임시 디렉터리 파일.
//  · 원본 사진은 이 모듈을 거치지 않는다.
// ─────────────────────────────────────────────────────────────

const SIZE = 512;
const MAX_BYTES = 900_000;
export const IMAGE_ID_PATTERN = /^img_[a-f0-9]{32}$/;

/** PNG/JPEG 바이트를 512px WebP 로 변환. 용량이 넘치면 품질을 낮춘다 */
export async function encodeWebp(input: Buffer): Promise<Buffer> {
  let quality = 86;
  let out = await toWebp(input, quality);
  while (out.length > MAX_BYTES && quality > 55) {
    quality -= 10;
    out = await toWebp(input, quality);
  }
  return out;
}

function toWebp(input: Buffer, quality: number) {
  return sharp(input)
    .resize(SIZE, SIZE, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: '#FFFFFF' })
    .webp({ quality, effort: 4 })
    .toBuffer();
}

export function newImageId(): string {
  return `img_${randomBytes(16).toString('hex')}`;
}

export async function saveImage(id: string, userId: string, webp: Buffer): Promise<void> {
  const b64 = webp.toString('base64');
  if (hasFirestore()) {
    await firestoreImagePut(id, userId, b64);
    return;
  }
  const dir = path.join(os.tmpdir(), 'emotime-images');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify({ userId, data: b64 }));
}

/** 생성 이미지 영구 삭제 (팩 삭제, 다시 그리기 후 이전 컷 정리에 사용). 실패해도 호출자는 계속 진행한다 */
export async function deleteImage(id: string): Promise<void> {
  if (!IMAGE_ID_PATTERN.test(id)) return;
  if (hasFirestore()) {
    await firestoreImageDelete(id);
    return;
  }
  await fs.unlink(path.join(os.tmpdir(), 'emotime-images', `${id}.json`)).catch(() => undefined);
}

export async function loadImage(id: string): Promise<{ userId: string; data: Buffer } | null> {
  if (!IMAGE_ID_PATTERN.test(id)) return null;
  if (hasFirestore()) {
    const doc = await firestoreImageGet(id);
    return doc ? { userId: doc.userId, data: Buffer.from(doc.data, 'base64') } : null;
  }
  try {
    const raw = await fs.readFile(path.join(os.tmpdir(), 'emotime-images', `${id}.json`), 'utf-8');
    const doc = JSON.parse(raw) as { userId: string; data: string };
    return { userId: doc.userId, data: Buffer.from(doc.data, 'base64') };
  } catch {
    return null;
  }
}
