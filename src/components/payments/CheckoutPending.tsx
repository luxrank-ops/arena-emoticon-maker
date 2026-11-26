'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * 주문이 저장소에 아직 반영되지 않았을 때(생성 직후 KV 반영 지연) 잠깐 기다리는 화면.
 *  · 404 로 떨어뜨리지 않고 1.5초 간격으로 주문 상태를 다시 조회한다.
 *  · 주문이 보이면 화면을 새로 고쳐 실제 결제 패널로 넘긴다.
 *  · 30초가 지나도 안 보이면 다시 시도·요금제 이동 경로를 보여 준다(막다른 404 대신).
 */
const POLL_INTERVAL_MS = 1500;
const TIMEOUT_MS = 30_000;

export function CheckoutPending({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);
  const [retrying, setRetrying] = useState(0);
  // 렌더 중 Date.now() 를 부르지 않는다(순수 렌더 규칙) — 시작 시각은 effect 안에서 잡는다.
  const startedAt = useRef(0);
  const stopped = useRef(false);

  useEffect(() => {
    if (startedAt.current === 0) startedAt.current = Date.now();
    stopped.current = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (stopped.current) return;
      const passed = Date.now() - startedAt.current;
      setElapsed(passed);
      if (passed > TIMEOUT_MS) return;
      let found = false;
      try {
        const res = await fetch(`/api/checkout/status?orderId=${encodeURIComponent(orderId)}`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          found = Boolean(json?.found);
        }
      } catch {
        // 네트워크 오류는 다음 폴링에서 다시 시도한다
      }
      if (found) {
        stopped.current = true;
        router.refresh();
        return;
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };
    void tick();
    const clock = setInterval(() => setElapsed(Date.now() - startedAt.current), 1000);
    return () => {
      stopped.current = true;
      clearTimeout(timer);
      clearInterval(clock);
    };
  }, [orderId, retrying, router]);

  const waiting = elapsed <= TIMEOUT_MS;

  return (
    <div className="wrap max-w-2xl py-16">
      <div className="card p-8 text-center">
        {waiting ? (
          <>
            <span aria-hidden="true" className="mx-auto block h-8 w-8 animate-spin rounded-full border-[3px] border-primary/25 border-t-primary" />
            <h1 className="mt-5 text-lg font-black">주문을 확인하고 있어요</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-sub">
              결제 화면을 준비하는 중이에요. 잠시만 기다리면 자동으로 넘어갑니다.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-black">주문을 아직 확인하지 못했어요</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-sub">
              결제가 진행되지 않았다면 돈이 빠져나가지 않았어요. 다시 시도하거나 요금제에서 새로 시작해 주세요.
            </p>
          </>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            className="btn-primary !px-5 !py-2.5 text-sm"
            onClick={() => {
              startedAt.current = Date.now();
              setElapsed(0);
              setRetrying((n) => n + 1);
            }}
          >
            {waiting ? '지금 다시 확인' : '다시 시도'}
          </button>
          <Link href="/pricing" className="btn-ghost !px-5 !py-2.5 text-sm">
            요금제로 가기
          </Link>
        </div>
        <p className="mt-4 text-[11px] text-sub">
          주문번호 <span className="font-bold text-ink">{orderId.slice(0, 18)}…</span> · 계속 안 보이면 고객센터에 주문번호를 알려 주세요.
        </p>
      </div>
    </div>
  );
}
