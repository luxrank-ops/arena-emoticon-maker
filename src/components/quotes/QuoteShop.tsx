'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { Sticker } from '@/components/Sticker';
import { BACKGROUNDS, DEFAULT_PALETTE, DEFAULT_SIGNATURE, EMOTIONS, signatureFromSeed } from '@/lib/art/sticker';
import { downloadBlob, renderPngBlob } from '@/lib/export';
import { exportQuotePackZip } from '@/lib/quote-export';
import { sampleCutFor } from '@/lib/quote-samples';
import { layerFromLine, type TextLayer } from '@/lib/studio/layers';
import type { QuoteLine, QuotePackView } from '@/lib/quote-packs';
import type { BackgroundKey, Emotion, StickerSpec } from '@/lib/types';

function seedOf(id: string) {
  return Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0) * 97 + 41;
}

/**
 * 대사 팩 미리보기 그림체.
 *  · 'photo'  = 내 사진을 넣었을 때의 결과(실사 짤) — 기본값. 실사가 앱의 지향점이다.
 *  · 'pack'   = 이 팩의 화풍(2D·수채화 등)으로 만들었을 때의 모습.
 */
export type QuotePreviewStyle = 'photo' | 'pack';

function quoteSpec(
  pack: QuotePackView,
  line: QuoteLine,
  emotion: Emotion,
  background: BackgroundKey,
  previewStyle: QuotePreviewStyle = 'photo',
): StickerSpec {
  const seed = seedOf(line.id);
  const base: StickerSpec = {
    seed,
    tone: pack.tone,
    palette: { ...DEFAULT_PALETTE, accent: pack.accent },
    signature: { ...DEFAULT_SIGNATURE, ...signatureFromSeed(seed) },
    emotion,
    intensity: 74,
    prop: 'none',
    background,
    line: line.line,
    linePosition: 'bottom',
  };
  // 사진으로 만든 샘플 컷이 있으면 그 컷을 쓰고, 대사는 앱의 캘리그라피 레이어로 얹는다.
  // (그림에 글자를 굽지 않아 표정만 바꿔도 같은 인물의 다른 컷이 나온다)
  // '실사 짤' 미리보기는 사진 컷(12감정 실사 컷)을 쓰고, '팩 화풍'은 그 팩의 그림체 컷을 쓴다.
  const imageUrl = sampleCutFor(emotion, previewStyle === 'photo' ? 'photo-sticker' : pack.tone);
  if (!imageUrl) return base;
  // 샘플 컷은 얼굴이 화면 위쪽에 커서 기본 크기·위치면 턱을 가린다 → 조금 작게, 더 아래에.
  // (2줄로 접히는 긴 대사도 얼굴을 피해 셔츠 영역에 앉는다)
  const layer = layerFromLine(line.line, { size: 0.105, y: 0.9 });
  const textLayers: TextLayer[] = layer ? [layer] : [];
  return { ...base, imageUrl, ...(textLayers.length ? { textLayers } : {}) };
}

