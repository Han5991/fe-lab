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

// admin UI를 로컬(pnpm dev)에서 로그인 없이 개발/확인하기 위한 우회.
// NODE_ENV로 자동 게이팅된다 → 프로덕션 빌드에선 false로 인라인되어 아래 우회
// 분기가 전부 DCE로 제거되므로 배포 전 수동 원복이 필요 없다.
//
// 이 값은 화면만 연다 — 데이터는 Edge Function admin-analytics가 따로 지킨다.
// 그쪽 인증 우회는 URL 추정이 아니라 명시 플래그 ADMIN_ANALYTICS_ALLOW_UNAUTH
// 하나로만 켜지고(로컬 `supabase start`의 config.toml [edge_runtime.secrets]가
// 켠다), 플래그가 없는 배포 환경은 인증을 강제한다. 예전의 SUPABASE_URL 기반
// isLocalDev 자동 우회는 셀프호스트 게이트웨이 호스트명(kong)에서도 인증을 꺼
// 버리는 문제로 제거됐다(supabase/functions/admin-analytics/index.ts).
const DEV_BYPASS = process.env.NODE_ENV === 'development';

export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // 자식의 admin 쿼리가 만들어지기 전에 걸려야 해서 렌더 중에 건다 — 같은 값을
  // 다시 거는 것이라 몇 번 불려도 결과가 같다.
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
      // OAuth가 실패해 돌아온 경우 Supabase가 복귀 URL에 사유를 붙여 둔다.
      // 그냥 로그인 화면으로 보내면 사유가 떨어져, 거절된 계정이 아무 안내 없이
      // 로그인 화면으로 되돌아온다 — 사유를 실어 보낸다.
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
