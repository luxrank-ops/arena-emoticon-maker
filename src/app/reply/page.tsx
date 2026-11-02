import Link from 'next/link';
import { ReplyStudio } from '@/components/reply/ReplyStudio';
import { getCurrentUser } from '@/lib/session';
import { withDB } from '@/lib/store';
import { PLANS } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default async function ReplyPage() {
  const user = await getCurrentUser();
  const hasCuts = await withDB((db) =>
    db.packs.some((p) => p.userId === user.id && p.renderer === 'ai' && p.frames.some((f) => !!f.imageId)),
  );

  return (
    <div className="wrap py-10">
      <div className="mb-8 grid gap-4 md:grid-cols-[1.3fr_0.7fr] md:items-end">
        <div>
          <span className="chip !border-ink !bg-ink !text-cream">Chat-to-Sticker</span>
          <h1 className="h2 mt-3">톡 붙여넣으면, 3초 안에 답장 3개</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-sub">
            카톡 대화를 복사해 붙여넣으세요. 감정과 의도를 읽고 <strong className="text-ink">내가 만든 AI 컷</strong>으로
            답장 컷을 골라드립니다. 새로 그리지 않아 기다림이 없습니다.
          </p>
        </div>
        {!hasCuts ? (
          <div className="card-flat p-4 text-xs leading-relaxed text-sub">
            아직 만든 컷이 없어요. 팩을 만들면 여기에 내 얼굴 답장 컷이 나옵니다.{' '}
            <Link href="/studio/upload" className="text-coralink underline">내 얼굴 만들기 →</Link>
          </div>
        ) : null}
      </div>

      <ReplyStudio hasCuts={hasCuts} watermark={PLANS[user.plan].watermark} />
    </div>
  );
}
