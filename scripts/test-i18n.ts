import assert from 'node:assert/strict';
import { COMIC_EXPRESSIONS } from '../src/lib/comic-expressions';
import { PHOTO_STICKER_SCENES } from '../src/lib/photo-stickers';
import { buildPetRenderPrompt, buildRenderPrompt } from '../src/lib/ai/gemini-render';
import { localeFromPathname, localizedPath, normalizeLocale, withoutLocalePrefix } from '../src/lib/i18n/locale';
import { localizedComicExpressions, localizedPhotoStickerScenes, tonesForLocale } from '../src/lib/i18n/presets';

assert.equal(normalizeLocale('en'), 'en');
assert.equal(normalizeLocale('fr'), 'ko');
assert.equal(localeFromPathname('/en/studio/upload'), 'en');
assert.equal(localeFromPathname('/enjoy'), 'ko');
assert.equal(withoutLocalePrefix('/en'), '/');
assert.equal(withoutLocalePrefix('/en/studio/upload'), '/studio/upload');
assert.equal(localizedPath('en', '/'), '/en');
assert.equal(localizedPath('en', '/studio/upload?mode=comic#styles'), '/en/studio/upload?mode=comic#styles');
assert.equal(localizedPath('en', '/en/studio/upload'), '/en/studio/upload');
assert.equal(localizedPath('en', 'https://example.com/studio'), 'https://example.com/studio');
assert.equal(localizedPath('ko', '/studio/upload'), '/studio/upload');

const english = localizedComicExpressions('en');
assert.equal(english.length, 24);
assert.equal(new Set(english.map((item) => item.id)).size, 24);
assert.deepEqual(english.map((item) => item.id), COMIC_EXPRESSIONS.map((item) => item.id));
assert.equal(localizedComicExpressions('ko'), COMIC_EXPRESSIONS);
for (const item of english) {
  assert.ok(item.label.trim(), `${item.id} needs an English label`);
  assert.ok(item.line.trim(), `${item.id} needs an English line`);
  assert.doesNotMatch(`${item.label} ${item.line}`, /[가-힣]/, `${item.id} contains untranslated Korean copy`);
}
assert.equal(english.find((item) => item.id === 'sorry')?.line, "I'm sorry");
assert.equal(english.find((item) => item.id === 'burst-laugh')?.line, 'LOL');

const photo = localizedPhotoStickerScenes('en');
assert.equal(photo.length, PHOTO_STICKER_SCENES.length);
for (const item of photo) assert.doesNotMatch(`${item.label} ${item.line}`, /[가-힣]/);
const tones = tonesForLocale('en');
assert.equal(tones.length, 11);
for (const tone of tones) assert.doesNotMatch(`${tone.label} ${tone.desc}`, /[가-힣]/);

const base = {
  photoBase64: 'AA==',
  mimeType: 'image/png',
  tone: '2d-cute' as const,
  emotion: 'joy' as const,
  line: "I'm sorry",
};
const personPrompt = buildRenderPrompt(base);
assert.ok(personPrompt.includes('"I\'m sorry"'));
assert.ok(personPrompt.includes('preserving its language, spelling and punctuation'));
assert.ok(personPrompt.includes('Do not translate it'));
assert.ok(!personPrompt.includes('Korean text'));
const petPrompt = buildPetRenderPrompt({ ...base, subjectKind: 'pet', line: 'Love you' });
assert.ok(petPrompt.includes('"Love you"'));
assert.ok(petPrompt.includes('Do not translate it'));

// File-backed domain check: locale must reach stored packs, not only the picker UI.
const { mkdtempSync, rmSync } = await import('node:fs');
const { tmpdir } = await import('node:os');
const { join } = await import('node:path');
const dataDir = mkdtempSync(join(tmpdir(), 'emotihak-i18n-'));
process.env.DATA_DIR = dataDir;
process.env.STORE_BACKEND = 'file';
try {
  const { uid, withDB } = await import('../src/lib/store');
  const { createSheet, chooseSheet, createPack } = await import('../src/lib/packs');
  const { newImageId, saveImage } = await import('../src/lib/images');
  const now = new Date().toISOString();
  const user = { id: uid('usr'), name: 'English tester', plan: 'FREE' as const, credits: 0, role: 'user' as const, createdAt: now, lastGrantAt: now };
  const face = {
    id: uid('face'), userId: user.id,
    palette: { skin: '#F6D3B3', skinShade: '#E8BA95', hair: '#332621', shirt: '#5AB8F5', accent: '#FF6B5B' },
    signature: { headScale: 1, faceWidth: 1, eyeSpacing: 1, eyeSize: 1, eyeShape: 'almond' as const, browWeight: 1, mouthWidth: 1, lipThickness: 1, noseSize: 1, hairStyle: 1, cheek: 0.6, jawline: 'round' as const, glasses: false },
    metrics: { coverage: 0.2, centering: 0.1, brightness: 140, sharpness: 20, faceDetected: true },
    consent: { at: now, version: 'v1.2', ip: '127.0.0.1', overseas: true }, createdAt: now, purgedAt: new Date(Date.now() + 86400_000).toISOString(),
  };
  await withDB((db) => { db.users.push(user); db.faces.push(face); });
  const sheet = await createSheet(user.id, face.id, '2d-cute');
  const imageId = newImageId();
  await saveImage(imageId, user.id, new TextEncoder().encode('english-test-image'));
  sheet.variants[0].imageId = imageId;
  await chooseSheet(user.id, sheet.id, 'A');
  const pack = await createPack(user.id, sheet.id, 24, undefined, true, english.map((item) => item.id), 'en');
  assert.equal(pack.locale, 'en');
  assert.equal(pack.title, 'My reaction stickers');
  assert.equal(pack.frames.length, 24);
  assert.deepEqual(pack.frames.map((frame) => frame.line), english.map((item) => item.line));
  assert.deepEqual(pack.frames.map((frame) => frame.comicExpressionId), english.map((item) => item.id));
  for (const frame of pack.frames) assert.doesNotMatch(`${frame.label} ${frame.line}`, /[가-힣]/);
  const automatic = await createPack(user.id, sheet.id, 12, undefined, true, undefined, 'en');
  assert.equal(automatic.frames.length, 12);
  for (const frame of automatic.frames) assert.doesNotMatch(`${frame.label} ${frame.line}`, /[가-힣]/);
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}

console.log('i18n checks passed: routes, English presets/tones, exact-caption prompts, stored English packs');
