'use client';

import { useState } from 'react';
import { downloadBlob } from '@/lib/export';
import type { AiCut } from '@/lib/ai-cuts';
import type { ReplyResult } from '@/lib/recommend/engine';

type Candidate = ReplyResult['candidates'][number] & { cut: AiCut | null };
type ReplyPayload = Omit<ReplyResult, 'candidates'> & { candidates: Candidate[] };

const SAMPLES = [
  '야 너 또 늦었네 ㅋㅋㅋ 나 10분째 기다리는 중',
  '팀장님이 갑자기 오늘까지 보고서 내래… 진짜 킹받는다',
  '내일 생일인데 같이 저녁 먹을래?',
  '오늘 야근 확정… 나 집에 언제 가냐 ㅠㅠ',
  '미안 늦었어 ㅠㅠ 진짜 미안해',
];

export function ReplyStudio({ hasCuts }: { hasCuts: boolean; watermark: boolean }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReplyPayload | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function analyze(input?: string) {
    const value = (input ?? text).trim();
    if (value.length < 2) {
      setError('대화 내용을 2자 이상 붙여넣어 주세요');
      return;
    }
    setText(value);
    setLoading(true);
    setError(null);
    const t0 = performance.now();
    try {
      const res = await fetch('/api/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '분석에 실패했어요');
      setResult(json.result);
      setElapsed(Math.round(performance.now() - t0));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function copyLine(line: string) {
    try {
      await navigator.clipboard.writeText(line);
      setCopied(line);
      setTimeout(() => setCopied(null), 1400);
    } catch {
      setCopied(null);
    }
  }

  async function saveImage(c: Candidate) {
    if (!c.cut) return;
    const res = await fetch(c.cut.imageUrl);
    const blob = await res.blob();
    downloadBlob(blob, `reply-${c.cut.emotion}-${c.cut.frameId}.webp`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
      <div className="space-y-3">
        <div className="card p-4">
          <label htmlFor="conv" className="text-sm font-black">
            대화 붙여넣기
          </label>
          <textarea
            id="conv"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            maxLength={1200}
            placeholder="카톡 대화를 그대로 복사해서 붙여넣으세요. (상대방 대화 포함)"
            className="mt-2 w-full resize-none rounded-xl border-2 border-line bg-cream px-4 py-3 text-sm leading-relaxed outline-none focus:border-ink"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-sub">{text.length}/1200 · 저장되지 않습니다</span>
            <button className="btn-primary !px-5 !py-2 text-xs" onClick={() => analyze()} disabled={loading}>
              {loading ? '읽는 중…' : '답장 3개 추천 →'}
            </button>
          </div>
        </div>

        <div className="card-flat p-4">
          <p className="text-xs font-black text-sub">예시로 체험하기</p>
          <div className="mt-2 space-y-1.5">
            {SAMPLES.map((s) => (
              <button
                key={s}
                onClick={() => analyze(s)}
                className="block w-full truncate rounded-lg border border-line bg-paper px-3 py-2 text-left text-[12px] text-sub transition hover:border-ink hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {!hasCuts ? (
          <div className="rounded-xl border-2 border-dashed border-line px-4 py-3 text-[11px] leading-relaxed text-sub">
            아직 만든 AI 컷이 없어요. <strong className="text-ink">팩을 만들면</strong> 답장 컷이 내 얼굴로 나옵니다.
            대사 추천은 지금도 사용할 수 있어요.
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold text-sub">
          <div className="rounded-xl border border-line bg-paper py-2">
            <p className="text-base text-ink">0회</p>이미지 생성 호출
          </div>
          <div className="rounded-xl border border-line bg-paper py-2">
            <p className="text-base text-ink">{elapsed !== null ? `${elapsed}ms` : '~1.5s'}</p>응답 시간
          </div>
          <div className="rounded-xl border border-line bg-paper py-2">
            <p className="text-base text-ink">0원</p>추가 원가
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {error ? (
          <p className="rounded-xl border-2 border-coral/50 bg-coral/10 px-4 py-3 text-sm font-bold text-coralink">
            {error}
          </p>
        ) : null}

        {!result ? (
          <div className="card grid min-h-[320px] place-items-center p-8 text-center">
            <div>
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl border-2 border-ink bg-cream text-2xl shadow-card">
                💬
              </div>
              <p className="text-sm font-black">대화를 붙여넣으면 여기에 답장이 도착해요</p>
              <p className="mt-1 text-xs text-sub">상대의 감정과 상황을 읽고 3장을 골라드립니다</p>
            </div>
          </div>
        ) : (
          <>
            <div className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip !border-ink !bg-ink !text-cream">감정 · {result.moodLabel}</span>
                <span className="chip !bg-cream">확신도 {(result.confidence * 100).toFixed(0)}%</span>
                {result.cues.map((c) => (
                  <span key={c} className="chip">{c}</span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {result.candidates.map((c, i) => (
                <div key={`${c.templateId}-${i}`} className="card overflow-hidden p-0">
                  <div className="relative bg-cream p-2">
                    <span className="absolute left-2 top-2 z-10 rounded-full border border-ink bg-paper px-2 py-0.5 text-[10px] font-black">
                      {i === 0 ? 'BEST' : `대안 ${i}`}
                    </span>
                    {c.cut ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.cut.imageUrl}
                        alt={`답장 컷 ${c.cut.line}`}
                        className="aspect-square w-full object-contain"
                      />
                    ) : (
                      <div className="grid aspect-square place-items-center rounded-xl bg-paper p-3 text-center text-[11px] font-bold text-sub">
                        이 감정의 컷이 아직 없어요
                        <br />
                        팩을 만들면 여기에 나와요
                      </div>
                    )}
                  </div>
                  <div className="border-t-2 border-line p-3">
                    <p className="text-sm font-black">“{c.line}”</p>
                    {c.cut && c.cut.line !== c.line ? (
                      <p className="mt-0.5 text-[10px] text-sub">컷 안 대사: “{c.cut.line}”</p>
                    ) : null}
                    <p className="mt-1 text-[10px] leading-snug text-sub">{c.why}</p>
                    <div className="mt-2 flex gap-1">
                      <button
                        onClick={() => copyLine(c.line)}
                        className="flex-1 rounded-lg border-2 border-ink bg-paper py-1 text-[11px] font-black hover:bg-lemon/40"
                      >
                        {copied === c.line ? '복사됨!' : '대사 복사'}
                      </button>
                      <button
                        onClick={() => saveImage(c)}
                        disabled={!c.cut}
                        className="rounded-lg border border-line px-2 py-1 text-[11px] font-bold text-sub hover:border-ink disabled:opacity-40"
                      >
                        이미지
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="rounded-xl border border-line bg-paper px-4 py-3 text-[11px] leading-relaxed text-sub">
              붙여넣은 대화는 서버에 저장되지 않습니다. 요청 처리 후 즉시 폐기됩니다.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
