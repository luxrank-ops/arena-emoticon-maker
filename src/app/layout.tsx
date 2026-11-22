import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { BottomNav } from '@/components/BottomNav';
import { AnalyticsProvider } from '@/components/analytics/AnalyticsProvider';
import { PwaRegistration } from '@/components/PwaRegistration';
import { getLocale } from '@/lib/i18n/server';
import { tr } from '@/lib/i18n/locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = tr(locale, '이모티학 · 내 얼굴로 만드는 이모티콘', 'EmotiHak · Turn your photo into AI stickers');
  const description = tr(
    locale,
    '사진 한 장으로 나만의 이모티콘을 만들고, 다양한 표정을 골라 편집하고 저장해 보세요.',
    'Turn one photo into a personal sticker pack, choose expressions, edit every line, and download your favorites.',
  );
  return {
  title,
  description,
  keywords: locale === 'en'
    ? ['AI sticker maker', 'photo stickers', 'personal emoticons', 'custom reaction stickers', 'EmotiHak']
    : ['이모티콘 만들기', '내 얼굴 이모티콘', 'AI 이모티콘', '실사 표정 스티커', '카카오 이모티콘'],
  openGraph: {
    title,
    description,
    type: 'website',
    locale: locale === 'en' ? 'en_US' : 'ko_KR',
  },
  alternates: { languages: { 'ko-KR': '/', 'en-US': '/en' } },
  robots: { index: true, follow: true },
  verification: {
    google: 'lrB1CBJAO7vWKLVV5KuNM-6qrDfY06GRAP1daWMikjE',
  },
  // PWA / 플레이스토어(TWA) 준비
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: tr(locale, '이모티학', 'EmotiHak'),
  },
  formatDetection: { telephone: false },
  other: {
    'mobile-web-app-capable': 'yes',
    themeColor: '#7C4DFF',
  },
  };
}

// 홈 화면(PWA)·엣지투엣지 기기에서 하단 바가 안전 영역(safe-area-inset-bottom)을 피하도록 한다.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#7C4DFF',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <head>
        {/* 이모티콘 대사 캘리그라피 폰트 — 첫 미리보기부터 같은 서체로 그린다 */}
        <link rel="preload" href="/fonts/EmotiHakCalli.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      {/* 본문 하단 여백 = 하단 고정 바 높이(3.375rem) + 안전 영역. 바가 콘텐츠를 가리지 않게 한다. */}
      <body className="flex min-h-screen flex-col pb-[calc(4.25rem_+_env(safe-area-inset-bottom))] lg:pb-0">
        <AnalyticsProvider>
          <PwaRegistration />
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <BottomNav locale={locale} />
        </AnalyticsProvider>
      </body>
    </html>
  );
}
