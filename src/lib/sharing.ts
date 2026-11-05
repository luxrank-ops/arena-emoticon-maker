import { createHash, randomBytes } from 'node:crypto';
import { withDB } from '@/lib/store';
import type { Frame, Pack } from '@/lib/types';

export const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const SHARE_TTL_MS = 7 * 24 * 60 * 60_000;

export class ShareError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}

export function hashShareToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createPackShare(userId: string, packId: string, frameId: string) {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  return withDB((db) => {
    db.sharedLinks ??= [];
    const pack = db.packs.find((item) => item.id === packId && item.userId === userId);
    if (!pack) throw new ShareError('PACK_NOT_FOUND', '공유할 팩을 찾을 수 없습니다.', 404);
    const frame = pack.frames.find((item) => item.id === frameId);
    if (!frame || frame.hiddenAt) throw new ShareError('FRAME_NOT_FOUND', '공유할 컷을 찾을 수 없습니다.', 404);
    if (!frame.imageId) throw new ShareError('SHARE_IMAGE_NOT_READY', '완성된 이미지가 있는 컷만 링크로 공유할 수 있습니다.', 409);
    const activeCount = db.sharedLinks.filter((item) => item.userId === userId && !item.revokedAt && Date.parse(item.expiresAt) > now).length;
    if (activeCount >= 50) throw new ShareError('SHARE_LIMIT', '활성 공유 링크가 너무 많습니다. 기존 링크를 해제한 뒤 다시 시도해 주세요.', 429);
    const createdAt = new Date(now).toISOString();
    const expiresAt = new Date(now + SHARE_TTL_MS).toISOString();
    db.sharedLinks.push({ tokenHash: hashShareToken(token), packId, frameId, userId, createdAt, expiresAt });
    return { token, label: frame.label, expiresAt };
  });
}

export async function revokePackShares(userId: string, packId: string, frameId?: string) {
  return withDB((db) => {
    db.sharedLinks ??= [];
    const pack = db.packs.find((item) => item.id === packId && item.userId === userId);
    if (!pack) throw new ShareError('PACK_NOT_FOUND', '팩을 찾을 수 없습니다.', 404);
    const now = new Date().toISOString();
    let revoked = 0;
    for (const link of db.sharedLinks) {
      if (link.userId === userId && link.packId === packId && (!frameId || link.frameId === frameId) && !link.revokedAt) {
        link.revokedAt = now;
        revoked += 1;
      }
    }
    return { revoked };
  });
}

export interface SharedResult {
  share: { expiresAt: string };
  pack: Pack;
  frame: Frame;
}

/** A bearer link exposes exactly one ready frame, never the containing private pack. */
export async function getSharedResult(token: string): Promise<SharedResult | null> {
  if (!SHARE_TOKEN_PATTERN.test(token)) return null;
  const tokenHash = hashShareToken(token);
  return withDB((db) => {
    const share = (db.sharedLinks ?? []).find((item) => item.tokenHash === tokenHash);
    if (!share || share.revokedAt || Date.parse(share.expiresAt) <= Date.now()) return null;
    const pack = db.packs.find((item) => item.id === share.packId && item.userId === share.userId);
    const frame = pack?.frames.find((item) => item.id === share.frameId);
    if (!pack || !frame || frame.hiddenAt || !frame.imageId) return null;
    return { share: { expiresAt: share.expiresAt }, pack, frame };
  });
}
