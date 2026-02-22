'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { client as supabase } from '@/lib/client';
import { css } from '@design-system/ui-lib/css';
import { useSuspenseQuery } from '@tanstack/react-query';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const { data: session } = useSuspenseQuery({
    queryKey: ['admin-auth-session'],
    queryFn: async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth guard error:', error);
        return null;
      }
      return session;
    },
  });

  useEffect(() => {
    // Skip guard for the login page itself to prevent infinite loops
    if (pathname === '/admin/login') {
      return;
    }

    if (!session) {
      router.replace('/admin/login');
      return;
    }

    // Additional security check: Only allow the configured admin email
    if (session.user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
      console.warn(`Unauthorized email attempt: ${session.user.email}`);
      supabase.auth.signOut().then(() => {
        router.replace('/admin/login?error=unauthorized');
      });
      return;
    }

    // Listen for auth state changes (e.g., logging out from another tab)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (pathname === '/admin/login') return;

      if (event === 'SIGNED_OUT' || !currentSession) {
        router.replace('/admin/login');
      } else if (
        currentSession?.user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL
      ) {
        await supabase.auth.signOut();
        router.replace('/admin/login?error=unauthorized');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [session, router, pathname]);

  if (pathname === '/admin/login') {
    return children;
  }

  if (!session || session.user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return null; // Don't flash content before redirect
  }

  return children;
}
