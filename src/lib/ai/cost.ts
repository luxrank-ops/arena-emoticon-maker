// ─────────────────────────────────────────────────────────────
// AI API 원가·사용량 단일 소스
//  · 생성 1장당 단가는 prices.json 한 곳에만 둔다 (관리자 콘솔 · CLI 스크립트 공용).
//  · 공급자 공시 가격이 바뀌면 src/lib/ai/prices.json 만 고치면 된다.
//  · 실제 청구액이 아니라 '공시 단가 × 호출 수' 추정치다. 더 정확한 값이 필요하면
//    AI_PRICE_USD_JSON 으로 모델별 단가를 덮어쓴다 (예: {"gemini-3-pro-image-preview":0.12}).
// ─────────────────────────────────────────────────────────────

import type { UsageEvent } from '@/lib/types';
import PRICES from '@/lib/ai/prices.json';

/** 원화 환산 기준 (관리자가 FX_KRW_PER_USD 로 고정할 수 있다) */
export const FX_KRW_PER_USD = (() => {
  const v = Number(process.env.FX_KRW_PER_USD ?? PRICES.fxKrwPerUsd);
  return Number.isFinite(v) && v > 0 ? v : 1_400;
})();

type PriceTable = { models?: Record<string, number>; providers?: Record<string, number> };

function overrides(): PriceTable {
  const raw = process.env.AI_PRICE_USD_JSON;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as PriceTable;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function mergeTable(section: 'models' | 'providers'): Record<string, number> {
  return { ...(PRICES[section] as Record<string, number>), ...(overrides()[section] ?? {}) };
}

/**
 * 1장 생성 단가(USD).
 *  · 우선순위: 모델 단가 → 공급자 기본 단가 → 0 (알 수 없음)
 */
export function unitCostUsd(provider: string, model?: string): number {
  const models = mergeTable('models');
  if (model && models[model] !== undefined) return models[model];
  return mergeTable('providers')[provider] ?? 0;
}

export function usdToKrw(usd: number): number {
  return Math.round(usd * FX_KRW_PER_USD);
}

/** 컷당 원가 상한(원). .env 의 AI_COST_CAP_KRW 와 같은 값 */
export const AI_COST_CAP_KRW = (() => {
  const v = Number(process.env.AI_COST_CAP_KRW);
  return Number.isFinite(v) && v > 0 ? v : 60;
})();

/**
 * 상한을 넘는 모델 목록.
 *  · 실제로 생성을 막지는 않는다(제품 판단) — 관리자 콘솔에 경고로만 노출한다.
 */
export function modelsOverCap(capKrw = AI_COST_CAP_KRW): { model: string; krw: number }[] {
  return Object.entries(mergeTable('models'))
    .map(([model, usd]) => ({ model, krw: usdToKrw(usd) }))
    .filter((m) => m.krw > capKrw)
    .sort((a, b) => b.krw - a.krw);
}

export interface UsageBucket {
  key: string;
  calls: number;
  usd: number;
}

export interface ApiUsageSummary {
  /** 생성 이벤트(=API 호출) 총 건수 */
  calls: number;
  /** 공급자 응답에 실측 단가가 있던 호출 수 */
  measuredCalls: number;
  /** 공시 단가로 추정한 호출 수 */
  estimatedCalls: number;
  usd: number;
  krw: number;
  /** 호출 1회 평균 원가(원) */
  krwPerCall: number;
  fxKrwPerUsd: number;
  byProvider: UsageBucket[];
  byModel: UsageBucket[];
  byKind: { key: string; calls: number }[];
  byDay: { day: string; calls: number; krw: number }[];
  latency: { avgMs: number; p95Ms: number };
  /** 크레딧이 실제로 차감된 재생성(다시 그리기) 호출 수 */
  chargedRedraws: number;
}

interface EventLike {
  type: string;
  createdAt: string;
  meta: Record<string, string | number | boolean>;
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/**
 * 사용 이벤트에서 API 사용량을 집계한다.
 *  · type === 'generate' 인 이벤트만 센다 (실제 생성 공급자를 호출한 경로).
 *  · meta.costUsd 가 있으면 실측으로, 없으면 공시 단가 × 1장으로 추정한다.
 */
export function summarizeApiUsage(events: EventLike[], fxKrwPerUsd = FX_KRW_PER_USD): ApiUsageSummary {
  const providers = new Map<string, UsageBucket>();
  const models = new Map<string, UsageBucket>();
  const kinds = new Map<string, number>();
  const days = new Map<string, { calls: number; usd: number }>();
  const latencies: number[] = [];
  let usd = 0;
  let measuredCalls = 0;
  let estimatedCalls = 0;
  let chargedRedraws = 0;
  let calls = 0;

  for (const e of events) {
    if (e.type !== 'generate') continue;
    calls += 1;

    const provider = str(e.meta.provider) ?? 'unknown';
    const model = str(e.meta.model);
    const measured = num(e.meta.costUsd);
    const cost = measured !== undefined && measured > 0 ? measured : unitCostUsd(provider, model);
    if (measured !== undefined && measured > 0) measuredCalls += 1;
    else if (cost > 0) estimatedCalls += 1;

    usd += cost;
    if (e.meta.redraw === true) chargedRedraws += 1;

    const p = providers.get(provider) ?? { key: provider, calls: 0, usd: 0 };
    p.calls += 1;
    p.usd += cost;
    providers.set(provider, p);

    const modelKey = model ?? `${provider}:unknown-model`;
    const m = models.get(modelKey) ?? { key: modelKey, calls: 0, usd: 0 };
    m.calls += 1;
    m.usd += cost;
    models.set(modelKey, m);

    const kind = str(e.meta.kind) ?? (e.meta.batch === true ? 'batch' : e.meta.redraw === true ? 'redraw' : 'single');
    kinds.set(kind, (kinds.get(kind) ?? 0) + 1);

    const day = (e.createdAt || '').slice(0, 10) || 'unknown';
    const d = days.get(day) ?? { calls: 0, usd: 0 };
    d.calls += 1;
    d.usd += cost;
    days.set(day, d);

    const latency = num(e.meta.latencyMs);
    if (latency !== undefined && latency >= 0) latencies.push(latency);
  }

  latencies.sort((a, b) => a - b);
  const avgMs = latencies.length ? Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length) : 0;
  const p95Ms = latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))] : 0;

  const sortBuckets = (map: Map<string, UsageBucket>) =>
    [...map.values()].sort((a, b) => b.calls - a.calls || b.usd - a.usd);

  return {
    calls,
    measuredCalls,
    estimatedCalls,
    usd: Number(usd.toFixed(6)),
    krw: Math.round(usd * fxKrwPerUsd),
    krwPerCall: calls ? Math.round((usd * fxKrwPerUsd) / calls) : 0,
    fxKrwPerUsd,
    byProvider: sortBuckets(providers),
    byModel: sortBuckets(models),
    byKind: [...kinds.entries()]
      .map(([key, count]) => ({ key, calls: count }))
      .sort((a, b) => b.calls - a.calls),
    byDay: [...days.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([day, v]) => ({ day, calls: v.calls, krw: Math.round(v.usd * fxKrwPerUsd) })),
    latency: { avgMs, p95Ms },
    chargedRedraws,
  };
}

/** DB 이벤트 배열을 그대로 받는 편의 함수 */
export function summarizeEvents(events: UsageEvent[], fxKrwPerUsd = FX_KRW_PER_USD): ApiUsageSummary {
  return summarizeApiUsage(events, fxKrwPerUsd);
}
