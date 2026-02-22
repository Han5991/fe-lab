'use client';

import { AdminGuard } from '@/src/components/admin/AdminGuard';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage =
    pathname === '/admin/login' || pathname === '/admin/login/';

  return isLoginPage ? <>{children}</> : <AdminGuard>{children}</AdminGuard>;
}
