// 서버 호출 없이 사진 스코프와 Gemini 요청 구성을 검증한다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

function loadTs(path) {
  const source = fs.readFileSync(path, 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = new Module(path, module);
  mod.filename = path;
  mod.paths = module.paths;
  mod._compile(js, path);
  return mod.exports;
}

const data = new Map();
global.sessionStorage = {
  get length() { return data.size; },
  key(i) { return [...data.keys()][i] ?? null; },
  getItem(k) { return data.get(k) ?? null; },
  setItem(k, v) { data.set(k, String(v)); },
  removeItem(k) { data.delete(k); },
};
const photos = loadTs('./src/lib/studio/photo.ts');
photos.savePhoto('photo A', 'draft');
photos.linkPhoto('draft', 'sheet:a');
photos.linkPhoto('sheet:a', 'pack:a');
photos.savePhoto('photo B', 'draft');
photos.linkPhoto('draft', 'sheet:b');
photos.linkPhoto('sheet:b', 'pack:b');
assert.equal(photos.loadPhoto('pack:a'), 'photo A');
assert.equal(photos.loadPhoto('pack:b'), 'photo B');
photos.savePhoto('photo C', 'pack:b');
assert.equal(photos.loadPhoto('sheet:b'), 'photo B');
assert.equal(photos.loadPhoto('pack:b'), 'photo C');
assert.equal(photos.loadPhoto('pack:legacy'), null);
assert.throws(() => photos.linkPhoto('sheet:missing', 'pack:missing'));

const renderer = loadTs('./src/lib/ai/gemini-render.ts');
const base = { photoBase64: 'cGhvdG8=', mimeType: 'image/jpeg', tone: '2d-cute', emotion: 'joy' };
const prompt = renderer.buildRenderPrompt({ ...base, characterReference: { mimeType: 'image/webp', base64: 'cmVm' } });
assert.match(prompt, /first image is the original photo/);
assert.match(prompt, /second image is the chosen character design reference/);
assert.doesNotMatch(prompt, /5 years younger/);
assert.doesNotMatch(renderer.buildRenderPrompt(base), /second image/);
let request;
global.fetch = async (_url, options) => {
  request = JSON.parse(options.body);
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: 'aW1hZ2U=' } }] } }] }), { status: 200 });
};
process.env.GEMINI_API_KEY = 'test-only';
(async () => {
  await renderer.renderWithGemini({ ...base, characterReference: { mimeType: 'image/webp', base64: 'cmVm' } });
  const parts = request.contents[0].parts;
  assert.equal(parts[1].inlineData.data, base.photoBase64);
  assert.equal(parts[3].inlineData.data, 'cmVm');
  await renderer.renderWithGemini(base);
  assert.equal(request.contents[0].parts.length, 2);
  console.log('Identity reference and photo scope tests passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
