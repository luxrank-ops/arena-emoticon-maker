import Link from 'next/link';
import { UploadFlow } from '@/components/studio/UploadFlow';
import { getCurrentUser } from '@/lib/session';
import { tonesForPlan } from '@/lib/packs';
import { effectivePlan, isAdmin, planLabel } from '@/lib/admin-access';

export async function UploadPageContent({ step }: { step: 'photo' | 'settings' }) {
  const user = await getCurrentUser();
  const tones = tonesForPlan(effectivePlan(user));
  return (
    <div className="wrap py-10">
      <UploadFlow step={step} allowedTones={tones} credits={user.credits} planName={planLabel(user)} unlimited={isAdmin(user)} />
      <p className="mt-8 text-center text-xs text-sub">원본 사진은 서버에 저장되지 않습니다. 사전 확인과 생성 시 Google Gemini로 전송됩니다. <Link href="/privacy" className="text-coralink underline">자세히 보기</Link></p>
    </div>
  );
}
