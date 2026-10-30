'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Activity,
  Flag,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BarChart3,
  Shield,
  CreditCard,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

const navigation = [
  { name: '대시보드', href: '/admin/dashboard', icon: LayoutDashboard, badge: null },
  { name: '사용자 관리', href: '/admin/users', icon: Users, badge: null },
  { name: '수익 분석', href: '/admin/revenue', icon: DollarSign, badge: null },
  { name: '생성 모니터링', href: '/admin/generations', icon: Activity, badge: null },
  { name: '콘텐츠 모더레이션', href: '/admin/moderation', icon: Flag, badge: null },
  { name: '설정', href: '/admin/settings', icon: Settings, badge: null },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 flex flex-col',
          sidebarOpen ? 'w-64' : 'w-20',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo & Toggle */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-lg text-slate-900">관리자</span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" role="navigation" aria-label="관리자 메뉴">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  'overflow-hidden whitespace-nowrap',
                  isActive
                    ? 'bg-primary-50 text-primary-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  !sidebarOpen && 'justify-center px-2'
                )}
                title={sidebarOpen ? undefined : item.name}
              >
                <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-primary-600')} aria-hidden="true" />
                {sidebarOpen && (
                  <>
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-primary-100 text-primary-700 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: Toggle & Logout */}
        <div className="p-3 border-t border-slate-200">
          <Button
            variant="ghost"
            size="sm"
            className={cn('w-full justify-center', sidebarOpen && 'justify-between')}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <ChevronLeft className={cn('w-5 h-5 transition-transform', !sidebarOpen && 'rotate-180')} />
            {sidebarOpen && <span>메뉴 접기</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0 transition-all duration-300">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-slate-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="메뉴 열기"
              >
                <LayoutDashboard className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-semibold text-slate-900 hidden sm:block">
                {navigation.find(n => pathname === n.href || pathname.startsWith(n.href + '/'))?.name || '관리자'}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </Button>
              <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900 font-medium">
                사용자 페이지
              </Link>
              <Link href="/api/auth/signout" className="text-sm text-slate-600 hover:text-slate-900 font-medium">
                <LogOut className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Desktop sidebar toggle */}
      {!sidebarOpen && (
        <Button
          variant="primary"
          size="sm"
          className="fixed left-4 top-20 z-40 lg:hidden shadow-lg"
          onClick={() => setSidebarOpen(true)}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
}