'use client';

import { type ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
  ADMIN_LOGIN_PATH,
  ADMIN_LOGIN_UNAUTHORIZED_PATH,
  authRepository,
  isAdminEmail,
  isAdminLoginPath,
} from '@/domain/auth';

// admin UI를 로컬(pnpm dev)에서 로그인 없이 개발/확인하기 위한 우회.
// NODE_ENV로 자동 게이팅된다 → 프로덕션 빌드에선 false로 인라인되어 아래 우회
// 분기가 전부 DCE로 제거되므로 배포 전 수동 원복이 필요 없다. (Edge Function
// admin-analytics도 SUPABASE_URL 기반 isLocalDev로 자동 분기 — 로컬만 우회하고
// *.supabase.co 프로덕션은 인증을 강제한다.)
const DEV_BYPASS = process.env.NODE_ENV === 'development';

export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

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
      router.replace(ADMIN_LOGIN_PATH);
      return;
    }

    // 화면 쪽 관리자 판정 — 실제 강제는 Edge Function이 한다(domain/auth 참고).
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
