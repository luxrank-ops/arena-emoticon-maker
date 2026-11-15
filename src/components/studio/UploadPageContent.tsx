import Link from 'next/link';
import { UploadFlow } from '@/components/studio/UploadFlow';
import { getCurrentUser } from '@/lib/session';
import { tonesForPlan } from '@/lib/packs';
import { AI_ADMIN_ONLY_MESSAGE, canUseAiGeneration, effectivePlan, isAdmin, planLabel } from '@/lib/admin-access';
import { getLocale } from '@/lib/i18n/server';
import { localizedPath, tr } from '@/lib/i18n/locale';

export async function UploadPageContent({ step }: { step: 'photo' | 'settings' }) {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const tones = tonesForPlan(effectivePlan(user));
  const aiEnabled = canUseAiGeneration(user);
  return (
    <div className="wrap py-6 sm:py-10">
      {aiEnabled ? null : (
        <div role="status" className="mx-auto mb-6 max-w-3xl rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary-dark">
          <p>{tr(locale, AI_ADMIN_ONLY_MESSAGE, 'AI creation is temporarily limited to administrators during beta maintenance.')}</p>
          <p className="mt-1 text-[11px] font-bold text-sub">{tr(locale, '유료 등급 정비가 끝나면 다시 열립니다. 사진과 크레딧은 차감되지 않습니다.', 'This reopens once the paid tier is ready. Your photos and credits are not used.')}</p>
        </div>
      )}
      <UploadFlow step={step} allowedTones={tones} credits={user.credits} planName={planLabel(user)} unlimited={isAdmin(user)} locale={locale} />
      <p className="mt-8 text-center text-xs leading-relaxed text-sub">
        {tr(locale, '원본 사진은 서버에 저장되지 않습니다. 사전 확인과 생성 시 Google Gemini로 전송됩니다.', 'Original photos are not stored on our servers. They are sent to Google Gemini for pre-generation review and image creation.')} <Link href={localizedPath(locale, '/privacy')} className="text-coralink underline">{tr(locale, '자세히 보기', 'Privacy details')}</Link>
      </p>
    </div>
  );
}
