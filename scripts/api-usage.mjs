#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// API 소모량 체커 — 생성 API 호출 수 · 모델별 원가를 집계한다.
//
// 사용:
//   node scripts/api-usage.mjs              # 전체 기간 요약
//   node scripts/api-usage.mjs --days 7     # 최근 7일만
//   node scripts/api-usage.mjs --budget 50000   # 월 예산 초과 시 exit 2
//   node scripts/api-usage.mjs --json       # 기계 판독용 JSON
//   node scripts/api-usage.mjs --md         # reports/api-usage-YYYY-MM-DD.md 저장
//   node scripts/api-usage.mjs --file /path/store.json
//
// 원가 단가: src/lib/ai/prices.json (앱 관리자 콘솔과 동일 소스)
// 환경변수: FX_KRW_PER_USD, AI_PRICE_USD_JSON
// ─────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const PRICES = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/lib/ai/prices.json'), 'utf8'));
const FX = Number(process.env.FX_KRW_PER_USD) > 0 ? Number(process.env.FX_KRW_PER_USD) : PRICES.fxKrwPerUsd;

let overrides = {};
try {
  if (process.env.AI_PRICE_USD_JSON) overrides = JSON.parse(process.env.AI_PRICE_USD_JSON) || {};
} catch {
  overrides = {};
}

const DAYS = Number(value('days', '0')) || 0;
const BUDGET = Number(value('budget', '0')) || 0;
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data');
const FILE = value('file', path.join(DATA_DIR, 'store.json'));

function unitCostUsd(provider, model) {
  const models = { ...PRICES.models, ...(overrides.models || {}) };
  if (model && models[model] !== undefined) return models[model];
  const providers = { ...PRICES.providers, ...(overrides.providers || {}) };
  return providers[provider] ?? 0;
}

const won = (n) => Math.round(n).toLocaleString('ko-KR');
const usd = (n) => `$${n.toFixed(n < 0.01 ? 4 : 3)}`;

if (!fs.existsSync(FILE)) {
  console.log(`
API 소모량 — 0건

저장소가 없습니다: ${FILE}
  · 아직 앱을 실행하지 않았거나, 원격 저장소(Firestore/KV)를 쓰고 있습니다.
  · 파일 저장소로 앱을 한 번 실행하면(.data/store.json 생성) 이 스크립트가 집계합니다.
  · 원격 저장소 사용 중이면 관리자 콘솔(/admin)의 'API 소모량' 카드로 확인하세요.

현재 모드: ${process.env.GEMINI_API_KEY ? 'Gemini 실호출' : '데모(GEMINI_API_KEY 없음) → 외부 API 원가 0원'}
`);
  process.exit(0);
}

const db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const cutoff = DAYS > 0 ? Date.now() - DAYS * 86_400_000 : 0;
const events = (db.events || []).filter((e) => new Date(e.createdAt).getTime() >= cutoff);

const providers = new Map();
const models = new Map();
const kinds = new Map();
const latencies = [];
let calls = 0;
let measuredCalls = 0;
let estimatedCalls = 0;
let totalUsd = 0;
let chargedRedraws = 0;

for (const e of events) {
  if (e.type !== 'generate') continue;
  calls += 1;
  const provider = e.meta?.provider || 'unknown';
  const model = e.meta?.model;
  const measured = typeof e.meta?.costUsd === 'number' && e.meta.costUsd > 0 ? e.meta.costUsd : undefined;
  const cost = measured ?? unitCostUsd(provider, model);
  if (measured) measuredCalls += 1;
  else if (cost > 0) estimatedCalls += 1;
  totalUsd += cost;
  if (e.meta?.redraw === true) chargedRedraws += 1;

  const p = providers.get(provider) || { calls: 0, usd: 0 };
  providers.set(provider, { calls: p.calls + 1, usd: p.usd + cost });

  const modelKey = model || `${provider}:unknown`;
  const m = models.get(modelKey) || { calls: 0, usd: 0 };
  models.set(modelKey, { calls: m.calls + 1, usd: m.usd + cost });

  const kind = e.meta?.kind || (e.meta?.batch ? 'batch' : e.meta?.redraw ? 'redraw' : 'single');
  kinds.set(kind, (kinds.get(kind) || 0) + 1);

  if (typeof e.meta?.latencyMs === 'number') latencies.push(e.meta.latencyMs);
}

// 일자별 원가는 별도로 한 번만 누적한다
const dayAgg = new Map();
for (const e of events) {
  if (e.type !== 'generate') continue;
  const day = (e.createdAt || '').slice(0, 10) || 'unknown';
  const provider = e.meta?.provider || 'unknown';
  const model = e.meta?.model;
  const measured = typeof e.meta?.costUsd === 'number' && e.meta.costUsd > 0 ? e.meta.costUsd : undefined;
  const cost = measured ?? unitCostUsd(provider, model);
  const cur = dayAgg.get(day) || { calls: 0, usd: 0 };
  dayAgg.set(day, { calls: cur.calls + 1, usd: cur.usd + cost });
}

latencies.sort((a, b) => a - b);
const avgLatency = latencies.length ? Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length) : 0;
const p95Latency = latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))] : 0;

const frames = (db.packs || []).reduce((s, p) => s + (p.frames?.length || 0), 0);
const creditSpent = (db.credits || [])
  .filter((c) => c.reason === 'GENERATION' && (c.delta || 0) < 0)
  .reduce((s, c) => s + Math.abs(c.delta), 0);

