import { z } from 'zod';
import { handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { analyzeConversation } from '@/lib/recommend/engine';
import { specFor } from '@/lib/spec';
import { logEvent, withDB } from '@/lib/store';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/ratelimit';

const schema = z.object({ text: z.string().min(2).max(1200) });

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const limited = enforceRateLimit(user.id, 'reply', RATE_LIMITS.reply);
    if (limited) return limited;
    const { text } = schema.parse(await req.json());
    const result = analyzeConversation(text);
    const seedBase = Date.now() % 100000;

    const candidates = await Promise.all(
      result.candidates.map(async (c, i) => ({
        ...c,
        spec: await specFor(user.id, {
          emotion: c.emotion,
          line: c.line,
          intensity: c.intensity,
          prop: c.prop,
          background: c.background,
          seed: seedBase + i * 29,
          templateId: c.templateId,
        }),
      })),
    );

    await withDB((db) => logEvent(db, user.id, 'reply_used', { mood: result.mood, candidates: candidates.length }));
    return ok({ result: { ...result, candidates }, latencyNote: '생성 API 호출 0회 · 표정 뱅크 재조합' });
  } catch (e) {
    return handleError(e);
  }
}
