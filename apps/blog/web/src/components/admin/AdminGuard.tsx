'use client';

import { type ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { client as supabase } from '@/lib/client';
import { useSuspenseQuery } from '@tanstack/react-query';

// admin UI를 로컬(pnpm dev)에서 로그인 없이 개발/확인하기 위한 우회.
// NODE_ENV로 자동 게이팅된다 → 프로덕션 빌드에선 false로 인라인되어 아래 우회
// 분기가 전부 DCE로 제거되므로 배포 전 수동 원복이 필요 없다. (Edge Function
// admin-analytics도 SUPABASE_URL 기반 isLocalDev로 자동 분기 — 로컬만 우회하고
// *.supabase.co 프로덕션은 인증을 강제한다.)
const DEV_BYPASS = process.env.NODE_ENV === 'development';

export function AdminGuard({ children }: { children: ReactNode }) {
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
      void supabase.auth.signOut().then(() => {
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
    return children; // dev 전용 우회 (프로덕션은 위 게이팅으로 도달 불가)
  }

  if (pathname === '/admin/login') {
    return children;
  }

  if (!session || session.user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return null; // Don't flash content before redirect
  }

  return children;
}