const summary = {
  generatedAt: new Date().toISOString(),
  periodDays: DAYS || 'all',
  calls,
  measuredCalls,
  estimatedCalls,
  usd: Number(totalUsd.toFixed(6)),
  krw: Math.round(totalUsd * FX),
  krwPerCall: calls ? Math.round((totalUsd * FX) / calls) : 0,
  fxKrwPerUsd: FX,
  latency: { avgMs: avgLatency, p95Ms: p95Latency },
  chargedRedraws,
  byProvider: [...providers.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.calls - a.calls),
  byModel: [...models.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.calls - a.calls),
  byKind: [...kinds.entries()].map(([key, v]) => ({ key, calls: v })).sort((a, b) => b.calls - a.calls),
  byDay: [...dayAgg.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, v]) => ({ day, calls: v.calls, krw: Math.round(v.usd * FX) })),
  context: {
    packs: (db.packs || []).length,
    frames,
    creditsSpentOnGeneration: creditSpent,
    providerMode: process.env.AI_IMAGE_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'demo'),
  },
};

if (flag('json')) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  const lines = [];
  lines.push('');
  lines.push(`API 소모량 — ${DAYS ? `최근 ${DAYS}일` : '전체 기간'} (${FILE})`);
  lines.push('─'.repeat(52));
  lines.push(`생성 API 호출   ${calls}회`);
  lines.push(`추정 원가       ${won(summary.krw)}원 (${usd(summary.usd)} · 환율 ${won(FX)}원/USD)`);
  lines.push(`호출당 평균     ${won(summary.krwPerCall)}원`);
  if (latencies.length) {
    lines.push(`지연            평균 ${(avgLatency / 1000).toFixed(1)}s · p95 ${(p95Latency / 1000).toFixed(1)}s`);
  }
  lines.push(`집계 기준       실측 ${measuredCalls}건 · 추정 ${estimatedCalls}건`);
  lines.push('');

  if (calls === 0) {
    lines.push('👉 이 기간에 외부 생성 API 호출이 없습니다 (원가 0원).');
    lines.push(`   현재 모드: ${summary.context.providerMode}`);
  } else {
    lines.push('[공급자]');
    for (const row of summary.byProvider) {
      lines.push(`  ${row.key.padEnd(14)} ${String(row.calls).padStart(5)}회  ${won(row.usd * FX).padStart(9)}원`);
    }
    lines.push('');
    lines.push('[모델]');
    for (const row of summary.byModel) {
      lines.push(`  ${row.key.padEnd(38)} ${String(row.calls).padStart(4)}회  ${won(row.usd * FX).padStart(8)}원`);
    }
    lines.push('');
    lines.push('[일자별]');
    for (const row of summary.byDay.slice(-DAYS || -14)) {
      lines.push(`  ${row.day}  ${String(row.calls).padStart(4)}회  ${won(row.krw).padStart(9)}원`);
    }
    lines.push('');
  }

  lines.push('[참고]');
  lines.push(`  팩 ${summary.context.packs}개 · 컷 ${frames}개 · 생성 크레딧 차감 ${creditSpent}회`);
  lines.push(`  재생성(다시 그리기) 호출 ${chargedRedraws}회`);
  lines.push('');

  console.log(lines.join('\n'));

  if (BUDGET > 0) {
    const ok = summary.krw <= BUDGET;
    console.log(
      ok
        ? `✅ 예산 내: ${won(summary.krw)}원 / ${won(BUDGET)}원 (여유 ${won(BUDGET - summary.krw)}원)`
        : `🚨 예산 초과: ${won(summary.krw)}원 / ${won(BUDGET)}원 (+${won(summary.krw - BUDGET)}원)`,
    );
    if (!ok) process.exitCode = 2;
  }
}

if (flag('md')) {
  fs.mkdirSync('reports', { recursive: true });
  const out = path.join('reports', `api-usage-${new Date().toISOString().slice(0, 10)}.md`);
  const md = `# API 소모량 리포트 — ${new Date().toISOString().slice(0, 10)}

| 지표 | 값 |
| --- | --- |
| 기간 | ${DAYS ? `최근 ${DAYS}일` : '전체'} |
| 생성 API 호출 | ${summary.calls}회 |
| 추정 원가 | ${won(summary.krw)}원 (${usd(summary.usd)}) |
| 호출당 평균 | ${won(summary.krwPerCall)}원 |
| 지연 | 평균 ${(avgLatency / 1000).toFixed(1)}s · p95 ${(p95Latency / 1000).toFixed(1)}s |
| 집계 기준 | 실측 ${measuredCalls}건 · 추정 ${estimatedCalls}건 |
| 환율 | ${won(FX)}원/USD |

## 모델별
${summary.byModel.length ? summary.byModel.map((r) => `- ${r.key}: ${r.calls}회 · ${won(r.usd * FX)}원`).join('\n') : '- 호출 없음'}

## 일자별
${summary.byDay.length ? summary.byDay.map((r) => `- ${r.day}: ${r.calls}회 · ${won(r.krw)}원`).join('\n') : '- 호출 없음'}

---
생성: scripts/api-usage.mjs · 원본: ${FILE} · 단가: src/lib/ai/prices.json
`;
  fs.writeFileSync(out, md);
  console.log(`저장: ${out}`);
}
