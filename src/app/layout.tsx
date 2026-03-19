import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '筋肉疲労マップ 2D',
  description: '手動入力による筋肉疲労度管理アプリケーション',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
