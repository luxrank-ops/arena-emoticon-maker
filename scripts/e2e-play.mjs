// 유료 앱(TWA) 풀액세스 E2E — 로컬 dev 서버 대상
//  · TWA 세션: watercolor/24컷/워터마크 제거/카카오 패키징/브리핑 해제/무제한/409
//  · 웹 세션:  watercolor 402 / 24컷 402 / 12컷 차감 (기존 동작 유지)
const BASE = 'http://localhost:3000';
const TWA_UA = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 TWA/1.0';
const WEB_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const PALETTE = { skin: '#F6D3B3', skinShade: '#E8BA95', hair: '#332621', shirt: '#5AB8F5', accent: '#FF6B5B' };
const SIGNATURE = { headScale: 1.02, faceWidth: 0.98, eyeSpacing: 1, eyeSize: 1, eyeShape: 'almond', browWeight: 0.9, mouthWidth: 1, lipThickness: 0.8, noseSize: 0.9, hairStyle: 2, cheek: 0.6, jawline: 'round', glasses: false };

let pass = 0, failCount = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✔ ${name}`); }
  else { failCount++; console.log(`  ✘ ${name} ${extra}`); }
}

class Jar {
  constructor(ua) { this.ua = ua; this.cookies = new Map(); }
  cookieHeader() { return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; '); }
  absorb(res) {
    const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const c of sc) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      const k = pair.slice(0, i), v = pair.slice(i + 1);
      if (v === '' || /Expires=Thu, 01 Jan 1970/i.test(c)) this.cookies.delete(k); else this.cookies.set(k, v);
    }
  }
  async req(path, opts = {}) {
    const headers = { 'user-agent': this.ua, ...(opts.headers || {}) };
    if (this.cookies.size) headers['cookie'] = this.cookieHeader();
    if (opts.body) headers['content-type'] = 'application/json';
    const res = await fetch(BASE + path, { ...opts, headers, redirect: 'manual' });
    this.absorb(res);
    let json = null, text = '';
    try { text = await res.text(); } catch {}
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text };
  }
}

async function makeFace(jar) {
  const r = await jar.req('/api/face/analyze', {
    method: 'POST',
    body: JSON.stringify({
      palette: PALETTE, signature: SIGNATURE,
      metrics: { coverage: 0.18, centering: 0.1, brightness: 140, sharpness: 20, faceDetected: true },
      consent: { accepted: true, version: 'v1.0', overseas: true },
    }),
  });
  if (r.status !== 200 || !r.json?.faceId) throw new Error(`face/analyze ${r.status}: ${r.text.slice(0, 200)}`);
  return r.json.faceId;
}

async function makeSheet(jar, faceId, tone) {
  const r = await jar.req('/api/sheets', { method: 'POST', body: JSON.stringify({ faceId, tone }) });
  if (r.status !== 200 || !r.json?.sheet) return { status: r.status, json: r.json };
  const c = await jar.req(`/api/sheets/${r.json.sheet.id}/choose`, { method: 'POST', body: JSON.stringify({ variantKey: 'A' }) });
  return { status: r.status, json: r.json, choose: c };
}

console.log('\n[1] TWA 세션 (유료 앱)');
const twa = new Jar(TWA_UA);
const faceId = await makeFace(twa);
check('face/analyze 200', true);

const sWater = await makeSheet(twa, faceId, 'watercolor');
check('watercolor 시트 200 (풀액세스)', sWater.status === 200, `got ${sWater.status} ${JSON.stringify(sWater.json?.error || '')}`);

const sLine = await makeSheet(twa, faceId, '2d-cute');
check('2d-cute 시트 200', sLine.status === 200, `got ${sLine.status}`);

const pack24 = await twa.req('/api/packs', { method: 'POST', body: JSON.stringify({ sheetId: sWater.json.sheet.id, size: 24 }) });
check('24컷 팩 200 (무제한)', pack24.status === 200, `got ${pack24.status} ${pack24.text.slice(0, 150)}`);
check('크레딧 차감 0', pack24.json?.cost === 0, `got ${pack24.json?.cost}`);
const packId = pack24.json?.packId;

const view = await twa.req(`/api/packs/${packId}`);
check('팩 뷰 200', view.status === 200, `got ${view.status}`);
check('워터마크 없음', view.json?.watermark === false, `got ${view.json?.watermark}`);

const kakao = await twa.req(`/api/packs/${packId}/kakao`);
check('카카오 패키징 가능', kakao.json?.packaging === true, `got ${JSON.stringify(kakao.json?.packaging)} plan=${kakao.json?.plan}`);

const brief = await twa.req('/api/brief');
check('Daily Brief 잠금 해제', brief.status === 200 && brief.json?.locked === false, `status ${brief.status} locked=${brief.json?.locked}`);

const billing = await twa.req('/billing');
check('billing에 "무제한" 표시', billing.text.includes('무제한'), `status ${billing.status}`);
check('billing에 "구글 플레이 유료 앱" 표시', billing.text.includes('구글 플레이 유료 앱'));

const pricing = await twa.req('/pricing');
check('pricing에 "모든 기능을 이용 중이에요" 표시', pricing.text.includes('모든 기능을 이용 중이에요'), `status ${pricing.status}`);

const checkout = await twa.req('/api/checkout', { method: 'POST', body: JSON.stringify({ sku: 'credits-20' }) });
check('TWA 크레딧 주문 409 (불필요)', checkout.status === 409, `got ${checkout.status} ${checkout.text.slice(0, 150)}`);

console.log('\n[2] 웹 세션 (FREE 게스트) — 기존 동작 유지');
const web = new Jar(WEB_UA);
const webFace = await makeFace(web);
check('face/analyze 200', true);

const wWater = await makeSheet(web, webFace, 'watercolor');
check('watercolor 시트 402 (FREE 제한)', wWater.status === 402, `got ${wWater.status}`);

const wLine = await makeSheet(web, webFace, '2d-cute');
check('2d-cute 시트 200', wLine.status === 200, `got ${wLine.status}`);

const w12 = await web.req('/api/packs', { method: 'POST', body: JSON.stringify({ sheetId: wLine.json.sheet.id, size: 12 }) });
check('12컷 팩 200', w12.status === 200, `got ${w12.status} ${w12.text.slice(0, 150)}`);
check('크레딧 12 차감', w12.json?.cost === 12, `got ${w12.json?.cost}`);

const w24 = await web.req('/api/packs', { method: 'POST', body: JSON.stringify({ sheetId: wLine.json.sheet.id, size: 24 }) });
check('24컷 팩 402 (크레딧 부족)', w24.status === 402, `got ${w24.status}`);

const wBilling = await web.req('/billing');
check('웹 billing: 무제한 아닌 잔액 표시', !wBilling.text.includes('구글 플레이 유료 앱'));

const wPricing = await web.req('/pricing');
check('웹 pricing: 크레딧 충전 섹션 존재', wPricing.text.includes('크레딧만 충전하기'));

console.log(`\n결과: ${pass} 통과, ${failCount} 실패`);
process.exit(failCount ? 1 : 0);
