'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Sticker } from '@/components/Sticker';
import { ConsistencyNotice } from '@/components/studio/ConsistencyNotice';
import { TONES } from '@/lib/art/sticker';
import { COMIC_EXPRESSIONS } from '@/lib/comic-expressions';
import { compressPhotoFile, linkPhoto, loadPhoto, renderImage, runLimited, savePhoto } from '@/lib/studio/photo';
import type { Palette, SheetVariant, StickerSpec, Tone, SubjectKind } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// 캐릭터 시안 선택 (AI 생성본)
//  · 시안 3종은 사진을 참조해 Gemini 가 실제로 그린 이미지다 (SVG 아님)
//  · 사진은 이 탭의 임시 보관본을 쓰고, 사전 확인 및 생성 요청 때 서버로 전송된다
// ─────────────────────────────────────────────────────────────

export function SheetPicker({
  sheetId,
  subjectKind = 'person',
  variants,
  palette,
  tone,
  credits,
  unlimited = false,
  alreadyChosen,
}: {
  sheetId: string;
  subjectKind?: SubjectKind;
  variants: SheetVariant[];
  palette: Palette;
  tone: Tone;
  credits: number;
  unlimited?: boolean;
  alreadyChosen: string | null;
}) {
  const router = useRouter();
  const [chosen, setChosen] = useState<string | null>(alreadyChosen);
  const [size, setSize] = useState<12 | 16 | 24>(12);
  const [comicMode, setComicMode] = useState(false);
  const [comicIds, setComicIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<Record<string, string>>(() =>
    Object.fromEntries(variants.filter((v) => v.imageId).map((v) => [v.key, `/api/images/${v.imageId}`])),
  );
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<Record<string, string>>({});
  const [needPhoto, setNeedPhoto] = useState(false);
  const [photoTick, setPhotoTick] = useState(0);

  async function generate(keys: string[]) {
    const photo = loadPhoto(`sheet:${sheetId}`);
    if (!photo) {
      setNeedPhoto(true);
      return;
    }
    setFailed((prev) => {
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
    setPending((prev) => ({ ...prev, ...Object.fromEntries(keys.map((k) => [k, true])) }));
    await runLimited(keys, 3, async (key) => {
      try {
        const url = await renderImage({ kind: 'sheet', sheetId, variantKey: key }, photo, `sheet:${sheetId}`, subjectKind);
        setImages((prev) => ({ ...prev, [key]: url }));
      } catch (e) {
        setFailed((prev) => ({ ...prev, [key]: (e as Error).message }));
      } finally {
        setPending((prev) => ({ ...prev, [key]: false }));
      }
    });
  }

  // 처음 열렸을 때, 그리고 사진을 다시 올렸을 때 아직 없는 시안을 생성한다
  useEffect(() => {
    const missing = variants.filter((v) => !images[v.key]).map((v) => v.key);
    if (missing.length) void generate(missing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoTick]);

  async function onPickPhoto(file: File) {
    setError(null);
    try {
      savePhoto(await compressPhotoFile(file), `sheet:${sheetId}`);
      setNeedPhoto(false);
      setPhotoTick((t) => t + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function specOf(v: SheetVariant): StickerSpec {
    return {
      seed: v.seed,
      tone,
      palette,
      signature: v.signature,
      emotion: 'joy',
      intensity: 72,
      prop: 'none',
      background: 'cream',
      line: '',
      linePosition: 'bottom',
      imageUrl: images[v.key],
    };
  }

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
        body: JSON.stringify({ sheetId, size, ...(comicMode ? { comicExpressionIds: comicIds } : {}) }),
      });
      const packJson = await packRes.json();
      if (!packRes.ok) throw new Error(packJson?.error?.message ?? '팩을 만들지 못했어요');
      // 시안 생성 시 사용한 사진만 새 팩에 연결한다.
      try {
        if (loadPhoto(`sheet:${sheetId}`)) linkPhoto(`sheet:${sheetId}`, `pack:${packJson.packId}`);
      } catch {
        // 팩은 이미 생성되었으므로 중복 결제를 유발하지 않도록 이동한다. 팩에서 사진을 다시 올릴 수 있다.
      }
      const targetUrl = `/studio/pack/${packJson.packId}`;
      router.push(targetUrl);
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== targetUrl) {
          window.location.assign(targetUrl);
        }
      }, 1000);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const chosenReady = !!(chosen && images[chosen]);

  return (
    <div className="space-y-6">
      <ConsistencyNotice scope={`sheet:${sheetId}`} subjectKind={subjectKind} />
      {needPhoto ? (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-black">이 탭에 사진이 없어요</p>
            <p className="text-xs text-sub">
              사진은 탭을 닫으면 지워집니다. 같은 원본 사진을 한 번 더 올려 주세요.
            </p>
          </div>
          <label className="btn-primary cursor-pointer !py-2 text-xs">
            사진 다시 올리기
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && window.confirm('사진은 이미지 생성 전 확인과 생성 시 Google Gemini로 전송됩니다. AI 확인이 어려우면 파일만 확인하는 기본 방식으로 진행하며 일관성은 보장되지 않습니다. 동의하시면 확인을 눌러 주세요.')) void onPickPhoto(f);
                    e.target.value = '';
              }}
            />
          </label>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {variants.map((v) => {
          const isPending = !!pending[v.key];
          const err = failed[v.key];
          return (
            <div
              key={v.key}
              role="button"
              tabIndex={0}
              onClick={() => images[v.key] && setChosen(v.key)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && images[v.key]) setChosen(v.key);
              }}
              className={clsx(
                'card overflow-hidden p-0 text-left transition',
                images[v.key] ? 'cursor-pointer' : 'cursor-default',
                chosen === v.key ? 'ring-4 ring-coral/40' : images[v.key] ? 'hover:-translate-y-0.5' : '',
              )}
            >
              <div className="bg-cream p-3">
                {images[v.key] ? (
                  <Sticker spec={specOf(v)} ariaLabel={`캐릭터 시안 ${v.key}`} />
                ) : (
                  <div className="grid aspect-square place-items-center rounded-xl bg-[length:200%_100%] bg-gradient-to-r from-line/20 via-line/50 to-line/20 p-4 text-center animate-shimmer">
                    {err ? (
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold text-coralink">{err}</p>
                        <button
                          type="button"
                          className="btn-ghost !px-3 !py-1.5 text-[11px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            void generate([v.key]);
                          }}
                        >
                          다시 그리기
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold text-sub">
                        {isPending || !needPhoto ? 'AI가 시안을 그리는 중…' : '사진을 기다리는 중'}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between border-t-2 border-line px-4 py-3">
                <div>
                  <p className="text-sm font-black">
                    시안 {v.key} · {v.label}
                  </p>
                  <p className="text-[11px] text-sub">{TONES[tone].label} · 같은 사진 기준</p>
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
            </div>
          );
        })}
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black">팩 사이즈</p>
            <p className="text-xs text-sub">{unlimited ? '크레딧 차감 없음' : `1컷 = 1크레딧 · 보유 ${credits}크레딧`}</p>
          </div>
          <div className="flex gap-2">
            {(tone === 'photo-sticker' ? [12, 16] as const : [12, 24] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setSize(s); if (comicMode) setComicIds(COMIC_EXPRESSIONS.slice(0, s).map((item) => item.id)); }}
                className={clsx(
                  'rounded-xl border-2 px-4 py-2 text-sm font-black transition',
                  size === s ? 'border-ink bg-ink text-cream' : 'border-line bg-paper hover:border-ink',
                )}
              >
                {s}컷
                <span className="ml-2 text-[11px] font-bold opacity-70">{unlimited ? '차감 없음' : `${s}크레딧`}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-xl border-2 border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="text-sm font-black">코믹 감정 표현</p><p className="mt-1 text-xs text-sub">일상에서 쓰기 좋은 오리지널 코믹 반응 24종. 원하는 컷을 직접 골라 주세요.</p></div>
            <button type="button" aria-pressed={comicMode} onClick={() => { setComicMode(!comicMode); if (!comicMode) setComicIds(COMIC_EXPRESSIONS.slice(0, size).map((item) => item.id)); }} className="btn-ghost !px-3 !py-2 text-xs">{comicMode ? '기본 자동 구성으로' : '코믹 구성 선택'}</button>
          </div>
          {comicMode ? <>
            <p className="mt-3 text-xs font-bold text-sub">{comicIds.length} / {size}개 선택 · 선택 순서대로 개별 이미지 생성</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label="코믹 감정 표현 선택">
              {COMIC_EXPRESSIONS.map((item) => { const selected = comicIds.includes(item.id); return <button key={item.id} type="button" aria-pressed={selected} disabled={!selected && comicIds.length >= size} onClick={() => setComicIds((prev) => selected ? prev.filter((id) => id !== item.id) : [...prev, item.id])} className={clsx('rounded-xl border-2 p-2 text-left text-xs font-bold disabled:opacity-40', selected ? 'border-ink bg-lemon/30 text-ink' : 'border-line bg-paper text-sub')}><span aria-hidden="true">{item.emoji}</span> {item.label} <span className="block pt-1 text-[10px] font-normal">{item.line}</span></button>; })}
            </div>
            {comicIds.length !== size ? <p className="mt-2 text-xs font-bold text-coralink">{size}개를 선택해야 팩을 만들 수 있어요.</p> : null}
          </> : null}
        </div>

        <div className="mt-4 rounded-xl border border-line bg-cream px-4 py-3 text-[12px] leading-relaxed text-sub">
          {tone === 'photo-sticker'
            ? '표정마다 각각 독립된 이미지로 만들어집니다. 12·16컷은 개인 사용용이며 카카오 정식 제안 규격 충족을 보장하지 않습니다.'
            : <><strong className="text-ink">24컷</strong>은 카카오 이모티콘 스튜디오 제안 규격과 동일한 구성입니다. 12컷은 개인 사용·빠른 제작에 적합합니다.</>}
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border-2 border-coral/50 bg-coral/10 px-3 py-2 text-sm font-bold text-coralink">
            {error}
          </p>
        ) : null}

        <button className="btn-primary mt-4 w-full !py-4" disabled={!chosenReady || busy || (comicMode && comicIds.length !== size)} onClick={create}>
          {busy
            ? '팩 만드는 중…'
            : chosenReady
              ? `${size}컷 만들기 (${unlimited ? '차감 없음' : `${size}크레딧`})`
              : chosen
                ? '시안을 그리는 중입니다'
                : '마음에 드는 시안을 골라 주세요'}
        </button>
        <p className="mt-2 text-center text-[11px] text-sub">
          컷은 한 장씩 AI가 그리며, 완성되는 순서대로 팩에 나타납니다
        </p>
      </div>
    </div>
  );
}
