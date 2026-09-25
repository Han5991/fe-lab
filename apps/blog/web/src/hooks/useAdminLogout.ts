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
    // 이전 세션의 admin 집계 캐시가 다른 계정·뒤로 가기에 노출되지 않게 비운다.
    queryClient.removeQueries({ queryKey: ['admin'] });
    // 가드의 세션 캐시(prefix가 달라 위에서 안 걸린다)는 null로 덮는다 — 남기면 뒤로
    // 가기로 옛 세션 화면이 그려지고, 지우면 마운트된 가드가 다시 물어 화면이 번쩍인다.
    queryClient.setQueryData(['admin-auth-session'], null);
    router.push(ADMIN_LOGIN_PATH);
  };

  return { handleLogout };
}
