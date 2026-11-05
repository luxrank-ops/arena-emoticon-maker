'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

const inputClass = 'mt-1 w-full rounded-xl border-2 border-line bg-cream px-4 py-3 text-sm outline-none focus:border-ink';

export function AuthForm({ mode, redirectTo = '/' }: { mode: 'login' | 'signup'; redirectTo?: string }) {
  const safeRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const values = new FormData(event.currentTarget);
    if (mode === 'signup' && values.get('password') !== values.get('confirm')) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }
    const payload = mode === 'login'
      ? { identifier: values.get('identifier'), password: values.get('password') }
      : { email: values.get('email'), name: values.get('name'), nickname: values.get('nickname'), birthDate: values.get('birthDate'), gender: values.get('gender'), password: values.get('password'), consent: values.get('consent') === 'on' };
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? '요청을 처리하지 못했어요');
      window.location.assign(safeRedirect);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="card mx-auto max-w-md space-y-4 p-6 sm:p-8">
      <div>
        <h1 className="h2">{mode === 'login' ? '로그인' : '회원가입'}</h1>
        <p className="mt-2 text-sm text-sub">{mode === 'login' ? '이메일 또는 닉네임으로 로그인하세요.' : '계정을 만들어 내 팩과 크레딧을 이용하세요.'}</p>
      </div>
      {mode === 'signup' ? (
        <>
          <label className="block text-sm font-bold">이메일<input name="email" type="email" autoComplete="email" maxLength={254} required className={inputClass} /></label>
          <label className="block text-sm font-bold">이름<input name="name" autoComplete="name" maxLength={40} required className={inputClass} /></label>
          <label className="block text-sm font-bold">닉네임<input name="nickname" autoComplete="nickname" minLength={2} maxLength={20} required className={inputClass} /><span className="mt-1 block text-xs font-normal text-sub">문자·숫자·밑줄·하이픈을 사용할 수 있어요.</span></label>
          <label className="block text-sm font-bold">생년월일<input name="birthDate" type="date" autoComplete="bday" required className={inputClass} /><span className="mt-1 block text-xs font-normal text-sub">만 14세 이상 가입할 수 있습니다.</span></label>
          <label className="block text-sm font-bold">성별<select name="gender" defaultValue="unspecified" className={inputClass}><option value="unspecified">선택 안 함</option><option value="male">남성</option><option value="female">여성</option></select></label>
        </>
      ) : <label className="block text-sm font-bold">이메일 또는 닉네임<input name="identifier" autoComplete="username" required maxLength={254} className={inputClass} /></label>}
      <label className="block text-sm font-bold">비밀번호<input name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : 1} maxLength={128} required className={inputClass} />{mode === 'signup' ? <span className="mt-1 block text-xs font-normal text-sub">8자 이상 입력해 주세요.</span> : null}</label>
      {mode === 'signup' ? <>
        <label className="block text-sm font-bold">비밀번호 확인<input name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={128} required className={inputClass} /></label>
        <label className="flex items-start gap-2 text-xs leading-relaxed"><input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 accent-coral" /><span><Link href="/terms" target="_blank" className="underline">이용약관</Link> 및 <Link href="/privacy" target="_blank" className="underline">개인정보 수집·이용</Link>에 동의합니다. 이메일, 이름, 닉네임, 생년월일, 선택한 성별을 회원 관리에 사용합니다.</span></label>
      </> : null}
      <p className="rounded-xl bg-cream p-3 text-xs leading-relaxed text-sub">로그인 전 게스트로 만든 팩과 크레딧은 계정으로 자동 이전되지 않습니다.</p>
      {error ? <p role="alert" className="text-sm font-bold text-coralink">{error}</p> : null}
      <button type="submit" className="btn-primary w-full !py-3" disabled={busy}>{busy ? '처리 중…' : mode === 'login' ? '로그인' : '가입하기'}</button>
      <p className="text-center text-xs text-sub">{mode === 'login' ? '아직 계정이 없나요? ' : '이미 계정이 있나요? '}<Link href={mode === 'login' ? '/signup' : '/login'} className="font-bold text-coralink underline">{mode === 'login' ? '회원가입' : '로그인'}</Link></p>
    </form>
  );
}
