import Link from 'next/link';
import { UploadFlow } from '@/components/studio/UploadFlow';
import { getCurrentUser } from '@/lib/session';
import { tonesForPlan } from '@/lib/packs';
import { PLANS } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default async function UploadPage() {
  const user = await getCurrentUser();
  const tones = tonesForPlan(user.plan);

  return (
    <div className="wrap py-10">
      <nav className="mb-6 flex items-center gap-2 text-xs font-bold text-sub">
        <Link href="/" className="hover:text-ink">홈</Link>
        <span>/</span>
        <span className="text-ink">이모티콘 만들기</span>
        <span className="ml-auto chip">STEP 1 / 3</span>
      </nav>

      <div className="mb-8 grid gap-4 md:grid-cols-[1.2fr_1fr] md:items-end">
        <div>
          <h1 className="h2">내 얼굴로 이모티콘 만들기</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-sub">
            셀카 1장이면 충분합니다. 얼굴 분석은 브라우저에서만 이뤄지고, 서버에는 색상·특징 지표만 전달돼요.
          </p>
        </div>
        <div className="card-flat p-4 text-sm">
          <p className="font-black">진행 순서</p>
          <ol className="mt-2 space-y-1 text-sub">
            <li><strong className="text-ink">1.</strong> 사진 업로드 · 품질 확인</li>
            <li><strong className="text-ink">2.</strong> 캐릭터 시트 3종 중 선택</li>
            <li><strong className="text-ink">3.</strong> 12/24컷 생성 · 편집 · 내보내기</li>
          </ol>
        </div>
      </div>

      <UploadFlow allowedTones={tones} credits={user.credits} planName={PLANS[user.plan].name} />

      <div className="mt-10 rounded-2xl border-2 border-dashed border-line p-4 text-center text-xs text-sub">
        사진이 서버에 저장된다고요? <strong className="text-ink">아니요.</strong> 이모티미는 원본 이미지를 업로드하지
        않습니다. 자세한 내용은 <Link href="/privacy" className="text-coralink underline">개인정보처리방침</Link>.
      </div>
    </div>
  );
}
