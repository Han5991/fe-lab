'use client';

import { Suspense } from 'react';
import { signInAdminWithGoogle } from '@/domain/auth';
import { css, cx } from '@design-system/ui-lib/css';
import { railGutter } from '@/src/components/Rail';
import { LogIn } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';

function LoginForm() {
  const searchParams = useSearchParams();

  const { mutateAsync: handleGoogleLogin, isPending: isLoading } = useMutation({
    mutationFn: () => signInAdminWithGoogle(`${window.location.origin}/admin`),
    onError: () => alert('로그인 중 오류가 발생했습니다.'),
  });

  const error = searchParams?.get('error');

  return (
    <div
      className={cx(
        css({
          display: 'flex',
          flexDir: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minH: '[100vh]',
          bg: 'ink.50',
        }),
        // 거터가 없으면 400px보다 좁은 화면에서 카드 테두리가 화면 끝에
        // 붙는다. 404(railForm)와 같은 대우를 해준다.
        railGutter,
      )}
    >
      <div
        className={css({
          p: '8',
          rounded: 'xl',
          borderWidth: '[1px]',
          borderColor: 'ink.border',
          bg: 'ink.25',
          textAlign: 'center',
          maxW: 'railForm',
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
              color: 'danger.text',
              fontSize: 'sm',
              mb: '4',
              p: '3',
              bg: 'danger.bg',
              rounded: 'lg',
              borderWidth: '[1px]',
              borderColor: 'danger.border',
            })}
          >
            등록되지 않은 이메일입니다. 지정된 관리자 계정으로 로그인해주세요.
          </div>
        )}

        <button
          onClick={() => void handleGoogleLogin()}
          disabled={isLoading}
          className={css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2',
            w: 'full',
            py: '3',
            px: '4',
            bg: 'btn.accent',
            color: 'white',
            rounded: 'lg',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            fontWeight: 'semibold',
            fontSize: 'sm',
            transition: '[opacity 0.15s]',
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
