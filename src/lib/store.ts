import fs from 'node:fs/promises';
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

const DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data');
const FILE = path.join(DIR, 'store.json');

interface StoreGlobal {
  cache: DB | null;
  chain: Promise<unknown>;
  loaded: boolean;
}
const g = globalThis as unknown as { __emotimeStore?: StoreGlobal };
g.__emotimeStore ??= { cache: null, chain: Promise.resolve(), loaded: false };
const state = g.__emotimeStore;

async function load(): Promise<DB> {
  if (state.loaded && state.cache) return state.cache;
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw) as DB;
    state.cache = { ...EMPTY, ...parsed };
  } catch {
    state.cache = { ...EMPTY };
  }
  state.loaded = true;
  return state.cache;
}

async function save(db: DB) {
  await fs.mkdir(DIR, { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db));
  await fs.rename(tmp, FILE);
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
