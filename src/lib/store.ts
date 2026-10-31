import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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

// ── 원격 KV (선택) ─────────────────────────────────────────────
// Vercel KV / Upstash Redis REST. 설정돼 있으면 파일 저장소보다 우선한다.
// (서버리스에서 /tmp 는 인스턴스 로컬이라 세션·주문이 인스턴스 간 공유되지 않는다)
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const KV_KEY = process.env.KV_STORE_KEY || 'emotime:store';
const KV_TIMEOUT_MS = 4000;

export function hasRemoteStore(): boolean {
  return !!KV_URL && !!KV_TOKEN;
}

/** 원격이 최근에 실패했는지 (일정 시간 후 자동 재시도) */
function remoteUsable(): boolean {
  return hasRemoteStore() && Date.now() >= state.remoteDownUntil;
}

function markRemoteDown(e: unknown) {
  state.lastError = (e as Error)?.message ?? 'kv error';
  state.remoteDownUntil = Date.now() + 15_000;
}

/** 원격 저장소 호출 (Upstash REST 프로토콜) */
async function kv(command: unknown[], path = ''): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), KV_TIMEOUT_MS);
  try {
    const res = await fetch(`${KV_URL}${path}`, {
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

/** 현재 저장된 원문(없으면 null) */
async function kvRaw(): Promise<string | null> {
  const r = await kv(['GET', KV_KEY]);
  return typeof r === 'string' ? r : null;
}

/**
 * 원문이 그대로일 때만 교체 (compare-and-set).
 *  · 멀티 인스턴스에서 동시에 써도 한쪽이 덮어써 잃어버리는 일이 없게 한다.
 */
const CAS_SCRIPT = `local cur = redis.call('GET', KEYS[1])
if (cur == false) then cur = '' end
if cur == ARGV[1] then redis.call('SET', KEYS[1], ARGV[2]) return 1 else return 0 end`;

async function kvCas(expectedRaw: string, nextRaw: string): Promise<boolean> {
  const r = await kv(['EVAL', CAS_SCRIPT, '1', KV_KEY, expectedRaw, nextRaw]);
  return Number(r) === 1;
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
export function storeStatus(): { dir: string | null; mode: StoreMode; lastError: string | null } {
  if (hasRemoteStore()) {
    return {
      dir: `kv:${KV_KEY}`,
      // 원격 장애로 파일/메모리로 내려간 상태는 degraded(memory)로 알린다
      mode: remoteUsable() ? 'remote' : 'memory',
      lastError: state.lastError,
    };
  }
  return { dir: state.dir, mode: state.mode, lastError: state.lastError };
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
 * 원격 KV 트랜잭션: 읽기 → fn → CAS 저장.
 *  · 인프라 오류(KV 통신/파싱)만 파일·메모리로 폴백한다.
 *  · **fn 이 던진 오류는 그대로 전파**한다 — 업무 오류(한도 초과·404 등)를 저장소 장애로
 *    오인하면 멀쩡한 KV 를 15초간 버리고 파일 스냅샷으로 덮어써 데이터가 사라진다.
 *  · CAS 충돌 시 최신 스냅샷으로 fn 을 다시 적용한다 (fn 은 부수효과 없는 순수 함수여야 한다).
 */
async function withRemote<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    let raw: string | null;
    try {
      raw = await kvRaw();
    } catch (e) {
      // 인프라 장애 → 잠시 파일/메모리로 서비스 (자동 복구)
      markRemoteDown(e);
      return fallbackLocal(fn);
    }

    let db: DB;
    try {
      db = raw ? { ...EMPTY, ...(JSON.parse(raw) as DB) } : { ...EMPTY };
    } catch (e) {
      // 저장값이 깨졌다 → 덮어쓰지 않고 장애로 취급 (데이터 보존 우선)
      markRemoteDown(new Error(`corrupt store: ${(e as Error).message}`));
      return fallbackLocal(fn);
    }

    // 업무 오류는 여기서 그대로 던져 나간다 (폴백 없음)
    const result = await fn(db);
    const next = JSON.stringify(db);

    try {
      if (await kvCas(raw ?? '', next)) {
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

  // 5회 모두 충돌: 최신본에 한 번 더 적용한 뒤 마지막 쓰기 승자 방식으로 저장 (파일로 새지 않게)
  state.lastError = 'kv conflict: concurrent writes';
  try {
    const raw = await kvRaw();
    const db: DB = raw ? { ...EMPTY, ...(JSON.parse(raw) as DB) } : { ...EMPTY };
    const result = await fn(db);
    await kv(['SET', KV_KEY, JSON.stringify(db)]);
    return result;
  } catch (e) {
    markRemoteDown(e);
    return fallbackLocal(fn);
  }
}

/** 원격 장애 시에만 쓰는 로컬 경로 (파일 → 메모리) */
async function fallbackLocal<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const db = await load();
  const result = await fn(db);
  await save(db);
  return result;
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