export function QuoteShop({
  initialPacks,
  initialOwnedIds,
  initialCredits,
  unlimited,
  watermark,
  isAuthenticated,
  initialPackId,
  initialGroupId,
}: {
  initialPacks: QuotePackView[];
  initialOwnedIds: string[];
  initialCredits: number;
  unlimited: boolean;
  watermark: boolean;
  isAuthenticated: boolean;
  /** /presets 테마 카드에서 넘어올 때 그 팩을 바로 연다 */
  initialPackId?: string;
  /** 그 팩 안의 세부 테마(묶음)를 미리 골라 둔다 */
  initialGroupId?: string;
}) {
  const [packs, setPacks] = useState(initialPacks);
  const [ownedIds, setOwnedIds] = useState(initialOwnedIds);
  const [credits, setCredits] = useState(initialCredits);
  const openingPack = initialPacks.find((pack) => pack.id === initialPackId) ?? initialPacks[0];
  const [packId, setPackId] = useState(openingPack?.id ?? '');
  const currentPack = packs.find((pack) => pack.id === packId) ?? packs[0];
  const [groupId, setGroupId] = useState<string | null>(
    initialGroupId && openingPack?.groups?.some((group) => group.id === initialGroupId) ? initialGroupId : null,
  );
  const visibleLines = (groupId ? currentPack?.lines.filter((line) => line.groupId === groupId) : currentPack?.lines) ?? [];
  const [lineId, setLineId] = useState(visibleLines[0]?.id ?? '');
  const selectedLine = visibleLines.find((line) => line.id === lineId) ?? visibleLines[0];
  const [emotion, setEmotion] = useState<Emotion>(selectedLine?.emotion ?? 'joy');
  const [background, setBackground] = useState<BackgroundKey>('transparent');
  const [previewStyle, setPreviewStyle] = useState<QuotePreviewStyle>('photo');
  const [busy, setBusy] = useState(false);
  const [zipBusy, setZipBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // 팩·세부 테마·대사가 바뀌면 고른 값이 그 목록에 없을 때 첫 항목으로 되돌린다.
  // (사용자가 고른 상태를 유지하려는 의도적 동기화 — 렌더 파생으로 바꾸면 선택이 풀린다.)
  /* eslint-disable react-hooks/set-state-in-effect -- 팩·목록 변경에 맞춘 선택값 보정 */
  useEffect(() => {
    if (!currentPack) return;
    // 팩이 바뀌면 그 팩에 없는 세부 테마는 푼다.
    if (groupId && !currentPack.groups?.some((group) => group.id === groupId)) setGroupId(null);
    if (!currentPack.lines.some((line) => line.id === lineId)) setLineId(visibleLines[0]?.id ?? currentPack.lines[0]?.id ?? '');
  }, [currentPack, groupId, lineId, visibleLines]);

  useEffect(() => {
    if (visibleLines.length && !visibleLines.some((line) => line.id === lineId)) setLineId(visibleLines[0].id);
  }, [visibleLines, lineId]);

  useEffect(() => {
    if (selectedLine) setEmotion(selectedLine.emotion);
  }, [selectedLine]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const owned = !!currentPack && (unlimited || currentPack.priceCredits === 0 || ownedIds.includes(currentPack.id));
  const currentWatermark = unlimited || (currentPack?.priceCredits > 0 && owned) ? false : watermark;
  const spec = useMemo(
    () => currentPack && selectedLine ? quoteSpec(currentPack, selectedLine, emotion, background, previewStyle) : null,
    [currentPack, selectedLine, emotion, background, previewStyle],
  );

  if (!currentPack || !selectedLine || !spec) return null;

  async function purchase() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/quote-packs/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: currentPack.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? '팩을 구매하지 못했어요');
      const unlocked = json.pack as QuotePackView;
      setPacks((prev) => prev.map((pack) => pack.id === unlocked.id ? unlocked : pack));
      setOwnedIds((prev) => prev.includes(unlocked.id) ? prev : [...prev, unlocked.id]);
      setCredits(json.balance);
      setNotice(`「${unlocked.title}」 ${unlocked.lineCount}컷을 모두 열었어요. 이제 워터마크 없이 다운로드할 수 있습니다.`);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function downloadOne() {
    if (!spec) return;
    setDownloadBusy(true);
    setError('');
    try {
      const blob = await renderPngBlob(spec, { watermark: currentWatermark });
      downloadBlob(blob, `${currentPack.id}-${selectedLine.id}.png`);
    } catch {
      setError('PNG를 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setDownloadBusy(false);
    }
  }

  async function downloadZip() {
    if (!owned || currentPack.access !== 'FULL') return;
    setZipBusy(true);
    setError('');
    try {
      const items = currentPack.lines.map((line, index) => ({
        spec: quoteSpec(currentPack, line, line.emotion, 'transparent', previewStyle),
        filename: `${String(index + 1).padStart(2, '0')}-${line.id}`,
        quoteId: line.id,
      }));
      const blob = await exportQuotePackZip(currentPack, items, { watermark: currentWatermark });
      downloadBlob(blob, `emotihak-${currentPack.id}.zip`);
      setNotice(`${currentPack.lineCount}컷과 원본 대사 사용권 안내를 ZIP으로 다운로드했어요.`);
    } catch {
      setError('ZIP을 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setZipBusy(false);
    }
  }

  return (
    <div className="space-y-7">
      <div className="card-flat flex flex-wrap items-start justify-between gap-3 border-ink/20 bg-lemon/20 p-4 text-xs leading-relaxed text-sub">
        <p className="max-w-3xl"><strong className="text-ink">저작권 안심 구성:</strong> 유명 영화·드라마 대사를 복제하지 않고, 장르의 분위기만 살린 오리지널 문구입니다. 작품명·캐릭터·배우 초상도 사용하지 않습니다.</p>
        <span className="chip shrink-0 !bg-white">ORIGINAL · 개인 사용권</span>
      </div>

      {!isAuthenticated ? <p className="rounded-xl border-2 border-line bg-paper p-4 text-xs leading-relaxed text-sub">게스트 구매는 이 세션에 연결됩니다. 다른 기기에서도 구매한 팩을 사용하려면 <Link href="/login" className="font-bold text-coralink underline">로그인</Link>한 뒤 구매해 주세요.</p> : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" role="group" aria-label="대사 팩 선택">
        {packs.map((pack, index) => {
          const packOwned = unlimited || pack.priceCredits === 0 || ownedIds.includes(pack.id);
          const selected = pack.id === currentPack.id;
          return (
            <button key={pack.id} type="button" aria-pressed={selected} onClick={() => { setPackId(pack.id); setGroupId(null); setNotice(''); setError(''); }} className={clsx('card h-full min-h-[120px] p-3 text-left transition hover:-translate-y-0.5 sm:p-4', index === packs.length - 1 && packs.length % 2 === 1 && 'col-span-2 sm:col-span-1', selected && 'ring-4 ring-coral/30')} style={{ background: selected ? `${pack.accent}20` : undefined }}>
              <div className="flex items-start justify-between gap-2"><span className="text-2xl" aria-hidden="true">{pack.emoji}</span><span className={clsx('chip !px-2 !py-0.5 !text-[10px]', packOwned ? '!bg-mint/10 !text-ink' : '!bg-cream')}>{packOwned ? pack.priceCredits === 0 ? '무료' : '보유함' : `${pack.priceCredits}크레딧`}</span></div>
              <h2 className="mt-2 text-sm font-black">{pack.title}</h2>
              <p className="mt-1 text-[11px] leading-snug text-sub">{pack.genre} · {pack.lineCount}컷</p>
            </button>
          );
        })}
      </div>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="card overflow-hidden">
          <div className="border-b-2 border-line p-5" style={{ background: `${currentPack.accent}18` }}>
            <p className="eyebrow">{currentPack.genre}</p>
            <h2 className="mt-1 text-2xl font-black">{currentPack.emoji} {currentPack.title}</h2>
            <p className="mt-2 text-sm font-bold">{currentPack.tagline}</p>
            <p className="mt-1 text-xs leading-relaxed text-sub">{currentPack.description}</p>
          </div>
          <div className="bg-cream p-5">
            <div className="mb-2 flex justify-center gap-1.5" role="group" aria-label="미리보기 그림체">
              <button type="button" aria-pressed={previewStyle === 'photo'} onClick={() => setPreviewStyle('photo')} className={clsx('rounded-full border px-3 py-1.5 text-[11px] font-black transition', previewStyle === 'photo' ? 'border-primary bg-primary text-white' : 'border-line bg-white text-sub hover:text-ink')}>
                📸 실사 짤 <span className="opacity-70">(사진 그대로)</span>
              </button>
              <button type="button" aria-pressed={previewStyle === 'pack'} onClick={() => setPreviewStyle('pack')} className={clsx('rounded-full border px-3 py-1.5 text-[11px] font-black transition', previewStyle === 'pack' ? 'border-primary bg-primary text-white' : 'border-line bg-white text-sub hover:text-ink')}>
                🎨 이 팩의 화풍
              </button>
            </div>
            <div className="mx-auto max-w-[340px] overflow-hidden rounded-2xl" style={{ background: BACKGROUNDS[background].color }}><Sticker spec={spec} ariaLabel={`${selectedLine.label} 대사 이모티콘`} /></div>
          </div>
          <div className="border-t border-line p-4 text-center"><p className="text-xs font-bold text-sub">“{selectedLine.line}”</p><p className="mt-1 text-[11px] text-sub">{selectedLine.label} · 감정과 배경을 바꿔 나만의 컷으로 만들어 보세요</p></div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-sm font-black">{owned ? '전체 팩 사용 중' : '미리보기 2컷 공개 중'}</p><p className="mt-1 text-xs text-sub">{owned ? `${currentPack.lineCount}컷 모두 선택하고 PNG·ZIP으로 저장할 수 있어요.` : `전체 ${currentPack.lineCount}컷 · ${currentPack.priceCredits}크레딧 · 구매 후 워터마크 없음`}</p></div>
              <span className="chip !bg-cream">보유 {unlimited ? '차감 없음' : `${credits}크레딧`}</span>
            </div>
            {!owned ? (
              <div className="mt-4 rounded-xl border-2 border-line bg-cream p-4">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-lg font-black">{currentPack.priceCredits}크레딧</p><p className="text-xs text-sub">한 번 구매하면 계속 사용 · 개인 메신저 사용권</p></div><button className="btn-primary" disabled={busy || credits < currentPack.priceCredits} onClick={purchase}>{busy ? '구매 중…' : '이 대사 팩 구매'}</button></div>
                {credits < currentPack.priceCredits ? <p className="mt-2 text-xs font-bold text-coralink">크레딧이 부족해요. <Link href="/pricing" className="underline">충전하러 가기 →</Link></p> : null}
              </div>
            ) : (
              <button className="btn-dark mt-4 w-full !py-3" disabled={zipBusy || currentPack.access !== 'FULL'} onClick={downloadZip}>{zipBusy ? 'ZIP 만드는 중…' : `전체 ${currentPack.lineCount}컷 ZIP 다운로드`}</button>
            )}
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-black">감정·배경 바꾸기</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-sub">표정<select className="mt-1 w-full rounded-xl border-2 border-line bg-cream px-3 py-2.5 text-sm font-bold text-ink" value={emotion} onChange={(event) => setEmotion(event.target.value as Emotion)}>{Object.entries(EMOTIONS).map(([key, value]) => <option key={key} value={key}>{value.emoji} {value.label}</option>)}</select></label>
              <label className="text-xs font-bold text-sub">배경<select className="mt-1 w-full rounded-xl border-2 border-line bg-cream px-3 py-2.5 text-sm font-bold text-ink" value={background} onChange={(event) => setBackground(event.target.value as BackgroundKey)}>{Object.entries(BACKGROUNDS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
            </div>
            <button className="btn-primary mt-4 w-full !py-3" disabled={downloadBusy} onClick={downloadOne}>{downloadBusy ? 'PNG 만드는 중…' : '선택한 컷 PNG 다운로드'}</button>
            <p className="mt-2 text-center text-[11px] text-sub">{currentWatermark ? '미리보기·무료 팩은 워터마크가 포함됩니다.' : '구매한 팩은 워터마크 없이 저장됩니다.'}</p>
          </div>

          {notice ? <p role="status" className="rounded-xl border-2 border-mint/40 bg-mint/10 p-3 text-xs font-bold text-ink">{notice}</p> : null}
          {error ? <p role="alert" className="rounded-xl border-2 border-coral/50 bg-coral/10 p-3 text-xs font-bold text-coralink">{error}</p> : null}
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-lg font-black">대사를 골라 감정 컷 만들기</h2><p className="mt-1 text-xs text-sub">각 대사의 추천 표정을 그대로 쓰거나, 위에서 다른 감정을 선택할 수 있어요.</p></div><span className="text-xs font-bold text-sub">{visibleLines.length} / {currentPack.lineCount}컷 공개</span></div>
        {currentPack.groups?.length ? (
          <div role="group" aria-label="세부 테마 선택" className="mb-3 flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={groupId === null} onClick={() => setGroupId(null)} className={clsx('rounded-full border px-3 py-1.5 text-[11px] font-black transition', groupId === null ? 'border-primary bg-primary text-white' : 'border-line bg-white text-sub hover:text-ink')}>
              전체 {currentPack.lineCount}컷
            </button>
            {currentPack.groups.map((group) => {
              const count = currentPack.lines.filter((line) => line.groupId === group.id).length;
              const active = groupId === group.id;
              return (
                <button key={group.id} type="button" aria-pressed={active} onClick={() => setGroupId(active ? null : group.id)} className={clsx('rounded-full border px-3 py-1.5 text-[11px] font-black transition', active ? 'border-primary bg-primary text-white' : 'border-line bg-white text-sub hover:text-ink')}>
                  <span aria-hidden="true">{group.emoji}</span> {group.label} {count}
                </button>
              );
            })}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {visibleLines.map((line) => <button key={line.id} type="button" aria-pressed={line.id === selectedLine.id} onClick={() => setLineId(line.id)} className={clsx('card overflow-hidden p-0 text-left transition hover:-translate-y-0.5', line.id === selectedLine.id && 'ring-4 ring-coral/30')}><div className="bg-cream p-2"><Sticker spec={quoteSpec(currentPack, line, line.emotion, 'cream', previewStyle)} ariaLabel={line.label} /></div><div className="border-t-2 border-line p-3"><p className="text-xs font-black">{line.label}</p><p className="mt-1 truncate text-[11px] text-sub">{line.line}</p></div></button>)}
          {Array.from({ length: groupId ? 0 : Math.max(0, currentPack.lineCount - currentPack.lines.length) }, (_, index) => <div key={`locked-${index}`} className="card grid aspect-[0.88] place-items-center border-dashed bg-cream/50 p-4 text-center opacity-75"><div><span className="text-2xl" aria-hidden="true">🔒</span><p className="mt-2 text-xs font-black">유료 컷 잠금</p><p className="mt-1 text-[11px] text-sub">팩 구매 후 대사와 이미지가 공개됩니다</p></div></div>)}
        </div>
      </section>

      <details className="card-flat p-4 text-xs leading-relaxed text-sub"><summary className="cursor-pointer font-black text-ink">원본 대사와 사용권 안내</summary><p className="mt-3">{currentPack.rights.note}</p><p className="mt-2">구매 또는 무료 이용은 개인 메신저에서 사용할 수 있는 비독점적 사용권을 제공합니다. 팩 재판매·재배포와 광고·방송·출판 등 상업적 이용은 별도 서면 라이선스가 필요합니다. 실제 명대사는 권리자의 서면 라이선스와 지역·기간·매체 범위를 확인한 경우에만 등록합니다.</p></details>
    </div>
  );
}
