'use client';

import { ACCESSORIES } from '@/lib/accessories';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { Sticker } from '@/components/Sticker';
import { BACKGROUNDS, EMOTIONS, PROPS } from '@/lib/art/sticker';
import { downloadBlob, renderGifBlob, renderPngBlob } from '@/lib/export';
import { track } from '@/lib/analytics';
import { formatKstTime } from '@/lib/time';
import { compressPhotoFile, loadPhoto, renderImage, savePhoto } from '@/lib/studio/photo';
import type { BackgroundKey, Emotion, FrameView, PropKey, StickerSpec } from '@/lib/types';

const QUICK_LINES = ['ㅇㅋ', '킹받네', '출근합니다', '퇴근!!', '고마워!', '배고파아', 'ㅋㅋㅋㅋ', 'ㅠㅠ'];

export function FrameEditor({
  frame: initial,
  packId,
  watermark,
  index,
  total,
  aiPack,
  unlimited = false,
}: {
  frame: FrameView;
  packId: string;
  watermark: boolean;
  index: number;
  total: number;
  /** AI 생성 팩이면 대사·표정 변경 시 컷을 다시 그린다 */
  aiPack: boolean;
  unlimited?: boolean;
}) {
  const [frame, setFrame] = useState(initial);
  const [exporting, setExporting] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [emotion, setEmotion] = useState<Emotion>(initial.emotion);
  // 마지막으로 그려진(또는 처음 받은) 대사·표정 — 이와 다르면 "다시 그리기" 를 연다
  const [drawn, setDrawn] = useState({ line: initial.line, emotion: initial.emotion, accessories: initial.accessoryIds ?? [] });
  const [redrawing, setRedrawing] = useState(false);
  const [redrawError, setRedrawError] = useState<string | null>(null);
  const [needPhoto, setNeedPhoto] = useState(false);
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>(initial.accessoryIds ?? []);

  const spec: StickerSpec = useMemo(
    () => ({ ...frame.spec, emotion, line: frame.line, prop: frame.prop, background: frame.background, intensity: frame.intensity }),
    [frame, emotion],
  );

  const dirty = aiPack && (frame.line !== drawn.line || emotion !== drawn.emotion ||
    selectedAccessories.length !== drawn.accessories.length || selectedAccessories.some((id) => !drawn.accessories.includes(id)));

  function toggleAccessory(id: string) {
    setSelectedAccessories((prev) => prev.includes(id)
      ? prev.filter((item) => item !== id)
      : prev.length < 3 ? [...prev, id] : prev);
  }

  async function patch(next: { line?: string; prop?: PropKey; background?: BackgroundKey; intensity?: number; emotion?: Emotion }, requireSave = false) {
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
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? '편집 내용을 저장하지 못했어요');
      if (json.ok) {
        // 서버 값으로 맞추되, 이미 그려진 이미지 URL 은 유지한다
        setFrame((prev) => ({ ...json.frame, spec: { ...json.frame.spec, imageUrl: prev.spec.imageUrl } }));
        setSavedAt(formatKstTime(new Date()));
      }
    } catch (e) {
      if (requireSave) throw e;
      setRedrawError((e as Error).message || '편집 내용을 저장하지 못했어요');
    }
  }

  // 대사·표정을 저장한 뒤 같은 사진으로 컷을 다시 그린다
  async function redraw() {
    setRedrawError(null);
    const photo = loadPhoto(`pack:${packId}`);
    if (!photo) {
      setNeedPhoto(true);
      setRedrawError('이 탭에 사진이 없어요. 같은 셀카를 다시 올려 주세요.');
      return;
    }
    setRedrawing(true);
    try {
      await patch({ line: frame.line, emotion }, true);
      const url = await renderImage({ kind: 'frame', frameId: frame.id, force: true, accessoryIds: selectedAccessories }, photo);
      setFrame((prev) => ({ ...prev, spec: { ...prev.spec, imageUrl: url } }));
      setDrawn({ line: frame.line, emotion, accessories: selectedAccessories });
      setFrame((prev) => ({ ...prev, accessoryIds: selectedAccessories }));
      track('frame_redraw', { emotion });
    } catch (e) {
      setRedrawError((e as Error).message);
    } finally {
      setRedrawing(false);
    }
  }

  async function onPickPhoto(file: File) {
    try {
      savePhoto(await compressPhotoFile(file), `pack:${packId}`);
      setNeedPhoto(false);
      setRedrawError(null);
    } catch (e) {
      setRedrawError((e as Error).message);
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
            <span className="chip !bg-cream">
              {redrawing ? 'AI가 그리는 중…' : dirty ? '변경됨 · 다시 그리기 필요' : savedAt ? `저장됨 ${savedAt}` : '자동 저장'}
            </span>
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
        { (aiPack || frame.spec.imageUrl) ? (
          <div className="card p-5">
            <p className="text-sm font-black">AI로 다시 그리기</p>
            <p className="mt-1 text-[12px] leading-relaxed text-sub">
              대사, 표정 또는 악세사리를 바꾼 뒤 다시 그리면 같은 사진을 참고해 이 컷을 새로 만듭니다. 보통 20~40초 걸립니다. {unlimited ? '관리자는 크레딧이 차감되지 않습니다.' : '1크레딧이 차감되며, 생성 실패 시 환불됩니다.'}
            </p>
            <button
              className="btn-primary mt-3 w-full !py-3 text-sm"
              disabled={redrawing || (!dirty && !needPhoto)}
              onClick={redraw}
            >
              {redrawing ? 'AI가 그리는 중…' : dirty ? `바뀐 내용으로 다시 그리기 · ${unlimited ? '관리자 무제한' : '1크레딧'}` : '대사·표정·악세사리를 바꾸면 활성화돼요'}
            </button>
            {needPhoto ? (
              <label className="btn-ghost mt-2 w-full cursor-pointer !py-2 text-center text-xs">
                셀카 다시 올리기
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onPickPhoto(f);
                  }}
                />
              </label>
            ) : null}
            {redrawError ? (
              <p className="mt-2 rounded-lg border-2 border-coral/50 bg-coral/10 px-3 py-2 text-xs font-bold text-coralink">
                {redrawError}
              </p>
            ) : null}
          </div>
        ) : null}

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
          {!aiPack ? (
            <>
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
            </>
          ) : null}

          <p className={clsx('text-sm font-black', !aiPack && 'mt-4')}>표정</p>
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

        {aiPack ? (
          <div className="card p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black">악세사리</p>
              <span className="text-xs font-bold text-sub">{selectedAccessories.length} / 3</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-sub">최대 3개를 선택하고 위의 다시 그리기를 눌러 적용하세요. 선택 해제도 다시 그려야 반영됩니다. 별도의 악세사리 비용은 없습니다.</p>
            <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="악세사리 선택">
              {ACCESSORIES.map((accessory) => {
                const selected = selectedAccessories.includes(accessory.id);
                return (
                  <button
                    key={accessory.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={redrawing || (!selected && selectedAccessories.length >= 3)}
                    onClick={() => toggleAccessory(accessory.id)}
                    className={clsx('rounded-xl border-2 px-3 py-3 text-left text-xs font-bold transition disabled:opacity-50', selected ? 'border-ink bg-lemon/50 text-ink' : 'border-line bg-paper text-sub hover:border-ink')}
                  >
                    <span aria-hidden="true" className="mr-2 text-lg">{accessory.emoji}</span>{accessory.name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {!aiPack ? (
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
        ) : null}

        <div className="rounded-2xl border-2 border-dashed border-line p-4 text-[11px] leading-relaxed text-sub">
          {aiPack ? (
            <>
              대사와 표정은 <strong className="text-ink">AI가 그린 컷 안에</strong> 반영됩니다. 바꾼 뒤 다시 그리기를 눌러 주세요.
              악세사리도 다시 그리기로 적용할 수 있습니다. AI 컷의 배경 편집은 지원하지 않습니다.
            </>
          ) : (
            <>
              편집은 서버에 저장됩니다. <strong className="text-ink">같은 대사·소품·배경</strong>은 캐시되어
              다음부터 생성 없이 즉시 열립니다 (원가 0).
            </>
          )}
        </div>
      </div>
    </div>
  );
}
