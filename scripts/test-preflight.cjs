// Unit checks: two pre-generation vision steps and one shared preparation per photo.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
function loadTs(path) {
  const js = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
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
