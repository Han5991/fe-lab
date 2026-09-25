import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import { HOME_PATH } from '@/src/shared/routes';
import { actionButton } from './actionButton';
import { Rail } from './Rail';

interface ErrorFallbackProps {
  /** 에러 경계를 다시 그려 본다 — Next의 `retry`가 그대로 들어온다. */
  onRetry: () => void;
}

/**
 * 라우트·루트 에러 경계가 함께 쓰는 복구 화면. 에러 문구는 보이지 않는다 — 프로덕션은
 * digest로 가려져 오고 읽는 사람에게 쓸모가 없다.
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
        className={actionButton({ tone: 'primary' })}
      >
        다시 시도
      </button>
      <Link href={HOME_PATH} className={actionButton({ tone: 'secondary' })}>
        홈으로 돌아가기
      </Link>
    </div>
  </Rail>
);
