import type { Emotion } from '@/lib/types';
import { rng } from '@/lib/art/sticker';
import { kstHour, kstParts, kstWeekdayLabel } from '@/lib/time';
import { TEMPLATES, TEMPLATES_BY_ID, type SituationTemplate, type Slot } from './templates';

// ─────────────────────────────────────────────────────────────
// 추천 엔진 — 팩 구성 / 톡 답장 / 데일리 브리핑
// 외부 API 호출 없이 결정적으로 동작 (지연 0, 원가 0)
// ─────────────────────────────────────────────────────────────

export function slotOf(d: Date): Slot {
  // 서버가 UTC 로 돌아도 KST 기준 시간대를 쓴다 (아침/한낮/저녁/밤)
  const h = kstHour(d);
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 18) return 'work';
  if (h >= 18 && h < 22) return 'evening';
  return 'night';
}

const SLOT_LABEL: Record<Slot, string> = {
  morning: '아침',
  work: '한낮',
  evening: '저녁',
  night: '밤',
  any: '하루',
};

function score(t: SituationTemplate, slot: Slot, recent: Set<string>) {
  let s = t.weight;
  if (t.slot === slot) s += 8;
  else if (t.slot === 'any') s += 2;
  if (recent.has(t.id)) s -= 4;
  return s;
}

/** 팩 구성: 만능 컷 25% + 상황 컷 + 감정 다양성 보정 */
export function composePackTemplates(size: number, now = new Date(), recentIds: string[] = []): SituationTemplate[] {
  const slot = slotOf(now);
  const recent = new Set(recentIds);
  const rand = rng(Math.floor(now.getTime() / 60000) % 2147483647);
  const shuffle = <T,>(arr: T[]) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const evergreenCount = Math.max(2, Math.round(size * 0.25));
  const picked: SituationTemplate[] = [];
  const emotionCount = new Map<Emotion, number>();
  const maxPerEmotion = Math.max(2, Math.ceil(size / 5));

  const take = (pool: SituationTemplate[], limit: number) => {
    const sorted = shuffle(pool).sort((a, b) => score(b, slot, recent) - score(a, slot, recent));
    for (const t of sorted) {
      if (picked.length >= limit) break;
      if (picked.some((p) => p.id === t.id)) continue;
      const c = emotionCount.get(t.emotion) ?? 0;
      if (c >= maxPerEmotion) continue;
      picked.push(t);
      emotionCount.set(t.emotion, c + 1);
    }
  };

  take(TEMPLATES.filter((t) => t.evergreen), evergreenCount);
  take(TEMPLATES.filter((t) => !t.evergreen && (t.slot === slot || t.slot === 'any')), size);
  if (picked.length < size) take(TEMPLATES.filter((t) => !t.evergreen), size);
  if (picked.length < size) take(TEMPLATES, size);

  return picked.slice(0, size);
}

// ── 톡 붙여넣기 → 답장 3종 ───────────────────────────────────

export interface ReplyCandidate {
  templateId: string;
  emotion: Emotion;
  line: string;
  why: string;
  intensity: number;
  prop: string;
  background: string;
}

export interface ReplyResult {
  mood: Emotion;
  moodLabel: string;
  confidence: number;
  cues: string[];
  candidates: ReplyCandidate[];
}

const MOOD_RULES: { mood: Emotion; label: string; words: string[] }[] = [
  { mood: 'king', label: '킹받음/분노', words: ['화나', '짜증', '킹받', '열받', '빡치', '빡쳐', '어이없', '최악', '개짜'] },
  { mood: 'sad', label: '슬픔/위로 필요', words: ['슬퍼', '우울', '속상', 'ㅠㅠ', 'ㅜㅜ', '힘들', '외로', '눈물'] },
  { mood: 'love', label: '애정/설렘', words: ['사랑', '보고싶', '좋아해', '설레', '심쿵', '하트', '♥'] },
  { mood: 'laugh', label: '웃김/유쾌', words: ['ㅋㅋ', '웃겨', '빵터', '개웃', '실화', '레전드', '미쳤'] },
  { mood: 'sulk', label: '서운함/삐짐', words: ['삐졌', '서운', '섭섭', '그러니까', '왜이래'] },
  { mood: 'tired', label: '지침/야근', words: ['지쳐', '피곤', '졸려', '야근', '힘드', '번아웃'] },
  { mood: 'surprised', label: '놀람/헉', words: ['헐', '대박', '진짜?', '충격', '뭐야', '말도안'] },
  { mood: 'joy', label: '기쁨/긍정', words: ['좋아', '행복', '신나', '최고', '완전 좋'] },
  { mood: 'smug', label: '뿌듯/칭찬', words: ['잘했', '멋지', '대단', '칭찬', '고생했'] },
];

