'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { digitalGoodsAvailable, getPlayItemDetails, listPlayPurchases, purchasePlayItem, type PlayItemDetails } from '@/lib/play-billing';

/**
 * 구글 플레이 인앱결제 버튼 (TWA 전용 골격).
 *  · 상품이 콘솔에 등록되기 전에는 "준비 중"으로 비활성 표시한다.
 *  · 구매 후 서버 검증이 끝나야만 자격이 생기고, 화면은 router.refresh() 로 서버 판정을 다시 읽는다.
 *  · 여기서 유료 기능을 직접 열지 않는다.
 */
export function PlayBillingButton({
  productId,
  kind,
  label,
  className = 'btn-primary w-full',
}: {
  productId: string;
  kind: 'INAPP' | 'SUBS';
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [details, setDetails] = useState<PlayItemDetails | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!digitalGoodsAvailable()) {
      // Digital Goods API 지원 여부는 브라우저에서만 알 수 있어 마운트 후에 반영한다.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 브라우저 전용 API 결과를 마운트 후 반영
      setSupported(false);
      return () => { alive = false; };
    }
    setSupported(true);
    getPlayItemDetails([productId]).then((items) => {
      if (alive) setDetails(items[0] ?? null);
    });
    return () => { alive = false; };
  }, [productId]);

  async function buy() {
    setBusy(true);
    setNotice(null);
    const outcome = await purchasePlayItem(productId, kind);
    setBusy(false);
    if (outcome.status === 'purchased') {
      if (outcome.verified) {
        setNotice('결제가 확인됐어요. 잠시 후 이용 권한이 반영됩니다.');
        router.refresh();
      } else {
        setNotice(outcome.message ?? '구매는 접수됐지만 아직 확인 중입니다.');
      }
      return;
    }
    if (outcome.status === 'cancelled') return;
    if (outcome.status === 'unsupported') {
      setNotice('이 화면에서는 앱 내 결제를 쓸 수 없습니다. 플레이 스토어 앱에서 열어 주세요.');
      return;
    }
    setNotice(outcome.message);
  }

  async function restore() {
    setBusy(true);
    setNotice(null);
    const purchases = await listPlayPurchases();
    const tokens = purchases.filter((item) => (item.itemId ?? productId) === productId).map((item) => item.purchaseToken);
    let verified = false;
    for (const purchaseToken of tokens) {
      const res = await fetch('/api/play/purchases/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, purchaseToken, kind }),
      });
      if (res.ok) { verified = true; break; }
    }
    setBusy(false);
    setNotice(verified ? '이전 구매를 찾았어요. 이용 권한이 반영됩니다.' : '이 계정에서 이전 구매를 찾지 못했어요.');
    if (verified) router.refresh();
  }

  const priceLabel = details?.price ? `${details.price.value} ${details.price.currency}` : null;

  return (
    <div className="w-full">
      <button type="button" className={className} onClick={buy} disabled={busy || supported === false || !details}>
        {busy ? '진행 중…' : details && priceLabel ? `${label} · ${priceLabel}` : `${label} (준비 중)`}
      </button>
      {supported ? (
        <button type="button" onClick={restore} disabled={busy} className="mt-1 w-full text-[11px] font-bold text-sub underline underline-offset-2">
          이전 구매 복원
        </button>
      ) : (
        <p className="mt-1 text-[11px] leading-relaxed text-sub">앱(플레이 스토어)에서 열면 인앱결제를 쓸 수 있어요.</p>
      )}
      {notice ? <p role="status" className="mt-2 text-[11px] font-bold leading-relaxed text-primary-dark">{notice}</p> : null}
    </div>
  );
}
