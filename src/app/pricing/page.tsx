import Link from 'next/link';
import { BUSINESS } from '@/lib/business';
import { CheckoutButton } from '@/components/payments/CheckoutButton';
import { PLAN_DISCLOSURES, PRICE_TIERS, SKUS, visibleSkus, won } from '@/lib/pricing';
import { getCurrentUser } from '@/lib/session';
import { creditsLabel, effectivePlan, hasPlayEntitlement, isAdmin, isFullAccess, planLabel } from '@/lib/admin-access';
import { playBillingEnabled } from '@/lib/play-purchases';
import { checkoutSuspended, paymentsUnavailable } from '@/lib/payments';
import { PLAY_CREDITS_PRODUCT_ID, PLAY_SUBSCRIPTION_PRODUCT_ID } from '@/lib/play-products';
import { PlayBillingButton } from '@/components/payments/PlayBillingButton';

export const dynamic = 'force-dynamic';

const FAQ = [
  {
    q: '무료 미리보기와 잠금 해제는 어떻게 다른가요?',
    a: '미리보기는 12컷 전체를 저해상도·반투명 워터마크로 보여 줍니다. 단건 팩 완성권(5,900원)을 결제하면 그 팩의 고화질·투명 PNG, 워터마크 제거, 카카오·라인 규격 ZIP 내보내기가 열립니다.',
  },
  {
    q: '크레딧은 어떻게 쓰이나요?',
    a: '1컷 생성 = 1크레딧입니다. 12컷 팩은 12크레딧, 24컷 팩은 24크레딧이 차감됩니다. 편집(대사·소품·배경 변경)은 크레딧을 쓰지 않습니다.',
  },
  {
    q: 'Creator Pro 는 자동 갱신되나요?',
    a: '아니요. 1개월 이용권으로 판매하며 자동 갱신되지 않습니다. 만료 뒤에도 이미 잠금 해제한 팩의 내보내기 권한은 그대로 유지됩니다.',
  },
  {
    q: '환불 규정은?',
    a: '결제 후 7일 이내 미사용 유료 크레딧은 청약철회를 신청할 수 있습니다. 잠금 해제한 디지털 콘텐츠는 사용이 시작된 부분의 청약철회가 법령에 따라 제한될 수 있습니다. 자세한 내용은 환불 정책을 확인해 주세요.',
  },
  {
    q: '결제 수단은?',
    a: '카드 기반 결제는 토스페이먼츠를 통해 제공합니다. 제공 가능한 결제수단은 계약 및 설정에 따라 달라질 수 있습니다.',
  },
];