/** 감정별 1순위 템플릿 — 룰 기반 추천의 정확도를 지탱하는 손으로 고른 매핑 */
const MOOD_PREFERRED: Record<string, string[]> = {
  king: ['t-king', 't-why', 't-hmph'],
  angry: ['t-why', 't-king', 't-hmph'],
  sad: ['t-cryy', 't-hug', 't-cheer'],
  cry: ['t-cryy', 't-hug', 't-cheer'],
  love: ['t-loveyou', 't-miss', 't-thumb'],
  laugh: ['t-lol', 't-omg', 't-hbd'],
  sulk: ['t-sulk2', 't-sorry', 't-hmph'],
  tired: ['t-sigh', 't-zzz', 't-quit'],
  surprised: ['t-wow', 't-gasp', 't-deadline'],
  joy: ['t-ok', 't-good', 't-thx'],
  smug: ['t-thumb', 't-clap', 't-tsun'],
  blank: ['t-hmm', 't-no', 't-done'],
};

const INTENT_RULES: { intent: string; words: string[]; templateIds: string[] }[] = [
  { intent: '사과', words: ['미안', '사과', '잘못', 'sorry'], templateIds: ['t-sorry', 't-please', 't-sulk2'] },
  { intent: '감사', words: ['고마', '감사', '땡큐'], templateIds: ['t-thx', 't-hug', 't-thumb'] },
  { intent: '부탁', words: ['부탁', '해줘', '제발', '도와'], templateIds: ['t-please', 't-ok', 't-thumb'] },
  { intent: '거절', words: ['안돼', '못해', '싫어', '어려울'], templateIds: ['t-no', 't-hmm', 't-sorry'] },
  { intent: '축하', words: ['축하', '생일', '합격', '승진'], templateIds: ['t-hbd', 't-cong', 't-clap'] },
  { intent: '약속', words: ['몇 시', '언제', '만나', '약속'], templateIds: ['t-ok', 't-good', 't-late'] },
  { intent: '식사', words: ['밥', '점심', '저녁', '먹'], templateIds: ['t-lunch', 't-hungry', 't-chicken'] },
  { intent: '업무', words: ['회의', '보고', '마감', '메일', '자료'], templateIds: ['t-meeting', 't-deadline', 't-overtime'] },
  { intent: '안부', words: ['안녕', '뭐해', '잘 지내'], templateIds: ['t-hi', 't-ok', 't-lol'] },
];

