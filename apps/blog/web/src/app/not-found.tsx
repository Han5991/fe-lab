import Link from 'next/link';
import { css, cx } from '@design-system/ui-lib/css';

// leaf import — 404 화면은 도메인 데이터가 필요 없는 페이지라, 라우트 상수
// 하나 때문에 배럴(node:fs를 당기는 series까지)을 물리지 않는다.
import { POSTS_PATH } from '@blog/content';
import { HOME_PATH } from '@/shared/routes';
import { railGutter } from '@/src/components/Rail';

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
          color: 'ink.200',
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
        <Link
          href={HOME_PATH}
          className={css({
            px: '[16px]',
            py: '[8px]',
            bg: 'btn.primary',
            color: 'white',
            borderWidth: '[1px]',
            borderStyle: 'solid',
            borderColor: 'btn.primaryBorder',
            rounded: '[6px]',
            fontSize: 'sm',
            fontWeight: 'semibold',
            textAlign: 'center',
            _hover: { bg: 'btn.primaryHover' },
            _active: { bg: 'btn.primary' },
            transition: '[background 0.2s]',
            textDecorationLine: 'none',
          })}
        >
          홈으로 돌아가기
        </Link>
        <Link
          href={POSTS_PATH}
          className={css({
            px: '[16px]',
            py: '[8px]',
            bg: 'paper.200',
            borderWidth: '[1px]',
            borderStyle: 'solid',
            borderColor: 'ink.border',
            color: 'ink.800',
            rounded: '[6px]',
            fontSize: 'sm',
            fontWeight: 'medium',
            textAlign: 'center',
            _hover: { bg: 'paper.300', borderColor: 'ink.borderStrong' },
            _active: { bg: 'paper.300' },
            transition: '[all 0.2s]',
            textDecorationLine: 'none',
          })}
        >
          글 목록 보기
        </Link>
      </div>
    </div>
  );
}
