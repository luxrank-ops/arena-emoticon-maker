import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { AnalyticsProvider } from '@/components/analytics/AnalyticsProvider';

export const metadata: Metadata = {
  title: '이모티학 · 내 얼굴로 만드는 이모티콘',
  description:
    '사진 한 장으로 나만의 이모티콘을 만들고, 다양한 표정을 골라 편집하고 저장해 보세요.',
  keywords: ['이모티콘 만들기', '내 얼굴 이모티콘', 'AI 이모티콘', '실사 표정 스티커', '카카오 이모티콘'],
  openGraph: {
    title: '이모티학 · 내 얼굴로 만드는 이모티콘',
    description: '사진 한 장으로 나만의 이모티콘을 만들고 편집해 보세요.',
    type: 'website',
  },
  robots: { index: true, follow: true },
  verification: {
    google: 'lrB1CBJAO7vWKLVV5KuNM-6qrDfY06GRAP1daWMikjE',
  },
  // PWA / 플레이스토어(TWA) 준비
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '이모티학',
  },
  formatDetection: { telephone: false },
  other: {
    'mobile-web-app-capable': 'yes',
    themeColor: '#FF6B5B',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col">
        <AnalyticsProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </AnalyticsProvider>
      </body>
    </html>
  );
}
