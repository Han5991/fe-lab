'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { css } from '@design-system/ui-lib/css';
// 배럴(@/domain/auth)이 아니라 순수 판정 모듈을 직접 가져온다 — 배럴은
// 모듈 스코프에서 supabase 클라이언트를 바인딩하므로, 판정 하나 때문에
// 인증 세션 스택이 AdminGuard의 dynamic(ssr:false) 분리 밖(이 파일은 즉시
// 로드된다)으로 끌려 나온다.
import { isAdminLoginPath } from '@/shared/routes';

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
