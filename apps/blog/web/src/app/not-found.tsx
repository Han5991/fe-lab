import Link from 'next/link';
import { css, cx } from '@design-system/ui-lib/css';
import { POSTS_PATH } from '@blog/content/client';
import { HOME_PATH } from '@/src/shared/routes';
import { railGutter } from '@/src/components/Rail';
import { actionButton } from '@/src/components/actionButton';

export default function NotFound() {
  return (
    <div
      className={cx(
        css({
          display: 'flex',
          flexDir: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minH: '[60vh]',
          textAlign: 'center',
        }),
        railGutter,
      )}
    >
      <p
        className={css({
          fontSize: { base: '6xl', md: '8xl' },
          fontWeight: 'bold',
          // paper.50 위 보조 글자 톤(--fg-sub). ink.200은 1.4:1로 장식처럼 보여도
          // 숫자는 읽히는 글자라 대비 기준을 진다(axe color-contrast).
          color: 'ink.600',
          lineHeight: 'flat',
        })}
      >
        404
      </p>
      <h1
        className={css({
          fontSize: { base: 'xl', md: '2xl' },
          fontWeight: 'bold',
          color: 'ink.950',
          mt: '4',
        })}
      >
        페이지를 찾을 수 없습니다
      </h1>
      <p
        className={css({
          fontSize: 'sm',
          color: 'ink.500',
          mt: '3',
          maxW: 'railForm',
        })}
      >
        요청하신 페이지가 존재하지 않거나, 이동되었거나, 일시적으로 사용할 수
        없습니다.
      </p>
      <div
        className={css({
          display: 'flex',
          gap: '3',
          mt: '8',
          flexDir: { base: 'column', sm: 'row' },
          w: { base: 'full', sm: 'auto' },
        })}
      >
        <Link href={HOME_PATH} className={actionButton({ tone: 'primary' })}>
          홈으로 돌아가기
        </Link>
        <Link href={POSTS_PATH} className={actionButton({ tone: 'secondary' })}>
          글 목록 보기
        </Link>
      </div>
    </div>
  );
}
