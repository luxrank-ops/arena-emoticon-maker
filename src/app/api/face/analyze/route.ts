import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/session';
import { logEvent, uid, withDB } from '@/lib/store';

const schema = z.object({
  palette: z.object({
    skin: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    skinShade: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    hair: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    shirt: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  signature: z.object({
    headScale: z.number(), faceWidth: z.number(), eyeSpacing: z.number(), eyeSize: z.number(),
    browWeight: z.number(), mouthWidth: z.number(), hairStyle: z.number(), cheek: z.number(), glasses: z.boolean(),
  }),
  metrics: z.object({
    coverage: z.number(), centering: z.number(), brightness: z.number(), sharpness: z.number(), faceDetected: z.boolean(),
  }),
  consent: z.object({ accepted: z.literal(true), version: z.string().max(20), overseas: z.literal(true) }),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = schema.parse(await req.json());
    const id = uid('face');
    const now = new Date();
    const purgeAfter = new Date(now.getTime() + Number(process.env.FACE_PURGE_HOURS ?? 24) * 3600_000);

    await withDB((db) => {
      db.faces.push({
        id,
        userId: user.id,
        palette: body.palette,
        signature: body.signature,
        metrics: body.metrics,
        consent: {
          at: now.toISOString(),
          version: body.consent.version,
          ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local',
          overseas: true,
        },
        createdAt: now.toISOString(),
        purgedAt: purgeAfter.toISOString(),
      });
      logEvent(db, user.id, 'face_analyzed', { faceId: id, coverage: Number(body.metrics.coverage.toFixed(2)) });
    });

    return ok({ faceId: id, purgeAfter: purgeAfter.toISOString(), stored: 'palette+metrics only' });
  } catch (e) {
    return handleError(e);
  }
}
