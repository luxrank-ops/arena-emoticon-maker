import Link from 'next/link';
import { UploadFlow } from '@/components/studio/UploadFlow';
import { getCurrentUser } from '@/lib/session';
import { tonesForPlan } from '@/lib/packs';
import { PLANS } from '@/lib/pricing';

export async function UploadPageContent({ step }: { step: 'photo' | 'settings' }) {
  const user = await getCurrentUser();
  const tones = tonesForPlan(user.role === 'admin' ? 'STUDIO' : user.plan);
  const isPhoto = step === 'photo';
  return (
    <div className="wrap py-10">
      <nav className="mb-6 flex items-center gap-2 text-xs font-bold text-sub" aria-label="현재 위치">
        <Link href="/" className="hover:text-ink">홈</Link><span>/</span>
        {isPhoto ? <span className="text-ink">사진 선택</span> : <><Link href="/studio/upload" className="hover:text-ink">사진 선택</Link><span>/</span><span className="text-ink">스타일과 동의</span></>}
        <span className="ml-auto chip">STEP {isPhoto ? '1' : '2'} / 4</span>
      </nav>
      <div className="mx-auto mb-8 max-w-3xl">
        <h1 className="h2">{isPhoto ? '어떤 사진으로 만들까요?' : '이모티콘 스타일을 골라주세요'}</h1>
        <p className="mt-2 text-sm leading-relaxed text-sub">
          {isPhoto ? '셀카 한 장을 선택하면 브라우저에서 사진 품질을 확인합니다.' : '구도와 스타일을 선택하고 필수 항목에 동의하면 시안 만들기를 시작합니다.'}
        </p>
        <ol aria-label="제작 진행 단계" className="mt-5 grid grid-cols-4 gap-1 text-center text-xs font-bold sm:gap-2 sm:text-sm">
          {['사진 선택', '스타일·동의', '시안 선택', '팩 완성'].map((label, index) => <li key={label} aria-current={index === (isPhoto ? 0 : 1) ? 'step' : undefined} className={`rounded-xl border-2 px-1 py-2 ${index === (isPhoto ? 0 : 1) ? 'border-ink bg-lemon/30 text-ink' : 'border-line text-sub'}`}>{index + 1}. {label}</li>)}
        </ol>
      </div>
      <UploadFlow step={step} allowedTones={tones} credits={user.credits} planName={user.role === 'admin' ? '관리자' : PLANS[user.plan].name} unlimited={user.role === 'admin'} />
      <p className="mt-8 text-center text-xs text-sub">원본 사진은 서버에 저장되지 않습니다. 사전 확인과 생성 시 Google Gemini로 전송됩니다. <Link href="/privacy" className="text-coralink underline">자세히 보기</Link></p>
    </div>
  );
}
