const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
function load(path) {
  const mod = new Module(path, module); mod.filename = path; mod.paths = module.paths;
  mod._compile(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, path);
  return mod.exports;
}
const { COMIC_EXPRESSIONS, comicExpressionById } = load('./src/lib/comic-expressions.ts');
const { EMOTION_PROMPTS, buildRenderPrompt } = load('./src/lib/ai/gemini-render.ts');
assert.ok(COMIC_EXPRESSIONS.length >= 20);
assert.equal(new Set(COMIC_EXPRESSIONS.map((x) => x.id)).size, COMIC_EXPRESSIONS.length);
for (const preset of COMIC_EXPRESSIONS) {
  assert.equal(comicExpressionById(preset.id), preset);
  assert.ok(EMOTION_PROMPTS[preset.emotion]);
  assert.ok(preset.line.length <= 34 && preset.action.length > 10);
  const prompt = buildRenderPrompt({ photoBase64: 'cGhvdG8=', mimeType: 'image/jpeg', tone: 'photo-sticker', emotion: preset.emotion, line: preset.line, sceneAction: preset.action });
  assert.ok(prompt.includes(preset.action));
  assert.ok(prompt.includes(preset.line));
  assert.match(prompt, /Exactly one individual sticker/);
}
assert.equal(comicExpressionById('unknown'), undefined);
console.log('Comic preset catalog and individual image prompts passed');
