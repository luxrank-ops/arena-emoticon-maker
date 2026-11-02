import { z } from 'zod';
import { handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { analyzeConversation } from '@/lib/recommend/engine';
import { findAiCut } from '@/lib/ai-cuts';
import { logEvent, withDB } from '@/lib/store';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';

const schema = z.object({ text: z.string().min(2).max(1200) });

/**
 * POST /api/reply
 * 대화를 분석해 답장 후보 3개를 고른다. 각 후보는 내 AI 팩에서 맞는 컷 이미지를 붙인다.
 * 맞는 컷이 아직 없으면 cut 은 null (화면에서 안내한다).
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'reply', RATE_LIMITS.reply);
    if (limited) return limited;
    const { text } = schema.parse(await req.json());
    const result = analyzeConversation(text);

    const candidates = await withDB((db) =>
      result.candidates.map((c) => ({
        ...c,
        cut: findAiCut(db, user.id, { templateId: c.templateId, emotion: c.emotion }),
      })),
    );

    await withDB((db) => logEvent(db, user.id, 'reply_used', { mood: result.mood, candidates: candidates.length }));
    return ok({ result: { ...result, candidates }, latencyNote: '생성 API 호출 0회 · 내 AI 컷 재사용' });
  } catch (e) {
    return handleError(e);
  }
}
