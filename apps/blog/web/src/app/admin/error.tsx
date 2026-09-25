'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { css, cx } from '@design-system/ui-lib/css';
import { railColumn, railGutter } from '@/src/components/Rail';
import { ADMIN_LOGIN_PATH } from '@/src/shared/routes';
// 판정만 필요하므로 admin 배럴(모듈 최상위에서 supabase 클라이언트를 바인딩)이
// 아니라 순수 leaf 모듈을 연다 — adminErrors.ts 머리 주석.
import {
  adminFailureKind,
  type AdminFailureKind,
} from '@/src/domain/analytics/adminErrors';

interface AdminErrorProps {
  /** 던져진 값 — Error가 아닐 수도 있다(Next의 ErrorInfo가 unknown으로 준다). */
  error: unknown;
  /** 경계를 비우고 자식을 다시 그린다. */
  reset: () => void;
}

/** 실패 종류별 제목 — 401·403은 재시도가 아니라 로그인·계정이 답이다. */
const TITLES = {
  unauthenticated: '로그인이 만료됐습니다 — 다시 로그인해 주세요',
  forbidden: '관리자 권한이 없는 계정입니다',
  other: '관리자 데이터를 불러오지 못했습니다',
} as const satisfies Record<AdminFailureKind, string>;

/**
 * admin 영역의 에러 경계.
 *
 * admin 화면의 데이터 훅은 전부 `useSuspenseQuery`라 실패가 곧 throw다
 * (Edge Function 401/403/500, 인덱스 fetch 실패). 경계가 없던 때는 그 throw가
 * 루트까지 올라가 Next의 "Application error" 흰 화면이 됐다 — 메시지도, 다시
 * 시도할 방법도 없었다.
 *
 * 이 경계는 `admin/layout.tsx` 아래(가드 안쪽)의 페이지를 감싼다. 레이아웃 자체의
 * 실패는 감싸지 못한다(Next의 error.js 규칙) — 가드의 세션 조회는 실패를
 * "세션 없음"으로 수렴시키므로 throw하지 않는다.
 *
 * "다시 시도"는 React Query의 에러 리셋과 경계 리셋을 함께 건다. 에러 상태로
 * 굳은 suspense 쿼리는 리셋 표시 없이 다시 마운트되면 재요청하지 않고 같은 에러를
 * 다시 던진다(재시도가 막힌다).
 */
export default function AdminError({ error, reset }: AdminErrorProps) {
  const { reset: resetQueryErrors } = useQueryErrorResetBoundary();

  useEffect(() => {
    console.error(error);
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
