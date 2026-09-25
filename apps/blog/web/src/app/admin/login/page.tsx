'use client';

import { Suspense } from 'react';
import { authRepository } from '@/src/domain/auth';
import { adminLoginRedirectUrl } from '@/src/shared/routes';
import { css, cx } from '@design-system/ui-lib/css';
import { railGutter } from '@/src/components/Rail';
import { LogIn } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';

function LoginForm() {
  const searchParams = useSearchParams();

  // 성공하면 브라우저가 Google로 떠나므로 반환값은 쓸 데가 없다 — 실패는 error 상태로 그린다.
  const {
    mutate: handleGoogleLogin,
    isPending: isLoading,
    error: signInError,
  } = useMutation({
    // 돌아올 주소의 계약(경로 모양, Supabase 대시보드 목록과의 짝)은
    // src/domain/auth가 갖는다. 화면이 보태는 건 origin 하나뿐이다 — 그걸
    // 아는 건 브라우저뿐이라 여기서만 읽을 수 있다.
    mutationFn: async () => {
      // 시작 실패는 throw가 아니라 { error }로 온다.
      const { error } = await authRepository.signInAdminWithGoogle(
        adminLoginRedirectUrl(window.location.origin),
      );
      if (error) throw new Error(error.message);
    },
  });

  const error = searchParams?.get('error');
  // AdminGuard가 실어 보낸 OAuth 실패 사유 — URL에서 온 글자라 고정 문구 아래 참고로만 보인다.
  const oauthErrorDescription = searchParams?.get('error_description');

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

        {(error === 'oauth' || signInError) && (
          <div
            role="alert"
            className={css({
              color: 'danger.text',
              fontSize: 'sm',
              mb: '4',
              p: '3',
              bg: 'danger.bg',
              rounded: 'lg',
              borderWidth: '[1px]',
              borderColor: 'danger.border',
              display: 'flex',
              flexDir: 'column',
              gap: '1',
            })}
          >
            <span>Google 로그인에 실패했습니다.</span>
            {(signInError?.message ?? oauthErrorDescription) && (
              <span
                className={css({ fontSize: 'xs', wordBreak: 'break-word' })}
              >
                {signInError?.message ?? oauthErrorDescription}
              </span>
            )}
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
