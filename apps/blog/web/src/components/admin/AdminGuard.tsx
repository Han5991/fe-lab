'use client';

import { type ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import {
  authRepository,
  isAdminEmail,
  readOAuthRedirectError,
} from '@/src/domain/auth';
import {
  ADMIN_LOGIN_PATH,
  ADMIN_LOGIN_UNAUTHORIZED_PATH,
  adminLoginErrorPath,
  isAdminLoginPath,
} from '@/src/shared/routes';
import { setAdminQueryDefaults } from '@/src/hooks/adminQueryDefaults';

// 로컬(pnpm dev)에서 로그인 없이 admin 화면을 여는 우회 — 프로덕션 빌드에서는 false로
// 인라인돼 DCE된다. 화면만 열고, 데이터는 Edge Function이 명시 플래그로 따로 지킨다.
const DEV_BYPASS = process.env.NODE_ENV === 'development';

export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // 자식 쿼리보다 먼저 걸려야 해서 렌더 중에 건다(같은 값이라 몇 번 불려도 같다).
  setAdminQueryDefaults(useQueryClient());

  const { data: session } = useSuspenseQuery({
    queryKey: ['admin-auth-session'],
    // 우회 시 supabase 세션 조회 생략. 조회 실패→null 수렴은 저장소가 한다.
    queryFn: () => (DEV_BYPASS ? null : authRepository.getAdminSession()),
  });

  useEffect(() => {
    if (DEV_BYPASS) return; // 우회: redirect/auth 리스너 skip
    // Skip guard for the login page itself to prevent infinite loops
    if (isAdminLoginPath(pathname)) {
      return;
    }

    if (!session) {
      // OAuth 실패로 돌아왔으면 Supabase가 복귀 URL에 붙인 사유를 실어 보낸다.
      const oauthError = readOAuthRedirectError(
        window.location.search,
        window.location.hash,
      );
      router.replace(
        oauthError ? adminLoginErrorPath(oauthError) : ADMIN_LOGIN_PATH,
      );
      return;
    }

    // 화면 쪽 관리자 판정 — 실제 강제는 Edge Function이 한다(src/domain/auth 참고).
    if (!isAdminEmail(session.user.email)) {
      console.warn(`Unauthorized email attempt: ${session.user.email}`);
      void authRepository.signOutAdmin().then(() => {
        router.replace(ADMIN_LOGIN_UNAUTHORIZED_PATH);
      });
      return;
    }

    // Listen for auth state changes (e.g., logging out from another tab)
    return authRepository.subscribeAdminSession((currentSession, event) => {
      if (isAdminLoginPath(pathname)) return;

      if (event === 'SIGNED_OUT' || !currentSession) {
        router.replace(ADMIN_LOGIN_PATH);
      } else if (!isAdminEmail(currentSession.user.email)) {
        void authRepository.signOutAdmin().then(() => {
          router.replace(ADMIN_LOGIN_UNAUTHORIZED_PATH);
        });
      }
    });
  }, [session, router, pathname]);

  if (DEV_BYPASS) {
    return children; // dev 전용 우회 (프로덕션은 위 게이팅으로 도달 불가)
  }

  if (isAdminLoginPath(pathname)) {
    return children;
  }

  if (!session || !isAdminEmail(session.user.email)) {
    return null; // Don't flash content before redirect
  }

  return children;
}
