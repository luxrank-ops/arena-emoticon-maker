#!/usr/bin/env node
// 주간 운영 리포트 생성기 (Step 3: 자동 개선 루프의 입력)
// 사용: node scripts/ops-report.mjs
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join(process.cwd(), '.data', 'store.json');
if (!fs.existsSync(FILE)) {
  console.error('저장소가 없습니다. 먼저 앱을 실행해 데이터를 만드세요.');
  process.exit(1);
}
const db = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const paid = db.orders.filter((o) => o.status === 'PAID');
const revenue = paid.reduce((s, o) => s + o.amount, 0);
const sub = paid.filter((o) => o.kind === 'subscription').reduce((s, o) => s + o.amount, 0);
const goods = paid.filter((o) => o.kind === 'goods').reduce((s, o) => s + o.amount, 0);
const frames = db.packs.reduce((s, p) => s + p.frames.length, 0);
const aiCost = frames * 54;
const paying = new Set(paid.filter((o) => o.kind === 'subscription').map((o) => o.userId));
const conversion = db.users.length ? ((paying.size / db.users.length) * 100).toFixed(1) : '0.0';
const errors = db.events.filter((e) => e.type === 'error');
const replies = db.events.filter((e) => e.type === 'reply_used').length;
const packs = db.packs.length;
const topFrames = db.packs
  .flatMap((p) => p.frames)
  .sort((a, b) => b.usageCount - a.usageCount)
  .slice(0, 5);

const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) : '0.0');
const ideas = [];
if (errors.length) ideas.push(`오류 ${errors.length}건 — 상위 스코프: ${[...new Set(errors.map((e) => e.meta?.scope ?? 'unknown'))].join(', ')}`);
if (replies === 0) ideas.push('Chat-to-Sticker 사용 로그가 없습니다. 온보딩 마지막 단계에 진입점을 배치하세요.');
if (Number(conversion) < 3) ideas.push(`무료→유료 전환 ${conversion}% — 3% 미만. 시트 선택 후 첫 팩 성공률을 확인하세요.`);
if (frames > 0 && aiCost / Math.max(1, revenue) > 0.2) ideas.push('AI 원가 비중 20% 초과 — 캐시 히트율과 재조합 경로를 점검하세요.');
if (!ideas.length) ideas.push('지표 이상 없음. 다음 실험: 커플 팩 초대 루프 A/B.');

const md = `# 이모티미 운영 리포트 — ${new Date().toISOString().slice(0, 10)}

## 핵심 지표
| 지표 | 값 |
| --- | --- |
| 사용자 | ${db.users.length}명 |
| 팩 생성 | ${packs}개 (${frames}컷) |
| 무료→유료 전환 | ${conversion}% (${paying.size}명) |
| 누적 매출 | ${revenue.toLocaleString('ko-KR')}원 (구독 ${sub.toLocaleString('ko-KR')} / 굿즈 ${goods.toLocaleString('ko-KR')}) |
| AI 원가(추정) | ${aiCost.toLocaleString('ko-KR')}원 (매출 대비 ${pct(aiCost, revenue)}%) |
| 총마진(추정) | ${pct(revenue - aiCost, revenue)}% |
| 답장 추천 사용 | ${replies}회 |
| 오류 이벤트 | ${errors.length}건 |

## 플랜 분포
${Object.entries(db.users.reduce((m, u) => ({ ...m, [u.plan]: (m[u.plan] ?? 0) + 1 }), {}))
  .map(([k, v]) => `- ${k}: ${v}명`)
  .join('\n')}

## 가장 많이 쓰인 컷
${topFrames.length ? topFrames.map((f) => `- ${f.label} “${f.line}” — ${f.usageCount}회`).join('\n') : '- 아직 사용 로그 없음'}

## 개선 제안 (자동 생성)
${ideas.map((i) => `- ${i}`).join('\n')}

---
생성: scripts/ops-report.mjs · 원본: .data/store.json
`;
fs.mkdirSync('reports', { recursive: true });
const out = path.join('reports', `ops-${new Date().toISOString().slice(0, 10)}.md`);
fs.writeFileSync(out, md);
console.log(md);
console.log(`\n저장: ${out}`);
