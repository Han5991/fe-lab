'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { authRepository } from '@/src/domain/auth';
import { ADMIN_LOGIN_PATH } from '@/src/shared/routes';
import { endAdminSession } from './adminCache';

export function useAdminLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await authRepository.signOutAdmin({ scope: 'local' });
    endAdminSession(queryClient);
    router.push(ADMIN_LOGIN_PATH);
  };

  return { handleLogout };
}
