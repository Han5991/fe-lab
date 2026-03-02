'use client';

import { useRouter } from 'next/navigation';
import { client } from '@/lib/client';

/**
 * Admin logout 훅.
 * admin/page.tsx와 admin/analytics/page.tsx에서 중복으로 정의되어 있던 것을 통합.
 */
export function useAdminLogout() {
  const router = useRouter();

  const handleLogout = async () => {
    await client.auth.signOut({ scope: 'local' });
    router.push('/admin/login');
  };

  return { handleLogout };
}
