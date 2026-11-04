// Run only against an isolated local server, never a real user database.
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { randomBytes } = require('node:crypto');
const base = process.env.PET_TEST_BASE_URL;
if (!base || !['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('PET_TEST_BASE_URL must point to an isolated local server');
const sid = `pet-test-${randomBytes(8).toString('hex')}`;
const cookie = `emotime_sid=${sid}`;
async function call(path, body, cookieValue = cookie) {
  const res = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { cookie: cookieValue, ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const text = await res.text();
  return { status: res.status, json: () => JSON.parse(text), text };
}
(async () => {
  const png = await sharp({ create: { width: 100, height: 100, channels: 3, background: '#ceb091' } }).png().toBuffer();
  const photo = `data:image/png;base64,${png.toString('base64')}`;
  const personCheck = await call('/api/face/consistency', { photo, consent: true, subjectKind: 'person' });
  const petCheck = await call('/api/face/consistency', { photo, consent: true, subjectKind: 'pet' });
  assert.equal(personCheck.status, 200); assert.equal(petCheck.status, 200);
  const palette = { skin: '#F6D3B3', skinShade: '#E8BA95', hair: '#332621', shirt: '#5AB8F5', accent: '#FF6B5B' };
  const signature = { headScale: 1, faceWidth: 1, eyeSpacing: 1, eyeSize: 1, eyeShape: 'almond', browWeight: 1, mouthWidth: 1, lipThickness: 1, noseSize: 1, hairStyle: 0, cheek: .6, jawline: 'round', glasses: false };
  const metrics = { coverage: 0, centering: 1, brightness: 0, sharpness: 0, faceDetected: false };
  const face = await call('/api/face/analyze', { palette, signature, metrics, consent: { accepted: true, version: 'test', overseas: true } });
  assert.equal(face.status, 200);
  const petSheet = await call('/api/sheets', { faceId: face.json().faceId, mode: 'full', tone: '2d-cute', subjectKind: 'pet' });
  assert.equal(petSheet.status, 200); assert.equal(petSheet.json().sheet.subjectKind, 'pet');
  const target = { kind: 'sheet', sheetId: petSheet.json().sheet.id, variantKey: 'A' };
  const mismatch = await call('/api/render', { photo, target, consistency: personCheck.json().prepared });
  assert.equal(mismatch.status, 409); assert.equal(mismatch.json().error.code, 'CONSISTENCY_REQUIRED');
  const wrongUser = await call('/api/render', { photo, target, consistency: petCheck.json().prepared }, 'emotime_sid=other-pet-user');
  assert.equal(wrongUser.status, 409);
  const page = await call(`/studio/sheet/${target.sheetId}`);
  assert.equal(page.status, 200); assert.match(page.text, /어떤 반려동물 캐릭터로 만들까요/);
  const personSheet = await call('/api/sheets', { faceId: face.json().faceId, tone: '2d-cute' });
  assert.equal(personSheet.status, 200); assert.equal(personSheet.json().sheet.subjectKind, 'person');
  console.log('Pet sheet persistence, subject binding and ownership integration tests passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
