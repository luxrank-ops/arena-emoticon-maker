import Link from 'next/link';
import { UploadFlow } from '@/components/studio/UploadFlow';
import { getCurrentUser } from '@/lib/session';
import { tonesForPlan } from '@/lib/packs';
import { AI_ADMIN_ONLY_MESSAGE, aiAccess, effectivePlan, isAdmin, planLabel } from '@/lib/admin-access';
import { TRIAL_MESSAGES, trialToneAllowed } from '@/lib/trial-policy';
import { getLocale } from '@/lib/i18n/server';
import { localizedPath, tr } from '@/lib/i18n/locale';

export async function UploadPageContent({ step }: { step: 'photo' | 'settings' }) {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const access = aiAccess(user);
  // 무료 체험은 시안 1장 + 컷 2장 맛보기까지만 — 실사 스티커(상위 모델)는 체험에서 뺀다.
  const tones = tonesForPlan(effectivePlan(user)).filter((tone) => access !== 'trial' || trialToneAllowed(tone));
  return (
    <div className="wrap py-6 sm:py-10">
      {access === 'trial' ? (
        <div role="status" className="mx-auto mb-6 max-w-3xl rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary-dark">
          <p>{tr(locale, TRIAL_MESSAGES.banner, 'Free trial: one draft and up to two stickers. Full packs open at launch.')}</p>
          <p className="mt-1 text-[11px] font-bold text-sub">
            {tr(locale, '체험 컷은 미리보기용이에요. 팩 저장·정식 내려받기는 정식 출시 후 열려요.', 'Trial stickers are previews. Pack saving and official downloads open at launch.')}
          </p>
        </div>
      ) : access === 'blocked' ? (
        <div role="status" className="mx-auto mb-6 max-w-3xl rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary-dark">
          <p>{tr(locale, AI_ADMIN_ONLY_MESSAGE, 'AI creation is temporarily limited to administrators during beta maintenance.')}</p>
          <p className="mt-1 text-[11px] font-bold text-sub">{tr(locale, '지금은 대사 스튜디오에서 바로 만들 수 있어요. 사진과 크레딧은 차감되지 않습니다.', 'You can create stickers right now in the quote studio. Your photos and credits are not used.')}</p>
          <Link href={localizedPath(locale, '/quotes')} className="btn-primary !mt-3 !px-4 !py-2 text-xs">{tr(locale, '대사 스튜디오로 가기', 'Open the quote studio')}</Link>
        </div>
      ) : null}
      <UploadFlow step={step} allowedTones={tones} credits={user.credits} planName={planLabel(user)} unlimited={isAdmin(user)} locale={locale} />
      <p className="mt-8 text-center text-xs leading-relaxed text-sub">
        {tr(locale, '원본 사진은 서버에 저장되지 않습니다. 사전 확인과 생성 시 Google Gemini로 전송됩니다.', 'Original photos are not stored on our servers. They are sent to Google Gemini for pre-generation review and image creation.')} <Link href={localizedPath(locale, '/privacy')} className="text-coralink underline">{tr(locale, '자세히 보기', 'Privacy details')}</Link>
      </p>
    </div>
  );
}
