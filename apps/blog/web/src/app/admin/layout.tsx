import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { AdminLayoutClient } from './AdminLayoutClient';

// robots.txt의 Disallow는 크롤만 막고 색인은 막지 못하므로 noindex를 명시한다.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
