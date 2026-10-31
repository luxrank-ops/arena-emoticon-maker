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
export type StoreMode = 'persistent' | 'ephemeral' | 'memory';

interface StoreGlobal {
  cache: DB | null;
  chain: Promise<unknown>;
  loaded: boolean;
  dir: string | null;
  mode: StoreMode;
  resolved: Promise<string | null> | null;
  lastError: string | null;
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
    state.lastError = null;
  } catch (e) {
    state.lastError = (e as Error).message;
    if (state.mode === 'persistent') state.mode = 'memory';
  }
}

/** 모든 읽기/쓰기는 이 함수를 통과 → 직렬화된 단일 트랜잭션 */
export function withDB<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = state.chain.then(async () => {
    const db = await load();
    const result = await fn(db);
    await save(db);
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
