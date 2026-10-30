"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardFooter } from "@/components/ui/Card";

interface ModerationItem {
  id: string;
  prompt: string;
  status: string;
  createdAt: string;
  user: { name: string | null; email: string };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AdminModerationClientProps {
  initialData: {
    items: ModerationItem[];
    pagination: Pagination;
    stats: { pending: number; approved: number; rejected: number; flagged: number };
    filters: { status: string; type: string };
  };
}

export default function AdminModerationClient({ initialData }: AdminModerationClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState(initialData.items);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [stats] = useState(initialData.stats);
  const [filters, setFilters] = useState(initialData.filters);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value, page: "1" };
    setFilters(newFilters);
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    router.push(`/admin/moderation?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/admin/moderation?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">콘텐츠 모더레이션</h1>
          <p className="text-slate-600 mt-1">부적절한 콘텐츠를 검토하고 조치하세요.</p>
        </div>
      </div>

      <Card variant="outlined" padding="none">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-12 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === items.length && items.length > 0}
                    onChange={(e) => setSelectedItems(e.target.checked ? items.map((u) => u.id) : [])}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">콘텐츠</th>
                <th className="px-4 py-3 text-center font-medium text-slate-500">상태</th>
                <th className="px-4 py-3 text-right font-medium text-slate-500">신고일시</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500">검토할 콘텐츠가 없습니다.</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => setSelectedItems((prev) => (e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)))}
                        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 truncate">{item.prompt.slice(0, 80)}...</p>
                    </td>
                    <td className="px-4 py-3 text-center">{item.status}</td>
                    <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">{new Date(item.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <CardFooter className="flex items-center justify-between">
            <div className="text-sm text-slate-600">전체 <strong>{pagination.total}</strong>건</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={pagination.page === 1} onClick={() => handlePageChange(pagination.page - 1)}>
                이전
              </Button>
              <span className="px-3 text-sm font-medium text-slate-700">{pagination.page} / {pagination.totalPages}</span>
              <Button variant="outline" size="sm" disabled={pagination.page === pagination.totalPages} onClick={() => handlePageChange(pagination.page + 1)}>
                다음
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}