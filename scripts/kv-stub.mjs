#!/usr/bin/env node
// 로컬 KV 스텁 — Upstash/Vercel KV REST 프로토콜의 최소 구현 (개발·검증용)
//   node scripts/kv-stub.mjs 4500
//   KV_REST_API_URL=http://127.0.0.1:4500 KV_REST_API_TOKEN=stub npm run dev
// 지원: GET / SET / DEL / EVAL(CAS 스크립트) · GET /__dump 로 저장 상태 확인
import http from 'node:http';

const store = new Map();
const PORT = Number(process.argv[2] ?? 4500);

function handle(cmd) {
  const [op, ...args] = cmd;
  switch (String(op).toUpperCase()) {
    case 'GET':
      return { result: store.has(args[0]) ? store.get(args[0]) : null };
    case 'SET':
      store.set(args[0], args[1]);
      return { result: 'OK' };
    case 'DEL':
      store.delete(args[0]);
      return { result: 1 };
    case 'EVAL': {
      // CAS 스크립트: KEYS[1], ARGV[1](기대 원문), ARGV[2](새 원문)
      const [, , key, expected, next] = args;
      const cur = store.has(key) ? store.get(key) : '';
      if (cur === expected) {
        store.set(key, next);
        return { result: 1 };
      }
      return { result: 0 };
    }
    default:
      return { error: `unknown command ${op}` };
  }
}

http
  .createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/__dump') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(Object.fromEntries(store)));
      return;
    }
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let cmd;
      try {
        cmd = JSON.parse(body || '[]');
      } catch {
        res.statusCode = 400;
        res.end('{"error":"bad json"}');
        return;
      }
      console.log('cmd', JSON.stringify(cmd).slice(0, 80));
      const out = handle(cmd);
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(out));
    });
  })
  .listen(PORT, '0.0.0.0', () => console.log(`kv stub on ${PORT}`));
