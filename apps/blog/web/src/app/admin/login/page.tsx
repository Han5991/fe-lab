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
      })}
    >
      <div
        className={css({
          p: '2rem',
          rounded: '8px',
          boxShadow:
            '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          bg: 'white',
          textAlign: 'center',
          maxW: '400px',
          w: '100%',
        })}
      >
        <h1
          className={css({
            fontSize: '1.5rem',
            fontWeight: 'bold',
            mb: '1rem',
            color: 'black',
          })}
        >
          Admin Login
        </h1>

        {error === 'unauthorized' && (
          <div
            className={css({
              color: 'red.500',
              fontSize: '0.875rem',
              mb: '1rem',
              p: '0.5rem',
              bg: 'red.50',
              rounded: '4px',
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
            gap: '0.5rem',
            w: '100%',
            p: '0.75rem 1rem',
            bg: '#4285F4',
            color: 'white',
            rounded: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            fontWeight: '500',
            transition: 'background-color 0.2s',
            border: 'none',
            fontSize: '1rem',
            _hover: {
              bg: '#3367D6',
            },
          })}
        >
          <LogIn size={20} />
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