export function analyzeConversation(raw: string): ReplyResult {
  const text = raw.toLowerCase().replace(/\s+/g, ' ');
  const cues: string[] = [];

  let bestMood: { mood: Emotion; label: string; score: number } = { mood: 'joy', label: '기쁨/긍정', score: 0 };
  for (const rule of MOOD_RULES) {
    const hits = rule.words.filter((w) => text.includes(w));
    if (hits.length > 0) cues.push(`감정 신호: ${hits.join(', ')}`);
    if (hits.length > bestMood.score) bestMood = { mood: rule.mood, label: rule.label, score: hits.length };
  }

  let bestIntent: { intent: string; ids: string[]; score: number } = { intent: '일상', ids: [], score: 0 };
  for (const rule of INTENT_RULES) {
    const hits = rule.words.filter((w) => text.includes(w));
    if (hits.length > 0) cues.push(`상황 신호: ${rule.intent}(${hits[0]})`);
    if (hits.length > bestIntent.score) bestIntent = { intent: rule.intent, ids: rule.templateIds, score: hits.length };
  }

  const intentPool: SituationTemplate[] = [];
  for (const id of bestIntent.ids) {
    const t = TEMPLATES_BY_ID[id];
    if (t) intentPool.push(t);
  }

  // 감정이 강하게 잡히면 그 감정을 먼저 보여준다 (사용자는 '상황'보다 '감정'에 반응한다)
  //  · emotion 만으로 고르면 'ㅠㅠ' → '배고파아'(t-hungry·emotion=sad) 같은 오답이 나온다.
  //    감정별 우선 템플릿(MOOD_PREFERRED)을 먼저 쓰고, 부족하면 같은 emotion 으로 채운다.
  const preferred = (MOOD_PREFERRED[bestMood.mood] ?? [])
    .map((id) => TEMPLATES_BY_ID[id])
    .filter(Boolean);
  const sameEmotion = TEMPLATES.filter((t) => t.emotion === bestMood.mood).sort((a, b) => b.weight - a.weight);
  const moodTemplates = [...preferred, ...sameEmotion.filter((t) => !preferred.some((p) => p.id === t.id))];
  const pool: SituationTemplate[] =
    bestMood.score >= 1 ? [...moodTemplates.slice(0, 3), ...intentPool] : [...intentPool, ...moodTemplates];
  const deduped = pool.filter((t, i) => pool.findIndex((x) => x.id === t.id) === i);
  pool.length = 0;
  pool.push(...deduped);

  const uniquePool = pool.filter((t, i) => pool.findIndex((x) => x.id === t.id) === i);
  const candidates: ReplyCandidate[] = uniquePool.slice(0, 3).map((t, i) => ({
    templateId: t.id,
    emotion: t.emotion,
    line: t.line,
    why:
      i === 0
        ? `${bestIntent.intent} 상황 + 상대 감정(${bestMood.label})에 가장 정확`
        : i === 1
          ? '톤을 부드럽게 낮춘 대안'
          : '분위기를 바꾸는 리액션 카드',
    intensity: t.emotion === 'king' ? 92 : t.emotion === 'laugh' ? 84 : 62,
    prop: t.category === 'food' ? 'coffee' : t.category === 'work' ? 'laptop' : t.emotion === 'love' ? 'heart' : 'none',
    background: t.emotion === 'king' ? 'pink' : t.emotion === 'sad' || t.emotion === 'cry' ? 'sky' : 'cream',
  }));

  // 후보가 3개 미만이면 만능 컷으로 채움
  const fillers = ['t-ok', 't-lol', 't-thx', 't-wow'];
  for (const id of fillers) {
    if (candidates.length >= 3) break;
    const t = TEMPLATES_BY_ID[id];
    if (t && !candidates.some((c) => c.templateId === id)) {
      candidates.push({
        templateId: id,
        emotion: t.emotion,
        line: t.line,
        why: '어디에나 안전한 만능 컷',
        intensity: 60,
        prop: 'none',
        background: 'cream',
      });
    }
  }

  const total = bestMood.score + bestIntent.score;
  return {
    mood: bestMood.mood,
    moodLabel: bestMood.label,
    confidence: Math.min(0.96, 0.42 + total * 0.12),
    cues: cues.slice(0, 4),
    candidates: candidates.slice(0, 3),
  };
}

// ── Daily Face Brief ─────────────────────────────────────────

export interface BriefPlan {
  headline: string;
  items: { templateId: string; label: string; reason: string; emotion: Emotion; line: string }[];
}

export function planBrief(now = new Date(), recentIds: string[] = []): BriefPlan {
  const slot = slotOf(now);
  const wd = kstWeekdayLabel(now);
  const wdIndex = kstParts(now).weekday;
  const picked = composePackTemplates(8, now, recentIds);
  const reasons: Record<Slot, string[]> = {
    morning: ['출근길에 바로 쓰는 컷', '아침 인사용', '커피 타임'],
    work: ['회의 중 리액션', '점심 메뉴 정할 때', '업무 답장용'],
    evening: ['퇴근 인증', '저녁 약속 잡기', '오늘 하루 마무리'],
    night: ['야식 얘기', '잘 자 인사', '내일 걱정 대신'],
    any: ['언제든 쓰는 만능 컷', '리액션용', '답장용'],
  };
  const pool = reasons[slot];
  const headline =
    wdIndex === 5
      ? `${wd}요일 ${SLOT_LABEL[slot]} — 퇴근 컷 먼저 챙겼어요`
      : wdIndex === 1
        ? `${wd}요일 ${SLOT_LABEL[slot]} — 월요일 생존 세트`
        : `${wd}요일 ${SLOT_LABEL[slot]} — 오늘 쓸 8컷`;
  return {
    headline,
    items: picked.map((t, i) => ({
      templateId: t.id,
      label: t.label,
      reason: pool[i % pool.length] + (recentIds.includes(t.id) ? ' · 최근 안 쓴 컷' : ''),
      emotion: t.emotion,
      line: t.line,
    })),
  };
}
