'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { EMOTION_OPTIONS, STYLE_OPTIONS, CREDIT_COSTS } from '@/lib/utils';
import {
  Sparkles,
  Zap,
  AlertCircle,
  CheckCircle,
  Copy,
  Download,
  Heart,
  Image,
  Loader2,
  Clock,
  Trash2,
  Eye,
  ExternalLink,
} from 'lucide-react';

interface GenerationResult {
  generationId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  revisedPrompt?: string;
  error?: string;
  creditsUsed: number;
  remainingCredits: number;
}

export function ImageGenerator() {
  const { data: session, update } = useSession();
  const [formData, setFormData] = useState({
    characterName: '새싹이 달린 말랑 캐릭터',
    characterConcept: '둥근 얼굴에 큰 눈, 부드러운 파스텔 톤, 머리 위에 작은 새싹이 자라는 귀여운 캐릭터',
    emotion: 'joy',
    dialogue: '사랑합니다! ❤️',
    style: '3d-disney-pixar',
    size: '1024x1024',
    quality: 'standard',
  });
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);

  const userCredits = session?.user ? (session.user as any).credits ?? 0 : 0;
  const canGenerate = userCredits >= CREDIT_COSTS.generation;

  const selectedEmotion = EMOTION_OPTIONS.find(e => e.value === formData.emotion);
  const selectedStyle = STYLE_OPTIONS.find(s => s.value === formData.style);

  // 폴링으로 상태 확인
  const startPolling = useCallback((generationId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    const poll = async () => {
      try {
        const response = await fetch(`/api/generations/${generationId}/status`);
        if (response.ok) {
          const data = await response.json();
          setResult(prev => prev ? { ...prev, ...data } : data);

          if (data.status === 'COMPLETED' || data.status === 'FAILED') {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setIsGenerating(false);
            if (data.status === 'COMPLETED' && update) {
              await update({ credits: data.remainingCredits });
            }
            if (data.generationTime) {
              setGenerationTime(data.generationTime);
            }
          }
        }
      } catch (err) {
        console.error('폴링 오류:', err);
      }
    };

    poll(); // 즉시 한 번 실행
    pollIntervalRef.current = setInterval(poll, 2000);
  }, [update]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setIsGenerating(true);
    setGenerationTime(null);

    try {
      const response = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '생성 요청 실패');
      }

      setResult({
        generationId: data.generationId,
        status: 'PENDING',
        creditsUsed: CREDIT_COSTS.generation,
        remainingCredits: userCredits - CREDIT_COSTS.generation,
      });

      // 폴링 시작
      startPolling(data.generationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.revisedPrompt) return;
    await navigator.clipboard.writeText(result.revisedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result?.revisedPrompt) return;
    const blob = new Blob([result.revisedPrompt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emoticon-prompt-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImageDownload = () => {
    if (!result?.imageUrl) return;
    const a = document.createElement('a');
    a.href = result.imageUrl;
    a.download = `emoticon-${result.generationId.slice(0, 8)}.png`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  const resetForm = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setResult(null);
    setError(null);
    setGenerationTime(null);
  };

  // 정리
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

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
              label="캐릭터 이름"
              value={formData.characterName}
              onChange={(e) => setFormData(prev => ({ ...prev, characterName: e.target.value }))}
              placeholder="예: 새싹이, 둥근 고양이, 우주인 토끼"
              maxLength={50}
              required
            />
            <Input
              label="캐릭터 상세 컨셉"
              value={formData.characterConcept}
              onChange={(e) => setFormData(prev => ({ ...prev, characterConcept: e.target.value }))}
              placeholder="예: 둥근 얼굴에 큰 눈, 부드러운 파스텔 톤, 머리 위에 작은 새싹이 자라는 귀여운 캐릭터"
              maxLength={200}
              required
              helperText="구체적일수록 더 정확한 이미지가 생성됩니다."
            />
            <Select
              label="아트 스타일"
              value={formData.style}
              onChange={(e) => setFormData(prev => ({ ...prev, style: e.target.value }))}
              options={STYLE_OPTIONS.map(s => ({ value: s.value, label: s.label, description: s.description }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="이미지 크기"
                value={formData.size}
                onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
                options={[
                  { value: '1024x1024', label: '정사각형 (1024x1024)', description: '이모티콘 최적' },
                  { value: '1792x1024', label: '가로형 (1792x1024)', description: '와이드 씬' },
                  { value: '1024x1792', label: '세로형 (1024x1792)', description: '세로 씬' },
                ]}
              />
              <Select
                label="품질"
                value={formData.quality}
                onChange={(e) => setFormData(prev => ({ ...prev, quality: e.target.value }))}
                options={[
                  { value: 'standard', label: '표준', description: '빠른 생성, 기본 품질' },
                  { value: 'hd', label: 'HD', description: '고해상도, 2배 크레딧' },
                ]}
              />
            </div>
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
          loading={isGenerating}
          disabled={!canGenerate || isGenerating}
          variant="primary"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              이미지 생성 중...
            </>
          ) : (
            <>
              <Image className="w-5 h-5 mr-2" />
              이모티콘 이미지 생성 ({CREDIT_COSTS.generation} 크레딧)
            </>
          )}
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

      {/* 에러 표시 */}
      {error && (
        <Card variant="outlined" padding="md" className="border-red-200 bg-red-50 animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-red-800">생성 실패</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={resetForm}>
              다시 시도
            </Button>
          </div>
        </Card>
      )}

      {/* 진행 상태 표시 */}
      {result && result.status !== 'COMPLETED' && result.status !== 'FAILED' && (
        <Card variant="elevated" padding="lg" className="animate-slide-up">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                  이미지 생성 중...
                </CardTitle>
                <CardDescription>
                  {result.status === 'PENDING' ? '대기열에서 순서를 기다리는 중...' : 'AI가 이미지를 그리고 있습니다...'}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                취소
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${result.progress || 0}%` }}
              />
            </div>
            <p className="text-sm text-slate-600 text-center">
              {result.status === 'PENDING' ? '대기 중...' : `생성 진행률: ${result.progress || 0}%`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 완료 결과 표시 */}
      {result && result.status === 'COMPLETED' && (
        <Card variant="elevated" padding="lg" className="animate-slide-up">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  이미지 생성 완료
                </CardTitle>
                <CardDescription>
                  {result.creditsUsed} 크레딧 사용 · 남은 크레딧: {result.remainingCredits}개
                  {generationTime && ` · 생성 시간: ${(generationTime / 1000).toFixed(1)}초`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="w-4 h-4 mr-1" /> {copied ? '복사됨' : '프롬프트 복사'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-1" /> 프롬프트 저장
                </Button>
                <Button variant="outline" size="sm" onClick={handleImageDownload}>
                  <Download className="w-4 h-4 mr-1" /> 이미지 다운로드
                </Button>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  새로 만들기
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 생성된 이미지 */}
            {result.imageUrl && (
              <div className="relative group">
                <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                  <img
                    src={result.imageUrl}
                    alt="생성된 이모티콘"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleImageDownload}
                    className="shadow-lg"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    다운로드
                  </Button>
                </div>
              </div>
            )}

            {/* 프롬프트 정보 */}
            <div className="border-t border-slate-200 pt-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-primary-600" />
                  최적화된 프롬프트 (영어)
                </p>
                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-sm overflow-x-auto max-h-48">
                  <pre className="whitespace-pre-wrap break-words">{result.revisedPrompt}</pre>
                </div>
              </div>

              {/* 외부 도구 링크 */}
              {result.revisedPrompt && (
                <div className="bg-gradient-to-r from-primary-50 to-indigo-50 border border-primary-100 rounded-xl p-4">
                  <p className="font-medium text-primary-900 mb-3 flex items-center gap-1">
                    <ExternalLink className="w-4 h-4" />
                    다른 AI 도구에서 바로 사용하기
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`https://chat.openai.com/?prompt=${encodeURIComponent(result.revisedPrompt)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 bg-white border border-primary-200 rounded-full text-primary-700 hover:bg-primary-50 transition"
                    >
                      ChatGPT (DALL·E 3)
                    </a>
                    <a
                      href={`https://www.midjourney.com/app/?prompt=${encodeURIComponent(result.revisedPrompt)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 bg-white border border-primary-200 rounded-full text-primary-700 hover:bg-primary-50 transition"
                    >
                      Midjourney
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                    >
                      프롬프트 복사
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 실패 표시 */}
      {result && result.status === 'FAILED' && (
        <Card variant="outlined" padding="md" className="border-red-200 bg-red-50 animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-red-800">이미지 생성 실패</p>
              <p className="text-sm text-red-700 mt-1">{result.error || '알 수 없는 오류가 발생했습니다.'}</p>
              <p className="text-sm text-red-600 mt-2">사용된 크레딧은 자동으로 환불되었습니다.</p>
            </div>
            <Button variant="outline" size="sm" onClick={resetForm}>
              다시 시도
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}