import assert from 'node:assert/strict';
import sharp from 'sharp';
import { DEFAULT_PALETTE, DEFAULT_SIGNATURE, EMOTIONS, TONES, renderSticker } from '../src/lib/art/sticker';
import { buildRenderPrompt, letteringDirection } from '../src/lib/ai/gemini-render';
import type { Emotion, StickerSpec, Tone } from '../src/lib/types';

function spec(overrides: Partial<StickerSpec> = {}): StickerSpec {
  return {
    seed: 42, tone: '2d-cute', palette: DEFAULT_PALETTE, signature: DEFAULT_SIGNATURE,
    emotion: 'joy', intensity: 85, prop: 'none', background: 'transparent',
    line: 'LET’S GO!', linePosition: 'bottom', ...overrides,
  };
}

for (const emotion of Object.keys(EMOTIONS) as Emotion[]) {
  for (const tone of Object.keys(TONES) as Tone[]) {
    const svg = renderSticker(spec({ emotion, tone }));
    assert.ok(svg.includes('data-caption-effect='), `${emotion}/${tone} has a caption treatment`);
    assert.ok(!svg.includes('NaN') && !svg.includes('undefined'), `${emotion}/${tone} has valid geometry`);
  }
}

const lively = renderSticker(spec());
assert.ok(lively.includes('data-caption-effect="pill"'));
assert.equal((lively.match(/<text /g) ?? []).length, 2, 'lively lettering has an extrusion and a front layer');
assert.ok(lively.includes('paint-order="stroke fill"'));
assert.ok(renderSticker(spec({ emotion: 'angry' })).includes('data-caption-effect="burst"'));
assert.ok(renderSticker(spec({ tone: 'watercolor' })).includes('data-caption-effect="brush"'));
assert.ok(renderSticker(spec({ tone: 'pixel-art' })).includes('data-caption-effect="block"'));
assert.equal((renderSticker(spec({ emotion: 'sad' })).match(/<text /g) ?? []).length, 1, 'soft captions stay calm');
assert.ok(renderSticker(spec({ line: '가'.repeat(34) })).includes('textLength='), 'long captions are constrained');
const escaped = renderSticker(spec({ line: '<tag>&' }));
assert.ok(escaped.includes('&lt;tag&gt;&amp;') && !escaped.includes('<tag>'));

for (const item of [spec(), spec({ emotion: 'angry' }), spec({ tone: 'watercolor' }), spec({ tone: 'pixel-art', linePosition: 'top' })]) {
  const png = await sharp(Buffer.from(renderSticker(item))).resize(360, 360).png().toBuffer();
  const metadata = await sharp(png).metadata();
  assert.equal(metadata.width, 360);
  assert.equal(metadata.height, 360);
  assert.ok(png.length > 1000);
}

const joyfulPrompt = buildRenderPrompt({ photoBase64: 'cGhvdG8=', mimeType: 'image/jpeg', tone: '2d-cute', emotion: 'joy', line: '좋아!' });
const angryPrompt = buildRenderPrompt({ photoBase64: 'cGhvdG8=', mimeType: 'image/jpeg', tone: '2d-cute', emotion: 'angry', line: '좋아!' });
assert.ok(joyfulPrompt.includes(letteringDirection('joy')) && joyfulPrompt.includes('좋아!'));
assert.ok(angryPrompt.includes(letteringDirection('angry')) && letteringDirection('angry') !== letteringDirection('joy'));
console.log('Text-effect SVG, escaping, prompt and raster export checks passed');
