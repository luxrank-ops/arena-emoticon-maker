'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import {
  downloadBlob,
  exportKakaoPackZip,
  renderAnimatedApngBlob,
  renderAnimatedGifBlob,
  renderFrameCanvas,
  renderFramesToApngBlob,
  renderFramesToGifBlob,
  renderMultiFrameCanvases,
  renderPngBlob,
  type MatteInfo,
} from '@/lib/export';
import { EMOTIONS } from '@/lib/art/sticker';
import { formatBytes } from '@/lib/packager';
import { LAYER_EFFECTS, type TextLayerStyle } from '@/lib/studio/layers';
import { CaptionFontPicker } from '@/components/studio/CaptionFontPicker';
import { localizedPath, tr, type Locale } from '@/lib/i18n/locale';
import { track } from '@/lib/analytics';
import { SeasonPropArt } from '@/components/season/SeasonPropArt';
import {
  preloadSeasonPropAssets,
  seasonPropById,
  SEASON_PROP_SHIFT_RANGE,
  SEASON_PROP_SIZE_RANGE,
  SEASON_PROP_SPOT_LABELS,
  type SeasonPropPlacement,
  type SeasonPropSpot,
} from '@/lib/studio/season-props';
import {
  MOTION_TEMPLATES,
  motionById,
  motionDurationMs,
  motionParticlesAt,
  motionTransformAt,
  type MotionId,
} from '@/lib/studio/motion';
import { extractVideoFrames, isVideoFile } from '@/lib/studio/video-frames';
import {
  CUTOUT_PHOTO_FRAME,
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
  type CutoutBackdrop,
  type CutoutCrop,
  type CutoutStyle,
  type CutoutSuggestionLine,
} from '@/lib/studio/photo-cutout';

// ─────────────────────────────────────────────────────────────
// 내 사진 바로 누끼 스티커 (무료 · 서버 왕복 없음)
//  · 사진 1~12장 또는 1~3초 숏폼 동영상을 올리면 기기 안에서 배경을 떼고
//    흰 스티커 외곽선과 캘리그라피 한 줄을 얹어 360×360 투명 APNG/GIF/PNG 로 저장한다.
//  · 반려동물은 털 끝이 뭉개지지 않도록 '배경 유지'(원본 배경 + 흰 보더 둥근 프레임)로 마감할 수 있고,
//    /pets 에서 들어오면(?subject=pet) 그 모드가 기본으로 켜진다.
//  · Gemini 를 호출하지 않으므로 원가 0원·대기 없음. 사진과 영상은 서버로 보내지 않는다.
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
  /** 동영상/숏폼인 경우 추출된 프레임 배열 (없으면 단일 사진) */
  videoFrames?: string[];
  /** 동영상인 경우 프레임 간 딜레이(ms) */
  frameDelayMs?: number;
}

const CHECKER: CSSProperties = {
  backgroundColor: '#FBF7F1',
  backgroundImage:
    'linear-gradient(45deg, #EFE6D8 25%, transparent 25%, transparent 75%, #EFE8DA 75%), linear-gradient(45deg, #EFE6D8 25%, transparent 25%, transparent 75%, #EFE8DA 75%)',
  backgroundSize: '18px 18px',
  backgroundPosition: '0 0, 9px 9px',
};

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

function styleKeyOf(cut: Cutout, outline: number, backdrop: CutoutBackdrop = 'cutout'): string {
  return JSON.stringify([cut.rev, cut.crop, cut.style, outline, backdrop]);
}

/** 시즌 소품 묶음 — 서버가 오픈 여부를 판정해 넘긴다(props 는 소품 id 목록) */
export interface SeasonPropGroup {
  id: string;
  emoji: string;
  title: string;
  titleEn: string;
  /** 오픈일이 지나 잠금이 풀렸는가 */
  unlocked: boolean;
  /** '12월 11일' — 잠금 안내에 쓴다 */
  openLabel: string;
  openLabelEn: string;
  propIds: string[];
}

