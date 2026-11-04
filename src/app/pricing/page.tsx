import Link from 'next/link';
import { BUSINESS } from '@/lib/business';
import { CheckoutButton } from '@/components/payments/CheckoutButton';
import { PLANS, SKUS, won } from '@/lib/pricing';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

const FAQ = [
  {
    q: '크레딧은 어떻게 쓰이나요?',
    a: '1컷 생성 = 1크레딧입니다. 12컷 팩은 12크레딧, 24컷 팩은 24크레딧이 차감됩니다. 편집(대사·소품·배경 변경)은 크레딧을 쓰지 않습니다.',
  },
  {
    q: '구독을 중간에 바꿀 수 있나요?',
    a: '네. 다음 결제일부터 변경된 플랜이 적용됩니다. 이미 지급된 크레딧은 소멸하지 않습니다.',
  },
  {
    q: '환불 규정은?',
    a: '결제 후 7일 이내 미사용 유료 크레딧은 청약철회를 신청할 수 있습니다. 일부를 사용했더라도 가분적인 미사용 부분은 별도로 확인합니다. 자세한 내용은 환불 정책을 확인해 주세요.',
  },
  {
    q: '결제 수단은?',
    a: '토스페이먼츠를 통해 카드·토스페이·카카오페이로 결제됩니다. 앱스토어 앱에서는 인앱결제(IAP)로만 결제됩니다.',
  },
];

export default async function PricingPage() {
  const user = await getCurrentUser();

  return (
    <div className="wrap py-12">
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip !border-ink !bg-lemon !text-ink">요금제</span>
        <h1 className="h1 mt-4 !text-[clamp(1.8rem,4vw,2.8rem)]">한 팩 값보다 싸게, 매달 새로</h1>
        <p className="mt-3 text-sm leading-relaxed text-sub">
          지금 플랜: <strong className="text-ink">{PLANS[user.plan].name}</strong> · 보유 크레딧{' '}
          <strong className="text-ink">{user.credits}</strong>
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {Object.values(PLANS).map((p) => {
          const sku = p.plan === 'PLUS' ? 'plan-plus-monthly' : p.plan === 'STUDIO' ? 'plan-studio-monthly' : null;
          const isCurrent = user.plan === p.plan;
          return (
            <div key={p.plan} className={`card p-6 ${p.highlight ? 'relative ring-4 ring-coral/30' : ''}`}>
              {p.highlight ? (
                <span className="absolute -top-3 left-6 rounded-full border-2 border-ink bg-coral px-3 py-1 text-[11px] font-black text-white">
                  가장 많이 선택
                </span>
              ) : null}
              <p className="text-xs font-black uppercase tracking-widest text-sub">{p.name}</p>
              <p className="mt-2 text-3xl font-black">
                {p.price === 0 ? '무료' : `${won(p.price)}원`}
                {p.price > 0 ? <span className="text-sm font-bold text-sub"> /월</span> : null}
              </p>
              <p className="mt-1 text-sm font-bold text-coralink">{p.tagline}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-ink/80">
                {p.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <div className="rounded-full border-2 border-line bg-cream py-3 text-center text-xs font-black text-sub">
                    현재 플랜
                  </div>
                ) : sku ? (
                  <CheckoutButton
                    sku={sku}
                    label={`${p.name} 시작하기`}
                    className={p.highlight ? 'btn-primary w-full' : 'btn-ghost w-full'}
                  />
                ) : (
                  <Link href="/studio/upload" className="btn-ghost w-full">
                    무료로 시작
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-black">크레딧만 충전하기</h2>
        <p className="mt-1 text-sm text-sub">구독 없이 필요할 때만. 크레딧은 소멸하지 않습니다.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.values(SKUS)
            .filter((s) => s.kind === 'credits')
            .map((s) => (
              <div key={s.sku} className="card-flat flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-black">{s.title}</p>
                  <p className="text-xs text-sub">{s.desc}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black">{won(s.price)}원</p>
                  <div className="mt-1">
                    <CheckoutButton sku={s.sku} label="충전" className="btn-dark !px-4 !py-1.5 text-[11px]" />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="text-lg font-black">결제 전 꼭 확인하세요</h2>
          <div className="mt-3 space-y-2">
            {FAQ.map((f) => (
              <details key={f.q} className="card-flat p-4">
                <summary className="cursor-pointer list-none text-sm font-black">Q. {f.q}</summary>
                <p className="mt-2 border-t border-line pt-2 text-xs leading-relaxed text-sub">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="text-lg font-black">사업자 정보</h2>
          <p className="mt-2 text-xs leading-relaxed text-sub">
            상호: {BUSINESS.name}
            <br />
            대표: {BUSINESS.owner} · 사업자등록번호:{' '}
            {BUSINESS.regNo}
            <br />
            통신판매업신고: {BUSINESS.mailOrder || '정보 미입력'}
            <br />
            사업장 주소: {BUSINESS.address}<br />
            고객센터: {BUSINESS.tel} · {BUSINESS.email}
          </p>
          <div className="mt-4 rounded-xl border border-line bg-cream p-3 text-[11px] leading-relaxed text-sub">
            <strong className="text-ink">청약철회 제한 안내</strong>
            <br />
            사용이 시작된 부분의 청약철회는 법령에 따라 제한될 수 있습니다. 가분적인 미사용 부분과 법령상 권리는 별도로 확인합니다. 자세한 내용은{' '}
            <Link href="/refund" className="text-coralink underline">환불 정책</Link>을 확인하세요.
          </div>
        </div>
      </div>
    </div>
  );
}
