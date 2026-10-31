'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { Sticker } from '@/components/Sticker';
import { downloadBlob, exportKakaoPackZip, exportPackZip, renderPngBlob } from '@/lib/export';
import { formatKstDateTime } from '@/lib/time';
import { formatBytes, KAKAO_RULES, type PackValidation } from '@/lib/packager';
import type { FrameView, Pack, Plan } from '@/lib/types';

export function PackViewer({
  pack: initialPack,
  frames: initialFrames,
  ready: initialReady,
  total,
  watermark,
  kakao,
}: {
  pack: Pack;
  frames: FrameView[];
  ready: number;
  total: number;
  watermark: boolean;
  kakao: { validation: PackValidation; packaging: boolean; plan: Plan };
}) {
  const [frames, setFrames] = useState(initialFrames);
  const [ready, setReady] = useState(initialReady);
  const [status, setStatus] = useState(initialPack.status);
  const [zipBusy, setZipBusy] = useState(false);
  const [kakaoBusy, setKakaoBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [kakaoNotice, setKakaoNotice] = useState<string | null>(null);
  const [kakaoFiles, setKakaoFiles] = useState<{ name: string; bytes: number }[] | null>(null);

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

  async function downloadKakao() {
    setKakaoBusy(true);
    setKakaoNotice(null);
    try {
      const items = visible
        .filter((f) => f.ready)
        .map((f) => ({ spec: f.spec, filename: `${f.index + 1}-${f.label}` }));
      const result = await exportKakaoPackZip(items, { watermark });
      downloadBlob(result.blob, `emotime-kakao-${initialPack.id}.zip`);
      setKakaoFiles(result.files);
      setKakaoNotice(
        result.validation.ok
          ? `${result.files.length}종 · ${KAKAO_RULES.size}×${KAKAO_RULES.size}px 패키징 완료 (${result.validation.summary})`
          : `패키징은 완료했지만 규격 미충족: ${result.validation.summary}`,
      );
    } catch {
      setKakaoNotice('패키징에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setKakaoBusy(false);
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

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-black">카카오 제안 규격 패키저</p>
            <p className="mt-0.5 text-[11px] text-sub">
              {KAKAO_RULES.count}종 · {KAKAO_RULES.size}×{KAKAO_RULES.size}px · 투명 PNG · 개당{' '}
              {formatBytes(KAKAO_RULES.maxBytes)} 이하
            </p>
          </div>
          <span className={clsx('chip', kakao.validation.ok ? '!border-mint/60 !bg-mint/10' : '!border-coral/50 !bg-coral/10 !text-coralink')}>
            {kakao.validation.ok ? '규격 충족' : '규격 미충족'}
          </span>
        </div>

        <ul className="mt-3 grid gap-1.5 text-[12px] sm:grid-cols-2">
          {kakao.validation.checks.map((c) => (
            <li key={c.id} className={clsx('flex items-start gap-1.5', c.pass ? 'text-ink/80' : 'text-coralink')}>
              <span className="font-black">{c.pass ? '✓' : c.blocking ? '✕' : '!'}</span>
              <span>
                <span className="font-bold">{c.label}</span>
                <span className="block text-[10px] leading-snug text-sub">{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            className="btn-primary !py-2 text-xs"
            disabled={!done || kakaoBusy || !kakao.validation.ok || !kakao.packaging}
            onClick={downloadKakao}
          >
            {kakaoBusy ? '패키징 중…' : '카카오 규격 ZIP 내려받기'}
          </button>
          {!kakao.packaging ? (
            <Link href="/pricing" className="chip !border-coral/50 !bg-coral/10 !text-coralink">
              Studio 플랜에서 사용 가능
            </Link>
          ) : null}
          {kakao.packaging && !kakao.validation.ok ? (
            <span className="text-[11px] text-sub">규격을 충족하면 내려받을 수 있어요</span>
          ) : null}
        </div>

        {kakaoNotice ? (
          <p className={clsx('mt-2 text-xs font-bold', kakaoNotice.includes('미충족') ? 'text-coralink' : 'text-mint')}>
            {kakaoNotice}
          </p>
        ) : null}
        {kakaoFiles ? (
          <p className="mt-1 text-[10px] text-sub">
            파일 크기: {kakaoFiles.map((f) => `${f.name}(${formatBytes(f.bytes)})`).slice(0, 6).join(', ')}
            {kakaoFiles.length > 6 ? ` 외 ${kakaoFiles.length - 6}개` : ''}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border-2 border-dashed border-line p-4 text-center text-xs leading-relaxed text-sub">
        카톡에서는 내보낸 PNG/GIF를 사진처럼 보내면 됩니다. <br />
        <strong className="text-ink">Studio 플랜</strong>은 카카오 제안 규격(360×360, 개당 2MB 이하) 검증·패키징까지
        자동으로 해드려요.
      </div>
    </div>
  );
}