export default async function PricingPage() {
  const user = await getCurrentUser();
  const fullAccess = isFullAccess(user);
  const checkoutReady = !paymentsUnavailable() && !checkoutSuspended();
  const credits = visibleSkus('credits');

  return (
    <div className="wrap py-12">
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip !border-ink !bg-lemon !text-ink">요금제 · 3단 가격</span>
        <h1 className="h1 mt-4 !text-[clamp(1.8rem,4vw,2.8rem)]">12컷 전체를 보고, 필요한 만큼만</h1>
        <p className="mt-3 text-sm leading-relaxed text-sub">
          지금 플랜: <strong className="text-ink">{planLabel(user)}</strong> · 보유 크레딧{' '}
          <strong className="text-ink">{creditsLabel(user)}</strong>
        </p>
      </div>

      {fullAccess ? (
        <div className="mt-10 card p-8 text-center">
          <p className="text-2xl font-black">🎉 모든 기능을 이용 중이에요</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-sub">
            {hasPlayEntitlement(user)
              ? '구글 플레이에서 구매가 확인된 계정입니다. 크레딧 차감 없이 모든 스타일·모든 팩을 잠금 해제해 내려받을 수 있어요.'
              : '관리자 계정은 크레딧 차감 없이 모든 스타일·모든 기능을 이용할 수 있어요.'}
          </p>
          <Link href="/studio/upload" className="btn-primary mt-5 !px-6 !py-3">팩 만들기</Link>
        </div>
      ) : (
        <>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PRICE_TIERS.map((tier) => (
              <div key={tier.id} className={`card flex flex-col p-6 ${tier.highlight ? 'relative ring-4 ring-coral/30' : ''}`}>
                {tier.highlight ? (
                  <span className="absolute -top-3 left-6 rounded-full border-2 border-ink bg-coral px-3 py-1 text-[11px] font-black text-white">가장 먼저 시작</span>
                ) : null}
                <p className="text-xs font-black uppercase tracking-widest text-sub">{tier.name}</p>
                <p className="mt-2 text-3xl font-black">{tier.priceLabel}<span className="text-sm font-bold text-sub"> {tier.unit}</span></p>
                <p className="mt-1 text-sm font-bold text-coralink">{tier.tagline}</p>
                <ul className="mt-4 flex-1 space-y-1.5 text-sm text-ink/80">
                  {tier.points.map((point) => <li key={point}>· {point}</li>)}
                </ul>
                <div className="mt-5">
                  {tier.id === 'creator' ? (
                    <CheckoutButton
                      sku="plan-creator-monthly"
                      label={checkoutReady ? 'Creator Pro 시작 (1개월)' : '결제 준비 중'}
                      disabled={!checkoutReady}
                      className="btn-primary w-full"
                    />
                  ) : (
                    <Link href="/studio/upload" className={tier.id === 'single' ? 'btn-primary block w-full text-center' : 'btn-ghost block w-full text-center'}>
                      12컷 미리보기 시작
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-black">시즌·테마 크레딧 팩</h2>
                <p className="mt-1 text-sm text-sub">여러 팩을 만들 때 쓰는 무기한 크레딧. 1컷 = 1크레딧, 소멸 없음.</p>
              </div>
              <span className="chip !bg-cream">₩9,900 ~ ₩22,000</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {credits.map((sku) => (
                <div key={sku.sku} className="card-flat flex flex-col p-4">
                  <p className="text-sm font-black">{sku.title}</p>
                  <p className="mt-0.5 text-xs text-sub">{sku.desc}</p>
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <p className="text-lg font-black">{won(sku.price)}원</p>
                    {checkoutReady ? (
                      <CheckoutButton sku={sku.sku} label="충전" className="btn-dark !px-4 !py-1.5 text-[11px]" />
                    ) : (
                      <CheckoutButton sku={sku.sku} label="충전 준비 중" disabled className="btn-dark !px-4 !py-1.5 text-[11px]" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-flat mt-6 p-5">
            <h2 className="text-sm font-black">단건 팩 완성권 가격</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-sub">팩 구성에 따라 완성권 가격이 다릅니다. 결제 화면에서 실제 금액을 확인할 수 있어요.</p>
            <ul className="mt-3 grid gap-1.5 text-[12px] sm:grid-cols-3">
              {['pack-unlock-single', 'pack-unlock-duo', 'pack-unlock-pet'].map((key) => {
                const sku = SKUS[key];
                return (
                  <li key={key} className="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2">
                    <span className="font-bold text-ink">{sku.title}</span>
                    <span className="font-black text-coralink">{won(sku.price)}원</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      <div className="card mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-sm font-black">교환권(코드)으로 바로 받기</h2>
          <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-sub">
            카드 결제 없이, 구입처에서 받은 32자리 코드로 팩 완성권·크레딧·Creator Pro를 받을 수 있어요.
            카드 결제가 준비되지 않은 기간에도 같은 상품을 코드로 지급합니다.
          </p>
        </div>
        <Link href="/redeem" className="btn-dark !px-5 !py-2.5 text-xs">
          교환권 사용
        </Link>
      </div>

      <div className="card-flat mt-10 p-5">
        <h2 className="text-sm font-black">요금제 표기 안내</h2>
        <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-sub">
          {PLAN_DISCLOSURES.map((line) => <li key={line}>· {line}</li>)}
        </ul>
      </div>

      {playBillingEnabled() ? (
        <div className="card mt-4 p-5">
          <h2 className="text-sm font-black">플레이 스토어 앱에서 구독·크레딧 결제</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-sub">
            앱(플레이 스토어)에서 열면 구글 플레이 결제로 구독과 크레딧을 살 수 있어요. 결제는 계정에 연결되고,
            구매 확인은 구글 플레이 서버에서 검증합니다.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <PlayBillingButton productId={PLAY_SUBSCRIPTION_PRODUCT_ID} kind="SUBS" label="Creator Pro 구독" className="btn-primary w-full" />
            <PlayBillingButton productId={PLAY_CREDITS_PRODUCT_ID} kind="INAPP" label="크레딧 팩" className="btn-dark w-full" />
          </div>
        </div>
      ) : null}

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
