'use client';

import { Suspense } from 'react';
import { client as supabase } from '@/lib/client';
import { css } from '@design-system/ui-lib/css';
import { LogIn } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';

function LoginForm() {
  const searchParams = useSearchParams();

  const { mutateAsync: handleGoogleLogin, isPending: isLoading } = useMutation({
    mutationFn: () =>
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/admin`,
        },
      }),
    onError: () => alert('로그인 중 오류가 발생했습니다.'),
  });

  const error = searchParams?.get('error');

  return (
    <div
      className={css({
        display: 'flex',
        flexDir: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minH: '100vh',
        bg: 'ink.50',
      })}
    >
      <div
        className={css({
          p: '8',
          rounded: 'xl',
          borderWidth: '1px',
          borderColor: 'ink.border',
          bg: 'ink.25',
          textAlign: 'center',
          maxW: '400px',
          w: 'full',
        })}
      >
        <p
          className={css({
            fontSize: 'xs',
            fontWeight: 'bold',
            letterSpacing: 'widest',
            textTransform: 'uppercase',
            color: 'accent.600',
            mb: '3',
          })}
        >
          Admin
        </p>
        <h1
          className={css({
            fontSize: 'xl',
            fontWeight: 'bold',
            mb: '6',
            color: 'ink.950',
          })}
        >
          FE Lab 관리자
        </h1>

        {error === 'unauthorized' && (
          <div
            className={css({
              color: 'red.600',
              fontSize: 'sm',
              mb: '4',
              p: '3',
              bg: 'red.50',
              rounded: 'lg',
              borderWidth: '1px',
              borderColor: 'red.200',
            })}
          >
            등록되지 않은 이메일입니다. 지정된 관리자 계정으로 로그인해주세요.
          </div>
        )}

        <button
          onClick={() => handleGoogleLogin()}
          disabled={isLoading}
          className={css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2',
            w: 'full',
            py: '3',
            px: '4',
            bg: 'accent.600',
            color: 'white',
            rounded: 'lg',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            fontWeight: 'semibold',
            fontSize: 'sm',
            transition: 'opacity 0.15s',
            _hover: { opacity: '0.85' },
          })}
        >
          <LogIn size={18} />
          {isLoading ? '로그인 중...' : 'Google 계정으로 계속하기'}
        </button>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
