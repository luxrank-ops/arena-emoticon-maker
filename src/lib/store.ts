import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { firestoreCas, firestoreReadSafe, hasFirestore, storeLabel as firestoreStoreLabel } from '@/lib/firestore';
import type {
  CharacterSheet,
  CreditEntry,
  DailyBrief,
  FaceProfile,
  Frame,
  GoodsOrder,
  Order,
  Pack,
  UsageEvent,
  User,
} from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// 파일 기반 저장소 (Step 2 데모 런타임)
// 프로덕션에서는 Prisma/Postgres 어댑터로 교체된다 (docs/ARCHITECTURE.md §3).
// 인터페이스는 동일하게 유지 → 상위 코드 변경 없이 스왑 가능.
// ─────────────────────────────────────────────────────────────

export interface DB {
  version: number;
  users: User[];
  faces: FaceProfile[];
  sheets: CharacterSheet[];
  packs: Pack[];
  credits: CreditEntry[];
  orders: (Order | GoodsOrder)[];
  briefs: DailyBrief[];
  events: UsageEvent[];
}

const EMPTY: DB = {
  version: 1,
  users: [],
  faces: [],
  sheets: [],
  packs: [],
  credits: [],
  orders: [],
  briefs: [],
  events: [],
};

// ── 저장 위치 해석 ─────────────────────────────────────────────
// 서버리스(Vercel 등)에서는 배포 디렉터리가 읽기 전용이므로 cwd 기준 경로에
// 쓸 수 없다. 후보를 순서대로 시도해 '쓸 수 있는 곳'을 고른다.
//   1) DATA_DIR (운영자가 명시)
//   2) VERCEL → /tmp/.data (인스턴스 로컬 · 콜드스타트 시 소실)
//   3) cwd/.data (로컬 · 도커 등 영속 볼륨)
//   4) os.tmpdir()/.data (마지막 안전망)
export type StoreMode = 'remote' | 'persistent' | 'ephemeral' | 'memory';

// ── 원격 저장소 (선택) ─────────────────────────────────────────
// 우선순위: Firestore > KV(Vercel KV/Upstash) > 파일/메모리.
// `STORE_BACKEND` 로 고정할 수 있다: auto(기본) | firestore | kv | file
// (서버리스에서 /tmp 는 인스턴스 로컬이라 세션·주문이 인스턴스 간 공유되지 않는다)
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const KV_KEY = process.env.KV_STORE_KEY || 'emotime:store';
const KV_TIMEOUT_MS = 4000;

export interface RemoteDriver {
  backend: 'firestore' | 'kv';
  /** 상태 표시용 (예: kv:emotime:store, firestore:emotime/store) */
  label: string;
  /** 현재 스냅샷 + CAS 용 버전 토큰(KV 는 원문 자체, Firestore 는 updateTime) */
  read(): Promise<{ raw: string | null; version: string }>;
  /** 기대 버전이 그대로일 때만 교체. 실패(선점됨)하면 false */
  cas(version: string, raw: string | null, next: string): Promise<boolean>;
}

