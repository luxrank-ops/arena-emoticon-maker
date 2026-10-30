'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Sparkles, Mail, Lock, Github, Chrome } from 'lucide-react';

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');

  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleOAuthSignIn = (provider: string) => {
    signIn(provider, { callbackUrl });
  };

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setFormError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setFormError('로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Sparkles className="w-8 h-8 text-primary-600" />
            <span className="text-2xl font-bold text-slate-900">Arena Emoticon Maker</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">로그인</h1>
          <p className="text-slate-600 mt-2">계정이 없으신가요?{' '}<Link href="/auth/signup" className="text-primary-600 hover:underline font-medium">회원가입</Link></p>
        </div>

        <Card variant="elevated" padding="lg">
          {(error || formError) && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <span className="flex-shrink-0">⚠️</span>
              {formError || error === 'CredentialsSignin' ? '이메일 또는 비밀번호가 올바르지 않습니다.' : '로그인 중 오류가 발생했습니다.'}
            </div>
          )}

          <div className="space-y-3 mb-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthSignIn('google')}
              disabled={isLoading}
            >
              <Chrome className="w-5 h-5 mr-2" />
              Google로 계속하기
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthSignIn('github')}
              disabled={isLoading}
            >
              <Github className="w-5 h-5 mr-2" />
              GitHub로 계속하기
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase text-slate-500">
              <span className="bg-white px-4">또는 이메일로 로그인</span>
            </div>
          </div>

          <form onSubmit={handleCredentialsSignIn} className="space-y-4">
            <Input
              label="이메일"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
            <Input
              label="비밀번호"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                로그인 상태 유지
              </label>
              <Link href="/auth/forgot-password" className="text-sm text-primary-600 hover:underline">
                비밀번호를 잊으셨나요?
              </Link>
            </div>
            <Button type="submit" className="w-full" loading={isLoading}>
              로그인
            </Button>
          </form>

          <CardFooter className="border-t border-slate-100 pt-6">
            <p className="text-center text-sm text-slate-600">
              처음 오셨나요? <Link href="/auth/signup" className="text-primary-600 hover:underline font-medium">무료 회원가입</Link>하고 10 크레딧 받기
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}