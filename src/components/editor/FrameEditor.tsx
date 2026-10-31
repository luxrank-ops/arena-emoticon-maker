'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { Sticker } from '@/components/Sticker';
import { BACKGROUNDS, EMOTIONS, PROPS } from '@/lib/art/sticker';
import { downloadBlob, renderGifBlob, renderPngBlob } from '@/lib/export';
import { track } from '@/lib/analytics';
import { formatKstTime } from '@/lib/time';
import type { BackgroundKey, Emotion, FrameView, PropKey, StickerSpec } from '@/lib/types';

const QUICK_LINES = ['ㅇㅋ', '킹받네', '출근합니다', '퇴근!!', '고마워!', '배고파아', 'ㅋㅋㅋㅋ', 'ㅠㅠ'];

export function FrameEditor({
  frame: initial,
  packId,
  watermark,
  index,
  total,
}: {
  frame: FrameView;
  packId: string;
  watermark: boolean;
  index: number;
  total: number;
}) {
  const [frame, setFrame] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [emotion, setEmotion] = useState<Emotion>(initial.emotion);

  const spec: StickerSpec = useMemo(
    () => ({ ...frame.spec, emotion, line: frame.line, prop: frame.prop, background: frame.background, intensity: frame.intensity }),
    [frame, emotion],
  );

  async function patch(next: { line?: string; prop?: PropKey; background?: BackgroundKey; intensity?: number; emotion?: Emotion }) {
    const { emotion: e, ...rest } = next;
    if (e) setEmotion(e);
    const merged = { ...frame, ...rest, ...(e ? { emotion: e } : {}) };
    setFrame(merged);
    try {
      const res = await fetch(`/api/frames/${frame.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rest, ...(e ? { emotion: e } : {}) }),
      });
      const json = await res.json();
      if (json.ok) {
        setFrame(json.frame);
        setSavedAt(formatKstTime(new Date()));
      }
    } catch {
      /* 오프라인 편집 유지 */
    }
  }

  async function exportPng() {
    setExporting('png');
    try {
      const blob = await renderPngBlob(spec, { watermark, size: 1024 });
      downloadBlob(blob, `${frame.label}-${frame.index + 1}.png`);
      track('export_sticker', { format: 'png', emotion: frame.emotion });
    } finally {
      setExporting(null);
    }
  }

  async function exportGif() {
    setExporting('gif');
    try {
      const blob = await renderGifBlob(spec, { frames: 12, size: 360 });
      downloadBlob(blob, `${frame.label}-${frame.index + 1}.gif`);
      track('export_sticker', { format: 'gif', emotion: frame.emotion });
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      {/* 미리보기 */}
      <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b-2 border-line px-4 py-2.5">
            <span className="text-xs font-black">
              {index + 1} / {total} · {EMOTIONS[emotion].label}
            </span>
            <span className="chip !bg-cream">{savedAt ? `저장됨 ${savedAt}` : '자동 저장'}</span>
          </div>
          <div className="bg-cream p-4">
            <div className="mx-auto max-w-[340px]">
              <Sticker spec={spec} />
            </div>
          </div>
          {watermark ? (
            <p className="border-t border-line bg-paper px-4 py-2 text-center text-[10px] text-sub">
              Free 플랜은 내보내기에 워터마크가 포함됩니다
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button className="btn-dark !py-3 text-xs" onClick={exportPng} disabled={!!exporting}>
            {exporting === 'png' ? '저장 중…' : 'PNG 내려받기'}
          </button>
          <button className="btn-ghost !py-3 text-xs" onClick={exportGif} disabled={!!exporting}>
            {exporting === 'gif' ? '만드는 중…' : 'GIF 애니메이션'}
          </button>
        </div>
        <Link href={`/studio/pack/${packId}`} className="btn-ghost w-full !py-2 text-xs">
          ← 팩으로 돌아가기
        </Link>
      </div>

      {/* 편집 패널 */}
      <div className="space-y-4">
        <div className="card p-5">
          <label className="text-sm font-black" htmlFor="line">
            대사
          </label>
          <input
            id="line"
            value={frame.line}
            maxLength={34}
            onChange={(e) => setFrame({ ...frame, line: e.target.value })}
            onBlur={() => patch({ line: frame.line })}
            placeholder="짧을수록 잘 읽혀요 (예: ㅇㅋ)"
            className="mt-2 w-full rounded-xl border-2 border-line bg-cream px-4 py-3 text-base font-bold outline-none focus:border-ink"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_LINES.map((l) => (
              <button
                key={l}
                onClick={() => patch({ line: l })}
                className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] font-bold text-sub hover:border-ink hover:text-ink"
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-black" htmlFor="intensity">
              감정선
            </label>
            <span className="chip !bg-cream">{frame.intensity}</span>
          </div>
          <input
            id="intensity"
            type="range"
            min={0}
            max={100}
            value={frame.intensity}
            onChange={(e) => setFrame({ ...frame, intensity: Number(e.target.value) })}
            onMouseUp={() => patch({ intensity: frame.intensity })}
            onTouchEnd={() => patch({ intensity: frame.intensity })}
            className="mt-3 w-full accent-coral"
          />
          <div className="mt-1 flex justify-between text-[10px] font-bold text-sub">
            <span>차분</span>
            <span>보통</span>
            <span>과장</span>
          </div>

          <p className="mt-4 text-sm font-black">표정</p>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {(Object.keys(EMOTIONS) as Emotion[]).map((e) => (
              <button
                key={e}
                onClick={() => patch({ emotion: e })}
                className={clsx(
                  'rounded-lg border-2 px-1 py-1.5 text-[11px] font-bold transition',
                  emotion === e ? 'border-ink bg-ink text-cream' : 'border-line bg-paper text-sub hover:border-ink',
                )}
              >
                {EMOTIONS[e].label}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm font-black">소품</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PROPS.map((p) => (
              <button
                key={p.key}
                onClick={() => patch({ prop: p.key })}
                className={clsx(
                  'rounded-full border-2 px-3 py-1.5 text-[11px] font-bold transition',
                  frame.prop === p.key ? 'border-ink bg-lemon/50' : 'border-line bg-paper text-sub hover:border-ink',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <p className="mt-4 text-sm font-black">배경</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(BACKGROUNDS) as BackgroundKey[]).map((b) => (
              <button
                key={b}
                onClick={() => patch({ background: b })}
                title={BACKGROUNDS[b].label}
                className={clsx(
                  'h-9 w-9 rounded-full border-2 transition',
                  frame.background === b ? 'border-ink ring-2 ring-coral/50' : 'border-line',
                )}
                style={{
                  background:
                    b === 'transparent'
                      ? 'repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50% / 10px 10px'
                      : BACKGROUNDS[b].color,
                }}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border-2 border-dashed border-line p-4 text-[11px] leading-relaxed text-sub">
          편집은 서버에 저장됩니다. <strong className="text-ink">같은 대사·소품·배경</strong>은 캐시되어
          다음부터 생성 없이 즉시 열립니다 (원가 0).
        </div>
      </div>
    </div>
  );
}
