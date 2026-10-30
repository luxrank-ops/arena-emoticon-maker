'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Sparkles, Github, Chrome } from 'lucide-react';

export function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const error = searchParams.get('error');

  const isLoading = false;
  const formError = '';

  const handleOAuthSignIn = (provider: string) => {
    signIn(provider, { callbackUrl });
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
          <p className="text-slate-600 mt-2">Google 또는 GitHub 계정으로 시작하세요.</p>
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

          <p className="text-sm text-slate-600">이메일 로그인은 안전한 인증 방식이 준비될 때까지 사용할 수 없습니다. Google 또는 GitHub 로그인을 이용해 주세요.</p>
        </Card>
      </div>
    </div>
  );
}