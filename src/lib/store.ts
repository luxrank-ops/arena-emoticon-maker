import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { firestoreCas, firestoreReadSafe, hasFirestore, storeLabel as firestoreStoreLabel } from '@/lib/firestore';
import type {
  CharacterSheet,
  ContentReport,
  CreditEntry,
  DailyBrief,
  FaceProfile,
  Frame,
  GoodsOrder,
  ImageDeletionJob,
  Order,
  Pack,
  PlayUsage,
  QuotePurchase,
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
  accounts: { userId: string; email: string; nickname: string; nicknameKey: string; name: string; birthDate: string; gender: 'male' | 'female' | 'unspecified'; passwordHash: string; consentAt: string }[];
  sessions: { tokenHash: string; userId: string; expiresAt: string }[];
  adminLoginAttempts: number[];
  /** 원본을 저장하지 않는 단기 일관성 기준. 기한 이후 파기한다. */
  consistencyPreparations: { tokenHash: string; userId: string; photoHash: string; subjectKind?: 'person' | 'pet'; features: string[]; expiresAt: number }[];
  faces: FaceProfile[];
  sheets: CharacterSheet[];
  packs: Pack[];
  credits: CreditEntry[];
  quotePurchases: QuotePurchase[];
  orders: (Order | GoodsOrder)[];
  contentReports: ContentReport[];
  deletionJobs: ImageDeletionJob[];
  playUsage: PlayUsage[];
  briefs: DailyBrief[];
  events: UsageEvent[];
}

