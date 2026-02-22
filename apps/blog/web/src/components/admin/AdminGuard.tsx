'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { client as supabase } from '@/lib/client';
import { css } from '@design-system/ui-lib/css';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth guard error:', error);
          if (mounted) {
            router.replace('/admin/login');
          }
          return;
        }

        if (!session) {
          if (mounted) {
            router.replace('/admin/login');
          }
          return;
        }

        // Additional security check: Only allow the configured admin email
        if (session.user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
          console.warn(`Unauthorized email attempt: ${session.user.email}`);
          await supabase.auth.signOut();
          if (mounted) {
            router.replace('/admin/login?error=unauthorized');
          }
          return;
        }

        if (mounted) {
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('Check auth error:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    // Skip guard for the login page itself to prevent infinite loops
    if (pathname === '/admin/login') {
      setIsLoading(false);
      setIsAuthenticated(true);
      return;
    }

    checkAuth();

    // Listen for auth state changes (e.g., logging out from another tab)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (pathname === '/admin/login') return;

      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/admin/login');
      } else if (session?.user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        await supabase.auth.signOut();
        router.replace('/admin/login?error=unauthorized');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  if (isLoading) {
    return (
      <div
        className={css({
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minH: '100vh',
        })}
      >
        <p>인증 확인 중...</p>
      </div>
    );
  }

  if (!isAuthenticated && pathname !== '/admin/login') {
    return null; // Don't flash content before redirect
  }

  return <>{children}</>;
}
