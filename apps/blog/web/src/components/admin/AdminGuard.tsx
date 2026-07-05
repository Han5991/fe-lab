'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { client as supabase } from '@/lib/client';
import { useSuspenseQuery } from '@tanstack/react-query';

// TODO(restore-admin-guard): 로컬 로그인이 안 되는 환경에서 admin UI 개발/확인용
// 임시 우회. Edge Function 인증도 함께 임시 해제됨(admin-analytics/index.ts).
// 배포/PR 전 이 우회와 Edge Function 인증을 모두 원복할 것.
const DEV_BYPASS = process.env.NODE_ENV === 'development';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const { data: session } = useSuspenseQuery({
    queryKey: ['admin-auth-session'],
    queryFn: async () => {
      if (DEV_BYPASS) return null; // 우회 시 supabase 세션 조회 생략
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
    if (DEV_BYPASS) return; // 우회: redirect/auth 리스너 skip
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

  if (DEV_BYPASS) {
    return children; // TODO(restore-admin-guard): dev 임시 우회
  }

  if (pathname === '/admin/login') {
    return children;
  }

  if (!session || session.user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return null; // Don't flash content before redirect
  }

  return children;
}
