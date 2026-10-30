import type { Metadata } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: '이모티미 · 내 얼굴로 만드는 3초 이모티콘',
  description:
    '사진 한 장으로 내 얼굴 이모티콘 24컷. 오늘 쓸 답장을 매일 추천하고, 실물 굿즈까지. 이모티미.',
  keywords: ['이모티콘 만들기', '내 얼굴 이모티콘', 'AI 이모티콘', '캐리커처', '카카오 이모티콘'],
  openGraph: {
    title: '이모티미 · 내 얼굴로 만드는 3초 이모티콘',
    description: '사진 1장 → 24컷 이모티콘 → 매일 아침 오늘의 답장 추천',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