/** 원격 저장소 호출 (Upstash/Vercel KV REST 프로토콜) */
async function kv(command: unknown[]): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), KV_TIMEOUT_MS);
  try {
    const res = await fetch(KV_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      signal: ctrl.signal,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`kv ${res.status}`);
    const json = (await res.json()) as { result?: unknown; error?: string };
    if (json.error) throw new Error(json.error);
    return json.result ?? null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 원문이 그대로일 때만 교체 (compare-and-set).
 *  · 멀티 인스턴스에서 동시에 써도 한쪽이 덮어써 잃어버리는 일이 없게 한다.
 */
const CAS_SCRIPT = `local cur = redis.call('GET', KEYS[1])
if (cur == false) then cur = '' end
if cur == ARGV[1] then redis.call('SET', KEYS[1], ARGV[2]) return 1 else return 0 end`;

const kvDriver: RemoteDriver = {
  backend: 'kv',
  label: `kv:${KV_KEY}`,
  async read() {
    const r = await kv(['GET', KV_KEY]);
    const raw = typeof r === 'string' ? r : null;
    return { raw, version: raw ?? '' };
  },
  async cas(_version, raw, next) {
    const r = await kv(['EVAL', CAS_SCRIPT, '1', KV_KEY, raw ?? '', next]);
    return Number(r) === 1;
  },
};

const firestoreDriver: RemoteDriver = {
  backend: 'firestore',
  label: firestoreStoreLabel(),
  read: () => firestoreReadSafe(),
  async cas(version, _raw, next) {
    return firestoreCas(version, next);
  },
};

/** 어떤 원격 백엔드를 쓸지 모듈 로드 시 1회 결정 */
function pickDriver(): RemoteDriver | null {
  const forced = (process.env.STORE_BACKEND || 'auto').toLowerCase();
  if (forced === 'file' || forced === 'none' || forced === 'local') return null;
  const fs = hasFirestore() ? firestoreDriver : null;
  const kv = KV_URL && KV_TOKEN ? kvDriver : null;
  if (forced === 'firestore') return fs;
  if (forced === 'kv') return kv;
  return fs ?? kv;
}

const DRIVER: RemoteDriver | null = pickDriver();
/** Firestore 로 갈아탈 때 KV 에 남아 있는 스냅샷을 1회 승계하기 위해 보관 */
const HANDOVER_KV: RemoteDriver | null = KV_URL && KV_TOKEN ? kvDriver : null;

export function hasRemoteStore(): boolean {
  return !!DRIVER;
}

/** 현재 저장 백엔드 이름 (file | kv | firestore) */
export function storeBackend(): 'file' | 'kv' | 'firestore' {
  return DRIVER?.backend ?? 'file';
}

/** 원격이 최근에 실패했는지 (일정 시간 후 자동 재시도) */
function remoteUsable(): boolean {
  return !!DRIVER && Date.now() >= state.remoteDownUntil;
}

function markRemoteDown(e: unknown) {
  state.lastError = (e as Error)?.message ?? `${DRIVER?.backend ?? 'remote'} error`;
  state.remoteDownUntil = Date.now() + 15_000;
}

interface StoreGlobal {
  cache: DB | null;
  chain: Promise<unknown>;
  loaded: boolean;
  dir: string | null;
  mode: StoreMode;
  resolved: Promise<string | null> | null;
  lastError: string | null;
  /** KV 장애 시 이 시각까지는 원격을 건너뛰고 파일/메모리로 서비스한다(자동 복구) */
  remoteDownUntil: number;
  /** 원격 장애로 로컬에만 기록된 건수 (0 이 아니면 데이터 유실 위험 신호) */
  fallbackWrites: number;
  /** Firestore 최초 사용 시 KV 스냅샷을 승계했는지 (kv | null) */
  importedFrom: 'kv' | null;
}
const g = globalThis as unknown as { __emotimeStore?: StoreGlobal };
g.__emotimeStore ??= {
  cache: null,
  chain: Promise.resolve(),
  loaded: false,
  dir: null,
  mode: 'persistent',
  resolved: null,
  lastError: null,
  remoteDownUntil: 0,
  fallbackWrites: 0,
  importedFrom: null,
};
const state = g.__emotimeStore;

function candidateDirs(): { dir: string; mode: StoreMode }[] {
  const out: { dir: string; mode: StoreMode }[] = [];
  if (process.env.DATA_DIR) out.push({ dir: process.env.DATA_DIR, mode: 'persistent' });
  if (process.env.VERCEL) out.push({ dir: path.join('/tmp', '.data'), mode: 'ephemeral' });
  out.push({ dir: path.join(process.cwd(), '.data'), mode: 'persistent' });
  out.push({ dir: path.join(os.tmpdir(), 'emotime-data'), mode: 'ephemeral' });
  return out;
}

/** 프로브가 예외 대신 '멈추는' 경로(예: /proc, 네트워크 fs)를 잘라내기 위한 상한 */
const PROBE_TIMEOUT_MS = 500;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => {
      const t = setTimeout(() => reject(new Error('probe timeout')), ms);
      // 타이머가 프로세스를 붙잡지 않게
      if (typeof (t as unknown as { unref?: () => void }).unref === 'function') {
        (t as unknown as { unref: () => void }).unref();
      }
    }),
  ]);
}

/** 후보 디렉터리에 실제로 쓸 수 있는지 1회 확인하고 캐시한다. */
async function resolveDir(): Promise<string | null> {
  if (state.resolved) return state.resolved;
  state.resolved = (async () => {
    for (const cand of candidateDirs()) {
      try {
        await withTimeout(
          (async () => {
            await fs.mkdir(cand.dir, { recursive: true });
            const probe = path.join(cand.dir, `.probe-${process.pid}`);
            await fs.writeFile(probe, 'ok');
            await fs.rm(probe, { force: true });
          })(),
          PROBE_TIMEOUT_MS,
        );
        state.dir = cand.dir;
        state.mode = cand.mode;
        return cand.dir;
      } catch {
        // 다음 후보로 (실패 · 타임아웃 모두)
      }
    }
    // 전부 실패 → 프로세스 메모리에만 유지 (사이트는 뜨고, 재시작 시 소실)
    state.dir = null;
    state.mode = 'memory';
    return null;
  })();
  return state.resolved;
}

