'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ContentReport, ContentReportReason } from '@/lib/types';
import { formatKstDateTime } from '@/lib/time';

export interface AdminContentReportItem extends ContentReport {
  packTitle?: string;
  frameLabel?: string;
  line?: string;
  imageId?: string;
}

const REASON_LABEL: Record<ContentReportReason, string> = {
  SEXUAL: '성적·선정적', HATE_HARASSMENT: '혐오·괴롭힘', VIOLENCE: '폭력·위험',
  MINOR_SAFETY: '미성년자 안전', PRIVACY: '개인정보·초상권', DECEPTIVE: '사기·기만', OTHER: '기타',
};
const STATUS_LABEL: Record<ContentReport['status'], string> = { OPEN: '검토 대기', REVIEWED: '검토 완료', DISMISSED: '신고 기각', ACTIONED: '콘텐츠 숨김' };

export function AdminContentReports({ items }: { items: AdminContentReportItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  async function act(reportId: string, action: 'review' | 'dismiss' | 'hide') {
    if (action === 'hide' && !window.confirm('신고된 컷을 사용자에게 숨기고 이미지를 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return;
    setBusyId(reportId);
    setMessage('');
    try {
      const res = await fetch('/api/admin/content-reports', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, action, note: notes[reportId] || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? '검토 결과를 저장하지 못했습니다');
      setMessage(action === 'hide' ? '콘텐츠를 숨기고 이미지 삭제 작업을 실행했습니다.' : '검토 결과를 저장했습니다.');
      router.refresh();
    } catch (cause) {
      setMessage((cause as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-black">AI 콘텐츠 신고</h2><span className="chip !bg-cream">{items.filter((item) => item.status === 'OPEN').length}건 대기</span></div>
      {message ? <p className="mt-2 text-[11px] font-bold text-sub">{message}</p> : null}
      {items.length === 0 ? <p className="mt-3 text-[11px] text-sub">접수된 신고가 없습니다. 각 컷의 신고 버튼으로 접수할 수 있습니다.</p> : (
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-line p-3 text-[11px]">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-black">{REASON_LABEL[item.reason]} · {STATUS_LABEL[item.status]}</p><p className="mt-1 text-sub">{item.packTitle ?? item.packId} / {item.frameLabel ?? item.frameId}{item.line ? ` “${item.line}”` : ''}</p></div>
                {item.imageId && item.status === 'OPEN' ? <img src={`/api/images/${item.imageId}`} alt="신고된 AI 컷" className="h-16 w-16 rounded-lg border border-line object-cover" /> : null}
              </div>
              {item.details ? <p className="mt-2 whitespace-pre-wrap rounded-lg bg-cream p-2 text-sub">{item.details}</p> : null}
              <p className="mt-2 break-all text-[9px] text-sub">신고 {item.id} · {formatKstDateTime(item.createdAt)}</p>
              {item.status === 'OPEN' ? (
                <>
                  <textarea value={notes[item.id] ?? ''} onChange={(event) => setNotes((prev) => ({ ...prev, [item.id]: event.target.value }))} maxLength={500} rows={2} placeholder="검토 메모 (선택)" className="mt-2 w-full resize-none rounded-lg border border-line bg-cream p-2 outline-none focus:border-ink" />
                  <div className="mt-2 flex flex-wrap gap-1">
                    <button disabled={busyId === item.id} onClick={() => act(item.id, 'review')} className="rounded-lg border border-line px-2 py-1 font-bold hover:border-ink">검토 완료</button>
                    <button disabled={busyId === item.id} onClick={() => act(item.id, 'dismiss')} className="rounded-lg border border-line px-2 py-1 font-bold hover:border-ink">신고 기각</button>
                    <button disabled={busyId === item.id} onClick={() => act(item.id, 'hide')} className="rounded-lg border border-coral px-2 py-1 font-bold text-coralink hover:bg-coral/10">콘텐츠 숨김</button>
                  </div>
                </>
              ) : item.resolutionNote ? <p className="mt-2 text-sub">메모: {item.resolutionNote}</p> : null}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[10px] leading-relaxed text-sub">숨김은 해당 컷을 즉시 사용자에게 노출하지 않고 이미지 삭제 작업을 남깁니다. 신고 내용을 반영해 생성 지시와 필터를 점검하세요.</p>
    </section>
  );
}
