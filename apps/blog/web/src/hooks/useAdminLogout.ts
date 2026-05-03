'use client';

import { useRouter } from 'next/navigation';
import { client } from '@/lib/client';

export function useAdminLogout() {
  const router = useRouter();

  const handleLogout = async () => {
    await client.auth.signOut({ scope: 'local' });
    router.push('/admin/login');
  };

  return { handleLogout };
}
