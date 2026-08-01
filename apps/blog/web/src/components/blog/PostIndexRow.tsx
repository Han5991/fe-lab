import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostSummary } from '@/domain/post';
import { encodePostSlug } from '@/domain/post/utils';
import { HiddenPostBadge } from './HiddenPostBadge';

/**
 * `2025-06-08` → `06-08`. 허브 목록은 같은 해 글이 대부분이라 연도를 떼고
 * 폭을 줄입니다(레퍼런스 `.date` 표기).
 */
function toMonthDay(date: string): string {
  return date.length >= 10 ? date.slice(5, 10) : date;
}

interface PostIndexRowProps {
  post: PostSummary;
}

/**
 * 허브의 장식 없는 글 목록 한 줄. 마지막 줄의 아래 보더는 행이 스스로 알 수
 * 없으므로 목록 컨테이너(`ol`)가 `:last-child` 선택자로 붙입니다.
 */
export const PostIndexRow = ({ post }: PostIndexRowProps) => {
  return (
    <Link
      href={`/posts/${encodePostSlug(post.slug)}/`}
      className={css({
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '[16px]',
        px: '[2px]',
        py: '[12px]',
        borderTopWidth: 'hairline',
        borderTopStyle: 'solid',
        borderColor: 'ink.border',
        fontSize: '[14px]',
        color: 'ink.950',
        transition: '[color 0.15s]',
        _hover: { color: 'accent.600' },
      })}
    >
      {/* 리뉴얼로 홈이 곧 글 목록이 됐다. dev에서 draft·예약 글이 여기 섞여
          나오므로 다른 목록(아카이브·시리즈)과 같은 배지를 달아 발행 상태를
          구분한다. 프로덕션에서는 아무것도 렌더되지 않는다. */}
      <span className={css({ minW: '0' })}>
        {post.title}
        <HiddenPostBadge post={post} />
      </span>
      {post.date && (
        <span
          className={css({
            fontFamily: 'mono',
            fontWeight: 'normal',
            fontSize: '[12px]',
            color: 'ink.500',
            flexShrink: 0,
            fontVariantNumeric: 'tabular-nums',
          })}
        >
          {toMonthDay(post.date)}
        </span>
      )}
    </Link>
  );
};