/** 헬스체크/운영 화면용 저장소 상태 */
export function storeStatus(): {
  dir: string | null;
  mode: StoreMode;
  backend: 'file' | 'kv' | 'firestore';
  lastError: string | null;
  fallbackWrites: number;
  importedFrom: 'kv' | null;
} {
  if (DRIVER) {
    return {
      dir: DRIVER.label,
      backend: DRIVER.backend,
      // 원격 장애로 파일/메모리로 내려간 상태는 degraded(memory)로 알린다
      mode: remoteUsable() ? 'remote' : 'memory',
      lastError: state.lastError,
      fallbackWrites: state.fallbackWrites,
      importedFrom: state.importedFrom,
    };
  }
  return {
    dir: state.dir,
    mode: state.mode,
    backend: 'file',
    lastError: state.lastError,
    fallbackWrites: state.fallbackWrites,
    importedFrom: state.importedFrom,
  };
}

async function load(): Promise<DB> {
  if (state.loaded && state.cache) return state.cache;
  const dir = await resolveDir();
  try {
    if (!dir) throw new Error('no writable store dir');
    const raw = await fs.readFile(path.join(dir, 'store.json'), 'utf8');
    const parsed = JSON.parse(raw) as DB;
    state.cache = { ...EMPTY, ...parsed };
  } catch {
    state.cache = { ...EMPTY };
  }
  state.loaded = true;
  return state.cache;
}

/**
 * 저장. 실패해도 **던지지 않는다** — 쓰기 불가 환경에서 페이지 전체가 500 이 되는 것을 막고
 * 메모리 캐시로 계속 서비스한다(storeStatus().mode === 'memory' 로 표면화).
 */
async function save(db: DB) {
  const dir = await resolveDir();
  if (!dir) {
    state.mode = 'memory';
    return;
  }
  const file = path.join(dir, 'store.json');
  try {
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db));
    await fs.rename(tmp, file);
  } catch (e) {
    state.lastError = (e as Error).message;
    if (state.mode === 'persistent') state.mode = 'memory';
  }
}

/**
 * 원격 저장소 트랜잭션: 읽기 → fn → CAS 저장.
 *  · 백엔드는 KV(Upstash/Vercel KV) 또는 Firestore — 인터페이스는 동일하다.
 *  · 인프라 오류(통신/파싱/체크섬)만 파일·메모리로 폴백한다.
 *  · **fn 이 던진 오류는 그대로 전파**한다 — 업무 오류(한도 초과·404 등)를 저장소 장애로
 *    오인하면 멀쩡한 원격 저장소를 15초간 버리고 파일 스냅샷으로 덮어써 데이터가 사라진다.
 *  · CAS 충돌 시 최신 스냅샷으로 fn 을 다시 적용한다 (fn 은 부수효과 없는 순수 함수여야 한다).
 */
async function withRemote<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const driver = DRIVER;
  if (!driver) return fallbackLocal(fn);

  // 동시 쓰기가 몰리면 CAS 가 계속 깨질 수 있다 → 지터를 섞은 지수 백오프로 재시도.
  // 스냅샷 1건 CAS 는 사실상 락이라, 경합이 심하면 재시도를 넉넉히 줘야 유실이 없다.
  const MAX_ATTEMPTS = 25;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(backoffMs(attempt));
    let snap: { raw: string | null; version: string };
    try {
      snap = await driver.read();
    } catch (e) {
      // 인프라 장애 → 잠시 파일/메모리로 서비스 (자동 복구)
      markRemoteDown(e);
      return fallbackLocal(fn);
    }

    // ── KV → Firestore 1회 승계 ─────────────────────────────────
    // Firestore 가 비어 있고 KV 자격증명이 남아 있으면, 기존 운영 데이터를 한 번만 옮긴다.
    // (백엔드 교체 배포에서 사용자·주문이 사라지지 않게. 이후에는 KV 를 읽지 않는다)
    let handover = false;
    if (driver.backend === 'firestore' && snap.raw === null && HANDOVER_KV && !state.importedFrom) {
      try {
        const legacy = await HANDOVER_KV.read();
        if (legacy.raw) {
          snap = { raw: legacy.raw, version: '' };
          handover = true;
        }
      } catch {
        // KV 가 이미 정리됐거나 장애 → 승계 없이 새 저장소로 시작 (다음 요청에서 재시도)
      }
    }

    let db: DB;
    try {
      db = snap.raw ? { ...EMPTY, ...(JSON.parse(snap.raw) as DB) } : { ...EMPTY };
    } catch (e) {
      // 저장값이 깨졌다 → 덮어쓰지 않고 장애로 취급 (데이터 보존 우선)
      markRemoteDown(new Error(`corrupt store: ${(e as Error).message}`));
      return fallbackLocal(fn);
    }

    // 업무 오류는 여기서 그대로 던져 나간다 (폴백 없음)
    const result = await fn(db);
    const next = JSON.stringify(db);

    try {
      if (await driver.cas(snap.version, snap.raw, next)) {
        if (handover) state.importedFrom = 'kv';
        state.mode = 'remote';
        state.remoteDownUntil = 0;
        state.lastError = null;
        return result;
      }
    } catch (e) {
      markRemoteDown(e);
      await save(db);
      return result;
    }
    // 다른 인스턴스가 먼저 썼다 → 최신 스냅샷으로 재시도
  }

  // 재시도를 모두 소진 → **거짓 성공을 돌려주지 않는다**.
  // (성공 응답을 보냈는데 저장이 안 되면 주문·크레딧이 조용히 사라진다)
  state.lastError = 'conflict: concurrent writes (retry exhausted)';
  throw new StoreBusyError();
}

