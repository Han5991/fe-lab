import { css } from '@design-system/ui-lib/css';
import type { PostData } from '@/lib/posts';
import { fmtDate, estimateReadMin } from '@/lib/format';
import { Label } from './Label';

interface PostHeaderProps {
  post: PostData;
  /** 시리즈 내 위치 — 있다면 `01 / 5` 같은 라벨로 표시 */
  seriesIndex?: { current: number; total: number; displayName: string };
}

export const PostHeader = ({ post, seriesIndex }: PostHeaderProps) => {
  const readMin = estimateReadMin(post.content);
  return (
    <header className={css({ mb: '10' })}>
      {seriesIndex && (
        <Label
          tone="marker"
          className={css({
            display: 'block',
            mb: '4',
            letterSpacing: '0.12em',
          })}
        >
          SERIES · {seriesIndex.displayName} ·{' '}
          {String(seriesIndex.current).padStart(2, '0')} /{' '}
          {String(seriesIndex.total).padStart(2, '0')}
        </Label>
      )}
      <h1
        className={css({
          fontFamily: 'serif',
          fontSize: { base: '4xl', md: '5xl', lg: '6xl' },
          fontWeight: '500',
          lineHeight: '1.05',
          letterSpacing: '-0.025em',
          color: 'ink.950',
          mb: '5',
        })}
      >
        {post.title}
      </h1>
      {post.excerpt && (
        <p
          className={css({
            fontFamily: 'serif',
            fontStyle: 'italic',
            fontSize: { base: 'lg', md: 'xl' },
            color: 'ink.700',
            lineHeight: '1.55',
            mb: '6',
          })}
        >
          {post.excerpt}
        </p>
      )}
      <div
        className={css({
          display: 'flex',
          alignItems: 'baseline',
          gap: '4',
          flexWrap: 'wrap',
          pb: '6',
          borderBottomWidth: '1px',
          borderColor: 'ink.border',
        })}
      >
        {post.date && (
          <span
            className={css({
              fontFamily: 'mono',
              fontSize: 'xs',
              color: 'ink.600',
              letterSpacing: '0.04em',
              fontVariantNumeric: 'tabular-nums',
            })}
          >
            {fmtDate(post.date)}
          </span>
        )}
        <span
          className={css({
            fontFamily: 'mono',
            fontSize: 'xs',
            color: 'ink.500',
            letterSpacing: '0.04em',
          })}
        >
          · {readMin}분 읽기
        </span>
        <span
          className={css({
            fontFamily: 'mono',
            fontSize: 'xs',
            color: 'ink.500',
            letterSpacing: '0.04em',
          })}
        >
          · 한상욱
        </span>
        {post.tags && post.tags.length > 0 && (
          <span
            className={css({
              fontFamily: 'mono',
              fontSize: 'xs',
              color: 'ink.500',
              letterSpacing: '0.04em',
            })}
          >
            · {post.tags.slice(0, 4).map(t => `#${t}`).join(' ')}
          </span>
        )}
      </div>
    </header>
  );
};
