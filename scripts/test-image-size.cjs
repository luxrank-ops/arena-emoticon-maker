// Verify generated frames are fixed-size and encoded without an extra lossy pass.
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const fs = require('node:fs');
const ts = require('typescript');
const sharp = require('sharp');
const original = Module._resolveFilename;
Module._resolveFilename = function(request, parent, ...rest) {
  return original.call(this, request.startsWith('@/') ? path.resolve('src', request.slice(2)) : request, parent, ...rest);
};
require.extensions['.ts'] = (mod, file) => {
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file);
};
const { encodeWebp } = require('../src/lib/images.ts');
(async () => {
  const source = await sharp({ create: { width: 900, height: 600, channels: 3, background: '#1c6ca9' } }).png().toBuffer();
  for (const pixelArt of [false, true]) {
    const image = await encodeWebp(source, { kind: 'frame', pixelArt });
    const meta = await sharp(image).metadata();
    assert.equal(meta.format, 'webp'); assert.equal(meta.width, 360); assert.equal(meta.height, 360);
    assert.ok(image.length < 900000);
    const { data, info } = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual([...data.subarray(0, 3)], [255,255,255]); // letterboxing instead of cropping
    assert.deepEqual([...data.subarray((180 * info.width + 180) * 3, (180 * info.width + 180) * 3 + 3)], [28,108,169]);
  }
  const tiny = await sharp({ create: { width: 40, height: 40, channels: 3, background: '#334455' } }).png().toBuffer();
  assert.equal((await sharp(await encodeWebp(tiny, { kind: 'frame' })).metadata()).width, 360);
  const sheet = await sharp(await encodeWebp(source, { kind: 'sheet' })).metadata();
  assert.equal(sheet.width, 512); assert.equal(sheet.height, 512);
  console.log('Frame size, quality encoding, aspect ratio and sheet tests passed');
})().catch((e) => { console.error(e); process.exitCode = 1; });
