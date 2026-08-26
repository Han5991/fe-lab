'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { css } from '@design-system/ui-lib/css';
import { isAdminLoginPath } from '@/domain/auth';

const AdminGuard = dynamic(
  () => import('@/src/components/admin/AdminGuard').then(mod => mod.AdminGuard),
  { ssr: false },
);

function AuthFallback() {
  return (
    <div
      className={css({
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minH: '[100vh]',
      })}
    >
      <p>인증 확인 중...</p>
    </div>
  );
}

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = isAdminLoginPath(pathname);

  const content = isLoginPage ? children : <AdminGuard>{children}</AdminGuard>;

  return <Suspense fallback={<AuthFallback />}>{content}</Suspense>;
}
