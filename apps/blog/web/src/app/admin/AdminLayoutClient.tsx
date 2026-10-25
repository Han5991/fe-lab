'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { type ReactNode, Suspense } from 'react';
import { css } from '@blog/styled-system/css';
// 로그인 경로 판정은 라우트 계약(@/src/shared/routes — 순수 상수·함수 모듈)에서
// 온다. auth 배럴(@/src/domain/auth)은 모듈 스코프에서 supabase 클라이언트를
// 바인딩하므로 여기서 열지 않는다 — 판정 하나 때문에 인증 세션 스택이
// AdminShell의 dynamic(ssr:false) 분리 밖(이 파일은 즉시 로드된다)으로
// 끌려 나온다.
import { isAdminLoginPath } from '@/src/shared/routes';

// 가드·관리자 바(로그아웃이 auth 배럴을 연다)는 한 청크로 지연 로드한다 — 둘을 따로 나누면
// 세션을 확인한 뒤에야 바의 청크를 받는 왕복이 하나 더 생긴다.
const AdminShell = dynamic(
  () => import('@/src/components/admin/AdminShell').then(mod => mod.AdminShell),
  { ssr: false },
);

function AuthFallback() {
  return (
    <div
      className={css({
        flex: '1',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      })}
    >
      <p>인증 확인 중...</p>
    </div>
  );
}

/**
 * admin 영역의 바탕 — 루트 레이아웃이 사이트 셸을 씌우지 않으므로(`ShellSwitch`) 지면색·글자색·
 * 최소 높이를 여기서 준다. 바닥은 카드보다 한 단계 어두운 `surface.base`다(승인 admin 목업).
 * 로그인 화면은 가드 밖이고 관리자 바도 없다.
 */
export function AdminLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = isAdminLoginPath(pathname);

  const content = isLoginPage ? children : <AdminShell>{children}</AdminShell>;

  return (
    <div
      className={css({
        minH: '[100dvh]',
        display: 'flex',
        flexDir: 'column',
        bg: 'surface.base',
        color: 'ink.950',
      })}
    >
      <Suspense fallback={<AuthFallback />}>{content}</Suspense>
    </div>
  );
}
