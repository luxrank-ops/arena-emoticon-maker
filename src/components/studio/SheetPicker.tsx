'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Sticker } from '@/components/Sticker';
import { TONES } from '@/lib/art/sticker';
import type { Palette, SheetVariant, Tone } from '@/lib/types';

export function SheetPicker({
  sheetId,
  variants,
  palette,
  tone,
  credits,
  alreadyChosen,
}: {
  sheetId: string;
  variants: SheetVariant[];
  palette: Palette;
  tone: Tone;
  credits: number;
  alreadyChosen: string | null;
}) {
  const router = useRouter();
  const [chosen, setChosen] = useState<string | null>(alreadyChosen);
  const [size, setSize] = useState<12 | 24>(12);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spec = (v: SheetVariant, emotion: 'joy' | 'king' | 'love' = 'joy') => ({
    seed: v.seed,
    tone,
    palette,
    signature: v.signature,
    emotion,
    intensity: 72,
    prop: 'none' as const,
    background: 'cream' as const,
    line: emotion === 'joy' ? '안녕!' : emotion === 'king' ? '킹받네' : '하트뿅',
    linePosition: 'bottom' as const,
  });

  async function create() {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      const chooseRes = await fetch(`/api/sheets/${sheetId}/choose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantKey: chosen }),
      });
      if (!chooseRes.ok) {
        const j = await chooseRes.json();
        throw new Error(j?.error?.message ?? '캐릭터를 선택하지 못했어요');
      }
      const packRes = await fetch('/api/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId, size }),
      });
      const packJson = await packRes.json();
      if (!packRes.ok) throw new Error(packJson?.error?.message ?? '팩을 만들지 못했어요');
      router.push(`/studio/pack/${packJson.packId}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {variants.map((v) => (
          <button
            key={v.key}
            onClick={() => setChosen(v.key)}
            className={clsx(
              'card overflow-hidden p-0 text-left transition',
              chosen === v.key ? 'ring-4 ring-coral/40' : 'hover:-translate-y-0.5',
            )}
          >
            <div className="bg-cream p-3">
              <Sticker spec={spec(v)} ariaLabel={`캐릭터 시안 ${v.key}`} />
            </div>
            <div className="flex items-center justify-between border-t-2 border-line px-4 py-3">
              <div>
                <p className="text-sm font-black">
                  시안 {v.key} · {v.label}
                </p>
                <p className="text-[11px] text-sub">
                  {TONES[tone].label} · 표정 12종 파생
                </p>
              </div>
              <span
                className={clsx(
                  'grid h-6 w-6 place-items-center rounded-full border-2 text-xs font-black',
                  chosen === v.key ? 'border-ink bg-coral text-white' : 'border-line text-sub',
                )}
              >
                ✓
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black">팩 사이즈</p>
            <p className="text-xs text-sub">1컷 = 1크레딧 · 보유 {credits}크레딧</p>
          </div>
          <div className="flex gap-2">
            {([12, 24] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={clsx(
                  'rounded-xl border-2 px-4 py-2 text-sm font-black transition',
                  size === s ? 'border-ink bg-ink text-cream' : 'border-line bg-paper hover:border-ink',
                )}
              >
                {s}컷
                <span className="ml-2 text-[11px] font-bold opacity-70">{s}크레딧</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-line bg-cream px-4 py-3 text-[12px] leading-relaxed text-sub">
          <strong className="text-ink">24컷</strong>은 카카오 이모티콘 스튜디오 제안 규격과 동일한 구성입니다.
          12컷은 개인 사용·빠른 제작에 적합합니다.
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border-2 border-coral/50 bg-coral/10 px-3 py-2 text-sm font-bold text-coralink">
            {error}
          </p>
        ) : null}

        <button className="btn-primary mt-4 w-full !py-4" disabled={!chosen || busy} onClick={create}>
          {busy ? '팩 생성 중…' : chosen ? `${size}컷 생성하기 (${size}크레딧)` : '캐릭터를 먼저 선택해 주세요'}
        </button>
        <p className="mt-2 text-center text-[11px] text-sub">
          생성은 90초 이내 · 미리보기는 준비되는 순서대로 열립니다
        </p>
      </div>
    </div>
  );
}
