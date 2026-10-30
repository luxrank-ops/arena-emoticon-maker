'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { EMOTION_OPTIONS, STYLE_OPTIONS, CREDIT_COSTS } from '@/lib/utils';
import { Sparkles, Zap, AlertCircle, CheckCircle, Copy, Download, Heart } from 'lucide-react';

interface GenerationResult {
  prompt: string;
  revisedPrompt?: string;
  imageUrl?: string;
  creditsUsed: number;
  remainingCredits: number;
}

export function EmoticonGenerator() {
  const { data: session, update } = useSession();
  const [formData, setFormData] = useState({
    characterName: '새싹이 달린 말랑 캐릭터',
    emotion: 'joy',
    dialogue: '사랑합니다! ❤️',
    style: '3d-disney-pixar',
  });
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const userCredits = session?.user ? (session.user as any).credits ?? 0 : 0;
  const canGenerate = userCredits >= CREDIT_COSTS.generation;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '생성 중 오류가 발생했습니다.');
      }

      setResult(data);
      
      // 세션 업데이트로 크레딧 반영
      if (update) {
        await update({ credits: data.remainingCredits });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setIsLoading(false);
    }
  }, [formData, update]);

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.prompt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emoticon-prompt-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setResult(null);
    setError(null);
  };

  const selectedEmotion = EMOTION_OPTIONS.find(e => e.value === formData.emotion);
  const selectedStyle = STYLE_OPTIONS.find(s => s.value === formData.style);

  return (
    <div className="space-y-6">
      {/* 크레딧 배지 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
            {session?.user ? (
              <>
                <Zap className="w-4 h-4 mr-1" /> 내 크레딧: <strong>{userCredits}</strong>개
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-1" /> 로그인 시 무료 10크레딧 제공
              </>
            )}
          </span>
        </div>
        {!session?.user && (
          <Button variant="ghost" size="sm" onClick={() => window.location.href = '/auth/signin'}>
            로그인 / 회원가입
          </Button>
        )}
      </div>

      {/* 입력 폼 */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <Card variant="outlined" padding="md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-600" />
              캐릭터 & 스타일 설정
            </CardTitle>
            <CardDescription>이모티콘의 기본 컨셉과 아트 스타일을 정의하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="캐릭터 이름 / 컨셉"
              value={formData.characterName}
              onChange={(e) => setFormData(prev => ({ ...prev, characterName: e.target.value }))}
              placeholder="예: 새싹이 달린 말랑 캐릭터, 둥근 고양이, 우주인 토끼"
              maxLength={100}
              required
            />
            <Select
              label="아트 스타일"
              value={formData.style}
              onChange={(e) => setFormData(prev => ({ ...prev, style: e.target.value }))}
              options={STYLE_OPTIONS.map(s => ({ value: s.value, label: s.label, description: s.description }))}
            />
          </CardContent>
        </Card>

        <Card variant="outlined" padding="md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              감정 표현 & 대사
            </CardTitle>
            <CardDescription>표정과 말풍선 대사를 조합해 생동감 있는 이모티콘을 만드세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="감정 선택"
              value={formData.emotion}
              onChange={(e) => setFormData(prev => ({ ...prev, emotion: e.target.value }))}
              options={EMOTION_OPTIONS.map(e => ({ value: e.value, label: e.label, description: e.description, icon: e.icon }))}
            />
            <Input
              label="말풍선 대사 (선택)"
              value={formData.dialogue}
              onChange={(e) => setFormData(prev => ({ ...prev, dialogue: e.target.value }))}
              placeholder="예: 사랑합니다! ❤️, 파이팅!, 굿잡!"
              maxLength={50}
            />
            {selectedEmotion && (
              <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
                <span className="font-medium">{selectedEmotion.icon} {selectedEmotion.label}</span>: {selectedEmotion.description}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 생성 버튼 */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={isLoading}
          disabled={!canGenerate || isLoading}
          variant="primary"
        >
          {isLoading ? 'AI 프롬프트 최적화 중...' : `이모티콘 프롬프트 생성 (${CREDIT_COSTS.generation} 크레딧)`}
        </Button>

        {!canGenerate && session?.user && (
          <p className="text-center text-sm text-red-600">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            크레딧이 부족합니다. <a href="/dashboard/credits" className="underline hover:text-red-700">충전하기</a>
          </p>
        )}

        {!session?.user && (
          <p className="text-center text-sm text-slate-500">
            로그인하면 <strong className="text-primary-600">무료 10 크레딧</strong>을 드립니다.
          </p>
        )}
      </form>

      {/* 결과 표시 */}
      {error && (
        <Card variant="outlined" padding="md" className="border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-red-800">생성 실패</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {result && (
        <Card variant="elevated" padding="lg" className="animate-slide-up">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  프롬프트 생성 완료
                </CardTitle>
                <CardDescription>
                  {result.creditsUsed} 크레딧 사용 · 남은 크레딧: {result.remainingCredits}개
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="w-4 h-4 mr-1" /> {copied ? '복사됨' : '복사'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-1" /> 다운로드
                </Button>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  새로 만들기
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-sm overflow-x-auto max-h-60">
              <pre className="whitespace-pre-wrap break-words">{result.prompt}</pre>
            </div>

            {result.revisedPrompt && result.revisedPrompt !== result.prompt && (
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-primary-600" />
                  AI 개선 프롬프트 (이미지 생성용)
                </p>
                <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 text-sm text-primary-900">
                  {result.revisedPrompt}
                </div>
              </div>
            )}

            {/* 이미지 생성 안내 */}
            <div className="bg-gradient-to-r from-primary-50 to-indigo-50 border border-primary-100 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-primary-900">다음 단계: 실제 이미지 생성</p>
                  <p className="text-sm text-primary-700 mt-1">
                    위 프롬프트를 복사해 <strong>DALL·E 3</strong>, <strong>Midjourney</strong>, <strong>Stable Diffusion</strong> 등에 붙여넣어
                    고품질 이모티콘 이미지를 생성하세요.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <a
                      href={`https://chat.openai.com/?prompt=${encodeURIComponent(result.revisedPrompt || result.prompt)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 bg-white border border-primary-200 rounded-full text-primary-700 hover:bg-primary-50 transition"
                    >
                      ChatGPT (DALL·E 3)
                    </a>
                    <a
                      href={`https://www.midjourney.com/app/?prompt=${encodeURIComponent(result.revisedPrompt || result.prompt)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 bg-white border border-primary-200 rounded-full text-primary-700 hover:bg-primary-50 transition"
                    >
                      Midjourney
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(result.revisedPrompt || result.prompt)}
                    >
                      프롬프트 복사
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}