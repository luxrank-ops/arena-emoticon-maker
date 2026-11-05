import Link from 'next/link';
import { UploadFlow } from '@/components/studio/UploadFlow';
import { getCurrentUser } from '@/lib/session';
import { tonesForPlan } from '@/lib/packs';
import { effectivePlan, isAdmin, planLabel } from '@/lib/admin-access';
import { getLocale } from '@/lib/i18n/server';
import { localizedPath, tr } from '@/lib/i18n/locale';

export async function UploadPageContent({ step }: { step: 'photo' | 'settings' }) {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const tones = tonesForPlan(effectivePlan(user));
  return (
    <div className="wrap py-6 sm:py-10">
      <UploadFlow step={step} allowedTones={tones} credits={user.credits} planName={planLabel(user)} unlimited={isAdmin(user)} locale={locale} />
      <p className="mt-8 text-center text-xs leading-relaxed text-sub">
        {tr(locale, '원본 사진은 서버에 저장되지 않습니다. 사전 확인과 생성 시 Google Gemini로 전송됩니다.', 'Original photos are not stored on our servers. They are sent to Google Gemini for pre-generation review and image creation.')} <Link href={localizedPath(locale, '/privacy')} className="text-coralink underline">{tr(locale, '자세히 보기', 'Privacy details')}</Link>
      </p>
    </div>
  );
}
