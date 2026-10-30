const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('index.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const elements = {};
for (const id of ['apiKeyInput', 'charName', 'emotion', 'dialogue', 'status', 'generateButton', 'resultBox', 'resultImage', 'downloadImage', 'keyStatus']) {
  elements[id] = { value: '', textContent: '', addEventListener() {}, classList: { add() {}, remove() {} } };
}
elements.apiKeyInput.value = 'test-key';
elements.charName.value = '새싹';
elements.emotion.value = '기쁨';
let called = false;
const context = { document: { getElementById: id => elements[id] }, localStorage: { removeItem() {} },
  fetch: async (url, options) => {
    called = true;
    assert.match(url, /gemini-2\.5-flash-image/);
    assert.equal(options.headers['x-goog-api-key'], 'test-key');
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'YWJj' } }] } }] }) };
  }
};
vm.createContext(context);
vm.runInContext(source, context);
(async () => {
  await context.generateImage();
  assert.ok(called);
  assert.equal(elements.resultImage.src, 'data:image/png;base64,YWJj');
  assert.equal(elements.downloadImage.download, 'emoticon.png');
  context.fetch = async () => ({ ok: false, status: 429, json: async () => ({ error: { message: 'Quota exceeded, limit: 0' } }) });
  await context.generateImage();
  assert.match(elements.status.textContent, /무료 할당량이 0/);
  context.clearApiKey();
  assert.equal(elements.apiKeyInput.value, '');
  console.log('Standalone generation flow smoke test passed (mocked API)');
})().catch(error => { console.error(error); process.exitCode = 1; });
