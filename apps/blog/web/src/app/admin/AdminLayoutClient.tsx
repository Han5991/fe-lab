'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { type ReactNode, Suspense } from 'react';
import { css } from '@design-system/ui-lib/css';
// 로그인 경로 판정은 라우트 계약(@/src/shared/routes — 순수 상수·함수 모듈)에서
// 온다. auth 배럴(@/src/domain/auth)은 모듈 스코프에서 supabase 클라이언트를
// 바인딩하므로 여기서 열지 않는다 — 판정 하나 때문에 인증 세션 스택이
// AdminGuard의 dynamic(ssr:false) 분리 밖(이 파일은 즉시 로드된다)으로
// 끌려 나온다.
import { isAdminLoginPath } from '@/src/shared/routes';

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

export function AdminLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = isAdminLoginPath(pathname);

  const content = isLoginPage ? children : <AdminGuard>{children}</AdminGuard>;

  return <Suspense fallback={<AuthFallback />}>{content}</Suspense>;
}
