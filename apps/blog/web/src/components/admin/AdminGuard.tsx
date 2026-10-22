'use client';

import { type ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import {
  type AdminSession,
  authRepository,
  isAdminEmail,
  readOAuthRedirectError,
} from '@/src/domain/auth';
import { reportError } from '@/src/components/errorReporting';
import {
  ADMIN_LOGIN_PATH,
  ADMIN_LOGIN_UNAUTHORIZED_PATH,
  adminLoginErrorPath,
  isAdminLoginPath,
} from '@/src/shared/routes';
import { setAdminQueryDefaults } from '@/src/hooks/adminQueryDefaults';
import {
  ADMIN_SESSION_QUERY_KEY,
  clearAdminData,
  endAdminSession,
} from '@/src/hooks/adminCache';

// 로컬(pnpm dev)에서 로그인 없이 admin 화면을 여는 우회 — 프로덕션 빌드에서는 false로
// 인라인돼 DCE된다. 화면만 열고, 데이터는 Edge Function이 명시 플래그로 따로 지킨다.
const DEV_BYPASS = process.env.NODE_ENV === 'development';

export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  // 자식 쿼리보다 먼저 걸려야 해서 렌더 중에 건다(같은 값이라 몇 번 불려도 같다).
  setAdminQueryDefaults(queryClient);

  const { data: session } = useSuspenseQuery({
    queryKey: ADMIN_SESSION_QUERY_KEY,
    // 우회 시 supabase 세션 조회 생략. 조회 실패→null 수렴은 저장소가 한다.
    queryFn: () => (DEV_BYPASS ? null : authRepository.getAdminSession()),
  });

  useEffect(() => {
    if (DEV_BYPASS) return; // 우회: redirect/auth 리스너 skip

    /**
     * 관리자가 아닌 계정을 내보낸다. 세션 캐시는 null로 덮지 않고 그 비관리자 세션으로 맞춘다 —
     * null이면 아래 "세션 없음" 분기가 로그인 화면으로 보내 권한 없음 리다이렉트와 다투고, 마운트
     * 때의 관리자 세션이 남으면 뒤로 가기로 돌아왔을 때 가드가 그 세션으로 화면을 그린다. 비관리자
     * 세션이면 이 판정이 계속 거절한다. 로그아웃이 실패해도 화면은 떠나고 실패는 보고한다.
     */
    const rejectNonAdmin = (nonAdmin: AdminSession) => {
      const leave = () => {
        clearAdminData(queryClient);
        queryClient.setQueryData(ADMIN_SESSION_QUERY_KEY, nonAdmin);
        router.replace(ADMIN_LOGIN_UNAUTHORIZED_PATH);
      };
      authRepository.signOutAdmin().then(leave, (error: unknown) => {
        leave();
        reportError(error, false);
      });
    };
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
      rejectNonAdmin(session);
      return;
    }

    // Listen for auth state changes (e.g., logging out from another tab)
    const unsubscribe = authRepository.subscribeAdminSession(
      (currentSession, event) => {
        if (isAdminLoginPath(pathname)) return;

        // 다른 탭의 로그아웃·계정 전환도 이 탭의 세션을 끝낸다 — 로그아웃 버튼과 같은 비우기를
        // 거쳐야 뒤로 가기에 옛 세션 화면·집계가 남지 않는다.
        if (event === 'SIGNED_OUT' || !currentSession) {
          endAdminSession(queryClient);
          router.replace(ADMIN_LOGIN_PATH);
        } else if (!isAdminEmail(currentSession.user.email)) {
          // 구독부터 끊는다 — signOut은 resolve하기 전에 같은 탭 구독자에게 SIGNED_OUT을 보내고,
          // 그게 위 분기로 들어오면 세션 캐시를 비워 권한 없음 리다이렉트를 로그인으로 덮는다.
          unsubscribe();
          rejectNonAdmin(currentSession);
        }
      },
    );
    return unsubscribe;
  }, [session, router, pathname, queryClient]);

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
