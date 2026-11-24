import { z } from 'zod';
import { fail, handleError, ok } from '@/lib/api';
import { bypassesRateLimit } from '@/lib/admin-access';
import { validateAuthRequest } from '@/lib/auth-api';
import { issueRedeemBatch, MAX_BATCH_SIZE, RedeemError, redeemAdminRows, redeemCatalog, redeemReconciliation, revokeRedeemBatch } from '@/lib/redeem';
import { enforceRateLimit } from '@/lib/ratelimit';
import { getCurrentUser } from '@/lib/session';
import { withDB } from '@/lib/store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const issueSchema = z.object({
  action: z.literal('issue'),
  sku: z.string().min(3).max(60),
  count: z.number().int().min(1).max(MAX_BATCH_SIZE),
  quantity: z.number().int().min(1).max(5).optional(),
  label: z.string().max(80).optional(),
  note: z.string().max(200).optional(),
  validDays: z.number().int().min(1).max(1095).optional(),
  startsAt: z.string().max(40).optional(),
  prefix: z.string().max(12).optional(),
  /** CS 재발급 — 특정 계정에 귀속 */
  issueToEmail: z.string().max(120).optional(),
});

const revokeSchema = z.object({
  action: z.literal('revoke'),
  batchId: z.string().min(3).max(80),
  reason: z.string().max(200).optional(),
});

const schema = z.discriminatedUnion('action', [issueSchema, revokeSchema]);

/** 운영자 전용 — 교환권 발급·폐기·대사 */
export async function POST(req: Request) {
  try {
    const forbidden = validateAuthRequest(req);
    if (forbidden) return forbidden;
    const admin = await getCurrentUser();
    if (admin.role !== 'admin') return fail('FORBIDDEN', '운영자 로그인이 필요합니다', 403);
    const limited = enforceRateLimit(admin.id, 'admin-redeem', 30);
    if (limited && !bypassesRateLimit(admin)) return limited;
    const body = schema.parse(await req.json());

    if (body.action === 'revoke') {
      const result = await revokeRedeemBatch(admin.id, body.batchId, body.reason ?? '운영자 폐기');
      return ok(result);
    }

    // 이메일로 귀속 발급할 때만 계정을 조회한다 (없으면 귀속 없이 발급하지 않는다 — 오배송 방지).
    let issuedTo: string | undefined;
    const email = body.issueToEmail?.trim().toLowerCase();
    if (email) {
      issuedTo = await withDB((db) => db.accounts.find((account) => account.email.toLowerCase() === email)?.userId);
      if (!issuedTo) return fail('ACCOUNT_NOT_FOUND', '해당 이메일의 회원 계정을 찾을 수 없습니다.', 404);
    }

    const result = await issueRedeemBatch(admin.id, {
      sku: body.sku,
      count: body.count,
      quantity: body.quantity ?? 1,
      label: body.label ?? '교환권',
      note: body.note,
      validDays: body.validDays,
      startsAt: body.startsAt,
      prefix: body.prefix,
      issuedTo,
    });
    return ok({ batch: result.batch, codes: result.codes });
  } catch (error) {
    if (error instanceof RedeemError) return fail(error.code, error.message, error.status);
    return handleError(error);
  }
}

/** 운영 콘솔 조회 — 발급 묶음·대사·지급 가능 상품 */
export async function GET() {
  try {
    const admin = await getCurrentUser();
    if (admin.role !== 'admin') return fail('FORBIDDEN', '운영자 로그인이 필요합니다', 403);
    const [rows, totals] = await Promise.all([redeemAdminRows(), redeemReconciliation()]);
    return ok({ rows, totals, catalog: redeemCatalog() });
  } catch (error) {
    return handleError(error);
  }
}
