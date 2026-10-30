'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Copy, Download, Trash2, Filter, ChevronDown, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Generation {
  id: string;
  prompt: string;
  revisedPrompt: string | null;
  emotion: string;
  dialogue: string | null;
  style: string;
  status: string;
  creditsUsed: number;
  createdAt: string;
}

const EMOTION_LABELS: Record<string, string> = {
  joy: '😊 기쁨',
  excitement: '🔥 열정',
  sadness: '😢 슬픔/당황',
  approval: '👍 최고/인정',
  love: '❤️ 사랑/하트',
  anger: '😡 화남/짜증',
  surprise: '😲 놀람/감탄',
  sleepy: '😴 졸림/피곤',
};

const STYLE_LABELS: Record<string, string> = {
  '3d-disney-pixar': '3D 디즈니/픽사',
  '2d-cute': '2D 귀여운',
  'pixel-art': '픽셀 아트',
  sketch: '스케치/손그림',
  watercolor: '수채화',
  minimal: '미니멀/라인',
};

export default function HistoryPage() {
  const { data: session } = useSession();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchGenerations();
  }, [filter]);

  const fetchGenerations = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter.toUpperCase());
      const response = await fetch(`/api/generations?${params}`);
      const data = await response.json();
      setGenerations(data.generations || []);
    } catch (error) {
      console.error('Failed to fetch generations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (text: string, id: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emoticon-${id.slice(0, 8)}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await fetch(`/api/generations/${id}`, { method: 'DELETE' });
      setGenerations(prev => prev.filter(g => g.id !== id));
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const filteredGenerations = generations.filter(g => {
    if (filter === 'all') return true;
    return filter === 'completed' ? g.status === 'COMPLETED' : g.status === 'FAILED';
  });

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="container-main max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">생성 히스토리</h1>
            <p className="text-slate-600 mt-1">이전에 생성한 프롬프트들을 관리하세요.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="appearance-none bg-white border border-slate-300 rounded-xl px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">전체 보기</option>
                <option value="completed">완료됨</option>
                <option value="failed">실패함</option>
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card variant="outlined" padding="md">
            <CardContent className="text-center">
              <p className="text-2xl font-bold text-slate-900">{generations.length}</p>
              <p className="text-sm text-slate-500">총 생성 수</p>
            </CardContent>
          </Card>
          <Card variant="outlined" padding="md">
            <CardContent className="text-center">
              <p className="text-2xl font-bold text-emerald-600">
                {generations.filter(g => g.status === 'COMPLETED').length}
              </p>
              <p className="text-sm text-slate-500">성공</p>
            </CardContent>
          </Card>
          <Card variant="outlined" padding="md">
            <CardContent className="text-center">
              <p className="text-2xl font-bold text-amber-600">
                {generations.reduce((sum, g) => sum + g.creditsUsed, 0)}
              </p>
              <p className="text-sm text-slate-500">사용 크레딧</p>
            </CardContent>
          </Card>
        </div>

        {/* History List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} variant="outlined" padding="lg">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-1/4 bg-slate-200 rounded" />
                  <div className="h-4 w-1/2 bg-slate-200 rounded" />
                  <div className="h-4 w-3/4 bg-slate-200 rounded" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredGenerations.length === 0 ? (
          <Card variant="outlined" padding="lg" className="text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Filter className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">생성 기록이 없습니다</h3>
            <p className="text-slate-500 mb-6">첫 이모티콘을 만들어보세요!</p>
            <Button variant="primary" onClick={() => window.location.href = '/'}>
              이모티콘 만들러 가기
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredGenerations.map((gen) => (
              <Card key={gen.id} variant="outlined" padding="lg" className="relative group">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                        {EMOTION_LABELS[gen.emotion] || gen.emotion}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs">
                        {STYLE_LABELS[gen.style] || gen.style}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        gen.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                        gen.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {gen.status === 'COMPLETED' ? '완료' : gen.status === 'FAILED' ? '실패' : '처리중'}
                      </span>
                      <span className="text-sm text-slate-500">
                        {format(new Date(gen.createdAt), 'yyyy년 M월 d일 HH:mm', { locale: ko })}
                      </span>
                    </div>
                    <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-sm max-h-40 overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-words">{gen.prompt}</pre>
                    </div>
                    {gen.revisedPrompt && gen.revisedPrompt !== gen.prompt && (
                      <div className="mt-3 p-3 bg-primary-50 border border-primary-200 rounded-xl">
                        <p className="text-xs font-medium text-primary-900 mb-1">AI 개선 프롬프트</p>
                        <p className="text-sm text-primary-800">{gen.revisedPrompt}</p>
                      </div>
                    )}
                    {gen.dialogue && (
                      <p className="mt-2 text-sm text-slate-600">
                        <span className="font-medium">대사:</span> "{gen.dialogue}"
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 lg:ml-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">
                        {gen.creditsUsed} 크레딧
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(gen.revisedPrompt || gen.prompt, gen.id)}
                        className="h-8 w-8 p-0"
                        title="복사"
                      >
                        {copiedId === gen.id ? (
                          <span className="text-emerald-600">✓</span>
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(gen.revisedPrompt || gen.prompt, gen.id)}
                        className="h-8 w-8 p-0"
                        title="다운로드"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(gen.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}