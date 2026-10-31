'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { Sticker } from '@/components/Sticker';
import { downloadBlob, exportPackZip, renderPngBlob } from '@/lib/export';
import { formatKstDateTime } from '@/lib/time';
import type { FrameView, Pack } from '@/lib/types';

export function PackViewer({
  pack: initialPack,
  frames: initialFrames,
  ready: initialReady,
  total,
  watermark,
}: {
  pack: Pack;
  frames: FrameView[];
  ready: number;
  total: number;
  watermark: boolean;
}) {
  const [frames, setFrames] = useState(initialFrames);
  const [ready, setReady] = useState(initialReady);
  const [status, setStatus] = useState(initialPack.status);
  const [zipBusy, setZipBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // SSE 진행률
  useEffect(() => {
    if (status === 'READY') return;
    const es = new EventSource(`/api/packs/${initialPack.id}/stream`);
    es.addEventListener('frame.ready', (e) => {
      const data = JSON.parse((e as MessageEvent).data) as { ready: number; total: number; status: string };
      setReady(data.ready);
      setStatus(data.status as Pack['status']);
    });
    es.addEventListener('job.done', () => {
      setStatus('READY');
      es.close();
      void refresh();
    });
    es.onerror = () => es.close();
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPack.id, status]);

  async function refresh() {
    try {
      const res = await fetch(`/api/packs/${initialPack.id}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.ok) {
        setFrames(json.frames);
        setReady(json.ready);
        setStatus(json.pack.status);
      }
    } catch {
      /* noop */
    }
  }

  const visible = useMemo(() => frames.map((f, i) => ({ ...f, ready: f.ready || i < ready })), [frames, ready]);
  const done = status === 'READY';

  async function downloadOne(f: FrameView) {
    const blob = await renderPngBlob(f.spec, { watermark });
    downloadBlob(blob, `${initialPack.id}-${f.index + 1}-${f.label}.png`);
  }

  async function downloadZip() {
    setZipBusy(true);
    setNotice(null);
    try {
      const items = visible
        .filter((f) => f.ready)
        .map((f) => ({ spec: f.spec, filename: `${String(f.index + 1).padStart(2, '0')}-${f.label}` }));
      const blob = await exportPackZip(items, { watermark });
      downloadBlob(blob, `emotime-${initialPack.id}.zip`);
      setNotice(`${items.length}컷을 ZIP으로 내려받았어요.`);
    } finally {
      setZipBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black">{initialPack.title}</p>
            <p className="text-xs text-sub">
              {initialPack.size}컷 · {initialPack.creditsSpent}크레딧 사용 ·{' '}
              {formatKstDateTime(initialPack.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                'chip',
                done ? '!border-mint/60 !bg-mint/10 !text-ink' : '!border-coral/50 !bg-coral/10 !text-coralink',
              )}
            >
              {done ? '● 생성 완료' : '● 생성 중'}
            </span>
            <span className="text-sm font-black">
              {ready}/{total}
            </span>
          </div>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-cream">
          <div
            className="h-full rounded-full bg-coral transition-[width] duration-500"
            style={{ width: `${Math.round((ready / total) * 100)}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-dark !py-2 text-xs" disabled={!done || zipBusy} onClick={downloadZip}>
            {zipBusy ? 'ZIP 만드는 중…' : '전체 PNG ZIP 다운로드'}
          </button>
          <Link href="/reply" className="btn-ghost !py-2 text-xs">톡 답장에 쓰기</Link>
          <Link href="/goods" className="btn-ghost !py-2 text-xs">굿즈로 만들기</Link>
          {watermark ? (
            <Link href="/pricing" className="chip !border-coral/50 !bg-coral/10 !text-coralink">
              워터마크 제거는 Plus
            </Link>
          ) : null}
        </div>
        {notice ? <p className="mt-2 text-xs font-bold text-mint">{notice}</p> : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((f) => (
          <div
            key={f.id}
            className={clsx(
              'card overflow-hidden p-0 transition',
              f.ready ? 'animate-pop' : 'opacity-60',
            )}
          >
            <div className="relative bg-cream p-2">
              {f.ready ? (
                <Sticker spec={f.spec} ariaLabel={`${f.label} 컷`} />
              ) : (
                <div className="grid aspect-square place-items-center rounded-xl bg-[length:200%_100%] bg-gradient-to-r from-line/20 via-line/50 to-line/20 animate-shimmer">
                  <span className="text-[11px] font-bold text-sub">생성 중…</span>
                </div>
              )}
              {!f.ready ? (
                <span className="absolute right-2 top-2 rounded-full border border-line bg-paper px-2 py-0.5 text-[10px] font-bold text-sub">
                  {f.index + 1}
                </span>
              ) : null}
            </div>
            <div className="border-t-2 border-line px-3 py-2">
              <p className="truncate text-[13px] font-black">{f.label}</p>
              <p className="truncate text-[11px] text-sub">“{f.line}”</p>
              <div className="mt-2 flex gap-1">
                <Link
                  href={`/editor/${initialPack.id}/${f.id}`}
                  className="flex-1 rounded-lg border-2 border-ink bg-paper py-1 text-center text-[11px] font-black hover:bg-lemon/40"
                >
                  편집
                </Link>
                <button
                  onClick={() => downloadOne(f)}
                  disabled={!f.ready}
                  title={f.ready ? '이 컷을 PNG로 저장' : '생성 중'}
                  className="rounded-lg border border-line px-2 py-1 text-[11px] font-bold text-sub hover:border-ink disabled:opacity-40"
                >
                  PNG
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border-2 border-dashed border-line p-4 text-center text-xs leading-relaxed text-sub">
        카톡에서는 내보낸 PNG/GIF를 사진처럼 보내면 됩니다. <br />
        <strong className="text-ink">Studio 플랜</strong>은 카카오 제안 규격(360×360, 개당 2MB 이하) 검증까지 자동으로 해드려요.
      </div>
    </div>
  );
}
