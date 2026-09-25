import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import { HOME_PATH } from '@/src/shared/routes';
import { Rail } from './Rail';

interface ErrorFallbackProps {
  /** 에러 경계를 다시 그려 본다 — Next의 `retry`가 그대로 들어온다. */
  onRetry: () => void;
}

const buttonBase = css.raw({
  px: '[16px]',
  py: '[8px]',
  borderWidth: '[1px]',
  borderStyle: 'solid',
  rounded: '[6px]',
  fontSize: 'sm',
  fontWeight: 'semibold',
  textAlign: 'center',
  cursor: 'pointer',
  transition: '[background 0.2s]',
  textDecorationLine: 'none',
});

/**
 * 라우트 에러 경계(`app/error.tsx`)와 루트 에러 경계(`app/global-error.tsx`)가
 * 함께 쓰는 화면. 잎 컴포넌트 하나가 던진 예외가 사이트 전체를 Next 기본 화면
 * ("This page couldn't load")으로 날리지 않도록, 두 경계가 같은 모양으로 받는다.
 *
 * 에러 메시지는 보여 주지 않는다 — 프로덕션에서는 서버 컴포넌트 에러가 digest로
 * 가려져 오고, 클라이언트 에러 문구는 읽는 사람에게 쓸모가 없다.
 */
export const ErrorFallback = ({ onRetry }: ErrorFallbackProps) => (
  <Rail
    className={css({
      py: { base: '16', md: '24' },
      display: 'flex',
      flexDir: 'column',
      alignItems: 'flex-start',
      gap: '4',
    })}
  >
    <h1
      className={css({
        fontSize: '[21px]',
        fontWeight: 'bold',
        color: 'ink.950',
      })}
    >
      페이지를 표시하지 못했습니다
    </h1>
    <p className={css({ fontSize: 'sm', color: 'ink.600' })}>
      일시적인 문제일 수 있습니다. 다시 시도하거나 홈으로 이동해 주세요.
    </p>
    <div
      className={css({
        display: 'flex',
        gap: '3',
        mt: '4',
        flexWrap: 'wrap',
      })}
    >
      <button
        type="button"
        onClick={onRetry}
        className={css(buttonBase, {
          bg: 'btn.primary',
          color: 'white',
          borderColor: 'btn.primaryBorder',
          _hover: { bg: 'btn.primaryHover' },
          _active: { bg: 'btn.primary' },
        })}
      >
        다시 시도
      </button>
      <Link
        href={HOME_PATH}
        className={css(buttonBase, {
          bg: 'paper.200',
          color: 'ink.800',
          borderColor: 'ink.border',
          fontWeight: 'medium',
          _hover: { bg: 'paper.300', borderColor: 'ink.borderStrong' },
          _active: { bg: 'paper.300' },
        })}
      >
        홈으로 돌아가기
      </Link>
    </div>
  </Rail>
);
