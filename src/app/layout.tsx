import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: 'Arena Emoticon Maker - 나만의 이모티콘 제작기',
    template: '%s | Arena Emoticon Maker',
  },
  description: 'AI로 나만의 캐릭터 이모티콘을 만들어보세요. Gemini AI로 프롬프트를 최적화하고 DALL·E, Midjourney로 고품질 이미지를 생성하세요.',
  keywords: ['이모티콘', '캐릭터', 'AI', '프롬프트', 'Gemini', 'DALL-E', 'Midjourney'],
  authors: [{ name: 'Arena AI' }],
  creator: 'Arena AI',
  publisher: 'Arena AI',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://emoticon.arena.ai',
    siteName: 'Arena Emoticon Maker',
    title: 'Arena Emoticon Maker - 나만의 이모티콘 제작기',
    description: 'AI로 나만의 캐릭터 이모티콘을 만들어보세요.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Arena Emoticon Maker',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arena Emoticon Maker',
    description: 'AI로 나만의 캐릭터 이모티콘을 만들어보세요.',
    images: ['/og-image.png'],
  },
  verification: {
    google: 'google-site-verification-code',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-slate-50 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}