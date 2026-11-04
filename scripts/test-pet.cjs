// Pet-specific preflight, cache isolation and one-image prompt checks (no real AI calls).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const sharp = require('sharp');
function load(path) {
  const mod = new Module(path, module); mod.filename = path; mod.paths = module.paths;
  mod._compile(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, path);
  return mod.exports;
}
const data = new Map();
global.sessionStorage = { get length() { return data.size; }, key(i) { return [...data.keys()][i] ?? null; }, getItem(k) { return data.get(k) ?? null; }, setItem(k,v) { data.set(k,String(v)); }, removeItem(k) { data.delete(k); } };
const analyzer = load('./src/lib/ai/consistency.ts');
const photos = load('./src/lib/studio/photo.ts');
const renderer = load('./src/lib/ai/gemini-render.ts');
(async () => {
  process.env.GEMINI_API_KEY = 'test-only';
  const calls = [];
  global.fetch = async (_url, options) => {
    const instruction = JSON.parse(options.body).contents[0].parts[0].text;
    calls.push(instruction);
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ usable: true, features: [calls.length === 1 ? 'white ear' : 'white left ear'] }) }] } }] });
  };
  const result = await analyzer.prepareConsistency({ mimeType: 'image/png', base64: 'cGhvdG8=' }, 'pet');
  assert.equal(calls.length, 2);
  assert.match(calls[0], /single visible pet/);
  assert.match(calls[1], /white ear/);
  assert.deepEqual(result.features, ['white left ear']);
  const png = await sharp({ create: { width: 100, height: 100, channels: 3, background: '#aabbcc' } }).png().toBuffer();
  const basic = await analyzer.prepareBasicConsistency({ mimeType: 'image/png', base64: png.toString('base64') }, 'pet');
  assert.match(basic.features.join(' '), /same animal/);
  assert.doesNotMatch(basic.features.join(' '), /same person/);
  const requests = [];
  global.fetch = async (_url, options) => { requests.push(JSON.parse(options.body)); return Response.json({ prepared: { token: (requests.length === 1 ? 'a' : 'b').repeat(64), createdAt: Date.now(), method: 'basic' } }); };
  photos.savePhoto('same photo', 'draft'); photos.linkPhoto('draft', 'sheet:pet');
  const person = await photos.ensurePhotoConsistency('same photo', 'draft');
  const [pet, petAgain] = await Promise.all([photos.ensurePhotoConsistency('same photo', 'sheet:pet', 'pet'), photos.ensurePhotoConsistency('same photo', 'draft', 'pet')]);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].subjectKind, 'person'); assert.equal(requests[1].subjectKind, 'pet');
  assert.notEqual(person.token, pet.token); assert.equal(pet.token, petAgain.token);
  assert.equal(photos.photoConsistencyMethod('sheet:pet', 'pet'), 'basic');
  const base = { photoBase64: 'cGhvdG8=', mimeType: 'image/jpeg', subjectKind: 'pet', tone: '2d-cute', emotion: 'joy' };
  const prompt = renderer.buildRenderPrompt({ ...base, characterReference: { mimeType: 'image/webp', base64: 'cmVm' }, sceneAction: 'playing', line: '안녕' });
  for (const pattern of [/first image is the original pet photo/, /species/, /fur colors and markings/, /second image is the chosen design reference/, /one animal/i, /No grid/, /안녕/]) assert.match(prompt, pattern);
  assert.doesNotMatch(prompt, /only source of the person/);
  assert.match(renderer.buildRenderPrompt({ ...base, mode: 'full' }), /whole animal/);
  assert.match(renderer.buildRenderPrompt({ ...base, tone: 'photo-sticker' }), /photorealistic pet/);
  console.log('Pet preflight, subject cache isolation and prompt tests passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
