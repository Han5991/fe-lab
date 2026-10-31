'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { authRepository } from '@/src/domain/auth';
import { adminLoginRedirectUrl, HOME_PATH } from '@/src/shared/routes';
import { css, cx } from '@blog/styled-system/css';
import { railColumn, railGutter } from '@/src/components/Rail';
import { actionButton } from '@/src/components/actionButton';
import { adminCard, pillBadge } from '@/src/components/admin/adminStyles';
import { pressText } from '@/src/components/interaction';
import { WORDMARK } from '@/src/components/wordmark';
import { AlertCircle, LogIn } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';

// 오류 배너 — Astryx Banner error(위험 틴트 면, 안쪽 12/16, 아이콘 20, 보더·그림자 없음). 카드 안에
// 든 상자라 라운드는 한 단계 아래인 element다(blog-design-system 스킬 형태 절).
const banner = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '2',
  py: '3',
  px: '4',
  rounded: 'element',
  bg: 'danger.bg',
  color: 'ink.950',
});

const bannerIcon = css({ flexShrink: '0', color: 'danger.text' });

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

  const error = searchParams.get('error');
  // AdminGuard가 실어 보낸 OAuth 실패 사유 — URL에서 온 글자라 고정 문구 아래 참고로만 보인다.
  const oauthErrorDescription = searchParams.get('error_description');

  return (
    // 가운데 정렬한 400 묶음(Astryx login 템플릿) — 워드마크·배지, 카드, 블로그로 돌아가는 링크.
    // 거터가 없으면 400px보다 좁은 화면에서 카드 테두리가 화면 끝에 붙는다(404와 같은 대우).
    <main
      className={cx(
        railGutter,
        css({
          flex: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: '6',
        }),
      )}
    >
      {/* 등장 — 묶음이 98%에서 제 크기로 서며 나타난다(medium·standard). 서버가 그린 화면이라 하드
          로드마다 돈다: 로그인 화면은 들어오는 장면 자체가 이 화면의 전부라 일부러 그렇게 둔다(공개
          페이지의 "서버가 그린 요소에는 등장 없음"과 다른 자리 — blog-design-system 스킬 admin 절).
          버튼 누름·비활성은 `actionButton`이 펼친 `pressButton`이 맡는다. */}
      <div
        className={cx(
          railColumn({ width: 'form' }),
          css({
            w: 'full',
            display: 'flex',
            flexDir: 'column',
            gap: '4',
            animationName: 'admin-card-in',
            animationDuration: 'medium',
            animationTimingFunction: 'standard',
            animationFillMode: 'both',
          }),
        )}
      >
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2',
          })}
        >
          <span
            className={css({
              fontFamily: 'mono',
              textStyle: 'h3',
              fontWeight: 'bold',
            })}
          >
            {WORDMARK}
          </span>
          <span className={css(pillBadge)}>Admin</span>
        </div>

        <section
          className={css(adminCard, {
            p: '8',
            display: 'flex',
            flexDir: 'column',
            gap: '4',
          })}
        >
          <h1 className={css({ textStyle: 'h2', textAlign: 'center' })}>
            FE Lab 관리자
          </h1>

          {error === 'unauthorized' && (
            <div className={banner}>
              <AlertCircle size={20} aria-hidden className={bannerIcon} />
              <p className={css({ textStyle: 'body' })}>
                등록되지 않은 이메일입니다. 지정된 관리자 계정으로
                로그인해주세요.
              </p>
            </div>
          )}

          {(error === 'oauth' || signInError) && (
            <div role="alert" className={banner}>
              <AlertCircle size={20} aria-hidden className={bannerIcon} />
              <div
                className={css({
                  display: 'flex',
                  flexDir: 'column',
                  minW: '0',
                })}
              >
                <p
                  className={css({ textStyle: 'body', fontWeight: 'semibold' })}
                >
                  Google 로그인에 실패했습니다.
                </p>
                {(signInError?.message ?? oauthErrorDescription) && (
                  <p
                    className={css({
                      textStyle: 'supporting',
                      color: 'ink.700',
                      wordBreak: 'break-word',
                    })}
                  >
                    {signInError?.message ?? oauthErrorDescription}
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleGoogleLogin()}
            disabled={isLoading}
            className={css(actionButton.raw({ tone: 'solid', size: 'lg' }), {
              w: 'full',
            })}
          >
            <LogIn size={20} aria-hidden />
            {isLoading ? '로그인 중...' : 'Google 계정으로 계속하기'}
          </button>
        </section>

        <Link
          href={HOME_PATH}
          className={css(pressText, {
            alignSelf: 'center',
            textStyle: 'supporting',
            color: 'ink.700',
            _hover: { color: 'ink.950', textDecorationLine: 'underline' },
          })}
        >
          ← 블로그로 돌아가기
        </Link>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
