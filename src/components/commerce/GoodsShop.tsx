'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { Sticker } from '@/components/Sticker';
import { GOODS, won } from '@/lib/pricing';
import type { StickerSpec } from '@/lib/types';

interface FrameOption {
  id: string;
  label: string;
  line: string;
  spec: StickerSpec;
}

export function GoodsShop({ frames, discount }: { frames: FrameOption[]; discount: number }) {
  const [frameId, setFrameId] = useState(frames[0]?.id ?? '');
  const [goodsSku, setGoodsSku] = useState(GOODS[0].sku);
  const [form, setForm] = useState({ name: '', phone: '', address: '', memo: '' });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ message: string; orderId: string } | null>(null);

  const frame = frames.find((f) => f.id === frameId) ?? frames[0];
  const goods = GOODS.find((g) => g.sku === goodsSku) ?? GOODS[0];
  const amount = Math.round((goods.price * (100 - discount)) / 100);
  const valid = form.name.length > 0 && form.phone.length >= 8 && form.address.length >= 5 && agree;

  async function order() {
    if (!frame) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/goods/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goodsSku,
          frameId: frame.id,
          frameLabel: `${frame.label} “${frame.line}”`,
          shipping: {
            name: form.name,
            phone: form.phone,
            address: form.address,
            memo: form.memo || undefined,
          },
          agreeNoRefundAfterProduction: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '주문에 실패했습니다');
      setDone({ message: json.message, orderId: json.order.id });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-ink bg-mint text-2xl">✓</div>
        <p className="mt-4 text-xl font-black">주문이 접수됐어요</p>
        <p className="mt-1 text-sm text-sub">{done.message}</p>
        <p className="mt-1 text-[11px] text-sub">주문번호 {done.orderId}</p>
        <button className="btn-ghost mt-5 !px-5 !py-2 text-xs" onClick={() => setDone(null)}>
          다른 컷 주문하기
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-4">
        <div className="card p-4">
          <p className="text-sm font-black">1. 컷 선택</p>
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
            {frames.map((f) => (
              <button
                key={f.id}
                onClick={() => setFrameId(f.id)}
                className={clsx(
                  'overflow-hidden rounded-xl border-2 bg-cream p-1 transition',
                  frameId === f.id ? 'border-ink ring-2 ring-coral/40' : 'border-line hover:border-ink/50',
                )}
              >
                <Sticker spec={{ ...f.spec, background: 'cream' }} />
              </button>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <p className="text-sm font-black">2. 상품 선택</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {GOODS.map((g) => {
              const price = Math.round((g.price * (100 - discount)) / 100);
              return (
                <button
                  key={g.sku}
                  onClick={() => setGoodsSku(g.sku)}
                  className={clsx(
                    'flex items-center gap-3 rounded-xl border-2 p-3 text-left transition',
                    goodsSku === g.sku ? 'border-ink bg-lemon/30' : 'border-line bg-paper hover:border-ink/50',
                  )}
                >
                  <span className="text-2xl">{g.emoji}</span>
                  <span>
                    <span className="block text-[13px] font-black">{g.name}</span>
                    <span className="block text-[11px] text-sub">
                      {won(price)}원
                      {discount > 0 ? <span className="ml-1 text-coralink">−{discount}%</span> : null}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <div className="flex items-center gap-4">
            {frame ? (
              <div className="w-24 shrink-0 rounded-xl border-2 border-line bg-cream p-1">
                <Sticker spec={{ ...frame.spec, background: 'cream', line: '' }} />
              </div>
            ) : null}
            <div>
              <p className="text-sm font-black">{goods.name}</p>
              <p className="text-[11px] text-sub">
                {goods.desc} · {frame?.label} “{frame?.line}”
              </p>
              <p className="mt-1 text-lg font-black">
                {won(amount)}원
                {discount > 0 ? (
                  <span className="ml-2 text-[11px] font-bold text-sub line-through">{won(goods.price)}원</span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <input
              placeholder="받는 사람 이름"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border-2 border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-ink"
            />
            <input
              placeholder="연락처 (- 없이)"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-xl border-2 border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-ink"
            />
            <input
              placeholder="주소"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full rounded-xl border-2 border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-ink"
            />
            <input
              placeholder="배송 메모 (선택)"
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
              className="w-full rounded-xl border-2 border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-ink"
            />
          </div>

          <label className="mt-3 flex items-start gap-2 rounded-xl border border-line bg-cream px-3 py-2.5 text-[11px] leading-relaxed">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-coral"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
            <span>
              <strong>[필수]</strong> 제작이 시작된 이후에는 단순 변심에 의한 취소·환불이 제한됨에 동의합니다.
              (상품 하자 시 교환/환불 가능)
            </span>
          </label>

          {error ? (
            <p className="mt-3 rounded-lg border-2 border-coral/50 bg-coral/10 px-3 py-2 text-xs font-bold text-coralink">
              {error}
            </p>
          ) : null}

          <button className="btn-primary mt-3 w-full !py-3.5" disabled={!valid || busy} onClick={order}>
            {busy ? '주문 처리 중…' : `${won(amount)}원 주문하기`}
          </button>
          <p className="mt-2 text-center text-[10px] text-sub">
            테스트 모드: 실제 결제·배송이 발생하지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
