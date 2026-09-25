'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { authRepository } from '@/src/domain/auth';
import { ADMIN_LOGIN_PATH } from '@/src/shared/routes';

export function useAdminLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await authRepository.signOutAdmin({ scope: 'local' });
    // 로그아웃 후 이전 세션의 admin 집계 데이터가 캐시(gcTime 10분)에 남아
    // 다른 계정 로그인/뒤로가기 시 노출되지 않도록 ['admin', *] prefix의 집계
    // 쿼리를 비운다(partial 매칭).
    queryClient.removeQueries({ queryKey: ['admin'] });
    // 가드의 세션 캐시(['admin-auth-session'] — prefix가 달라 위에서 안 걸린다)도
    // "세션 없음"으로 덮는다. signOut은 supabase 쪽 세션만 지우고, 이 캐시는
    // staleTime 5분·refetchOnMount false라 로그인 화면에서 뒤로 가기로 돌아오면
    // 가드가 옛 세션으로 admin 화면을 그리고 그 아래 쿼리가 401을 맞았다.
    // 지우지 않고 null로 두는 건, 지우면 아직 마운트된 가드가 세션을 다시 묻느라
    // 로그인 화면으로 넘어가기 전에 "인증 확인 중" 화면이 한 번 번쩍이기 때문이다.
    queryClient.setQueryData(['admin-auth-session'], null);
    router.push(ADMIN_LOGIN_PATH);
  };

  return { handleLogout };
}