export function PhotoCutoutStudio({
  locale = 'ko',
  seasonGroups = [],
  seasonFocus = null,
  initialBackdrop = 'cutout',
}: {
  locale?: Locale;
  seasonGroups?: SeasonPropGroup[];
  /** ?season=christmas 로 들어왔을 때 그 팩을 먼저 보여 준다 */
  seasonFocus?: string | null;
  /** 시작 마감 방식 — /pets 처럼 반려동물 흐름에서 오면 'frame'(배경 유지) */
  initialBackdrop?: CutoutBackdrop;
}) {
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const lp = (href: string) => localizedPath(locale, href);

  const [cuts, setCuts] = useState<Cutout[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [outline, setOutline] = useState(CUTOUT_DEFAULT_OUTLINE);
  const [backdrop, setBackdrop] = useState<CutoutBackdrop>(initialBackdrop);
  const [themeId, setThemeId] = useState<string>(CUTOUT_SUGGESTIONS[0]?.id ?? '');
  const [uploading, setUploading] = useState(false);
  const [rendering, setRendering] = useState<string[]>([]);
  const [busyFormat, setBusyFormat] = useState<'png' | 'gif' | 'apng' | null>(null);
  const [zipBusy, setZipBusy] = useState(false);
  const [packFormat, setPackFormat] = useState<'apng' | 'gif' | 'png'>('apng');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  // 시즌 소품 — 오픈한 팩의 소품만 고를 수 있고, 고른 소품은 모든 컷에 같이 얹힌다.
  const [seasonProp, setSeasonProp] = useState<string>('none');
  const [propSpot, setPropSpot] = useState<SeasonPropSpot | 'auto'>('auto');
  // 자동 맞춤 위에 얹는 사용자 미세조정 (크기·좌우·상하)
  const [propSize, setPropSize] = useState(1);
  const [propDx, setPropDx] = useState(0);
  const [propDy, setPropDy] = useState(0);

  const orderedSeasonGroups = useMemo(() => {
    if (!seasonFocus) return seasonGroups;
    return [...seasonGroups].sort((a, b) => (a.id === seasonFocus ? -1 : b.id === seasonFocus ? 1 : 0));
  }, [seasonGroups, seasonFocus]);
  const seasonPlacement = useMemo<SeasonPropPlacement | null>(() => {
    if (seasonProp === 'none') return null;
    const prop = seasonPropById(seasonProp);
    if (!prop) return null;
    return {
      id: prop.id,
      spot: propSpot === 'auto' ? prop.spot : propSpot,
      sizeFactor: propSize,
      dx: propDx,
      dy: propDy,
    };
  }, [seasonProp, propSpot, propSize, propDx, propDy]);
  const seasonPropKey = seasonPlacement
    ? `${seasonPlacement.id}@${seasonPlacement.spot ?? 'auto'}|${seasonPlacement.sizeFactor?.toFixed(2)}|${seasonPlacement.dx?.toFixed(2)}|${seasonPlacement.dy?.toFixed(2)}`
    : '';
  const activeSeasonProp = seasonProp === 'none' ? undefined : seasonPropById(seasonProp);
  const propFitHint = !activeSeasonProp
    ? ''
    : activeSeasonProp.fit === 'head'
      ? t(
          '정수리 윤곽과 머리 너비를 재서 챙이 머리카락을 덮게 앉히고, 기운 얼굴만큼 같이 눕혀요. 눈썹은 가리지 않아요.',
          'Reads the crown and head width so the band hugs the hair, tilts with the face, and never covers the brows.',
        )
      : activeSeasonProp.fit === 'face'
        ? t('사진에서 얼굴 위치를 찾아 코 자리에 맞춰 얹어요.', 'Finds the face and sits it on the nose.')
        : activeSeasonProp.fit === 'chest'
          ? t('피사체 가슴 높이에 맞춰 너비를 잡아요.', 'Sized to the body and placed at chest height.')
          : t('피사체가 비워 둔 여백을 찾아 그 안에 맞춰 넣어요.', 'Fits into the empty space around the subject.');

  const cutsRef = useRef<Cutout[]>([]);
  const renderedRef = useRef(new Map<string, string>());
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const baseCanvasesRef = useRef(new Map<string, HTMLCanvasElement>());
  const videoCanvasesRef = useRef(new Map<string, HTMLCanvasElement[]>());

  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const selected = cuts.find((cut) => cut.id === selectedId) ?? cuts[0] ?? null;
  const isVideoSelected = (selected?.videoFrames?.length ?? 0) > 1;
  const currentMotion = selected?.style.motion ?? 'none';
  const isAnimatedSelected = isVideoSelected || currentMotion !== 'none';

  const effects = useMemo(() => LAYER_EFFECTS.filter((item) => (CUTOUT_EFFECT_IDS as readonly string[]).includes(item.id)), []);
  const activeTheme = CUTOUT_SUGGESTIONS.find((theme) => theme.id === themeId) ?? CUTOUT_SUGGESTIONS[0];

  useEffect(() => {
    cutsRef.current = cuts;
  }, [cuts]);

  // 컷 하나를 그린다 — 누끼 + 외곽선 + 시즌 소품 + 레이어 합성
  const renderCut = useCallback(
    async (cut: Cutout) => {
      const key = `${styleKeyOf(cut, outline, backdrop)}|${seasonPropKey}`;
      if (renderedRef.current.get(cut.id) === key) return;
      setRendering((prev) => (prev.includes(cut.id) ? prev : [...prev, cut.id]));
      try {
        let info: MatteInfo | null = null;
        const spec = cutoutSpec({ photo: cut.photo, style: cut.style, seed: cutoutSeed(cut.id) });
        const canvas = await renderFrameCanvas(spec, {
          size: CUTOUT_SIZE,
          outline: backdrop === 'frame' ? 0 : outline,
          preciseMatte: true,
          matteEngine: 'auto',
          seasonProp: seasonPlacement,
          ...(backdrop === 'frame' ? { photoFrame: CUTOUT_PHOTO_FRAME } : {}),
          onMatte: (next) => {
            info = next;
          },
        });
        const latest = cutsRef.current.find((item) => item.id === cut.id);
        if (latest && `${styleKeyOf(latest, outline, backdrop)}|${seasonPropKey}` !== key) return;
        renderedRef.current.set(cut.id, key);
        baseCanvasesRef.current.set(cut.id, canvas);
        const preview = canvas.toDataURL('image/png');

        // 동영상 컷인 경우 나머지 프레임도 순차 렌더링하여 애니메이션 루프 준비
        if (cut.videoFrames && cut.videoFrames.length > 1) {
          const vCanvases = await renderMultiFrameCanvases(cut.videoFrames, spec, {
            size: CUTOUT_SIZE,
            outline: backdrop === 'frame' ? 0 : outline,
            preciseMatte: true,
            matteEngine: 'auto',
            seasonProp: seasonPlacement,
            ...(backdrop === 'frame' ? { photoFrame: CUTOUT_PHOTO_FRAME } : {}),
          });
          videoCanvasesRef.current.set(cut.id, vCanvases);
        }

        setCuts((prev) => prev.map((item) => (item.id === cut.id ? { ...item, preview, matte: info ?? item.matte } : item)));
      } catch {
        setError(t('미리보기를 만들지 못했어요. 사진을 다시 선택해 주세요.', 'We could not build the preview. Please choose the photo again.'));
      } finally {
        setRendering((prev) => prev.filter((id) => id !== cut.id));
      }
    },
    [outline, backdrop, locale, t, seasonPlacement, seasonPropKey],
  );

  // 소품을 바꾸면 모든 컷을 다시 그린다 — 미리보기가 곧 저장 결과와 같아야 한다.
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

  // 문구·구도·모션 변경 디바운스
  const selectedKey = selected ? styleKeyOf(selected, outline, backdrop) : '';
  useEffect(() => {
    if (!selected) return;
    const timer = window.setTimeout(() => enqueue(selected), 240);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  // 외곽선·마감 방식 변경 시 전체 재렌더링
  useEffect(() => {
    if (cuts.length === 0) return;
    const timer = window.setTimeout(() => {
      for (const cut of cutsRef.current) enqueue(cut);
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outline, backdrop]);

  // 시즌 소품 변경 시 전체 재렌더링 (외곽선과 같은 방식 — 미리보기 = 저장 결과)
  useEffect(() => {
    if (cuts.length === 0) return;
    const timer = window.setTimeout(() => {
      for (const cut of cutsRef.current) enqueue(cut);
    }, 200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonPropKey]);

  // ── 실시간 60FPS 모션 미리보기 루프 (Canvas) ───────────────────────
  useEffect(() => {
    let raf = 0;
    const started = performance.now();
    const motion = selected?.style.motion ?? 'none';
    const isVideo = (selected?.videoFrames?.length ?? 0) > 1;

    const draw = (now: number) => {
      const canvas = previewCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const size = canvas.width;
      ctx.clearRect(0, 0, size, size);

      if (!selected) return;

      if (isVideo) {
        const vCanvases = videoCanvasesRef.current.get(selected.id);
        if (vCanvases && vCanvases.length > 0) {
          const delay = selected.frameDelayMs ?? 90;
          const totalDur = vCanvases.length * delay;
          const frameIdx = Math.floor(((now - started) % totalDur) / delay) % vCanvases.length;
          const cur = vCanvases[frameIdx];
          if (cur) ctx.drawImage(cur, 0, 0, size, size);
        } else {
          const base = baseCanvasesRef.current.get(selected.id);
          if (base) ctx.drawImage(base, 0, 0, size, size);
        }
      } else {
        const base = baseCanvasesRef.current.get(selected.id);
        if (!base) return;

        if (motion === 'none') {
          ctx.drawImage(base, 0, 0, size, size);
        } else {
          const duration = motionDurationMs(motion);
          const p = ((now - started) % duration) / duration;
          const tf = motionTransformAt(motion, p);
          ctx.save();
          ctx.globalAlpha = tf.alpha;
          ctx.translate(size / 2 + tf.dx * size, size / 2 + tf.dy * size);
          ctx.rotate((tf.rotate * Math.PI) / 180);
          ctx.scale(tf.scaleX, tf.scaleY);
          ctx.drawImage(base, -size / 2, -size / 2, size, size);
          ctx.restore();

          for (const particle of motionParticlesAt(motion, p)) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, particle.alpha));
            ctx.fillStyle = particle.kind === 'heart' ? '#FF5A79' : '#FFD24D';
            ctx.beginPath();
            ctx.arc(particle.x * size, particle.y * size, particle.r * size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [selectedId, selected?.style.motion, selected?.rev, cuts]);

  function updateSelected(patch: Partial<CutoutStyle>) {
    if (!selected) return;
    setCuts((prev) => prev.map((cut) => (cut.id === selected.id ? { ...cut, style: { ...cut.style, ...patch } } : cut)));
  }

  async function addFiles(files: FileList | File[] | null) {
    if (!files) return;
    setError(null);
    setNotice(null);
    const fileList = Array.from(files);
    const valid = fileList.filter((file) => file.type.startsWith('image/') || isVideoFile(file));
    if (valid.length === 0) {
      setError(t('이미지 또는 1~3초 동영상 파일만 올릴 수 있어요.', 'Only image or 1-3s video files can be added.'));
      return;
    }
    const room = CUTOUT_MAX_PHOTOS - cutsRef.current.length;
    if (room <= 0) {
      setNotice(t(`스티커는 한 번에 ${CUTOUT_MAX_PHOTOS}개까지예요. 필요 없는 컷을 지우고 다시 올려 주세요.`, `Up to ${CUTOUT_MAX_PHOTOS} items at a time.`));
      return;
    }
    const accepted = valid.slice(0, room);
    setUploading(true);
    const added: Cutout[] = [];
    for (const file of accepted) {
      try {
        if (isVideoFile(file)) {
          setNotice(t('🎬 동영상에서 12프레임을 추출하고 있어요…', 'Extracting frames from video…'));
          const clip = await extractVideoFrames(file, { crop: 'face' });
          added.push({
            id: crypto.randomUUID(),
            file,
            name: file.name,
            photo: clip.frames[0],
            crop: 'face',
            rev: 0,
            style: { ...DEFAULT_CUTOUT_STYLE, caption: '나 지금 가는 중!!' },
            videoFrames: clip.frames,
            frameDelayMs: clip.delayMs,
          });
        } else {
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
        }
      } catch (err) {
        console.warn('파일 처리 실패:', err);
      }
    }
    setUploading(false);
    if (added.length === 0) {
      setError(t('파일을 읽지 못했어요. 다른 사진이나 동영상으로 시도해 주세요.', 'We could not read the file. Please try another image or video.'));
      return;
    }
    setCuts((prev) => [...prev, ...added]);
    setSelectedId((prev) => prev ?? added[0].id);
    for (const cut of added) enqueue(cut);
    // 무료 도구 '사용 시작' — 사진/동영상이 실제로 읽힌 시점(마케팅 KPI: 체험 시작률)
    track('studio_photo_start', {
      count: added.length,
      video: added.some((cut) => (cut.videoFrames?.length ?? 0) > 1),
    });
  }

  async function recrop(cut: Cutout, crop: CutoutCrop) {
    if (cut.crop === crop) return;
    setError(null);
    try {
      if (cut.videoFrames && isVideoFile(cut.file)) {
        const clip = await extractVideoFrames(cut.file, { crop });
        setCuts((prev) =>
          prev.map((item) =>
            item.id === cut.id
              ? { ...item, photo: clip.frames[0], videoFrames: clip.frames, frameDelayMs: clip.delayMs, crop, rev: item.rev + 1 }
              : item,
          ),
        );
      } else {
        const photo = await squarePhoto(cut.file, crop);
        setCuts((prev) => prev.map((item) => (item.id === cut.id ? { ...item, photo, crop, rev: item.rev + 1 } : item)));
      }
    } catch {
      setError(t('사진 구도를 다시 잡지 못했어요.', 'We could not re-frame the photo.'));
    }
  }

  function removeCut(id: string) {
    const next = cutsRef.current.filter((cut) => cut.id !== id);
    renderedRef.current.delete(id);
    baseCanvasesRef.current.delete(id);
    videoCanvasesRef.current.delete(id);
    setCuts(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
  }

  function clearAll() {
    renderedRef.current.clear();
    baseCanvasesRef.current.clear();
    videoCanvasesRef.current.clear();
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

  function resetPropTuning() {
    setPropSize(1);
    setPropDx(0);
    setPropDy(0);
  }

  function removeSeasonProp() {
    setSeasonProp('none');
    setPropSpot('auto');
    resetPropTuning();
  }

  async function downloadSingle(format: 'png' | 'gif' | 'apng') {
    if (!selected) return;
    setBusyFormat(format);
    setError(null);
    setNotice(null);
    try {
      const index = cutsRef.current.findIndex((cut) => cut.id === selected.id);
      const safeIndex = index < 0 ? 0 : index;
      const spec = cutoutSpec({ photo: selected.photo, style: selected.style, seed: cutoutSeed(selected.id) });
      const baseOpts = {
        size: CUTOUT_SIZE,
        outline: backdrop === 'frame' ? 0 : outline,
        preciseMatte: true,
        matteEngine: 'auto' as const,
        seasonProp: seasonPlacement,
        ...(backdrop === 'frame' ? { photoFrame: CUTOUT_PHOTO_FRAME } : {}),
      };
      const isVideo = (selected.videoFrames?.length ?? 0) > 1;
      const motion = selected.style.motion ?? 'none';

      let blob: Blob;
      let filename: string;

      if (format === 'png') {
        blob = await renderPngBlob(spec, baseOpts);
        filename = cutoutFileName(safeIndex, 'png');
      } else if (format === 'gif') {
        if (isVideo) {
          const vCanvases = videoCanvasesRef.current.get(selected.id) ?? (await renderMultiFrameCanvases(selected.videoFrames!, spec, baseOpts));
          blob = await renderFramesToGifBlob(vCanvases, selected.frameDelayMs ?? 90, 128);
        } else {
          blob = await renderAnimatedGifBlob(spec, { ...baseOpts, motion: motion === 'none' ? 'bounce' : motion, colors: 128 });
        }
        filename = cutoutFileName(safeIndex, 'gif');
      } else {
        // apng
        if (isVideo) {
          const vCanvases = videoCanvasesRef.current.get(selected.id) ?? (await renderMultiFrameCanvases(selected.videoFrames!, spec, baseOpts));
          blob = await renderFramesToApngBlob(vCanvases, selected.frameDelayMs ?? 90);
        } else {
          blob = await renderAnimatedApngBlob(spec, { ...baseOpts, motion: motion === 'none' ? 'bounce' : motion });
        }
        filename = `emotihak-cutout-${cutoutOrder(safeIndex)}-apng.png`;
      }

      downloadBlob(blob, filename);
      track('sticker_export', { format, motion: isVideo ? 'video' : motion, count: 1 });
      track('sticker_download', { format, count: 1 });
      const kb = Math.round(blob.size / 1024);
      setNotice(
        format === 'gif'
          ? t(`🎬 움직이는 GIF 내려받기 완료 (${kb}KB)! 카카오톡 채팅방에 사진으로 보내면 바로 움직여요.`, `Downloaded moving GIF (${kb}KB)!`)
          : format === 'apng'
            ? t(`✨ 카톡 규격 APNG 내려받기 완료 (${kb}KB)! 카카오 이모티콘 스튜디오 제출용 무손실 투명 규격이에요.`, `Downloaded Kakao APNG (${kb}KB)!`)
            : backdrop === 'frame'
              ? t(`🖼️ 사진 프레임 PNG 내려받기 완료 (${kb}KB)! 원본 배경을 살린 둥근 프레임 360×360 스티커예요.`, `Downloaded framed PNG (${kb}KB)!`)
              : t(`🖼️ 투명 PNG 내려받기 완료 (${kb}KB)! 360×360 선명한 정지 스티커예요.`, `Downloaded transparent PNG (${kb}KB)!`),
      );
    } catch {
      setError(t('스티커를 만들지 못했어요. 잠시 후 다시 시도해 주세요.', 'Could not build sticker. Please try again.'));
    } finally {
      setBusyFormat(null);
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
        videoFrames: cut.videoFrames,
        frameDelayMs: cut.frameDelayMs,
        motion: cut.style.motion,
      }));

      const isPackAnimated = packFormat !== 'png';
      const result = await exportKakaoPackZip(items, {
        outline: backdrop === 'frame' ? 0 : outline,
        preciseMatte: true,
        matteEngine: 'auto',
        seasonProp: seasonPlacement,
        ...(backdrop === 'frame' ? { photoFrame: CUTOUT_PHOTO_FRAME } : {}),
        motion: isPackAnimated ? 'bounce' : 'none',
        animationFormat: packFormat === 'gif' ? 'gif' : 'apng',
      });

      downloadBlob(result.blob, CUTOUT_ZIP_NAME);
      track('sticker_export', { format: 'zip', count: list.length, pack_format: packFormat });
      track('sticker_download', { format: 'zip', count: list.length });
      const usable = result.validation.exportable;
      // 문구는 실제 검증 결과(가장 큰 파일 크기 / 적용된 한도)를 그대로 쓴다.
      // 움직이는 팩의 한도는 150KB 가 아니라 2MB 이므로 '150KB 이하 확인'으로 단정하지 않는다.
      const limit = formatBytes(result.maxBytes);
      const heaviest = formatBytes(result.heaviestBytes);
      setNotice(
        usable
          ? t(
              `${list.length}컷 카카오 규격 ZIP을 내려받았어요 (${packFormat.toUpperCase()}). 360×360 · 개당 ${limit} 이하 기준 충족 (가장 큰 파일 ${heaviest})${result.compressed > 0 ? ` · 자동 압축 ${result.compressed}컷` : ''}. 카카오 공식 제안은 32컷(움티 24컷)이라 개수는 다르지만, 내 대화방에 바로 쓸 수 있어요.`,
              `Downloaded a ${list.length}-cut ZIP (${packFormat.toUpperCase()}, 360×360, each within ${limit}; largest ${heaviest}).`,
            )
          : t(
              `${list.length}컷 ZIP을 내려받았어요. ${result.validation.summary} (가장 큰 파일 ${heaviest} · 한도 ${limit})`,
              `Downloaded a ${list.length}-cut ZIP. ${result.validation.summary} (largest ${heaviest} · limit ${limit})`,
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
        <p className="eyebrow">{t('PHOTO & VIDEO CUTOUT · FREE', 'PHOTO & VIDEO CUTOUT · FREE')}</p>
        <h1 className="h2 mt-1 break-keep">
          📸 {backdrop === 'frame'
            ? t('내 사진 그대로 사진 프레임 스티커', 'My photo in a rounded sticker frame')
            : t('내 사진·동영상 바로 누끼 스티커', 'Cut my photo & video into a sticker')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sub">
          {t(
            backdrop === 'frame'
              ? 'AI가 새로 그리지 않아요. 올린 사진 그대로, 원본 배경을 살린 둥근 사진 프레임에 캘리그라피 한 줄과 모션을 얹어 카톡 규격(360×360 APNG/GIF/PNG)으로 바로 저장해요.'
              : 'AI가 새로 그리지 않아요. 올린 사진이나 1~3초 숏폼 영상 그대로 배경만 떼고, 캘리그라피 한 줄과 모션을 얹어 카톡 규격(360×360 투명 APNG/GIF)으로 바로 저장해요.',
            backdrop === 'frame'
              ? 'No AI redraw: keep your photo’s real background in a soft rounded frame, add lettering & motion, and export as KakaoTalk-ready 360×360 APNG/GIF/PNG.'
              : 'No AI redraw: remove background from your photo or short video, add lettering & motion, and export as KakaoTalk-ready 360×360 transparent APNG/GIF.',
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-black">
          <span className="chip !bg-mint/10 !text-ink">{t('AI 생성 없음 · 즉시 완성', 'No AI generation · instant')}</span>
          <span className="chip !bg-white">{t('사진·영상은 기기 안에서만', 'Photos & videos stay on device')}</span>
          <span className="chip !bg-white">{t('움직이는 카톡 움티 지원 (APNG·GIF)', 'Animated Kakao sticker supported')}</span>
          <span className="chip !bg-white">{t('크레딧 0 · 무료', '0 credits · free')}</span>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        {/* ── 미리보기 + 내려받기 ─────────────────────────── */}
        <section className="card h-fit overflow-hidden lg:sticky lg:top-24">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <p className="text-sm font-black">
              {t('미리보기', 'Preview')}
              {selected ? (
                <span className="ml-2 text-[11px] font-bold text-sub">
                  {cutoutOrder(selectedIndex)} / {String(cuts.length).padStart(2, '0')}
                </span>
              ) : null}
            </p>
            <div className="flex items-center gap-1.5">
              {isVideoSelected ? (
                <span className="chip !bg-coral/10 !text-coralink !text-[10px]">🎬 {t('동영상 클립', 'Video clip')}</span>
              ) : currentMotion !== 'none' ? (
                <span className="chip !bg-primary/10 !text-primary-dark !text-[10px]">
                  {motionById(currentMotion)?.emoji} {locale === 'en' ? motionById(currentMotion)?.labelEn : motionById(currentMotion)?.label}
                </span>
              ) : null}
              {matteText ? <span className="chip !bg-cream !text-[10px]">{matteText}</span> : null}
            </div>
          </div>
          <div className="p-4">
            <div className="relative mx-auto aspect-square w-full max-w-[360px] overflow-hidden rounded-2xl border border-line" style={CHECKER}>
              <canvas
                ref={previewCanvasRef}
                width={CUTOUT_SIZE}
                height={CUTOUT_SIZE}
                className={clsx('h-full w-full object-contain', !selected && 'hidden')}
              />
              {!selected ? (
                <div className="grid h-full place-items-center p-6 text-center">
                  <div>
                    <p aria-hidden="true" className="text-4xl">📸</p>
                    <p className="mt-2 text-sm font-black">{t('사진이나 동영상을 올리면 여기에 완성돼요', 'Your sticker appears here')}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-sub">
                      {t('단일 사진은 8종 모션, 짧은 영상은 실제 움직임 그대로 살아 움직여요.', 'Single photos get 8 motions; short videos move naturally.')}
                    </p>
                  </div>
                </div>
              ) : null}
              {selected && rendering.includes(selected.id) ? (
                <div className="absolute inset-0 grid place-items-center bg-paper/70 backdrop-blur-[1px]">
                  <span role="status" className="rounded-full border border-line bg-white px-3 py-1.5 text-[11px] font-black text-ink shadow-soft">
                    {backdrop === 'frame' ? t('📷 사진 프레임 만드는 중…', 'Framing photo…') : t('✂️ 누끼 따는 중…', 'Cutting out…')}
                  </span>
                </div>
              ) : null}
            </div>

            {/* 단일 컷 다운로드 버튼군 */}
            <div className="mt-4 space-y-2">
              {isAnimatedSelected ? (
                <div className="grid gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="btn-primary min-h-12 !py-2.5 text-xs font-black shadow-pop"
                      disabled={!selected || busyFormat !== null}
                      onClick={() => downloadSingle('gif')}
                    >
                      {busyFormat === 'gif' ? t('GIF 만드는 중…', 'Making GIF…') : t('🎬 움직이는 GIF(움짤) 저장', 'Save Animated GIF')}
                    </button>
                    <button
                      type="button"
                      className="btn-accent min-h-12 !py-2.5 text-xs font-black"
                      disabled={!selected || busyFormat !== null}
                      onClick={() => downloadSingle('apng')}
                    >
                      {busyFormat === 'apng' ? t('APNG 만드는 중…', 'Making APNG…') : t('✨ 카톡 규격 APNG 저장', 'Save Kakao APNG')}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost min-h-10 !py-2 text-xs font-bold text-sub"
                    disabled={!selected || busyFormat !== null}
                    onClick={() => downloadSingle('png')}
                  >
                    {busyFormat === 'png' ? t('PNG 만드는 중…', 'Making PNG…') : t('🖼️ 정지 PNG (360×360) 저장', 'Save Still PNG')}
                  </button>
                </div>
              ) : (
                <div className="grid gap-2">
                  <button
                    type="button"
                    className="btn-primary min-h-12 !py-3 text-sm font-black shadow-pop"
                    disabled={!selected || busyFormat !== null}
                    onClick={() => downloadSingle('png')}
                  >
                    {busyFormat === 'png'
                      ? t('PNG 만드는 중…', 'Making PNG…')
                      : backdrop === 'frame'
                        ? t(`사진 프레임 PNG ${CUTOUT_SIZE}×${CUTOUT_SIZE} 내려받기`, `Download framed PNG ${CUTOUT_SIZE}×${CUTOUT_SIZE}`)
                        : t(`투명 PNG ${CUTOUT_SIZE}×${CUTOUT_SIZE} 내려받기`, `Download transparent PNG ${CUTOUT_SIZE}×${CUTOUT_SIZE}`)}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost min-h-10 !py-2 text-xs font-bold text-sub"
                    disabled={!selected}
                    onClick={() => updateSelected({ motion: 'bounce' })}
                  >
                    🏀 {t('이 컷에 움직임(바운스 모션) 추가하기', 'Add bounce motion to this cut')}
                  </button>
                </div>
              )}

              {/* 전체 팩 ZIP 패키징 */}
              <div className="mt-3 rounded-2xl border border-line bg-cream/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-black text-ink">{t('전체 컷 패키징 형식', 'Pack format')}</p>
                  <div className="flex gap-1">
                    {(['apng', 'gif', 'png'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setPackFormat(fmt)}
                        className={clsx(
                          'rounded-lg px-2 py-1 text-[10px] font-black uppercase transition',
                          packFormat === fmt ? 'bg-ink text-white' : 'bg-white text-sub hover:text-ink',
                        )}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-dark mt-2.5 w-full min-h-11 !py-2.5 text-xs font-black"
                  disabled={cuts.length === 0 || zipBusy}
                  onClick={downloadZip}
                >
                  {zipBusy ? t('ZIP 만드는 중…', 'Making ZIP…') : t(`전체 ${cuts.length}컷 카카오 규격 ZIP (${packFormat.toUpperCase()})`, `All ${cuts.length} cuts · Kakao ZIP (${packFormat.toUpperCase()})`)}
                </button>
              </div>
            </div>

            {notice ? <p role="status" className="mt-3 rounded-xl border border-mint/40 bg-mint/10 px-3 py-2 text-[11px] font-bold leading-relaxed text-ink">{notice}</p> : null}
            {error ? <p role="alert" className="mt-3 rounded-xl border border-coral/50 bg-coral/10 px-3 py-2 text-[11px] font-bold leading-relaxed text-coralink">{error}</p> : null}
          </div>
        </section>

        <div className="space-y-4">
          {/* ── 사진·동영상 올리기 ──────────────────────────────── */}
          <section className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black">{t('① 사진 또는 동영상 올리기', '① Add photos or video')}</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-sub">
                  {t(`사진 1~${CUTOUT_MAX_PHOTOS}장 또는 1~3초 짧은 동영상을 올리면 실사 카톡 짤로 만들어 드려요.`, `Upload photos or a 1-3s short video to create live-action stickers.`)}
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
                ref={videoRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/*"
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
                {uploading
                  ? t('파일을 준비하고 있어요…', 'Preparing files…')
                  : t('사진이나 1~3초 동영상을 여기로 끌어다 놓으세요', 'Drop photos or 1-3s video here')}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button type="button" className="btn-primary min-h-11 !px-4 !py-2 text-xs" disabled={uploading} onClick={() => galleryRef.current?.click()}>
                  📸 {t('사진 올리기', 'Add photos')}
                </button>
                <button type="button" className="btn-accent min-h-11 !px-4 !py-2 text-xs" disabled={uploading} onClick={() => videoRef.current?.click()}>
                  🎬 {t('동영상 올리기 (1~3초)', 'Add short video')}
                </button>
                <button type="button" className="btn-ghost min-h-11 !px-4 !py-2 text-xs" disabled={uploading} onClick={() => cameraRef.current?.click()}>
                  {t('카메라 촬영', 'Take photo')}
                </button>
                {cuts.length > 0 ? (
                  <button type="button" className="min-h-11 rounded-xl px-3 text-xs font-bold text-sub hover:text-ink" onClick={clearAll}>
                    {t('모두 지우기', 'Clear all')}
                  </button>
                ) : null}
              </div>
            </div>

            {/* 업로드된 컷 썸네일 스트립 */}
            {cuts.length > 0 ? (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-black text-sub">{t('컷 선택', 'Select cut')}</p>
                  <p className="text-[10px] text-sub">{t('선택한 컷을 아래에서 편집해요', 'Edit selected cut below')}</p>
                </div>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                  {cuts.map((cut, index) => {
                    const active = cut.id === selected?.id;
                    const isVid = (cut.videoFrames?.length ?? 0) > 1;
                    return (
                      <div
                        key={cut.id}
                        role="button"
                        tabIndex={0}
                        aria-pressed={active}
                        onClick={() => setSelectedId(cut.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedId(cut.id);
                          }
                        }}
                        className={clsx(
                          'group relative shrink-0 w-20 cursor-pointer rounded-2xl border-2 p-1 text-left transition',
                          active ? 'border-primary bg-primary/5 shadow-soft ring-2 ring-primary/30' : 'border-line bg-white hover:border-ink/30',
                        )}
                      >
                        <div className="relative aspect-square w-full overflow-hidden rounded-xl" style={CHECKER}>
                          {cut.preview ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={cut.preview} alt="" className="h-full w-full object-contain" />
                          ) : (
                            <div className="grid h-full place-items-center text-xs text-sub">…</div>
                          )}
                          {isVid ? (
                            <span className="absolute bottom-1 right-1 rounded-md bg-ink/80 px-1 py-0.5 text-[8px] font-black text-white">
                              🎬 12F
                            </span>
                          ) : cut.style.motion && cut.style.motion !== 'none' ? (
                            <span className="absolute bottom-1 right-1 rounded-md bg-primary/90 px-1 py-0.5 text-[8px] font-black text-white">
                              {motionById(cut.style.motion)?.emoji}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 flex items-center justify-between px-1">
                          <span className="text-[10px] font-black text-sub">{cutoutOrder(index)}</span>
                          <button
                            type="button"
                            aria-label={t(`${index + 1}번 컷 삭제`, `Delete cut ${index + 1}`)}
                            onClick={(event) => {
                              event.stopPropagation();
                              removeCut(cut.id);
                            }}
                            className="rounded p-0.5 text-[10px] text-sub hover:bg-coral/10 hover:text-coralink"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>

          {/* ── 문구·모션·스타일 편집 ────────────────────────── */}
          <section className="card p-4 sm:p-5">
            <h2 className="text-sm font-black">{t('② 문구·모션 편집', '② Lettering & motion')}</h2>

            {/* 1) 움직임 효과 선택 (단일 사진 모션 vs 동영상 원본 동작) */}
            <div className="mt-3 rounded-2xl border border-line bg-paper p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black text-ink">
                  {isVideoSelected ? '🎬 ' + t('숏폼 동영상 모션', 'Short video motion') : '🏀 ' + t('움직임 효과 (카톡 모션)', 'Motion effect (Kakao)')}
                </p>
                {isVideoSelected ? (
                  <span className="chip !bg-coral/10 !text-coralink !text-[10px]">{t('원본 동작 12프레임', '12 original frames')}</span>
                ) : (
                  <span className="text-[10px] text-sub">{motionById(currentMotion)?.hint ?? t('정지 이미지', 'Still')}</span>
                )}
              </div>

              {isVideoSelected ? (
                <p className="mt-1.5 text-[11px] leading-relaxed text-sub">
                  {t('업로드한 영상의 실제 움직임 그대로 12프레임 배경을 분리하여 카톡 규격 APNG/GIF 로 조립합니다.', 'Uses your video frames directly for natural live movement.')}
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={!selected}
                    aria-pressed={currentMotion === 'none'}
                    onClick={() => updateSelected({ motion: 'none' })}
                    className={clsx(
                      'min-h-9 rounded-full border px-2.5 text-[11px] font-black transition',
                      currentMotion === 'none' ? 'border-ink bg-ink text-white' : 'border-line bg-white text-sub hover:text-ink',
                    )}
                  >
                    {t('정지 컷', 'Still')}
                  </button>
                  {MOTION_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      disabled={!selected}
                      aria-pressed={currentMotion === tpl.id}
                      onClick={() => updateSelected({ motion: tpl.id })}
                      className={clsx(
                        'min-h-9 rounded-full border px-2.5 text-[11px] font-black transition',
                        currentMotion === tpl.id ? 'border-primary bg-primary text-white shadow-soft' : 'border-line bg-white text-sub hover:border-primary/50',
                      )}
                    >
                      <span>{tpl.emoji}</span> {locale === 'en' ? tpl.labelEn : tpl.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2) 문구 입력 */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-sub" htmlFor="cutout-caption">
                  {t('대사 한 줄 (비우면 사진/영상만)', 'Caption (leave empty for photo only)')}
                </label>
                <span className={clsx('text-[10px] font-bold', captionLength > CUTOUT_CAPTION_MAX ? 'text-coral' : 'text-sub')}>
                  {captionLength} / {CUTOUT_CAPTION_MAX}
                </span>
              </div>
              <div className="mt-1.5 flex gap-1.5">
                <input
                  id="cutout-caption"
                  type="text"
                  maxLength={CUTOUT_CAPTION_MAX}
                  value={selected?.style.caption ?? ''}
                  disabled={!selected}
                  placeholder={t('예: 나 지금 가는 중!!, 오늘 칼퇴합니다', 'e.g. On my way!, Calling it a day')}
                  onChange={(event) => updateSelected({ caption: event.target.value })}
                  className="input-field flex-1 text-sm font-bold disabled:opacity-50"
                />
                <button
                  type="button"
                  disabled={!selected}
                  onClick={randomSuggestion}
                  className="btn-ghost shrink-0 !px-3 text-xs font-bold"
                  title={t('추천 대사 무작위 넣기', 'Random suggestion')}
                >
                  🎲 {t('랜덤', 'Random')}
                </button>
              </div>
            </div>

            {/* 추천 대사 테마 칩 */}
            <div className="mt-3 rounded-2xl border border-line bg-cream/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-black text-sub">💡 {t('추천 대사 (클릭하면 바로 적용)', 'Suggestions')}</p>
                <div className="flex gap-1 overflow-x-auto">
                  {CUTOUT_SUGGESTIONS.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setThemeId(theme.id)}
                      className={clsx(
                        'shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-black transition',
                        themeId === theme.id ? 'bg-ink text-white' : 'bg-white text-sub hover:text-ink',
                      )}
                    >
                      <span aria-hidden="true">{theme.emoji}</span> {theme.title}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {activeTheme?.lines.map((line) => (
                  <button
                    key={line.id}
                    type="button"
                    disabled={!selected}
                    onClick={() => applySuggestion(line)}
                    className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-bold text-ink transition hover:border-primary hover:bg-primary/5 active:scale-95 disabled:opacity-40"
                  >
                    <span aria-hidden="true" className="mr-1">{EMOTIONS[line.emotion]?.emoji}</span>
                    {line.line}
                  </button>
                ))}
              </div>
            </div>

            {/* 서체 선택 — 카드마다 그 서체로 쓴 예시 글자를 보여 준다 */}
            <div className="mt-4">
              <CaptionFontPicker
                value={(selected?.style.style ?? 'round') as TextLayerStyle}
                onChange={(style) => updateSelected({ style })}
                locale={locale}
                disabled={!selected}
                label={t('서체', 'Font')}
              />
            </div>

            {/* 문구 위치 및 사진 구도 */}
            <div className="mt-4 grid grid-cols-2 gap-3">
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

            {/* 글자 크기 */}
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

            {/* 분위기/감정 */}
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

            {/* 데코 & 이펙트 */}
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

            {/* 시즌 소품 — 크리스마스·새해·설날. 오픈일 전에는 잠금 배지로만 보인다. */}
            {orderedSeasonGroups.length ? (
              <div
                className="mt-4 rounded-2xl border border-line bg-cream/40 p-3"
                onPointerEnter={() =>
                  preloadSeasonPropAssets(orderedSeasonGroups.filter((group) => group.unlocked).flatMap((group) => group.propIds))
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-black text-ink">🎄 {t('시즌 소품', 'Season props')}</p>
                  <span className="text-[10px] font-bold text-sub">
                    {t('사진 위에 얹어 바로 저장', 'Overlay and save')}
                  </span>
                </div>

                {/* 차선책 1 — 2D 얹기가 어색한 사진은 AI가 직접 그린다. */}
                <Link
                  href={lp('/studio/upload')}
                  onClick={() => track('season_ai_wear_click', { from: 'studio_photo' })}
                  className="mt-2 flex items-start gap-2 rounded-xl border border-primary/35 bg-gradient-to-r from-primary/[0.12] to-coral/[0.10] p-2.5 transition hover:border-primary/60"
                >
                  <span aria-hidden="true" className="text-[15px] leading-none">
                    ✨
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-black text-primary-dark">
                      {t('내 사진에 AI로 자연스럽게 입히기', 'Wear it with AI')}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-relaxed text-sub">
                      {t(
                        '사진을 올리고 악세사리를 고르면 AI가 머리카락·조명·각도에 맞춰 모자·뿔·산타복·한복을 직접 그려요. (AI 컷 만들기 · 크레딧)',
                        'Upload the photo, pick an accessory, and AI draws the hat, antlers, Santa suit or hanbok around your hair, light and angle. (AI cuts · credits)',
                      )}
                    </span>
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-[11px] font-black text-primary-dark">
                    →
                  </span>
                </Link>

                {orderedSeasonGroups.map((group) => {
                  const props = group.propIds.map((id) => seasonPropById(id)).filter((prop): prop is NonNullable<typeof prop> => Boolean(prop));
                  const openLabel = locale === 'en' ? group.openLabelEn : group.openLabel;
                  // 주변 데코(실패 0)를 먼저, 머리에 쓰는 소품은 각도 주의와 함께 뒤에 — 차선책 2
                  const decorProps = props.filter((prop) => prop.kind === 'decor');
                  const wearProps = props.filter((prop) => prop.kind === 'wear');
                  const chip = (prop: (typeof props)[number]) => {
                    const active = seasonProp === prop.id;
                    return (
                      <button
                        key={prop.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          if (!group.unlocked) {
                            setNotice(
                              t(
                                `${openLabel} 오픈이에요. 그날 00시에 자동으로 열려요. 지금은 시즌팩 안내에서 소품 모양만 볼 수 있어요.`,
                                `Opens ${openLabel}. Preview the shapes in Season packs.`,
                              ),
                            );
                            track('season_prop_locked', { prop: prop.id, pack: group.id });
                            return;
                          }
                          const next = active ? 'none' : prop.id;
                          setSeasonProp(next);
                          setPropSpot('auto');
                          resetPropTuning();
                          if (next !== 'none') track('season_prop_select', { prop: prop.id, pack: group.id });
                        }}
                        className={clsx(
                          'inline-flex min-h-8 items-center gap-1 rounded-full border px-2 py-1 text-[10.5px] font-black transition',
                          active
                            ? 'border-primary bg-primary text-white shadow-soft'
                            : group.unlocked
                              ? 'border-line bg-white text-sub hover:border-primary/50 hover:text-ink'
                              : 'border-line/70 bg-white/60 text-sub/60',
                        )}
                      >
                        <span className={clsx('block h-4 w-4', !group.unlocked && 'opacity-45')}>
                          <SeasonPropArt id={prop.id} />
                        </span>
                        {locale === 'en' ? prop.labelEn : prop.label}
                        {!group.unlocked ? <span aria-hidden="true" className="text-[9px]">🔒</span> : null}
                      </button>
                    );
                  };
                  return (
                    <div key={group.id} className="mt-3 rounded-xl bg-white/60 p-2.5">
                      <p className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-black text-sub">
                        <span aria-hidden="true">{group.emoji}</span>
                        <span>{locale === 'en' ? group.titleEn : group.title}</span>
                        <span
                          className={clsx(
                            'rounded-full px-1.5 py-0.5 text-[9px] font-black',
                            group.unlocked ? 'bg-mint/10 text-mint' : 'bg-primary/[0.07] text-primary-dark',
                          )}
                        >
                          {group.unlocked ? t('오픈', 'OPEN') : `🔒 ${openLabel} ${t('오픈', '')}`.trim()}
                        </span>
                      </p>

                      {decorProps.length ? (
                        <div className="mt-1.5">
                          <p className="flex items-center gap-1 text-[9.5px] font-black text-mint">
                            🎁 {t('주변 데코', 'Around the photo')}
                            <span className="rounded-full bg-mint/10 px-1.5 py-0.5 text-[8.5px] font-black">
                              {t('추천 · 어떤 사진이든 OK', 'Recommended · any photo')}
                            </span>
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">{decorProps.map(chip)}</div>
                        </div>
                      ) : null}

                      {wearProps.length ? (
                        <div className="mt-2">
                          <p className="flex items-center gap-1 text-[9.5px] font-black text-sub">
                            🎩 {t('머리에 쓰는 소품', 'Worn on the head')}
                            <span className="rounded-full bg-cream px-1.5 py-0.5 text-[8.5px] font-black text-sub/80">
                              {t('각도에 민감', 'Angle sensitive')}
                            </span>
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">{wearProps.map(chip)}</div>
                          <p className="mt-1 text-[9.5px] leading-relaxed text-sub/80">
                            {t(
                              '옆모습·기울어진 사진이면 어색할 수 있어요. 그때는 ✨AI로 입히기나 위의 주변 데코를 써 보세요.',
                              'Side profiles or tilted photos can look off — then use ✨AI wear or the decor above.',
                            )}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                {/* 복장(산타복·한복)은 얹기가 아니라 AI 변환 — 시즌팩으로 이어 준다. */}
                <div className="mt-3 rounded-xl border border-primary/25 bg-primary/[0.05] p-2.5">
                  <p className="text-[10.5px] font-black text-ink">
                    👗 {t('옷 전체는 AI 변환으로', 'Full outfits via AI')}
                  </p>
                  <p className="mt-1 text-[10px] leading-relaxed text-sub">
                    {t(
                      '산타복·한복처럼 몸 전체를 입히는 건 소품을 얹는 것과 달라요. AI가 사진을 다시 그려 옷·배경까지 자연스럽게 입혀요.',
                      'A full Santa suit or hanbok is not an overlay — AI redraws the photo so the outfit and background fit naturally.',
                    )}
                  </p>
                  <Link
                    href={lp('/season')}
                    className="mt-1 inline-block text-[10px] font-black text-primary-dark underline underline-offset-2"
                  >
                    {t('시즌팩에서 복장 변환 보기 →', 'See the season outfit transformations →')}
                  </Link>
                </div>

                {seasonPlacement && activeSeasonProp ? (
                  <div className="mt-3 rounded-xl border border-line bg-white p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[10px] font-black text-ink">🪄 {t('자동 맞춤', 'Auto-fit')}</p>
                      <button
                        type="button"
                        onClick={removeSeasonProp}
                        className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[9.5px] font-black text-sub hover:border-coral/50 hover:text-coralink"
                      >
                        {t('소품 빼기', 'Remove')}
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-sub">{propFitHint}</p>

                    <p className="mt-2 text-[10px] font-black text-sub">{t('자리', 'Position')}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <button
                        type="button"
                        aria-pressed={propSpot === 'auto'}
                        onClick={() => setPropSpot('auto')}
                        className={clsx(
                          'min-h-8 rounded-full border px-2.5 text-[10px] font-black transition',
                          propSpot === 'auto' ? 'border-primary bg-primary/10 text-primary-dark' : 'border-line bg-white text-sub hover:text-ink',
                        )}
                      >
                        {t('자동', 'Auto')}
                      </button>
                      {SEASON_PROP_SPOT_LABELS.map((spot) => (
                        <button
                          key={spot.id}
                          type="button"
                          aria-pressed={propSpot === spot.id}
                          onClick={() => setPropSpot(spot.id)}
                          className={clsx(
                            'min-h-8 rounded-full border px-2.5 text-[10px] font-black transition',
                            propSpot === spot.id ? 'border-primary bg-primary/10 text-primary-dark' : 'border-line bg-white text-sub hover:text-ink',
                          )}
                        >
                          {locale === 'en' ? spot.labelEn : spot.label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-2.5 space-y-1.5">
                      <label className="flex items-center gap-2 text-[10px] font-black text-sub" htmlFor="prop-size">
                        <span className="w-12 shrink-0">{t('크기', 'Size')}</span>
                        <input
                          id="prop-size"
                          type="range"
                          min={SEASON_PROP_SIZE_RANGE.min}
                          max={SEASON_PROP_SIZE_RANGE.max}
                          step={SEASON_PROP_SIZE_RANGE.step}
                          value={propSize}
                          onChange={(event) => setPropSize(Number(event.target.value))}
                          className="w-full flex-1 accent-primary"
                        />
                        <span className="w-9 shrink-0 text-right text-[10px] text-ink">{Math.round(propSize * 100)}%</span>
                      </label>
                      <label className="flex items-center gap-2 text-[10px] font-black text-sub" htmlFor="prop-dx">
                        <span className="w-12 shrink-0">{t('좌우', 'Left/right')}</span>
                        <input
                          id="prop-dx"
                          type="range"
                          min={SEASON_PROP_SHIFT_RANGE.min}
                          max={SEASON_PROP_SHIFT_RANGE.max}
                          step={SEASON_PROP_SHIFT_RANGE.step}
                          value={propDx}
                          onChange={(event) => setPropDx(Number(event.target.value))}
                          className="w-full flex-1 accent-primary"
                        />
                        <span className="w-9 shrink-0 text-right text-[10px] text-ink">{Math.round(propDx * 100)}</span>
                      </label>
                      <label className="flex items-center gap-2 text-[10px] font-black text-sub" htmlFor="prop-dy">
                        <span className="w-12 shrink-0">{t('상하', 'Up/down')}</span>
                        <input
                          id="prop-dy"
                          type="range"
                          min={SEASON_PROP_SHIFT_RANGE.min}
                          max={SEASON_PROP_SHIFT_RANGE.max}
                          step={SEASON_PROP_SHIFT_RANGE.step}
                          value={propDy}
                          onChange={(event) => setPropDy(Number(event.target.value))}
                          className="w-full flex-1 accent-primary"
                        />
                        <span className="w-9 shrink-0 text-right text-[10px] text-ink">{Math.round(propDy * 100)}</span>
                      </label>
                      <div className="flex items-center justify-between pt-0.5">
                        <p className="text-[9.5px] leading-relaxed text-sub/80">
                          {t('미리보기 = 내려받기 결과', 'Preview = download')}
                        </p>
                        <button
                          type="button"
                          onClick={resetPropTuning}
                          className="rounded-full border border-line px-2.5 py-0.5 text-[9.5px] font-black text-sub hover:text-ink"
                        >
                          {t('처음 크기로', 'Reset size')}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-[10px] leading-relaxed text-sub">
                    {orderedSeasonGroups.some((group) => group.unlocked)
                      ? t(
                          '사진을 올린 뒤 시즌 소품을 고르면 미리보기와 내려받기에 똑같이 얹혀요.',
                          'Upload a photo, then pick a season prop — it is applied to the preview and the download alike.',
                        )
                      : t('시즌 소품은 오픈일 00시에 자동으로 열려요.', 'Season props unlock automatically at 00:00 KST on opening day.')}{' '}
                    <Link href={lp('/season')} className="font-black text-primary-dark underline underline-offset-2">
                      {t('시즌팩 미리 보기 →', 'Preview season packs →')}
                    </Link>
                  </p>
                )}
              </div>
            ) : null}

            {/* 마감 방식 — 반려동물은 누끼 대신 원본 배경을 살린 둥근 사진 프레임 */}
            <div className="mt-4 rounded-xl border border-line bg-cream/50 p-3">
              <p className="text-[11px] font-black text-sub">{t('마감 방식', 'Finish')}</p>
              <div role="group" aria-label={t('마감 방식 선택', 'Choose finish')} className="mt-1.5 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  aria-pressed={backdrop === 'cutout'}
                  onClick={() => setBackdrop('cutout')}
                  className={clsx(
                    'rounded-xl border px-2 py-2 text-[11px] font-black transition',
                    backdrop === 'cutout' ? 'border-primary bg-primary text-white shadow-soft' : 'border-line bg-white text-sub hover:text-ink',
                  )}
                >
                  ✂️ {t('누끼 (투명)', 'Cutout (transparent)')}
                </button>
                <button
                  type="button"
                  aria-pressed={backdrop === 'frame'}
                  onClick={() => setBackdrop('frame')}
                  className={clsx(
                    'rounded-xl border px-2 py-2 text-[11px] font-black transition',
                    backdrop === 'frame' ? 'border-mint bg-mint text-white shadow-soft' : 'border-line bg-white text-sub hover:text-ink',
                  )}
                >
                  🖼️ {t('배경 유지 (사진 프레임)', 'Keep background (frame)')}
                </button>
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-sub">
                {backdrop === 'frame'
                  ? t(
                      '사진 원본 배경을 그대로 살리고 흰 보더의 둥근 프레임으로 마감해요. 털이 있는 반려동물은 배경을 지우면 털 끝이 거칠어져서 이 방식이 더 깔끔해요.',
                      'Keeps the real photo background and finishes it in a rounded frame with a thin white border. For furry pets this is cleaner than removing the background.',
                    )
                  : t(
                      '배경을 지우고 투명 스티커로 만들어요. 사람·사물 사진에 잘 맞아요. 털이 있는 반려동물은 배경 유지가 더 깔끔해요.',
                      'Removes the background for a transparent sticker — best for people and objects. For furry pets, keeping the background looks cleaner.',
                    )}
              </p>
            </div>

            {/* 흰 스티커 외곽선 — 누끼 모드에서만 */}
            {backdrop === 'cutout' ? (
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
            ) : null}
          </section>

          <section className="card-flat space-y-1.5 p-4 text-[11px] leading-relaxed text-sub">
            <p><strong className="text-ink">{t('사진과 영상은 서버로 보내지 않아요.', 'Photos & videos never leave your device.')}</strong> {t('누끼·글자·외곽선·APNG/GIF 인코딩을 모두 이 브라우저 안에서 계산하고, 내려받는 순간에도 업로드가 없어요.', 'Cutout, lettering, borders, and APNG/GIF encoding are computed entirely in your browser.')}</p>
            <p>{t('동영상은 1~3초 내외의 클립에서 12프레임을 추출하여 가장 자연스러운 카톡 움티로 완성됩니다.', 'Short 1-3s video clips are converted into smooth 12-frame Kakao animated stickers.')}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