/** 원격 장애 시에만 쓰는 로컬 경로 (파일 → 메모리) */
async function fallbackLocal<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  if (DRIVER) state.fallbackWrites += 1;
  const db = await load();
  const result = await fn(db);
  await save(db);
  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 3ms → 최대 120ms, ±50% 지터 (여러 인스턴스가 같은 간격으로 다시 부딪히지 않게) */
function backoffMs(attempt: number): number {
  const base = Math.min(120, 3 * 2 ** Math.min(attempt, 5));
  return Math.round(base * (0.5 + Math.random()));
}

/**
 * 저장소 쓰기 경합으로 저장에 실패했을 때 던지는 오류.
 *  · API 계층에서 503 + Retry-After 로 변환된다 (성공한 척 하지 않는다).
 */
export class StoreBusyError extends Error {
  readonly code = 'STORE_BUSY';
  constructor() {
    super('요청이 몰려 저장하지 못했습니다. 잠시 후 다시 시도해 주세요');
    this.name = 'StoreBusyError';
  }
}

/** 모든 읽기/쓰기는 이 함수를 통과 → 직렬화된 단일 트랜잭션 */
export function withDB<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = state.chain.then(async () => {
    if (remoteUsable()) return withRemote(fn);
    return fallbackLocal(fn);
  });
  state.chain = run.catch(() => undefined);
  return run;
}

/** 테스트/개발용 초기화 */
export function resetDB() {
  state.cache = { ...EMPTY };
  state.loaded = true;
  return save(state.cache);
}

export function logEvent(db: DB, userId: string, type: UsageEvent['type'], meta: UsageEvent['meta'] = {}) {
  db.events.push({
    id: uid('evt'),
    userId,
    type,
    meta,
    createdAt: new Date().toISOString(),
  });
  if (db.events.length > 5000) db.events.splice(0, db.events.length - 4000);
}

export function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function findUser(db: DB, id: string) {
  return db.users.find((u) => u.id === id) ?? null;
}

export function packsOfUser(db: DB, userId: string): Pack[] {
  return db.packs.filter((p) => p.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function framesOfPack(db: DB, packId: string): Frame[] {
  const pack = db.packs.find((p) => p.id === packId);
  return pack?.frames.slice().sort((a, b) => a.index - b.index) ?? [];
}

export function latestReadyPack(db: DB, userId: string): Pack | null {
  return packsOfUser(db, userId).find((p) => p.status !== 'FAILED') ?? null;
}

/** 데모 시드: 관리자 통계가 비어 보이지 않도록 최소 데이터 1회 생성 */
export function ensureSeed(db: DB) {
  if (db.users.some((u) => u.id === 'demo_seed')) return;
  const now = new Date();
  const iso = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
  db.users.push({
    id: 'demo_seed',
    name: '데모 작가',
    plan: 'PLUS',
    credits: 24,
    role: 'user',
    createdAt: iso(26),
    lastGrantAt: iso(2),
  });
  db.credits.push({
    id: uid('cr'),
    userId: 'demo_seed',
    delta: 36,
    reason: 'SUBSCRIPTION_GRANT',
    balanceAfter: 36,
    createdAt: iso(26),
  });
  db.credits.push({
    id: uid('cr'),
    userId: 'demo_seed',
    delta: -12,
    reason: 'GENERATION',
    refType: 'pack',
    refId: 'seed_pack',
    balanceAfter: 24,
    createdAt: iso(25),
  });
}
