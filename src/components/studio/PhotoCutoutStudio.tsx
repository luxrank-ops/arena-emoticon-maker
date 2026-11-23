'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { downloadBlob, exportKakaoPackZip, renderFrameCanvas, renderPngBlob, type MatteInfo } from '@/lib/export';
import { EMOTIONS } from '@/lib/art/sticker';
import { LAYER_EFFECTS, TEXT_STYLES } from '@/lib/studio/layers';
import { localizedPath, tr, type Locale } from '@/lib/i18n/locale';
import {
  CUTOUT_CAPTION_MAX,
  CUTOUT_DEFAULT_OUTLINE,
  CUTOUT_MAX_OUTLINE,
  CUTOUT_MAX_PHOTOS,
  CUTOUT_PHOTO_SIDE,
  CUTOUT_SIZE,
  CUTOUT_SUGGESTIONS,
  CUTOUT_SUGGESTION_COUNT,
  CUTOUT_ZIP_NAME,
  DEFAULT_CUTOUT_STYLE,
  cutoutFileName,
  cutoutOrder,
  cutoutSeed,
  cutoutSpec,
  hasCaption,
  type CutoutCrop,
  type CutoutStyle,
  type CutoutSuggestionLine,
} from '@/lib/studio/photo-cutout';

// ─────────────────────────────────────────────────────────────
// 내 사진 바로 누끼 스티커 (무료 · 서버 왕복 없음)
//  · 사진 1~12장을 올리면 기기 안에서 배경을 떼고(AI 피사체 누끼) 흰 스티커 외곽선을 입힌다.
//  · 컷마다 캘리그라피 한 줄·심플 데코를 골라 얹고, 360×360 투명 PNG 또는 카카오 규격 ZIP으로 저장한다.
//  · Gemini 를 호출하지 않으므로 원가 0원·대기 없음. 사진은 서버로 보내지 않는다.
// ─────────────────────────────────────────────────────────────

interface Cutout {
  id: string;
  /** 원본 파일 — 구도를 다시 잡을 때 다시 잘라 쓴다 */
  file: File;
  name: string;
  /** 800×800 정사각으로 다듬은 data URL (기기 밖으로 나가지 않는다) */
  photo: string;
  crop: CutoutCrop;
  /** 구도를 다시 잡을 때마다 올라가는 판 번호 — 미리보기 캐시 키에 쓴다 */
  rev: number;
  style: CutoutStyle;
  /** 마지막으로 만든 360 미리보기 (PNG data URL) */
  preview?: string;
  matte?: MatteInfo;
}

const CHECKER: CSSProperties = {
  backgroundColor: '#FBF7F1',
  backgroundImage:
    'linear-gradient(45deg, #EFE6D8 25%, transparent 25%, transparent 75%, #EFE8DA 75%), linear-gradient(45deg, #EFE6D8 25%, transparent 25%, transparent 75%, #EFE8DA 75%)',
  backgroundSize: '18px 18px',
  backgroundPosition: '0 0, 9px 9px',
};

const CUTOUT_TEXT_STYLE_IDS = ['calli', 'brush', 'hand', 'gothic', 'bold'] as const;
const CUTOUT_EFFECT_IDS = ['none', 'heart', 'sparkle', 'star', 'crown', 'flower', 'party', 'sweat', 'zzz', 'question'] as const;

/** 세로로 긴 사진을 정사각으로 다듬는다 (얼굴 위주 = 위쪽 32% 기준, 가운데 = 정중앙) */
async function squarePhoto(file: File, crop: CutoutCrop): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) * (crop === 'face' ? 0.32 : 0.5);
    const canvas = document.createElement('canvas');
    canvas.width = CUTOUT_PHOTO_SIDE;
    canvas.height = CUTOUT_PHOTO_SIDE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // JPEG 은 투명을 담지 못한다 — 투명 PNG 를 올려도 검게 죽지 않게 흰 바탕을 깐다.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CUTOUT_PHOTO_SIDE, CUTOUT_PHOTO_SIDE);
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, CUTOUT_PHOTO_SIDE, CUTOUT_PHOTO_SIDE);
    return canvas.toDataURL('image/jpeg', 0.92);
  } finally {
    bitmap.close?.();
  }
}