const EMPTY: DB = {
  version: 1,
  users: [],
  accounts: [],
  sessions: [],
  adminLoginAttempts: [],
  consistencyPreparations: [],
  faces: [],
  sheets: [],
  packs: [],
  credits: [],
  quotePurchases: [],
  orders: [],
  contentReports: [],
  deletionJobs: [],
  playUsage: [],
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

function getCFKV(): any {
  if (typeof globalThis !== 'undefined' && (globalThis as any).STORE_KV) return (globalThis as any).STORE_KV;
  if (typeof process !== 'undefined' && (process.env as any)?.STORE_KV) return (process.env as any).STORE_KV;
  return null;
}

const cfKvDriver: RemoteDriver = {
  backend: 'kv',
  label: 'cloudflare-kv:emotime-store',
  async read() {
    const kv = getCFKV();
    if (!kv) return { raw: null, version: '' };
    const raw = await kv.get('emotime:store');
    return { raw, version: raw ?? '' };
  },
  async cas(_version, _raw, next) {
    const kv = getCFKV();
    if (!kv) return false;
    await kv.put('emotime:store', next);
    return true;
  },
};

/** 어떤 원격 백엔드를 쓸지 동적 결정 (Cloudflare KV 최우선) */
function getDriver(): RemoteDriver | null {
  const cfKv = getCFKV();
  if (cfKv) return cfKvDriver;
  return DRIVER;
}

/** 어떤 원격 백엔드를 쓸지 모듈 로드 시 1회 결정 */
function pickDriver(): RemoteDriver | null {
  const cfKv = getCFKV();
  if (cfKv) return cfKvDriver;
  const forced = (process.env.STORE_BACKEND || 'auto').toLowerCase();
  if (forced === 'file' || forced === 'none' || forced === 'local') return null;
  const fs = hasFirestore() ? firestoreDriver : null;
  const kv = KV_URL && KV_TOKEN ? kvDriver : null;
  if (forced === 'firestore') return fs;
  if (forced === 'kv') return cfKv ?? kv;
  return cfKv ?? fs ?? kv;
}

const DRIVER: RemoteDriver | null = pickDriver();
/** Firestore 로 갈아탈 때 KV 에 남아 있는 스냅샷을 1회 승계하기 위해 보관 */
const HANDOVER_KV: RemoteDriver | null = KV_URL && KV_TOKEN ? kvDriver : null;

export function hasRemoteStore(): boolean {
  return !!getDriver();
}

/** 현재 저장 백엔드 이름 (file | kv | firestore) */
export function storeBackend(): 'file' | 'kv' | 'firestore' {
  return getDriver()?.backend ?? 'file';
}

/** 원격이 최근에 실패했는지 (일정 시간 후 자동 재시도) */
function remoteUsable(): boolean {
  return !!getDriver() && Date.now() >= state.remoteDownUntil;
}

function markRemoteDown(e: unknown) {
  const driver = getDriver();
  state.lastError = (e as Error)?.message ?? `${driver?.backend ?? 'remote'} error`;
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
  shardUpdatedAt?: Record<string, number>;
  deletedIds?: Set<string>;
  imageBindings?: Map<string, string>;
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
  shardUpdatedAt: {},
  deletedIds: new Set<string>(),
  imageBindings: new Map<string, string>(),
};
const state = g.__emotimeStore;
state.shardUpdatedAt ??= {};
state.deletedIds ??= new Set<string>();
state.imageBindings ??= new Map<string, string>();

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
  const driver = getDriver();
  if (driver) {
    return {
      dir: driver.label,
      backend: driver.backend,
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
async function withRemote<T>(fn: (db: DB) => T | Promise<T>, strict = false): Promise<T> {
  const driver = getDriver();
  if (!driver) { if (strict) throw new StoreBusyError(); return fallbackLocal(fn); }

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
      if (strict) throw new StoreBusyError();
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
        // 결제에서는 승계 실패를 빈 데이터베이스로 오인하지 않는다.
        if (strict) throw new StoreBusyError();
        // KV 가 이미 정리됐거나 장애 → 승계 없이 새 저장소로 시작 (다음 요청에서 재시도)
      }
    }

    let db: DB;
    try {
      db = snap.raw ? { ...EMPTY, ...(JSON.parse(snap.raw) as DB) } : { ...EMPTY };
    } catch (e) {
      // 저장값이 깨졌다 → 덮어쓰지 않고 장애로 취급 (데이터 보존 우선)
      markRemoteDown(new Error(`corrupt store: ${(e as Error).message}`));
      if (strict) throw new StoreBusyError();
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
      if (strict) throw new StoreBusyError();
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
  if (getDriver()) state.fallbackWrites += 1;
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

function mergeById<T>(
  localArr: T[],
  remoteArr: T[],
  keyFn: (item: T) => string,
  preferRemote: boolean,
  deleted?: Set<string>,
  mergeItem?: (newer: T, older: T) => T,
): T[] {
  const map = new Map<string, T>();
  const first = preferRemote ? localArr : remoteArr;
  const second = preferRemote ? remoteArr : localArr;
  for (const item of first) {
    const k = keyFn(item);
    if (deleted?.has(k)) continue;
    map.set(k, item);
  }
  for (const item of second) {
    const k = keyFn(item);
    if (deleted?.has(k)) continue;
    const prev = map.get(k);
    map.set(k, prev && mergeItem ? mergeItem(item, prev) : item);
  }
  return Array.from(map.values());
}

async function kvGetSafe(kv: any, key: string): Promise<string | null> {
  try {
    return await withTimeout<string | null>(kv.get(key), 3000);
  } catch {
    return null;
  }
}

async function kvPutSafe(kv: any, key: string, value: string): Promise<void> {
  try {
    await withTimeout(kv.put(key, value), 4000);
  } catch (e) {
    state.lastError = (e as Error)?.message ?? 'kv put error';
  }
}

async function withCloudflareKV<T>(fn: (db: DB) => T | Promise<T>, _strict = false): Promise<T> {
  const kv = getCFKV();
  const shardUpdated = state.shardUpdatedAt!;
  const deleted = state.deletedIds!;
  const imgMap = state.imageBindings!;

  const [rawUsers, rawPrep, rawFaces, rawSheets, rawPacks] = await Promise.all([
    kvGetSafe(kv, 'emotime:shard:users'),
    kvGetSafe(kv, 'emotime:shard:prep'),
    kvGetSafe(kv, 'emotime:shard:faces'),
    kvGetSafe(kv, 'emotime:shard:sheets'),
    kvGetSafe(kv, 'emotime:shard:packs'),
  ]);

  let legacyDB: Partial<DB> | null = null;
  if (!rawUsers && !rawSheets && !state.cache) {
    const legacyRaw = await kvGetSafe(kv, 'emotime:store');
    if (legacyRaw) {
      try { legacyDB = JSON.parse(legacyRaw) as Partial<DB>; } catch { /* ignore */ }
    }
  }

  const parseShard = <S>(raw: string | null): { updatedAt: number; data: S | null } => {
    if (!raw) return { updatedAt: 0, data: null };
    try {
      const parsed = JSON.parse(raw);
      return { updatedAt: Number(parsed?.updatedAt ?? 0), data: parsed?.data ?? null };
    } catch {
      return { updatedAt: 0, data: null };
    }
  };

  const uShard = parseShard<Pick<DB, 'users' | 'accounts' | 'sessions' | 'credits' | 'quotePurchases' | 'orders' | 'contentReports' | 'deletionJobs' | 'playUsage' | 'adminLoginAttempts'>>(rawUsers);
  const pShard = parseShard<Pick<DB, 'consistencyPreparations'>>(rawPrep);
  const fShard = parseShard<Pick<DB, 'faces'>>(rawFaces);
  const sShard = parseShard<Pick<DB, 'sheets'>>(rawSheets);
  const kShard = parseShard<Pick<DB, 'packs' | 'briefs'>>(rawPacks);

  const local = state.cache ?? { ...EMPTY, ...(legacyDB ?? {}) };
  const now = Date.now();

  const uRemoteNewer = uShard.updatedAt > (shardUpdated.users ?? 0);
  const fRemoteNewer = fShard.updatedAt > (shardUpdated.faces ?? 0);
  const sRemoteNewer = sShard.updatedAt > (shardUpdated.sheets ?? 0);
  const kRemoteNewer = kShard.updatedAt > (shardUpdated.packs ?? 0);

  if (uShard.updatedAt > (shardUpdated.users ?? 0)) shardUpdated.users = uShard.updatedAt;
  if (pShard.updatedAt > (shardUpdated.prep ?? 0)) shardUpdated.prep = pShard.updatedAt;
  if (fShard.updatedAt > (shardUpdated.faces ?? 0)) shardUpdated.faces = fShard.updatedAt;
  if (sShard.updatedAt > (shardUpdated.sheets ?? 0)) shardUpdated.sheets = sShard.updatedAt;
  if (kShard.updatedAt > (shardUpdated.packs ?? 0)) shardUpdated.packs = kShard.updatedAt;

  const db: DB = {
    version: Math.max(local.version || 1, 1),
    users: mergeById(local.users ?? [], uShard.data?.users ?? legacyDB?.users ?? [], (x) => x.id, uRemoteNewer),
    accounts: mergeById(local.accounts ?? [], uShard.data?.accounts ?? legacyDB?.accounts ?? [], (x) => x.userId, uRemoteNewer),
    sessions: mergeById(local.sessions ?? [], uShard.data?.sessions ?? legacyDB?.sessions ?? [], (x) => x.tokenHash, uRemoteNewer)
      .filter((s) => Date.parse(s.expiresAt) > now),
    adminLoginAttempts: uRemoteNewer ? (uShard.data?.adminLoginAttempts ?? local.adminLoginAttempts ?? []) : (local.adminLoginAttempts ?? []),
    consistencyPreparations: mergeById(
      local.consistencyPreparations ?? [],
      pShard.data?.consistencyPreparations ?? legacyDB?.consistencyPreparations ?? [],
      (x) => x.tokenHash,
      true,
    ).filter((entry) => entry.expiresAt > now),
    faces: mergeById(local.faces ?? [], fShard.data?.faces ?? legacyDB?.faces ?? [], (x) => x.id, fRemoteNewer, deleted),
    sheets: mergeById(
      local.sheets ?? [],
      sShard.data?.sheets ?? legacyDB?.sheets ?? [],
      (x) => x.id,
      sRemoteNewer,
      deleted,
      (newer, older) => ({
        ...older,
        ...newer,
        chosenKey: newer.chosenKey ?? older.chosenKey,
        variants: newer.variants.map((nv) => {
          const ov = older.variants.find((x) => x.key === nv.key);
          const bound = imgMap.get(`var:${newer.id}:${nv.key}`);
          return { ...ov, ...nv, imageId: bound ?? nv.imageId ?? ov?.imageId };
        }),
      }),
    ),
    packs: mergeById(
      local.packs ?? [],
      kShard.data?.packs ?? legacyDB?.packs ?? [],
      (x) => x.id,
      kRemoteNewer,
      deleted,
      (newer, older) => ({
        ...older,
        ...newer,
        characterReferenceImageId: newer.characterReferenceImageId ?? older.characterReferenceImageId,
        frames: newer.frames.map((nf) => {
          const ofrm = older.frames.find((x) => x.id === nf.id);
          const bound = imgMap.get(`frm:${nf.id}`);
          return { ...ofrm, ...nf, imageId: bound ?? nf.imageId ?? ofrm?.imageId };
        }),
      }),
    ),
    credits: mergeById(local.credits ?? [], uShard.data?.credits ?? legacyDB?.credits ?? [], (x) => x.id, uRemoteNewer),
    quotePurchases: mergeById(local.quotePurchases ?? [], uShard.data?.quotePurchases ?? legacyDB?.quotePurchases ?? [], (x) => x.id, uRemoteNewer),
    orders: mergeById(local.orders ?? [], uShard.data?.orders ?? legacyDB?.orders ?? [], (x) => x.id, uRemoteNewer),
    contentReports: mergeById(local.contentReports ?? [], uShard.data?.contentReports ?? legacyDB?.contentReports ?? [], (x) => x.id, uRemoteNewer),
    deletionJobs: mergeById(local.deletionJobs ?? [], uShard.data?.deletionJobs ?? legacyDB?.deletionJobs ?? [], (x) => x.id, uRemoteNewer),
    playUsage: mergeById(local.playUsage ?? [], uShard.data?.playUsage ?? legacyDB?.playUsage ?? [], (x) => x.id, uRemoteNewer),
    briefs: mergeById(local.briefs ?? [], kShard.data?.briefs ?? legacyDB?.briefs ?? [], (x) => x.date, kRemoteNewer),
    events: (local.events ?? []).slice(-500),
  };

  // 최근 15분 이내 생성된 시트/팩에서 병렬 렌더링된 개별 이미지 바인딩을 KV에서 보강한다
  const pendingLookups: Promise<void>[] = [];
  for (const s of db.sheets.slice(-5)) {
    if (now - Date.parse(s.createdAt) > 15 * 60_000) continue;
    for (const v of s.variants) {
      const memImg = imgMap.get(`var:${s.id}:${v.key}`);
      if (memImg && !v.imageId) v.imageId = memImg;
      if (!v.imageId && !imgMap.has(`miss:var:${s.id}:${v.key}`)) {
        pendingLookups.push(
          kvGetSafe(kv, `emotime:var:${s.id}:${v.key}`).then((id) => {
            if (id) {
              v.imageId = id;
              imgMap.set(`var:${s.id}:${v.key}`, id);
            }
          }),
        );
      }
    }
  }
  for (const p of db.packs.slice(-3)) {
    if (now - Date.parse(p.createdAt) > 15 * 60_000) continue;
    for (const f of p.frames) {
      const memImg = imgMap.get(`frm:${f.id}`);
      if (memImg && !f.imageId) f.imageId = memImg;
      if (!f.imageId) {
        pendingLookups.push(
          kvGetSafe(kv, `emotime:frm:${f.id}`).then((id) => {
            if (id) {
              f.imageId = id;
              imgMap.set(`frm:${f.id}`, id);
            }
          }),
        );
      }
    }
  }
  if (pendingLookups.length > 0) await Promise.all(pendingLookups);

  const snapUsers = () => JSON.stringify({ users: db.users, accounts: db.accounts, sessions: db.sessions, credits: db.credits, quotePurchases: db.quotePurchases, orders: db.orders, contentReports: db.contentReports, deletionJobs: db.deletionJobs, playUsage: db.playUsage, adminLoginAttempts: db.adminLoginAttempts });
  const snapPrep = () => JSON.stringify({ consistencyPreparations: db.consistencyPreparations });
  const snapFaces = () => JSON.stringify({ faces: db.faces });
  const snapSheets = () => JSON.stringify({ sheets: db.sheets });
  const snapPacks = () => JSON.stringify({ packs: db.packs, briefs: db.briefs });

  const bUsers = snapUsers();
  const bPrep = snapPrep();
  const bFaces = snapFaces();
  const bSheets = snapSheets();
  const bPacks = snapPacks();

  const prevSheetIds = new Set(db.sheets.map((s) => s.id));
  const prevPackIds = new Set(db.packs.map((p) => p.id));
  const prevFaceIds = new Set(db.faces.map((f) => f.id));
  const prevVarImgs = new Map<string, string>();
  for (const s of db.sheets) for (const v of s.variants) if (v.imageId) prevVarImgs.set(`${s.id}:${v.key}`, v.imageId);
  const prevFrmImgs = new Map<string, string>();
  for (const p of db.packs) for (const f of p.frames) if (f.imageId) prevFrmImgs.set(f.id, f.imageId);

  const result = await fn(db);

  const curSheetIds = new Set(db.sheets.map((s) => s.id));
  const curPackIds = new Set(db.packs.map((p) => p.id));
  const curFaceIds = new Set(db.faces.map((f) => f.id));
  for (const id of prevSheetIds) if (!curSheetIds.has(id)) deleted.add(id);
  for (const id of prevPackIds) if (!curPackIds.has(id)) deleted.add(id);
  for (const id of prevFaceIds) if (!curFaceIds.has(id)) deleted.add(id);

  const writes: Promise<void>[] = [];
  for (const s of db.sheets) {
    for (const v of s.variants) {
      if (v.imageId && prevVarImgs.get(`${s.id}:${v.key}`) !== v.imageId) {
        imgMap.set(`var:${s.id}:${v.key}`, v.imageId);
        writes.push(kvPutSafe(kv, `emotime:var:${s.id}:${v.key}`, v.imageId));
      }
    }
  }
  for (const p of db.packs) {
    for (const f of p.frames) {
      if (f.imageId && prevFrmImgs.get(f.id) !== f.imageId) {
        imgMap.set(`frm:${f.id}`, f.imageId);
        writes.push(kvPutSafe(kv, `emotime:frm:${f.id}`, f.imageId));
      }
    }
  }

  const writeTime = Date.now();
  const aUsers = snapUsers();
  const aPrep = snapPrep();
  const aFaces = snapFaces();
  const aSheets = snapSheets();
  const aPacks = snapPacks();

  if (aUsers !== bUsers || (!rawUsers && legacyDB)) {
    shardUpdated.users = writeTime;
    writes.push(kvPutSafe(kv, 'emotime:shard:users', JSON.stringify({ updatedAt: writeTime, data: JSON.parse(aUsers) })));
  }
  if (aPrep !== bPrep || (!rawPrep && legacyDB)) {
    shardUpdated.prep = writeTime;
    writes.push(kvPutSafe(kv, 'emotime:shard:prep', JSON.stringify({ updatedAt: writeTime, data: JSON.parse(aPrep) })));
  }
  if (aFaces !== bFaces || (!rawFaces && legacyDB)) {
    shardUpdated.faces = writeTime;
    writes.push(kvPutSafe(kv, 'emotime:shard:faces', JSON.stringify({ updatedAt: writeTime, data: JSON.parse(aFaces) })));
  }
  if (aSheets !== bSheets || (!rawSheets && legacyDB)) {
    shardUpdated.sheets = writeTime;
    writes.push(kvPutSafe(kv, 'emotime:shard:sheets', JSON.stringify({ updatedAt: writeTime, data: JSON.parse(aSheets) })));
  }
  if (aPacks !== bPacks || (!rawPacks && legacyDB)) {
    shardUpdated.packs = writeTime;
    writes.push(kvPutSafe(kv, 'emotime:shard:packs', JSON.stringify({ updatedAt: writeTime, data: JSON.parse(aPacks) })));
  }

  state.cache = db;
  state.mode = 'remote';
  state.remoteDownUntil = 0;
  state.lastError = null;

  if (writes.length > 0) {
    await Promise.all(writes);
  }
  return result;
}

/** 모든 읽기/쓰기는 이 함수를 통과 → 직렬화된 단일 트랜잭션 */
export function withDB<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  if (getCFKV()) {
    return withCloudflareKV(fn, false);
  }
  const run = state.chain.then(async () => {
    if (remoteUsable()) return withRemote(fn);
    return fallbackLocal(fn);
  });
  state.chain = run.catch(() => undefined);
  return run;
}

/** 결제·원장은 원격 CAS 실패 시 절대 로컬/메모리로 폴백하지 않는다. */
export function withPaymentDB<T>(fn: (db: DB) => T): Promise<T> {
  if (getCFKV()) {
    return withCloudflareKV(fn, true);
  }
  const run = state.chain.then(async () => {
    if (getDriver()) return withRemote(fn, true);
    // 단일 프로세스 로컬 개발 외에는 파일 저장소를 결제에 사용하지 않는다.
    if (process.env.NODE_ENV === 'production') throw new StoreBusyError();
    const db = structuredClone(await load());
    const result = fn(db);
    await save(db);
    if (state.mode !== 'persistent') throw new StoreBusyError();
    state.cache = db;
    return result;
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
