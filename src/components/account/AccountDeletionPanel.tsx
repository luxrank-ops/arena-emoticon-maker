'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const inputClass = 'mt-1 w-full rounded-xl border-2 border-line bg-cream px-4 py-3 text-sm outline-none focus:border-ink';

export function AccountDeletionPanel() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const values = new FormData(event.currentTarget);
    try {
      const res = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: values.get('password'), confirmation: values.get('confirmation') }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json?.error?.message ?? '계정을 삭제하지 못했습니다');
      const pending = Number(json.imageDeletion?.pending ?? 0);
      router.push(`/account-deletion?deleted=1&pending=${pending}`);
      router.refresh();
    } catch (cause) {
      setError((cause as Error).message);
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="card border-coral/50 p-5">
        <h2 className="text-sm font-black">계정 및 데이터 영구 삭제</h2>
        <p className="mt-2 text-xs leading-relaxed text-sub">로그인 정보, 얼굴 분석 정보, 팩·시안·이미지, 브리핑과 신고 기록을 삭제합니다. 법령상 보존이 필요한 유료 주문·구매/환불 원장은 개인 식별 정보와 생성물을 제외한 기록만 남습니다.</p>
        <button className="mt-4 rounded-full border-2 border-coral px-4 py-2 text-xs font-black text-coralink hover:bg-coral/10" onClick={() => setOpen(true)}>삭제 절차 시작</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card border-coral/50 space-y-4 p-5">
      <div>
        <h2 className="text-sm font-black text-coralink">영구 삭제 확인</h2>
        <p className="mt-2 text-xs leading-relaxed text-sub">삭제 후에는 같은 이메일·닉네임으로 다시 가입할 수 있지만 기존 팩과 크레딧은 복구되지 않습니다. 미해결 결제나 제작·배송 중인 주문이 있으면 먼저 정리해야 합니다.</p>
      </div>
      <label className="block text-sm font-bold">현재 비밀번호<input name="password" type="password" autoComplete="current-password" minLength={1} maxLength={128} required className={inputClass} /></label>
      <label className="block text-sm font-bold">확인 문구: 영구 삭제<input name="confirmation" type="text" autoComplete="off" required pattern="영구 삭제" className={inputClass} /></label>
      {error ? <p role="alert" className="text-xs font-bold text-coralink">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="rounded-full border-2 border-coral bg-coral px-4 py-2 text-xs font-black text-white disabled:opacity-50">{busy ? '삭제하는 중…' : '계정과 데이터를 영구 삭제'}</button>
        <button type="button" disabled={busy} className="btn-ghost !py-2 text-xs" onClick={() => setOpen(false)}>취소</button>
      </div>
    </form>
  );
}
