"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface GenerationItem {
  id: string;
  prompt: string;
  status: string;
  model: string;
  creditsUsed: number;
  generationTime: number | null;
  createdAt: string;
  user: { name: string | null; email: string };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AdminGenerationsClientProps {
  initialData: {
    generations: GenerationItem[];
    pagination: Pagination;
    stats: { total: number; completed: number; failed: number; pending: number; processing: number };
    modelStats: { model: string; count: number; avgTime: number }[];
    dailyTrend: { date: string; count: number; avgTime: number }[];
    filters: { status: string; model: string; date: string };
  };
}

const STATUS_OPTIONS = [
  { value: "", label: "전체 상태" },
  { value: "PENDING", label: "대기" },
  { value: "PROCESSING", label: "처리중" },
  { value: "COMPLETED", label: "완료" },
  { value: "FAILED", label: "실패" },
];

const formatNumber = (num: number) => new Intl.NumberFormat("ko-KR").format(num);
const formatTime = (ms: number | null) => {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

export default function AdminGenerationsClient({ initialData }: AdminGenerationsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [generations, setGenerations] = useState(initialData.generations);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [stats] = useState(initialData.stats);
  const [filters, setFilters] = useState(initialData.filters);
  const [selectedGenerations, setSelectedGenerations] = useState<string[]>([]);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value, page: "1" };
    setFilters(newFilters);
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    router.push(`/admin/generations?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/admin/generations?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">생성 모니터링</h1>
          <p className="text-slate-600 mt-1">이모티콘 생성 현황을 실시간으로 모니터링하세요.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card variant="elevated" padding="md">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">총 생성</p>
              <p className="text-2xl font-bold text-slate-900">{formatNumber(stats.total)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated" padding="md">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">완료</p>
              <p className="text-2xl font-bold text-emerald-600">{formatNumber(stats.completed)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated" padding="md">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">실패</p>
              <p className="text-2xl font-bold text-red-600">{formatNumber(stats.failed)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <span className="text-2xl">❌</span>
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated" padding="md">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">처리중</p>
              <p className="text-2xl font-bold text-blue-600">{formatNumber(stats.processing)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated" padding="md">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">대기</p>
              <p className="text-2xl font-bold text-amber-600">{formatNumber(stats.pending)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <span className="text-2xl">⏰</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card variant="outlined" padding="md" className="mb-6">
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="프롬프트, 사용자 검색..."
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="w-full sm:w-[250px]"
          />
          <Select value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)} options={STATUS_OPTIONS} className="w-full sm:w-[150px]" />
        </CardContent>
      </Card>

      <Card variant="outlined" padding="none">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-12 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectedGenerations.length === generations.length && generations.length > 0}
                    onChange={(e) => setSelectedGenerations(e.target.checked ? generations.map((g) => g.id) : [])}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">프롬프트</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500 hidden md:table-cell">사용자</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">모델</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">상태</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">생성일시</th>
              </tr>
            </thead>
            <tbody>
              {generations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">생성 내역이 없습니다.</td>
                </tr>
              ) : (
                generations.map((gen) => (
                  <tr key={gen.id} className={`border-b border-slate-100 hover:bg-slate-50 ${selectedGenerations.includes(gen.id) ? "bg-primary-50" : ""}`}>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedGenerations.includes(gen.id)}
                        onChange={(e) => setSelectedGenerations((prev) => (e.target.checked ? [...prev, gen.id] : prev.filter((id) => id !== gen.id)))}
                        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 truncate max-w-xs">{gen.prompt.slice(0, 100)}...</p>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <div className="font-medium text-slate-900">{gen.user.name || "익명"}</div>
                      <div className="text-sm text-slate-500">{gen.user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{gen.model}</span>
                    </td>
                    <td className="px-4 py-3 text-center">{gen.status}</td>
                    <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">{format(new Date(gen.createdAt), "MM/dd HH:mm:ss", { locale: ko })}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <CardFooter className="flex items-center justify-between">
            <div className="text-sm text-slate-600">전체 <strong>{formatNumber(pagination.total)}</strong>건</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={pagination.page === 1} onClick={() => handlePageChange(pagination.page - 1)}>
                <span className="w-4 h-4">◀</span>
              </Button>
              <span className="px-3 text-sm font-medium text-slate-700">{pagination.page} / {pagination.totalPages}</span>
              <Button variant="outline" size="sm" disabled={pagination.page === pagination.totalPages} onClick={() => handlePageChange(pagination.page + 1)}>
                <span className="w-4 h-4">▶</span>
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}