import assert from 'node:assert/strict';
import { rng } from '../src/lib/art/sticker';
import { composePackTemplates, slotOf } from '../src/lib/recommend/engine';
import { TEMPLATES, type SituationTemplate, type Slot } from '../src/lib/recommend/templates';
import type { Emotion } from '../src/lib/types';

// 기존 구현을 기준으로 점수 동률·셔플 순서까지 비교한다.
function original(size: number, now: Date, recentIds: string[]) {
  const slot = slotOf(now);
  const recent = new Set(recentIds);
  const rand = rng(Math.floor(now.getTime() / 60000) % 2147483647);
  const shuffle = <T>(arr: T[]) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const score = (t: SituationTemplate, current: Slot) =>
    t.weight + (t.slot === current ? 8 : t.slot === 'any' ? 2 : 0) - (recent.has(t.id) ? 4 : 0);
  const picked: SituationTemplate[] = [];
  const counts = new Map<Emotion, number>();
  const max = Math.max(2, Math.ceil(size / 5));
  const take = (pool: SituationTemplate[], limit: number) => {
    for (const t of shuffle(pool).sort((a, b) => score(b, slot) - score(a, slot))) {
      if (picked.length >= limit) break;
      if (picked.some((p) => p.id === t.id)) continue;
      const count = counts.get(t.emotion) ?? 0;
      if (count >= max) continue;
      picked.push(t);
      counts.set(t.emotion, count + 1);
    }
  };
  take(TEMPLATES.filter((t) => t.evergreen), Math.max(2, Math.round(size * 0.25)));
  take(TEMPLATES.filter((t) => !t.evergreen && (t.slot === slot || t.slot === 'any')), size);
  if (picked.length < size) take(TEMPLATES.filter((t) => !t.evergreen), size);
  if (picked.length < size) take(TEMPLATES, size);
  return picked.slice(0, size);
}

for (const hour of [0, 5, 11, 18, 22]) {
  for (const size of [0, 1, 12, 24, 32, 150]) {
    for (const recent of [[], TEMPLATES.slice(0, 25).map((t) => t.id)]) {
      const now = new Date(`2026-11-24T${String(hour).padStart(2, '0')}:00:00+09:00`);
      assert.deepEqual(composePackTemplates(size, now, recent), original(size, now, recent));
    }
  }
}
console.log('추천 엔진 최적화 전후 결과 60개 조합 일치');
