'use client';

import { FormEvent, useState } from 'react';
import type { ContentReportReason } from '@/lib/types';

const REASONS: { value: ContentReportReason; label: string }[] = [
  { value: 'SEXUAL', label: '성적이거나 선정적인 내용' },
  { value: 'HATE_HARASSMENT', label: '혐오·괴롭힘·비방' },
  { value: 'VIOLENCE', label: '폭력적이거나 위험한 내용' },
  { value: 'MINOR_SAFETY', label: '미성년자 안전 침해' },
  { value: 'PRIVACY', label: '개인정보·초상권 침해' },
  { value: 'DECEPTIVE', label: '사기·기만적인 내용' },
  { value: 'OTHER', label: '기타 부적절한 내용' },
];

export function ContentReportButton({ packId, frameId, className = '' }: { packId: string; frameId: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const values = new FormData(event.currentTarget);
    try {
      const res = await fetch('/api/content-reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId, frameId, reason: values.get('reason'), details: values.get('details') || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? '신고를 접수하지 못했습니다');
      setDone(true);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setDone(false); setError(''); }} className={className || 'rounded-lg border border-line px-2 py-1 text-[11px] font-bold text-sub hover:border-coral hover:text-coralink'}>신고</button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="report-title" className="w-full max-w-md rounded-2xl border-2 border-ink bg-paper p-5 shadow-xl">
            {done ? (
              <div>
                <h2 id="report-title" className="text-base font-black">신고를 접수했습니다</h2>
                <p className="mt-2 text-xs leading-relaxed text-sub">운영팀이 생성 결과와 신고 내용을 검토합니다. 반복 접수할 필요는 없습니다.</p>
                <button className="btn-dark mt-4 w-full !py-2 text-xs" onClick={() => setOpen(false)}>확인</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <h2 id="report-title" className="text-base font-black">AI 생성 결과 신고</h2>
                  <p className="mt-1 text-xs leading-relaxed text-sub">앱을 떠나지 않고 부적절한 결과를 운영팀에 알릴 수 있습니다. 사진 대신 컷 ID와 신고 내용이 전송됩니다.</p>
                </div>
                <label className="block text-sm font-bold">신고 사유<select name="reason" required className="mt-1 w-full rounded-xl border-2 border-line bg-cream px-3 py-2 text-sm">{REASONS.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}</select></label>
                <label className="block text-sm font-bold">상세 설명 (선택)<textarea name="details" maxLength={500} rows={3} placeholder="개인정보·비밀번호는 입력하지 마세요" className="mt-1 w-full resize-none rounded-xl border-2 border-line bg-cream px-3 py-2 text-sm outline-none focus:border-ink" /></label>
                {error ? <p role="alert" className="text-xs font-bold text-coralink">{error}</p> : null}
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn-ghost !py-2 text-xs" disabled={busy} onClick={() => setOpen(false)}>취소</button>
                  <button type="submit" className="btn-dark !py-2 text-xs" disabled={busy}>{busy ? '접수 중…' : '신고 접수'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
