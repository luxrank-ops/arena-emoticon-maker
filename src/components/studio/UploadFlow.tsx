'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { analyzeSelfie, type FaceAnalysis } from '@/lib/face/analyze';
import { TONES } from '@/lib/art/sticker';
import { track } from '@/lib/analytics';
import { compressPhotoFile, loadPhoto, savePhoto } from '@/lib/studio/photo';
import type { Tone } from '@/lib/types';

const CONSENT_VERSION = 'v1.0';

export function UploadFlow({
  allowedTones,
  credits,
  planName,
}: {
  allowedTones: Tone[];
  credits: number;
  planName: string;
}) {
  const router = useRouter();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [analysis, setAnalysis] = useState<FaceAnalysis | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tone, setTone] = useState<Tone>(allowedTones[0] ?? '2d-cute');
  const [consent, setConsent] = useState({ terms: false, privacy: false, overseas: false });
  const [dragging, setDragging] = useState(false);

  const onFile = useCallback(async (file: File) => {
    setError(null);
    setBusy(true);
    setFileName(file.name);
    try {
      const result = await analyzeSelfie(file);
      setAnalysis(result);
      track('photo_analyzed', { ok: result.ok });
      // 생성 단계에서 쓸 사진을 이 탭에만 임시 보관 (서버 저장 없음)
      savePhoto(await compressPhotoFile(file));
    } catch {
      setError('사진을 읽지 못했어요. 다른 사진으로 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }, []);

  const ready = analysis?.ok && consent.terms && consent.privacy && consent.overseas && !busy;


  async function submit() {
    if (!analysis) return;
    if (!loadPhoto()) {
      setError('사진을 다시 선택해 주세요. 탭을 새로 열면 사진 보관이 초기화돼요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const faceRes = await fetch('/api/face/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          palette: analysis.palette,
          signature: analysis.signature,
          metrics: analysis.metrics,
          consent: { accepted: true, version: CONSENT_VERSION, overseas: true },
        }),
      });
      const faceJson = await faceRes.json();
      if (!faceRes.ok) throw new Error(faceJson?.error?.message ?? '얼굴 정보를 저장하지 못했어요');

      const sheetRes = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceId: faceJson.faceId, tone }),
      });
      const sheetJson = await sheetRes.json();
      if (!sheetRes.ok) throw new Error(sheetJson?.error?.message ?? '캐릭터 시트를 만들지 못했어요');

      track('sheet_created', { tone, credits });
      router.push(`/studio/sheet/${sheetJson.sheet.id}`);
    } catch (e) {
      track('sheet_failed', { tone });
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      {/* ── 왼쪽: 업로드 & 동의 ───────────────────────────── */}
      <div className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void onFile(f);
          }}
          className={clsx(
            'card relative grid min-h-[240px] place-items-center p-6 text-center transition',
            dragging && 'bg-lemon/20',
          )}
        >
          {/* 사진첩에서 선택: capture 속성 없음 → 갤러리/파일 선택 열림 */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          {/* 카메라로 찍기: capture="user" → 전면 카메라 바로 열림 */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          {!analysis ? (
            <div>
              <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl border-2 border-ink bg-cream text-3xl shadow-card">
                📸
              </div>
              <p className="text-lg font-black">정면 셀카 한 장을 올려주세요</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-sub">
                밝은 곳에서, 안경·모자 없이, 얼굴이 화면의 절반 정도 차게. 사진은
                <strong className="text-ink"> AI 생성 요청 때만 전송되고 서버에 저장되지 않습니다</strong>.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button className="btn-primary" onClick={() => galleryInputRef.current?.click()} disabled={busy}>
                  {busy ? '분석 중…' : '사진 선택'}
                </button>
                <button className="btn-ghost" onClick={() => cameraInputRef.current?.click()} disabled={busy}>
                  카메라로 찍기
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <div className="flex items-center justify-between gap-3 text-left">
                <div>
                  <p className="text-sm font-black">
                    {analysis.ok ? '얼굴 인식 완료' : '얼굴을 확인해 주세요'}
                  </p>
                  <p className="text-xs text-sub">
                    {fileName} · {analysis.metrics.faceDetected ? '얼굴 1명' : '얼굴 미검출'} · 커버리지{' '}
                    {(analysis.metrics.coverage * 100).toFixed(1)}%
                  </p>
                </div>
                <button className="chip hover:border-ink" onClick={() => galleryInputRef.current?.click()}>
                  다시 선택
                </button>
              </div>

              <ul className="mt-3 space-y-1.5 text-left text-[13px]">
                {analysis.issues.length === 0 ? (
                  <li className="font-bold text-mint">✓ 품질 좋아요. 바로 만들 수 있습니다.</li>
                ) : (
                  analysis.issues.map((i) => (
                    <li key={i.code} className={i.blocking ? 'font-bold text-coralink' : 'text-sub'}>
                      {i.blocking ? '✕' : '!'} {i.label}
                    </li>
                  ))
                )}
              </ul>

              <div className="mt-4 flex items-center gap-2 text-left">
                <span className="text-xs font-bold text-sub">추출된 팔레트</span>
                <div className="flex gap-1">
                  {Object.entries(analysis.palette).map(([k, v]) => (
                    <span
                      key={k}
                      title={`${k} ${v}`}
                      className="h-6 w-6 rounded-full border-2 border-ink"
                      style={{ background: v }}
                    />
                  ))}
                </div>
              </div>

              <p className="mt-4 rounded-xl border border-line bg-cream px-3 py-2 text-left text-[11px] leading-relaxed text-sub">
                원본 사진은 서버에 저장되지 않습니다. 이 탭에만 임시 보관되며, 컷 생성 요청 시에만 AI(Google Gemini)로 전송됩니다.
              </p>
            </div>
          )}
        </div>

        {/* 동의 */}
        <div className="card p-5">
          <p className="text-sm font-black">필수 동의</p>
          <div className="mt-3 space-y-2.5 text-[13px]">
            {[
              { key: 'terms' as const, label: '서비스 이용약관 동의', href: '/terms' },
              { key: 'privacy' as const, label: '개인정보 수집·이용 동의 (생성 요청 시 사진 일시 처리, 원본 미저장)', href: '/privacy' },
              { key: 'overseas' as const, label: '개인정보 국외이전 동의 (Google LLC · 생성 목적)', href: '/privacy' },
            ].map((c) => (
              <label key={c.key} className="flex items-start gap-2 leading-snug">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-coral"
                  checked={consent[c.key]}
                  onChange={(e) => setConsent((s) => ({ ...s, [c.key]: e.target.checked }))}
                />
                <span>
                  <span className="font-bold">[필수]</span> {c.label}{' '}
                  <a href={c.href} target="_blank" className="text-coralink underline">
                    보기
                  </a>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ── 오른쪽: 스타일 & 미리보기 ─────────────────────── */}
      <div className="space-y-4">
        <div className="card p-5">
          <p className="text-sm font-black">AI가 만드는 방식</p>
          <ol className="mt-3 space-y-2 text-[13px] leading-snug text-sub">
            <li>1. 셀카 한 장으로 캐릭터 시안 3종을 AI가 그립니다.</li>
            <li>2. 고른 시안으로 같은 얼굴의 표정 컷 12개(또는 24개)를 만듭니다.</li>
            <li>3. 완성된 컷은 팩에 저장되고 PNG·ZIP·카카오 규격으로 받을 수 있어요.</li>
          </ol>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black">버전 선택 (캐릭터 vs 실사포토)</p>
            <span className="chip !bg-cream">{planName} · {allowedTones.length}종</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(Object.keys(TONES) as Tone[]).map((t) => {
              const allowed = allowedTones.includes(t);
              return (
                <button
                  key={t}
                  disabled={!allowed}
                  onClick={() => setTone(t)}
                  className={clsx(
                    'rounded-xl border-2 p-3 text-left transition',
                    tone === t ? 'border-ink bg-lemon/30' : 'border-line bg-paper hover:border-ink/50',
                    !allowed && 'cursor-not-allowed opacity-45',
                  )}
                >
                  <p className="text-[13px] font-black">{TONES[t].label}</p>
                  <p className="mt-0.5 text-[10px] leading-tight text-sub">{TONES[t].desc}</p>
                  {!allowed ? <p className="mt-1 text-[10px] font-bold text-coralink">유료 플랜</p> : null}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border-2 border-coral/50 bg-coral/10 px-4 py-3 text-sm font-bold text-coralink">
            {error}
          </p>
        ) : null}

        <button className="btn-primary w-full !py-4 text-base" disabled={!ready} onClick={submit}>
          {busy ? '처리 중…' : '캐릭터 시트 만들기 →'}
        </button>
        <p className="text-center text-[11px] text-sub">
          다음 단계에서 3가지 시안 중 하나를 고릅니다 · 보유 크레딧 {credits}
        </p>
      </div>
    </div>
  );
}
