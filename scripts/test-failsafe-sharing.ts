import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

const dataDir = mkdtempSync(join(tmpdir(), 'emotihak-share-test-'));
process.env.DATA_DIR = dataDir;
process.env.STORE_BACKEND = 'file';

try {
  const { withDB, resetDB } = await import('../src/lib/store');
  const { saveImage, detectImageMimeType } = await import('../src/lib/images');
  const { createPackShare, getSharedResult, revokePackShares } = await import('../src/lib/sharing');
  const { GET: sharedImage } = await import('../src/app/api/share/[token]/image/route');
  const { normalizeErrorCode } = await import('../src/lib/client-errors');
  const { photoInputError } = await import('../src/lib/api');
  const { parseShareAttribution } = await import('../src/lib/share-attribution');

  assert.equal(normalizeErrorCode('TYPE'), 'ERR_IMG_INVALID_FORMAT');
  assert.equal(normalizeErrorCode('BLUR'), 'ERR_ANALYZE_BLURRY');
  assert.equal(normalizeErrorCode(undefined, 500), 'ERR_SERVER_FAIL');
  assert.deepEqual(parseShareAttribution('utm_source=kakaotalk&utm_medium=share&utm_campaign=emoticon_share'), { source: 'kakaotalk', medium: 'share', campaign: 'emoticon_share' });
  assert.equal(parseShareAttribution('utm_source=javascript%3Aalert(1)&utm_medium=share&utm_campaign=x'), null);

  const schema = z.object({ photo: z.string().max(10).regex(/^data:image\/png;base64,/) });
  for (const [input, status, code] of [
    [{}, 400, 'ERR_IMG_MISSING'],
    [{ photo: 'x' }, 400, 'ERR_IMG_INVALID_FORMAT'],
    [{ photo: 'data:image/png;base64,too-long' }, 413, 'ERR_IMG_TOO_LARGE'],
  ] as const) {
    const parsed = schema.safeParse(input);
    assert.equal(parsed.success, false);
    const response = photoInputError(parsed.success ? null : parsed.error);
    assert.ok(response);
    assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
  }

  await resetDB();
  const now = new Date().toISOString();
  const imageId = `img_${'a'.repeat(32)}`;
  await withDB((db) => {
    db.users.push({ id: 'owner', name: 'Owner', plan: 'FREE', credits: 0, role: 'user', createdAt: now, lastGrantAt: now });
    db.packs.push({
      id: 'pack_share', userId: 'owner', sheetId: 'sheet_share', tone: '2d-cute', title: 'Share test', size: 1,
      status: 'READY', creditsSpent: 0, createdAt: now, renderer: 'ai',
      frames: [{ id: 'frame_share', packId: 'pack_share', index: 0, emotion: 'joy', intensity: 70, templateId: 'joy', label: '활짝', line: '안녕!', prop: 'none', background: 'transparent', seed: 1, readyAt: 0, usageCount: 0, imageId }],
    });
  });
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(detectImageMimeType(png), 'image/png');
  await saveImage(imageId, 'owner', png);

  const created = await createPackShare('owner', 'pack_share', 'frame_share');
  assert.match(created.token, /^[A-Za-z0-9_-]{43}$/);
  await withDB((db) => {
    assert.equal(db.sharedLinks.length, 1);
    assert.equal(JSON.stringify(db.sharedLinks).includes(created.token), false, 'raw bearer token must not be persisted');
    assert.match(db.sharedLinks[0].tokenHash, /^[a-f0-9]{64}$/);
  });
  assert.equal((await getSharedResult(created.token))?.frame.id, 'frame_share');
  await assert.rejects(() => createPackShare('someone-else', 'pack_share', 'frame_share'), /공유할 팩/);

  const publicResponse = await sharedImage(new Request('http://localhost/api/share/x/image'), { params: Promise.resolve({ token: created.token }) });
  assert.equal(publicResponse.status, 200);
  assert.equal(publicResponse.headers.get('content-type'), 'image/png');
  assert.equal(publicResponse.headers.get('cache-control'), 'no-store');

  assert.equal((await revokePackShares('owner', 'pack_share', 'frame_share')).revoked, 1);
  assert.equal(await getSharedResult(created.token), null);
  const revokedResponse = await sharedImage(new Request('http://localhost/api/share/x/image'), { params: Promise.resolve({ token: created.token }) });
  assert.equal(revokedResponse.status, 404);

  const hidden = await createPackShare('owner', 'pack_share', 'frame_share');
  await withDB((db) => { db.packs[0].frames[0].hiddenAt = new Date().toISOString(); });
  assert.equal(await getSharedResult(hidden.token), null);

  console.log('fail-safe/share tests: error mapping, UTM validation, hashed token, public image, revoke, hide, ownership passed');
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}
