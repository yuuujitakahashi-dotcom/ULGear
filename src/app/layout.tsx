import type { Metadata } from 'next';
import { Noto_Sans_JP, Google_Sans } from 'next/font/google';
import { cn } from '@/lib/utils';
import './globals.css';

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const googleSans = Google_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-numeric',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ULoG',
  description: '山岳ギア管理アプリ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={cn('font-sans', notoSansJP.variable, googleSans.variable)}>
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏔️</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  );
}