function matteLabel(info: MatteInfo | undefined, locale: Locale): string | null {
  if (!info) return null;
  if (info.engine === 'ai') {
    const percent = info.coverage ? Math.round(info.coverage * 100) : null;
    return tr(
      locale,
      percent ? `✨ AI 정밀 누끼 · 피사체 ${percent}%` : '✨ AI 정밀 누끼 적용',
      percent ? `✨ AI cutout · subject ${percent}%` : '✨ AI cutout applied',
    );
  }
  if (info.reason === 'color-fallback') {
    return tr(locale, '빠른 누끼 — 이 기기에서는 AI 누끼를 못 써서 단색 기준으로 뗐어요', 'Quick cutout — AI matte unavailable on this device');
  }
  return tr(locale, '빠른 누끼 — 단색 배경이라 바로 뗐어요', 'Quick cutout — flat background removed');
}

function styleKeyOf(cut: Cutout, outline: number): string {
  return JSON.stringify([cut.rev, cut.crop, cut.style, outline]);
}

export function PhotoCutoutStudio({ locale = 'ko' }: { locale?: Locale }) {
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const lp = (href: string) => localizedPath(locale, href);

  const [cuts, setCuts] = useState<Cutout[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [outline, setOutline] = useState(CUTOUT_DEFAULT_OUTLINE);
  const [themeId, setThemeId] = useState<string>(CUTOUT_SUGGESTIONS[0]?.id ?? '');
  const [uploading, setUploading] = useState(false);
  const [rendering, setRendering] = useState<string[]>([]);
  const [zipBusy, setZipBusy] = useState(false);
  const [pngBusy, setPngBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const cutsRef = useRef<Cutout[]>([]);
  const renderedRef = useRef(new Map<string, string>());
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const selected = cuts.find((cut) => cut.id === selectedId) ?? cuts[0] ?? null;
  const textStyles = useMemo(() => TEXT_STYLES.filter((item) => (CUTOUT_TEXT_STYLE_IDS as readonly string[]).includes(item.id)), []);
  const effects = useMemo(() => LAYER_EFFECTS.filter((item) => (CUTOUT_EFFECT_IDS as readonly string[]).includes(item.id)), []);
  const activeTheme = CUTOUT_SUGGESTIONS.find((theme) => theme.id === themeId) ?? CUTOUT_SUGGESTIONS[0];

  useEffect(() => {
    cutsRef.current = cuts;
  }, [cuts]);

  // 컷 하나를 그린다 — 미리보기와 같은 파이프라인(누끼 + 외곽선 + 레이어)을 쓴다.
  // MediaPipe 세그멘터는 한 번에 하나씩만 써야 해서 큐로 순서를 지킨다.
  const renderCut = useCallback(
    async (cut: Cutout) => {
      const key = styleKeyOf(cut, outline);
      if (renderedRef.current.get(cut.id) === key) return;
      setRendering((prev) => (prev.includes(cut.id) ? prev : [...prev, cut.id]));
      try {
        let info: MatteInfo | null = null;
        const canvas = await renderFrameCanvas(cutoutSpec({ photo: cut.photo, style: cut.style, seed: cutoutSeed(cut.id) }), {
          size: CUTOUT_SIZE,
          outline,
          preciseMatte: true,
          matteEngine: 'auto',
          onMatte: (next) => {
            info = next;
          },
        });
        const latest = cutsRef.current.find((item) => item.id === cut.id);
        // 그리는 사이에 문구·구도가 바뀌었으면 결과를 버린다(다음 렌더가 맞는 값을 만든다).
        if (latest && styleKeyOf(latest, outline) !== key) return;
        renderedRef.current.set(cut.id, key);
        const preview = canvas.toDataURL('image/png');
        setCuts((prev) => prev.map((item) => (item.id === cut.id ? { ...item, preview, matte: info ?? item.matte } : item)));
      } catch {
        setError(t('미리보기를 만들지 못했어요. 사진을 다시 선택해 주세요.', 'We could not build the preview. Please choose the photo again.'));
      } finally {
        setRendering((prev) => prev.filter((id) => id !== cut.id));
      }
    },
    [outline, locale],
  );

  const enqueue = useCallback(
    (cut: Cutout) => {
      queueRef.current = queueRef.current
        .then(() => renderCut(cut))
        .catch(() => {
          /* 한 컷 실패가 다음 컷을 막지 않는다 */
        });
    },
    [renderCut],
  );

  // 선택한 컷의 문구·구도가 바뀌면 잠깐 기다렸다 다시 그린다(타이핑 중 깜빡임 방지).
  const selectedKey = selected ? styleKeyOf(selected, outline) : '';
  useEffect(() => {
    if (!selected) return;
    const timer = window.setTimeout(() => enqueue(selected), 240);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  // 외곽선 두께는 모든 컷에 적용된다 — 미리보기와 ZIP 결과가 어긋나지 않게 함께 다시 그린다.
  useEffect(() => {
    if (cuts.length === 0) return;
    const timer = window.setTimeout(() => {
      for (const cut of cutsRef.current) enqueue(cut);
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outline]);

  function updateSelected(patch: Partial<CutoutStyle>) {
    if (!selected) return;
    setCuts((prev) => prev.map((cut) => (cut.id === selected.id ? { ...cut, style: { ...cut.style, ...patch } } : cut)));
  }

  async function addFiles(files: FileList | File[] | null) {
    if (!files) return;
    setError(null);
    setNotice(null);
    const list = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (list.length === 0) {
      setError(t('이미지 파일만 올릴 수 있어요.', 'Only image files can be added.'));
      return;
    }
    const room = CUTOUT_MAX_PHOTOS - cutsRef.current.length;
    if (room <= 0) {
      setNotice(t(`사진은 한 번에 ${CUTOUT_MAX_PHOTOS}장까지예요. 필요 없는 컷을 지우고 다시 올려 주세요.`, `Up to ${CUTOUT_MAX_PHOTOS} photos at a time. Remove one to add another.`));
      return;
    }
    const accepted = list.slice(0, room);
    if (list.length > room) {
      setNotice(t(`사진은 한 번에 ${CUTOUT_MAX_PHOTOS}장까지예요. ${accepted.length}장을 올렸어요.`, `Up to ${CUTOUT_MAX_PHOTOS} photos — ${accepted.length} added.`));
    }
    setUploading(true);
    const added: Cutout[] = [];
    for (const file of accepted) {
      try {
        const photo = await squarePhoto(file, 'face');
        added.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          photo,
          crop: 'face',
          rev: 0,
          style: { ...DEFAULT_CUTOUT_STYLE },
        });
      } catch {
        /* 읽지 못한 파일은 건너뛴다 */
      }
    }
    setUploading(false);
    if (added.length === 0) {
      setError(t('사진을 읽지 못했어요. 다른 사진으로 시도해 주세요.', 'We could not read that photo. Please try another image.'));
      return;
    }
    setCuts((prev) => [...prev, ...added]);
    setSelectedId((prev) => prev ?? added[0].id);
    for (const cut of added) enqueue(cut);
  }

  async function recrop(cut: Cutout, crop: CutoutCrop) {
    if (cut.crop === crop) return;
    setError(null);
    try {
      const photo = await squarePhoto(cut.file, crop);
      setCuts((prev) => prev.map((item) => (item.id === cut.id ? { ...item, photo, crop, rev: item.rev + 1 } : item)));
    } catch {
      setError(t('사진 구도를 다시 잡지 못했어요.', 'We could not re-frame the photo.'));
    }
  }

  function removeCut(id: string) {
    const next = cutsRef.current.filter((cut) => cut.id !== id);
    renderedRef.current.delete(id);
    setCuts(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  }

  function clearAll() {
    renderedRef.current.clear();
    setCuts([]);
    setSelectedId(null);
    setNotice(null);
    setError(null);
  }

  function applySuggestion(line: CutoutSuggestionLine) {
    updateSelected({ caption: line.line.slice(0, CUTOUT_CAPTION_MAX), emotion: line.emotion });
  }

  function randomSuggestion() {
    if (!activeTheme) return;
    const line = activeTheme.lines[Math.floor(Math.random() * activeTheme.lines.length)];
    if (!line) return;
    setThemeId(activeTheme.id);
    applySuggestion(line);
  }

  async function downloadSelected() {
    if (!selected) return;
    setPngBusy(true);
    setError(null);
    setNotice(null);
    try {
      const index = cutsRef.current.findIndex((cut) => cut.id === selected.id);
      const blob = await renderPngBlob(cutoutSpec({ photo: selected.photo, style: selected.style, seed: cutoutSeed(selected.id) }), {
        size: CUTOUT_SIZE,
        outline,
        preciseMatte: true,
        matteEngine: 'auto',
      });
      downloadBlob(blob, cutoutFileName(index < 0 ? 0 : index));
      setNotice(
        t(
          `투명 PNG ${CUTOUT_SIZE}×${CUTOUT_SIZE}를 내려받았어요 (${Math.round(blob.size / 1024)}KB). 카카오톡 채팅방에 사진으로 보내면 스티커처럼 보여요.`,
          `Downloaded a transparent ${CUTOUT_SIZE}×${CUTOUT_SIZE} PNG (${Math.round(blob.size / 1024)}KB).`,
        ),
      );
    } catch {
      setError(t('PNG를 만들지 못했어요. 잠시 후 다시 시도해 주세요.', 'We could not build the PNG. Please try again.'));
    } finally {
      setPngBusy(false);
    }
  }

  async function downloadZip() {
    const list = cutsRef.current;
    if (list.length === 0) return;
    setZipBusy(true);
    setError(null);
    setNotice(null);
    try {
      const items = list.map((cut, index) => ({
        spec: cutoutSpec({ photo: cut.photo, style: cut.style, seed: cutoutSeed(cut.id) }),
        filename: `${cutoutOrder(index)}-cutout`,
      }));
      const result = await exportKakaoPackZip(items, { outline, preciseMatte: true, matteEngine: 'auto', motion: 'none' });
      downloadBlob(result.blob, CUTOUT_ZIP_NAME);
      // 컷 수(공식 32컷)는 내 대화방용 팩에는 해당 없다 — 픽셀·용량 같은 실제 쓸모 기준으로 안내한다.
      const usable = result.validation.exportable;
      setNotice(
        usable
          ? t(
              `${list.length}컷 카카오 규격 ZIP을 내려받았어요. 360×360 · 개당 150KB 이하 확인${result.compressed > 0 ? ` · 자동 압축 ${result.compressed}컷` : ''}. 카카오 공식 제안은 32컷이라 개수는 다르지만, 내 대화방에 바로 쓸 수 있어요.`,
              `Downloaded a ${list.length}-cut ZIP (360×360, under 150KB each).`,
            )
          : t(
              `${list.length}컷 ZIP을 내려받았어요. ${result.validation.summary}`,
              `Downloaded a ${list.length}-cut ZIP. ${result.validation.summary}`,
            ),
      );
    } catch {
      setError(t('ZIP을 만들지 못했어요. 잠시 후 다시 시도해 주세요.', 'We could not build the ZIP. Please try again.'));
    } finally {
      setZipBusy(false);
    }
  }

  const selectedIndex = selected ? cuts.findIndex((cut) => cut.id === selected.id) : -1;
  const matteText = matteLabel(selected?.matte, locale);
  const captionLength = selected?.style.caption.length ?? 0;

  return (
    <div className="space-y-6">
      <nav aria-label={t('현재 위치', 'Breadcrumb')} className="flex items-center gap-2 text-xs font-bold text-sub">
        <Link href={lp('/')} className="hover:text-ink">{t('홈', 'Home')}</Link>
        <span>/</span>
        <Link href={lp('/studio/upload')} className="hover:text-ink">{t('만들기', 'Create')}</Link>
        <span>/</span>
        <span className="text-ink">{t('내 사진 누끼', 'Photo cutout')}</span>
      </nav>

      <header>
        <p className="eyebrow">{t('PHOTO CUTOUT · FREE', 'PHOTO CUTOUT · FREE')}</p>
        <h1 className="h2 mt-1 break-keep">📸 {t('내 사진 바로 누끼 스티커', 'Cut my photo into a sticker')}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sub">
          {t(
            'AI가 새로 그리지 않아요. 올린 사진 그대로 배경만 떼고, 캘리그라피 한 줄과 심플 데코를 얹어 360×360 투명 PNG로 바로 저장해요.',
            'No AI redraw: we remove the background from your own photo, add a handwritten line and a small decor, and save a 360×360 transparent PNG.',
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-black">
          <span className="chip !bg-mint/10 !text-ink">{t('AI 생성 없음 · 즉시 완성', 'No AI generation · instant')}</span>
          <span className="chip !bg-white">{t('사진은 기기 안에서만', 'Photos stay on device')}</span>
          <span className="chip !bg-white">{t('크레딧 0 · 무료', '0 credits · free')}</span>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        {/* ── 미리보기 + 내려받기 ─────────────────────────── */}
        <section className="card h-fit overflow-hidden lg:sticky lg:top-24">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <p className="text-sm font-black">
              {t('미리보기', 'Preview')}
              {selected ? <span className="ml-2 text-[11px] font-bold text-sub">{cutoutOrder(selectedIndex)} / {String(cuts.length).padStart(2, '0')}</span> : null}
            </p>
            {matteText ? <span className="chip !bg-cream !text-[10px]">{matteText}</span> : null}
          </div>
          <div className="p-4">
            <div className="relative mx-auto aspect-square w-full max-w-[360px] overflow-hidden rounded-2xl border border-line" style={CHECKER}>
              {selected?.preview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selected.preview}
                  alt={t('누끼 스티커 미리보기', 'Cutout sticker preview')}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="grid h-full place-items-center p-6 text-center">
                  <div>
                    <p aria-hidden="true" className="text-4xl">🖼️</p>
                    <p className="mt-2 text-sm font-black">{t('사진을 올리면 여기에 완성돼요', 'Your sticker appears here')}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-sub">{t('체크무늬는 투명한 부분이에요.', 'The checkered area is transparent.')}</p>
                  </div>
                </div>
              )}
              {selected && rendering.includes(selected.id) ? (
                <div className="absolute inset-0 grid place-items-center bg-paper/70 backdrop-blur-[1px]">
                  <span role="status" className="rounded-full border border-line bg-white px-3 py-1.5 text-[11px] font-black text-ink shadow-soft">
                    ✂️ {t('누끼 따는 중…', 'Cutting out…')}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid gap-2">
              <button type="button" className="btn-primary min-h-12 !py-3 text-sm" disabled={!selected || pngBusy} onClick={downloadSelected}>
                {pngBusy
                  ? t('PNG 만드는 중…', 'Making PNG…')
                  : t(`투명 PNG ${CUTOUT_SIZE}×${CUTOUT_SIZE} 내려받기`, `Download transparent PNG ${CUTOUT_SIZE}×${CUTOUT_SIZE}`)}
              </button>
              <button type="button" className="btn-dark min-h-12 !py-3 text-sm" disabled={cuts.length === 0 || zipBusy} onClick={downloadZip}>
                {zipBusy ? t('ZIP 만드는 중…', 'Making ZIP…') : t(`전체 ${cuts.length}컷 카카오 규격 ZIP`, `All ${cuts.length} cuts · Kakao ZIP`)}
              </button>
            </div>
            {notice ? <p role="status" className="mt-3 rounded-xl border border-mint/40 bg-mint/10 px-3 py-2 text-[11px] font-bold leading-relaxed text-ink">{notice}</p> : null}
            {error ? <p role="alert" className="mt-3 rounded-xl border border-coral/50 bg-coral/10 px-3 py-2 text-[11px] font-bold leading-relaxed text-coralink">{error}</p> : null}
          </div>
        </section>

        <div className="space-y-4">
          {/* ── 사진 올리기 ──────────────────────────────── */}
          <section className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black">{t('① 사진 올리기', '① Add photos')}</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-sub">
                  {t(`한 장만 올려도 되고, ${CUTOUT_MAX_PHOTOS}장까지 한 번에 올려 팩처럼 저장할 수 있어요.`, `One photo is enough; up to ${CUTOUT_MAX_PHOTOS} at once for a whole pack.`)}
                </p>
              </div>
              <span className="chip !bg-cream !text-[10px]">{cuts.length} / {CUTOUT_MAX_PHOTOS}</span>
            </div>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void addFiles(event.dataTransfer.files);
              }}
              className={clsx(
                'mt-3 rounded-2xl border-2 border-dashed p-4 text-center transition',
                dragging ? 'border-primary bg-primary/5' : 'border-line bg-cream/50',
              )}
            >
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(event) => {
                  void addFiles(event.target.files);
                  event.target.value = '';
                }}
              />
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="user"
                className="sr-only"
                onChange={(event) => {
                  void addFiles(event.target.files);
                  event.target.value = '';
                }}
              />
              <p className="text-[13px] font-bold leading-relaxed">
                {uploading ? t('사진을 준비하고 있어요…', 'Preparing photos…') : t('사진을 여기로 끌어다 놓거나 아래 버튼을 눌러 주세요', 'Drop photos here or use the buttons below')}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button type="button" className="btn-primary min-h-11 !px-4 !py-2 text-xs" disabled={uploading} onClick={() => galleryRef.current?.click()}>
                  {t('사진 선택', 'Choose photos')}
                </button>
                <button type="button" className="btn-ghost min-h-11 !px-4 !py-2 text-xs" disabled={uploading} onClick={() => cameraRef.current?.click()}>
                  {t('카메라로 찍기', 'Take a photo')}
                </button>
                {cuts.length > 0 ? (
                  <button type="button" className="min-h-11 rounded-xl px-3 text-xs font-bold text-sub hover:text-ink" onClick={clearAll}>
                    {t('모두 지우기', 'Clear all')}
                  </button>
                ) : null}
              </div>
            </div>

            {cuts.length > 0 ? (
              <ul className="mt-3 grid grid-cols-4 gap-2" aria-label={t('올린 사진', 'Added photos')}>
                {cuts.map((cut, index) => {
                  const active = cut.id === selected?.id;
                  return (
                    <li key={cut.id} className="relative">
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSelectedId(cut.id)}
                        className={clsx(
                          'block w-full overflow-hidden rounded-xl border-2 bg-cream transition',
                          active ? 'border-primary ring-2 ring-primary/20' : 'border-line hover:border-primary/40',
                        )}
                      >
                        <span className="relative block aspect-square">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={cut.preview ?? cut.photo} alt={cut.name} className="h-full w-full object-cover" />
                          {rendering.includes(cut.id) ? <span className="absolute inset-0 grid place-items-center bg-paper/60 text-sm">✂️</span> : null}
                        </span>
                        <span className="block truncate px-1 py-1 text-[10px] font-black">{cutoutOrder(index)}</span>
                      </button>
                      <button
                        type="button"
                        aria-label={t(`${cutoutOrder(index)}번 사진 지우기`, `Remove photo ${cutoutOrder(index)}`)}
                        onClick={() => removeCut(cut.id)}
                        className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border border-line bg-white text-xs font-black text-sub shadow-soft hover:text-coralink"
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
                {cuts.length < CUTOUT_MAX_PHOTOS ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => galleryRef.current?.click()}
                      className="grid aspect-square w-full place-items-center rounded-xl border-2 border-dashed border-line bg-cream/40 text-lg font-black text-sub hover:border-primary/40 hover:text-primary-dark"
                      aria-label={t('사진 더 올리기', 'Add more photos')}
                    >
                      +
                    </button>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </section>

          {/* ── 문구 ─────────────────────────────────────── */}
          <section className="card p-4 sm:p-5" aria-labelledby="cutout-caption-title">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="cutout-caption-title" className="text-sm font-black">{t('② 문구 넣기', '② Add a line')}</h2>
              <span className="text-[10px] font-bold text-sub">{captionLength} / {CUTOUT_CAPTION_MAX}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={selected?.style.caption ?? ''}
                maxLength={CUTOUT_CAPTION_MAX}
                disabled={!selected}
                placeholder={t('예) 퇴근!! / 간식 내놔 / ㅋㅋㅋㅋ', 'e.g. Going home!')}
                onChange={(event) => updateSelected({ caption: event.target.value })}
                className="min-h-12 w-full rounded-xl border-2 border-line bg-cream px-3 text-sm font-bold text-ink disabled:opacity-50"
                aria-label={t('사진에 얹을 문구', 'Line to place on the photo')}
              />
              <button
                type="button"
                className="btn-ghost min-h-12 shrink-0 !px-3 text-xs"
                disabled={!selected || !hasCaption(selected.style)}
                onClick={() => updateSelected({ caption: '' })}
              >
                {t('지우기', 'Clear')}
              </button>
            </div>

            <div className="mt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-black text-sub">{t(`추천 대사 ${CUTOUT_SUGGESTION_COUNT}개 — 누르면 바로 채워져요`, `${CUTOUT_SUGGESTION_COUNT} ready-made lines — tap to fill`)}</p>
                <button type="button" className="text-[11px] font-black text-coralink underline" disabled={!selected} onClick={randomSuggestion}>
                  🎲 {t('랜덤', 'Random')}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={t('추천 대사 테마', 'Line themes')}>
                {CUTOUT_SUGGESTIONS.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    aria-pressed={theme.id === activeTheme?.id}
                    onClick={() => setThemeId(theme.id)}
                    className={clsx(
                      'rounded-full border px-2.5 py-1 text-[11px] font-black transition',
                      theme.id === activeTheme?.id ? 'border-primary bg-primary text-white' : 'border-line bg-white text-sub hover:text-ink',
                    )}
                  >
                    <span aria-hidden="true">{theme.emoji}</span> {theme.title}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid max-h-44 gap-1.5 overflow-y-auto rounded-xl border border-line bg-cream/40 p-2 sm:grid-cols-2">
                {activeTheme?.lines.map((line) => (
                  <button
                    key={line.id}
                    type="button"
                    disabled={!selected}
                    onClick={() => applySuggestion(line)}
                    className={clsx(
                      'rounded-lg border px-2 py-1.5 text-left text-[11px] font-bold leading-snug transition',
                      selected?.style.caption === line.line ? 'border-primary bg-primary/10 text-primary-dark' : 'border-line bg-white text-ink hover:border-primary/40',
                    )}
                  >
                    <span aria-hidden="true" className="mr-1">{EMOTIONS[line.emotion]?.emoji}</span>
                    {line.line}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── 스타일 ───────────────────────────────────── */}
          <section className="card p-4 sm:p-5" aria-labelledby="cutout-style-title">
            <h2 id="cutout-style-title" className="text-sm font-black">{t('③ 서체·데코 고르기', '③ Style & decor')}</h2>

            <p className="mt-3 text-[11px] font-black text-sub">{t('서체', 'Typeface')}</p>
            <div className="mt-1.5 grid grid-cols-5 gap-1.5">
              {textStyles.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={!selected}
                  aria-pressed={selected?.style.style === item.id}
                  onClick={() => updateSelected({ style: item.id })}
                  className={clsx(
                    'min-h-10 rounded-xl border px-1 text-[11px] font-black transition',
                    selected?.style.style === item.id ? 'border-primary bg-primary/10 text-primary-dark' : 'border-line bg-white text-sub hover:text-ink',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div>
                <p className="text-[11px] font-black text-sub">{t('문구 위치', 'Position')}</p>
                <div className="mt-1.5 flex gap-1.5">
                  {([['bottom', t('아래', 'Bottom')], ['top', t('위', 'Top')]] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      disabled={!selected}
                      aria-pressed={selected?.style.position === value}
                      onClick={() => updateSelected({ position: value })}
                      className={clsx(
                        'min-h-10 flex-1 rounded-xl border text-[11px] font-black transition',
                        selected?.style.position === value ? 'border-primary bg-primary/10 text-primary-dark' : 'border-line bg-white text-sub hover:text-ink',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-black text-sub">{t('사진 구도', 'Crop')}</p>
                <div className="mt-1.5 flex gap-1.5">
                  {([['face', t('얼굴 위주', 'Face')], ['center', t('가운데', 'Center')]] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      disabled={!selected}
                      aria-pressed={selected?.crop === value}
                      onClick={() => selected && void recrop(selected, value)}
                      className={clsx(
                        'min-h-10 flex-1 rounded-xl border text-[11px] font-black transition',
                        selected?.crop === value ? 'border-primary bg-primary/10 text-primary-dark' : 'border-line bg-white text-sub hover:text-ink',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label className="mt-4 block text-[11px] font-black text-sub" htmlFor="cutout-size">
              {t('글자 크기', 'Text size')}
            </label>
            <input
              id="cutout-size"
              type="range"
              min={10}
              max={24}
              step={1}
              value={Math.round((selected?.style.size ?? DEFAULT_CUTOUT_STYLE.size) * 100)}
              disabled={!selected}
              onChange={(event) => updateSelected({ size: Number(event.target.value) / 100 })}
              className="mt-1 w-full accent-primary"
            />

            <label className="mt-3 block text-[11px] font-black text-sub" htmlFor="cutout-emotion">
              {t('분위기 (글자 색·데코)', 'Mood (ink & decor)')}
            </label>
            <select
              id="cutout-emotion"
              value={selected?.style.emotion ?? 'joy'}
              disabled={!selected}
              onChange={(event) => updateSelected({ emotion: event.target.value as CutoutStyle['emotion'] })}
              className="mt-1 w-full rounded-xl border-2 border-line bg-cream px-3 py-2.5 text-sm font-bold text-ink disabled:opacity-50"
            >
              {Object.entries(EMOTIONS).map(([key, value]) => (
                <option key={key} value={key}>{value.emoji} {value.label}</option>
              ))}
            </select>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-black text-sub">{t('심플 데코', 'Small decor')}</p>
              <div className="flex gap-1.5">
                {([['auto', t('자동', 'Auto')], ['off', t('끔', 'Off')]] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    disabled={!selected}
                    aria-pressed={(selected?.style.decor ?? 'auto') === value}
                    onClick={() => updateSelected({ decor: value })}
                    className={clsx(
                      'min-h-9 rounded-full border px-3 text-[11px] font-black transition',
                      (selected?.style.decor ?? 'auto') === value ? 'border-primary bg-primary/10 text-primary-dark' : 'border-line bg-white text-sub hover:text-ink',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-3 text-[11px] font-black text-sub">{t('포인트 이펙트', 'Accent effect')}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {effects.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={!selected}
                  aria-pressed={selected?.style.effect === item.id}
                  onClick={() => updateSelected({ effect: item.id })}
                  className={clsx(
                    'min-h-9 rounded-full border px-2.5 text-[11px] font-black transition',
                    selected?.style.effect === item.id ? 'border-primary bg-primary/10 text-primary-dark' : 'border-line bg-white text-sub hover:text-ink',
                  )}
                >
                  <span aria-hidden="true">{item.emoji}</span> {item.label}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-line bg-cream/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-black text-sub">{t('흰 스티커 외곽선', 'White sticker border')}</p>
                <span className="text-[11px] font-black text-ink">{outline}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={CUTOUT_MAX_OUTLINE}
                step={1}
                value={outline}
                onChange={(event) => setOutline(Number(event.target.value))}
                className="mt-1 w-full accent-primary"
                aria-label={t('흰 스티커 외곽선 두께', 'White sticker border width')}
              />
              <p className="mt-1 text-[10px] leading-relaxed text-sub">{t('모든 컷에 똑같이 적용돼요.', 'Applies to every cut.')}</p>
            </div>
          </section>

          <section className="card-flat space-y-1.5 p-4 text-[11px] leading-relaxed text-sub">
            <p><strong className="text-ink">{t('사진은 서버로 보내지 않아요.', 'Photos never leave your device.')}</strong> {t('누끼·글자·외곽선을 모두 이 브라우저 안에서 계산하고, 내려받는 순간에도 업로드가 없어요.', 'Cutout, lettering and border are all computed in this browser — nothing is uploaded.')}</p>
            <p>{t('세로로 긴 사진은 정사각형으로 잘려요. 머리가 잘리면 「사진 구도」를 가운데로 바꾸거나, 여백을 두고 찍은 사진을 올려 주세요.', 'Tall photos are cropped to a square. If the head is cut, switch Crop to Center or use a photo with more margin.')}</p>
            <p>{t('사람·반려동물을 인식하는 기기 안 AI 누끼를 쓰고, 기기에서 지원되지 않으면 단색 배경 기준으로 대신 떼요.', 'An on-device AI matte finds people and pets; on unsupported devices it falls back to flat-background removal.')}</p>
            <p>{t('저장 규격: 360×360 투명 PNG · 카카오 ZIP은 개당 150KB 이하로 자동 압축하고 validation.json 에 검증 결과를 담아요.', 'Output: 360×360 transparent PNG. The Kakao ZIP auto-compresses each cut under 150KB and includes validation.json.')}</p>
            <p><Link href={lp('/privacy')} className="font-black text-coralink underline">{t('개인정보 처리 안내', 'Privacy details')}</Link></p>
          </section>
        </div>
      </div>
    </div>
  );
}
