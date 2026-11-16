'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  downloadBlob,
  renderAnimatedGifBlob,
  renderAnimatedApngBlob,
  renderFrameCanvas,
  renderPngBlob,
} from '@/lib/export';
import {
  LAYER_BUBBLES,
  LAYER_EFFECTS,
  MAX_LAYERS,
  TEXT_STYLES,
  newLayer,
  normalizeLayers,
  type TextLayer,
} from '@/lib/studio/layers';
import { MOTION_TEMPLATES, motionById, motionDurationMs, motionParticlesAt, motionTransformAt, type MotionId } from '@/lib/studio/motion';
import { tr, type Locale } from '@/lib/i18n/locale';
import type { StickerSpec } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// 움직이는 미리보기 + 한글 대사·이펙트 레이어 + 흰 외곽선 내보내기
//  · 왼쪽 미리보기는 실제 내보내기와 같은 캔버스 파이프라인을 쓴다.
//  · 레이어는 서버(프레임)에 저장되어 팩 전체 내보내기에도 반영된다.
// ─────────────────────────────────────────────────────────────

export function FrameEffectsPanel({
  spec,
  frameId,
  locale = 'ko',
  watermark = false,
  onLayersSaved,
}: {
  spec: StickerSpec;
  frameId: string;
  locale?: Locale;
  watermark?: boolean;
  onLayersSaved?: (layers: TextLayer[]) => void;
}) {
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const [motion, setMotion] = useState<MotionId | 'none'>('none');
  const [outline, setOutline] = useState(4);
  const [layers, setLayers] = useState<TextLayer[]>(() => normalizeLayers(spec.textLayers));
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);

  const previewSize = 320;
  const active = layers[selected];

  // 레이어·외곽선이 바뀌면 합성 베이스를 다시 만든다.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const composed = await renderFrameCanvas(spec, { size: 360, outline, watermark, layers });
        if (!cancelled) baseRef.current = composed;
      } catch {
        if (!cancelled) baseRef.current = null;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [spec, outline, watermark, layers]);

  useEffect(() => {
    let raf = 0;
    const started = performance.now();
    const draw = (now: number) => {
      const canvas = canvasRef.current;
      const base = baseRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const size = canvas.width;
          ctx.clearRect(0, 0, size, size);
          if (!base) {
            ctx.fillStyle = '#F3EEE6';
            ctx.fillRect(0, 0, size, size);
          } else if (motion === 'none') {
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
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [motion]);

  const duration = useMemo(() => (motion === 'none' ? 0 : motionDurationMs(motion)), [motion]);

  const patchLayer = useCallback((patch: Partial<TextLayer>) => {
    setLayers((prev) => prev.map((layer, index) => (index === selected ? { ...layer, ...patch } : layer)));
  }, [selected]);

  function addLayer() {
    if (layers.length >= MAX_LAYERS) {
      setMessage(t(`레이어는 ${MAX_LAYERS}장까지 얹을 수 있어요.`, `Up to ${MAX_LAYERS} layers.`));
      return;
    }
    setLayers((prev) => [...prev, newLayer(prev.length, t('안녕!', 'Hi!'))]);
    setSelected(layers.length);
    setMessage(null);
  }

  function removeLayer(index: number) {
    setLayers((prev) => prev.filter((_, i) => i !== index));
    setSelected((prev) => Math.max(0, Math.min(prev, layers.length - 2)));
  }

  async function saveLayers() {
    setSaving(true);
    setMessage(null);
    try {
      const clean = normalizeLayers(layers);
      const res = await fetch(`/api/frames/${frameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textLayers: clean }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? 'save failed');
      onLayersSaved?.(clean);
      setMessage(t('글자 레이어를 저장했어요. 팩 전체 내보내기에도 반영됩니다.', 'Text layers saved and applied to every export.'));
    } catch {
      setMessage(t('레이어를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.', 'Could not save the layers. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  async function download(kind: 'png' | 'gif' | 'apng') {
    setBusy(kind);
    setMessage(null);
    try {
      const base = { watermark, layers, outline };
      const blob =
        kind === 'png'
          ? await renderPngBlob(spec, base)
          : kind === 'gif'
            ? await renderAnimatedGifBlob(spec, { ...base, motion: motion === 'none' ? 'bounce' : motion })
            : await renderAnimatedApngBlob(spec, { ...base, motion: motion === 'none' ? 'bounce' : motion });
      const ext = kind === 'png' ? 'png' : kind === 'gif' ? 'gif' : 'png';
      downloadBlob(blob, `emotihak-360-${kind === 'apng' ? 'apng' : ext}`);
      setMessage(
        kind === 'png'
          ? t('360×360 PNG를 저장했어요.', 'Saved a 360×360 PNG.')
          : kind === 'gif'
            ? t('움직이는 GIF(360×360, 투명)를 저장했어요.', 'Saved an animated GIF (360×360, transparent).')
            : t('움직이는 APNG(360×360, 투명)를 저장했어요.', 'Saved an animated APNG (360×360, transparent).'),
      );
    } catch {
      setMessage(t('파일을 만들지 못했어요. 다시 시도해 주세요.', 'Could not build the file. Please try again.'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-line bg-paper p-4 text-left">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-coralink">{t('움직임 · 글자 · 외곽선', 'Motion · text · outline')}</p>
          <p className="mt-0.5 text-[11px] text-sub">{t('미리보기는 실제 내보내기와 같은 캔버스로 그립니다.', 'The preview uses the same canvas pipeline as export.')}</p>
        </div>
        <span className="chip">{MotionTemplatesLabel(t, motion)}</span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[150px_1fr]">
        <div className="mx-auto w-[150px] rounded-xl border-2 border-line bg-cream p-1.5">
          <canvas ref={canvasRef} width={previewSize} height={previewSize} className="aspect-square w-full" aria-label={t('움직이는 미리보기', 'Animated preview')} />
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-black text-sub">{t('모션 템플릿', 'Motion template')}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                aria-pressed={motion === 'none'}
                onClick={() => setMotion('none')}
                className={clsx('min-h-9 rounded-full border px-2.5 text-[11px] font-bold', motion === 'none' ? 'border-ink bg-ink text-cream' : 'border-line bg-paper text-sub')}
              >
                {t('정지', 'Still')}
              </button>
              {MOTION_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  aria-pressed={motion === template.id}
                  title={locale === 'en' ? template.hintEn : template.hint}
                  onClick={() => setMotion(template.id)}
                  className={clsx('min-h-9 rounded-full border px-2.5 text-[11px] font-bold', motion === template.id ? 'border-primary bg-primary text-white' : 'border-line bg-paper text-sub hover:border-primary/50')}
                >
                  <span aria-hidden="true">{template.emoji}</span> {locale === 'en' ? template.labelEn : template.label}
                </button>
              ))}
            </div>
            {duration ? <p className="mt-1 text-[10px] text-sub">{t(`1회 재생 ${(duration / 1000).toFixed(2)}초 · 프레임 ${motionById(motion)?.frames ?? 0}장`, `${(duration / 1000).toFixed(2)}s loop · ${motionById(motion)?.frames ?? 0} frames`)}</p> : null}
          </div>

          <div>
            <label htmlFor="outline-range" className="text-[11px] font-black text-sub">
              {t('흰색 스티커 외곽선', 'White sticker outline')} · {outline === 0 ? t('끔', 'Off') : `${outline}px`}
            </label>
            <input
              id="outline-range"
              type="range"
              min={0}
              max={12}
              step={1}
              value={outline}
              onChange={(event) => setOutline(Number(event.target.value))}
              className="mt-1 w-full accent-primary"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="btn-primary !min-h-9 !px-3 !py-1.5 text-[11px]" disabled={!!busy} onClick={() => void download('png')}>
              {busy === 'png' ? t('만드는 중…', 'Building…') : t('PNG 360', 'PNG 360')}
            </button>
            <button type="button" className="btn-dark !min-h-9 !px-3 !py-1.5 text-[11px]" disabled={!!busy} onClick={() => void download('gif')}>
              {busy === 'gif' ? t('만드는 중…', 'Building…') : t('움직이는 GIF', 'Animated GIF')}
            </button>
            <button type="button" className="btn-ghost !min-h-9 !px-3 !py-1.5 text-[11px]" disabled={!!busy} onClick={() => void download('apng')}>
              {busy === 'apng' ? t('만드는 중…', 'Building…') : t('움직이는 APNG', 'Animated APNG')}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-cream/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-black text-sub">{t('한글 대사·이펙트 레이어', 'Korean text & effect layers')}</p>
          <div className="flex gap-1.5">
            <button type="button" className="chip min-h-9 !px-2.5 text-[11px]" onClick={addLayer} disabled={layers.length >= MAX_LAYERS}>
              + {t('레이어', 'Layer')}
            </button>
            <button type="button" className="btn-primary !min-h-9 !px-3 !py-1.5 text-[11px]" onClick={() => void saveLayers()} disabled={saving}>
              {saving ? t('저장 중…', 'Saving…') : t('저장', 'Save')}
            </button>
          </div>
        </div>

        {layers.length === 0 ? (
          <p className="mt-2 text-[11px] leading-relaxed text-sub">
            {t('레이어가 없어요. 대사·도장·이펙트를 얹으면 AI가 글자를 뭉개지 않고 깔끔한 한글로 합성됩니다.', 'No layers yet. Add text, a stamp or an effect to compose clean Korean lettering.')}
          </p>
        ) : (
          <>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {layers.map((layer, index) => (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => setSelected(index)}
                  className={clsx('flex min-h-9 items-center gap-1 rounded-full border px-2.5 text-[11px] font-bold', selected === index ? 'border-ink bg-ink text-cream' : 'border-line bg-paper text-sub')}
                >
                  {layer.text.slice(0, 8) || t('빈 레이어', 'Empty')}
                  <span
                    role="presentation"
                    className="grid h-4 w-4 place-items-center rounded-full border border-current/40 text-[10px]"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeLayer(index);
                    }}
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>

            {active ? (
              <div className="mt-2 space-y-2">
                <label className="block text-[10px] font-bold text-sub">
                  {t('문구', 'Text')}
                  <input
                    value={active.text}
                    maxLength={24}
                    onChange={(event) => patchLayer({ text: event.target.value })}
                    className="mt-1 min-h-10 w-full rounded-lg border border-line bg-white px-2 text-sm font-semibold"
                    placeholder={t('짧은 한글 대사', 'Short caption')}
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-[10px] font-bold text-sub">
                    {t('글꼴', 'Font')}
                    <select
                      value={active.style}
                      onChange={(event) => patchLayer({ style: event.target.value as TextLayer['style'] })}
                      className="mt-1 min-h-10 w-full rounded-lg border border-line bg-white px-2 text-xs font-semibold"
                    >
                      {TEXT_STYLES.map((style) => (
                        <option key={style.id} value={style.id}>{locale === 'en' ? style.labelEn : style.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-[10px] font-bold text-sub">
                    {t('말풍선', 'Bubble')}
                    <select
                      value={active.bubble}
                      onChange={(event) => patchLayer({ bubble: event.target.value as TextLayer['bubble'] })}
                      className="mt-1 min-h-10 w-full rounded-lg border border-line bg-white px-2 text-xs font-semibold"
                    >
                      {LAYER_BUBBLES.map((bubble) => (
                        <option key={bubble.id} value={bubble.id}>{locale === 'en' ? bubble.labelEn : bubble.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-sub">{t('이펙트', 'Effect')}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {LAYER_EFFECTS.map((effect) => (
                      <button
                        key={effect.id}
                        type="button"
                        aria-pressed={active.effect === effect.id}
                        onClick={() => patchLayer({ effect: effect.id })}
                        className={clsx('min-h-8 rounded-full border px-2 text-[10px] font-bold', active.effect === effect.id ? 'border-ink bg-ink text-cream' : 'border-line bg-paper text-sub')}
                      >
                        <span aria-hidden="true">{effect.emoji}</span> {locale === 'en' ? effect.labelEn : effect.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-sub">
                  <label>
                    {t('가로', 'Horizontal')}
                    <input type="range" min={8} max={92} value={Math.round(active.x * 100)} onChange={(event) => patchLayer({ x: Number(event.target.value) / 100 })} className="w-full accent-primary" />
                  </label>
                  <label>
                    {t('세로', 'Vertical')}
                    <input type="range" min={8} max={94} value={Math.round(active.y * 100)} onChange={(event) => patchLayer({ y: Number(event.target.value) / 100 })} className="w-full accent-primary" />
                  </label>
                  <label>
                    {t('크기', 'Size')}
                    <input type="range" min={5} max={34} value={Math.round(active.size * 100)} onChange={(event) => patchLayer({ size: Number(event.target.value) / 100 })} className="w-full accent-primary" />
                  </label>
                  <label>
                    {t('회전', 'Rotate')}
                    <input type="range" min={-35} max={35} value={active.rotate} onChange={(event) => patchLayer({ rotate: Number(event.target.value) })} className="w-full accent-primary" />
                  </label>
                  <label className="flex items-center gap-2">
                    {t('색', 'Color')}
                    <input type="color" value={active.color} onChange={(event) => patchLayer({ color: event.target.value })} className="h-8 w-10 rounded border border-line" />
                  </label>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {message ? <p role="status" className="mt-2 text-[11px] font-bold text-primary-dark">{message}</p> : null}
    </section>
  );
}

function MotionTemplatesLabel(t: (ko: string, en: string) => string, motion: MotionId | 'none') {
  if (motion === 'none') return t('정지 이미지', 'Still image');
  const template = motionById(motion);
  return template ? `${template.emoji} ${t(template.label, template.labelEn)}` : t('움직임', 'Motion');
}
