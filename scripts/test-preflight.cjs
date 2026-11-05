// Unit checks: two pre-generation vision steps and one shared preparation per photo.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const sharp = require('sharp');
function loadTs(path) {
  const js = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const mod = new Module(path, module); mod.filename = path; mod.paths = module.paths; mod._compile(js, path); return mod.exports;
}
const store = new Map();
global.sessionStorage = { get length() { return store.size; }, key(i) { return [...store.keys()][i] ?? null; }, getItem(k) { return store.get(k) ?? null; }, setItem(k,v) { store.set(k,String(v)); }, removeItem(k) { store.delete(k); } };
process.env.GEMINI_API_KEY = 'test-only';
const analyzer = loadTs('./src/lib/ai/consistency.ts');
const photos = loadTs('./src/lib/studio/photo.ts');
(async () => {
  const calls = [];
  global.fetch = async (_url, opts) => {
    const body = JSON.parse(opts.body); calls.push(body.contents[0].parts[0].text);
    const features = calls.length === 1 ? ['short hair'] : ['short dark hair'];
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ usable: true, features }) }] } }] });
  };
  const guidance = await analyzer.prepareConsistency({ mimeType: 'image/png', base64: 'cGhvdG8=' });
  assert.equal(calls.length, 2);
  assert.match(calls[1], /short hair/);
  assert.deepEqual(guidance.features, ['short dark hair']);
  global.fetch = async () => Response.json({ candidates: [{ content: { parts: [{ text: '{"usable":false,"features":["unclear"]}' }] } }] });
  await assert.rejects(analyzer.prepareConsistency({ mimeType: 'image/png', base64: 'cGhvdG8=' }), { code: 'PHOTO_NEEDS_REVIEW' });
  const png = await sharp({ create: { width: 100, height: 100, channels: 3, background: '#aabbcc' } }).png().toBuffer();
  const photo = { mimeType: 'image/png', base64: png.toString('base64') };
  let fallbackCalls = 0;
  global.fetch = async () => { fallbackCalls++; return new Response('unavailable', { status: 503 }); };
  const fallback = await analyzer.prepareWithFallback(photo);
  assert.equal(fallback.method, 'basic'); assert.equal(fallbackCalls, 2); // primary + fallback endpoint
  assert.match(fallback.guidance.features.join(' '), /original reference photo/);
  global.fetch = async () => Response.json({ candidates: [{ content: { parts: [{ text: '{"usable":false,"features":["unclear"]}' }] } }] });
  assert.equal((await analyzer.prepareWithFallback(photo)).method, 'basic');
  global.fetch = async () => new Response('unavailable', { status: 503 });
  await assert.rejects(analyzer.prepareWithFallback({ mimeType: 'image/png', base64: 'cGhvdG8=' }), { code: 'PHOTO_NEEDS_REVIEW' });
  await assert.rejects(analyzer.prepareBasicConsistency({ ...photo, mimeType: 'image/jpeg' }), { code: 'PHOTO_NEEDS_REVIEW' });
  const tiny = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#ffffff' } }).png().toBuffer();
  await assert.rejects(analyzer.prepareBasicConsistency({ mimeType: 'image/png', base64: tiny.toString('base64') }), { code: 'PHOTO_NEEDS_REVIEW' });
  let preparations = 0;
  global.fetch = async () => { preparations++; await new Promise((r) => setTimeout(r, 10)); return Response.json({ prepared: { token: 'a'.repeat(64), createdAt: Date.now() } }); };
  photos.savePhoto('photo A', 'draft'); photos.linkPhoto('draft', 'sheet:a');
  const result = await Promise.all([photos.ensurePhotoConsistency('photo A', 'draft'), photos.ensurePhotoConsistency('photo A', 'sheet:a')]);
  assert.equal(preparations, 1); assert.equal(result[0].token, result[1].token);
  await photos.ensurePhotoConsistency('photo A', 'sheet:a'); assert.equal(preparations, 1);
  photos.savePhoto('photo B', 'draft'); await photos.ensurePhotoConsistency('photo B', 'draft'); assert.equal(preparations, 2);
  await assert.rejects(photos.ensurePhotoConsistency('photo A', 'draft'));
  console.log('Pre-generation consistency tests passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
