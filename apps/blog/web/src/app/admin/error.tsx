'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { css, cx } from '@design-system/ui-lib/css';
import { railColumn, railGutter } from '@/src/components/Rail';
import { ADMIN_LOGIN_PATH } from '@/src/shared/routes';
import { reportError } from '@/src/components/errorReporting';
// admin 배럴은 supabase 클라이언트를 바인딩하므로 순수 leaf를 연다.
import {
  adminFailureKind,
  type AdminFailureKind,
} from '@/src/domain/analytics/adminErrors';

interface AdminErrorProps {
  /** 던져진 값 — Error가 아닐 수도 있다(Next의 ErrorInfo가 unknown으로 준다). */
  error: unknown;
  reset: () => void;
}

/** 실패 종류별 제목 — 401·403은 재시도가 아니라 로그인·계정이 답이다. */
const TITLES = {
  unauthenticated: '로그인이 만료됐습니다 — 다시 로그인해 주세요',
  forbidden: '관리자 권한이 없는 계정입니다',
  other: '관리자 데이터를 불러오지 못했습니다',
} as const satisfies Record<AdminFailureKind, string>;

/**
 * admin 영역의 에러 경계 — 데이터 훅이 전부 suspense라 실패가 곧 throw다.
 * 레이아웃(가드)의 실패는 감싸지 못하므로 가드의 세션 조회는 던지지 않는다.
 * "다시 시도"는 React Query의 에러 리셋도 건다 — 없으면 굳은 쿼리가 재요청하지 않는다.
 */
export default function AdminError({ error, reset }: AdminErrorProps) {
  const { reset: resetQueryErrors } = useQueryErrorResetBoundary();

  useEffect(() => {
    console.error(error);
    reportError(error, true);
  }, [error]);

  const kind = adminFailureKind(error);
  const message = error instanceof Error ? error.message : String(error);

  return (
    <div
      className={cx(
        railGutter,
        css({ py: { base: '12', md: '16' }, bg: 'paper.50' }),
      )}
    >
      <div
        role="alert"
        className={cx(
          railColumn({ width: 'form' }),
          css({
            display: 'flex',
            flexDir: 'column',
            gap: '4',
            p: '6',
            rounded: 'lg',
            borderWidth: '[1px]',
            borderColor: 'danger.border',
            bg: 'danger.bg',
          }),
        )}
      >
        <h1
          className={css({
            fontSize: 'lg',
            fontWeight: 'bold',
            color: 'danger.text',
          })}
        >
          {TITLES[kind]}
        </h1>
        <p
          className={css({
            fontFamily: 'mono',
            fontSize: 'xs',
            color: 'ink.700',
            wordBreak: 'break-word',
          })}
        >
          {message}
        </p>
        <div className={css({ display: 'flex', gap: '3', flexWrap: 'wrap' })}>
          <button
            type="button"
            onClick={() => {
              resetQueryErrors();
              reset();
            }}
            className={css({
              px: '4',
              py: '2',
              rounded: 'md',
              bg: 'btn.primary',
              color: 'white',
              fontSize: 'sm',
              fontWeight: 'semibold',
              cursor: 'pointer',
              _hover: { bg: 'btn.primaryHover' },
            })}
          >
            다시 시도
          </button>
          <Link
            href={ADMIN_LOGIN_PATH}
            className={css({
              px: '4',
              py: '2',
              rounded: 'md',
              borderWidth: '[1px]',
              borderColor: 'ink.border',
              color: 'ink.800',
              fontSize: 'sm',
              _hover: { bg: 'paper.100' },
            })}
          >
            다시 로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
