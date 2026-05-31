'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { client } from '@/lib/client';

export function useAdminLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await client.auth.signOut({ scope: 'local' });
    // 로그아웃 후 이전 세션의 admin 집계 데이터가 캐시(gcTime 10분)에 남아
    // 다른 계정 로그인/뒤로가기 시 노출되지 않도록 ['admin', *] prefix의 집계
    // 쿼리를 비운다(partial 매칭). 인증 세션 쿼리(['admin-auth-session'])는
    // prefix가 달라 제외되며, 세션 자체는 위 signOut이 정리한다.
    queryClient.removeQueries({ queryKey: ['admin'] });
    router.push('/admin/login');
  };

  return { handleLogout };
}
