'use client';

import { FormEvent, InputHTMLAttributes, useState } from 'react';
import Link from 'next/link';

const inputClass = 'w-full rounded-xl border border-line bg-white px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10';

type FormValues = {
  identifier: string;
  email: string;
  name: string;
  nickname: string;
  birthDate: string;
  gender: 'male' | 'female' | 'unspecified';
  password: string;
  confirm: string;
  consent: boolean;
};

function ClearableInput({ value, onClear, clearLabel, ...props }: InputHTMLAttributes<HTMLInputElement> & { onClear: () => void; clearLabel: string }) {
  return (
    <div className="relative mt-1">
      <input {...props} value={value} className={`${inputClass} pr-14`} />
      {String(value ?? '') ? <button type="button" aria-label={clearLabel} title={clearLabel} onClick={onClear} className="absolute right-0.5 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full text-xl font-black text-sub hover:bg-paper hover:text-ink">×</button> : null}
    </div>
  );
}

const SIGNUP_STEPS = ['계정', '기본 정보', '성별·동의', '비밀번호'];

export function AuthForm({ mode, redirectTo = '/' }: { mode: 'login' | 'signup'; redirectTo?: string }) {
  const safeRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<FormValues>({ identifier: '', email: '', name: '', nickname: '', birthDate: '', gender: 'unspecified', password: '', confirm: '', consent: false });

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (mode === 'signup' && step < SIGNUP_STEPS.length) {
      setStep((current) => current + 1);
      return;
    }
    if (mode === 'signup' && values.password !== values.confirm) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }
    const payload = mode === 'login'
      ? { identifier: values.identifier, password: values.password }
      : { email: values.email, name: values.name, nickname: values.nickname, birthDate: values.birthDate, gender: values.gender, password: values.password, consent: values.consent };
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
    <form onSubmit={submit} className="card mx-auto max-w-md space-y-5 p-5 sm:p-8">
      <div>
        <h1 className="h2">{mode === 'login' ? '로그인' : '회원가입'}</h1>
        <p className="mt-2 text-sm leading-relaxed text-sub">{mode === 'login' ? '이메일 또는 닉네임으로 로그인하세요.' : '한 번에 한 단계씩, 필요한 정보를 입력해 계정을 만들어요.'}</p>
      </div>

      {mode === 'signup' ? (
        <div>
          <div className="flex items-center justify-between text-xs font-black"><span className="text-coralink">STEP {step} / {SIGNUP_STEPS.length}</span><span>{SIGNUP_STEPS[step - 1]}</span></div>
          <ol aria-label="회원가입 진행 단계" className="mt-2 grid grid-cols-4 gap-1.5">
            {SIGNUP_STEPS.map((label, index) => <li key={label} title={label} aria-current={index + 1 === step ? 'step' : undefined} className={`h-2 rounded-full ${index + 1 <= step ? 'bg-coral' : 'bg-line'}`}><span className="sr-only">{index + 1}. {label}</span></li>)}
          </ol>
        </div>
      ) : null}

      {mode === 'signup' && step === 1 ? (
        <div className="space-y-4">
          <label className="block text-sm font-bold">이메일<ClearableInput name="email" type="email" autoComplete="email" maxLength={254} required value={values.email} onChange={(event) => update('email', event.target.value)} onClear={() => update('email', '')} clearLabel="이메일 지우기" /></label>
          <label className="block text-sm font-bold">닉네임<ClearableInput name="nickname" autoComplete="nickname" minLength={2} maxLength={20} required value={values.nickname} onChange={(event) => update('nickname', event.target.value)} onClear={() => update('nickname', '')} clearLabel="닉네임 지우기" /><span className="mt-1 block text-xs font-normal text-sub">문자·숫자·밑줄·하이픈을 사용할 수 있어요.</span></label>
        </div>
      ) : null}

      {mode === 'signup' && step === 2 ? (
        <div className="space-y-4">
          <label className="block text-sm font-bold">이름<ClearableInput name="name" autoComplete="name" maxLength={40} required value={values.name} onChange={(event) => update('name', event.target.value)} onClear={() => update('name', '')} clearLabel="이름 지우기" /></label>
          <label className="block text-sm font-bold">생년월일<input name="birthDate" type="date" autoComplete="bday" required value={values.birthDate} onChange={(event) => update('birthDate', event.target.value)} className={`${inputClass} mt-1 min-h-12`} /><span className="mt-1 block text-xs font-normal text-sub">만 14세 이상 가입할 수 있습니다.</span></label>
        </div>
      ) : null}

      {mode === 'signup' && step === 3 ? (
        <div className="space-y-5">
          <fieldset>
            <legend className="text-sm font-bold">성별</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([['unspecified', '선택 안 함'], ['male', '남성'], ['female', '여성']] as const).map(([gender, label]) => (
                <label key={gender} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-2 text-center text-xs font-semibold focus-within:ring-2 focus-within:ring-primary ${values.gender === gender ? 'border-primary bg-primary text-white' : 'border-line bg-paper text-sub'}`}>
                  <input type="radio" name="gender" value={gender} checked={values.gender === gender} onChange={() => update('gender', gender)} className="sr-only" />{label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-start gap-2 text-xs leading-relaxed"><input type="checkbox" name="consent" required checked={values.consent} onChange={(event) => update('consent', event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-primary" /><span><Link href="/terms" target="_blank" className="underline">이용약관</Link> 및 <Link href="/privacy" target="_blank" className="underline">개인정보 수집·이용</Link>에 동의합니다. 이메일, 이름, 닉네임, 생년월일, 선택한 성별을 회원 관리에 사용합니다.</span></label>
        </div>
      ) : null}

      {mode === 'signup' && step === 4 ? (
        <div className="space-y-4">
          <label className="block text-sm font-bold">비밀번호<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={values.password} onChange={(event) => update('password', event.target.value)} className={`${inputClass} mt-1 min-h-12`} /><span className="mt-1 block text-xs font-normal text-sub">8자 이상 입력해 주세요.</span></label>
          <label className="block text-sm font-bold">비밀번호 확인<input name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={values.confirm} onChange={(event) => update('confirm', event.target.value)} className={`${inputClass} mt-1 min-h-12`} /></label>
        </div>
      ) : null}

      {mode === 'login' ? (
        <div className="space-y-4">
          <label className="block text-sm font-bold">이메일 또는 닉네임<ClearableInput name="identifier" autoComplete="username" required maxLength={254} value={values.identifier} onChange={(event) => update('identifier', event.target.value)} onClear={() => update('identifier', '')} clearLabel="이메일 또는 닉네임 지우기" /></label>
          <label className="block text-sm font-bold">비밀번호<input name="password" type="password" autoComplete="current-password" minLength={1} maxLength={128} required value={values.password} onChange={(event) => update('password', event.target.value)} className={`${inputClass} mt-1 min-h-12`} /></label>
        </div>
      ) : null}

      <p className="rounded-xl bg-cream p-3 text-xs leading-relaxed text-sub">로그인 전 게스트로 만든 팩과 크레딧은 계정으로 자동 이전되지 않습니다.</p>
      {error ? <p role="alert" className="text-sm font-bold text-coralink">{error}</p> : null}

      {mode === 'signup' ? (
        <div className="flex gap-2">
          {step > 1 ? <button type="button" className="btn-ghost min-h-12 flex-1 !py-3" disabled={busy} onClick={() => { setError(''); setStep((current) => current - 1); }}>이전</button> : null}
          <button type="submit" className="btn-primary min-h-14 flex-[2] !py-3" disabled={busy}>{busy ? '처리 중…' : step === SIGNUP_STEPS.length ? '가입하기' : '다음'}</button>
        </div>
      ) : <button type="submit" className="btn-primary min-h-14 w-full !py-3" disabled={busy}>{busy ? '처리 중…' : '로그인'}</button>}
      <p className="text-center text-xs text-sub">{mode === 'login' ? '아직 계정이 없나요? ' : '이미 계정이 있나요? '}<Link href={mode === 'login' ? '/signup' : '/login'} className="font-bold text-coralink underline">{mode === 'login' ? '회원가입' : '로그인'}</Link></p>
    </form>
  );
}
