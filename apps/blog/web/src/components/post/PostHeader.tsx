import { css } from '@design-system/ui-lib/css';
import type { PostData } from '@/domain/post';
import { fmtDate } from '@/lib/format';
import { Label } from '@/src/components/blog/Label';

interface PostHeaderProps {
  post: PostData;
  /** 시리즈 내 위치 — 있다면 `01 / 5` 같은 라벨로 표시 */
  seriesIndex?: { current: number; total: number; displayName: string };
}

export const PostHeader = ({ post, seriesIndex }: PostHeaderProps) => {
  const readMin = post.readMin;
  return (
    <header className={css({ mb: '8' })}>
      {seriesIndex && (
        <Label
          tone="meta"
          className={css({
            display: 'block',
            mb: '2',
            fontSize: '[12px]',
            letterSpacing: 'mono',
          })}
        >
          SERIES · {seriesIndex.displayName} ·{' '}
          {String(seriesIndex.current).padStart(2, '0')} /{' '}
          {String(seriesIndex.total).padStart(2, '0')}
        </Label>
      )}
      <h1
        className={css({
          fontFamily: 'sans',
          fontSize: { base: '3xl', md: '4xl' },
          fontWeight: 'bold',
          lineHeight: 'tight',
          letterSpacing: 'tightish',
          color: 'ink.950',
          mb: '3',
        })}
      >
        {post.title}
      </h1>
      {post.excerpt && (
        <p
          className={css({
            fontSize: { base: 'md', md: 'lg' },
            color: 'ink.700',
            lineHeight: 'comfortable',
            mb: '4',
          })}
        >
          {post.excerpt}
        </p>
      )}
      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '3',
          flexWrap: 'wrap',
          fontFamily: 'mono',
          fontSize: '[12px]',
          color: 'ink.500',
          fontVariantNumeric: 'tabular-nums',
          pb: '4',
          borderBottomWidth: '[1px]',
          borderStyle: 'solid',
          borderColor: 'ink.border',
        })}
      >
        {post.date && <span>{fmtDate(post.date)}</span>}
        <span>{readMin}분 읽기</span>
        <span>한상욱</span>
      </div>
      {post.tags && post.tags.length > 0 && (
        <div
          className={css({
            display: 'flex',
            gap: '2',
            flexWrap: 'wrap',
            mt: '4',
          })}
        >
          {post.tags.slice(0, 4).map(t => (
            <span
              key={t}
              className={css({
                display: 'inline-flex',
                alignItems: 'center',
                px: '[10px]',
                py: '[2px]',
                rounded: '[2rem]',
                bg: 'paper.200',
                color: 'ink.700',
                fontSize: 'xs',
                fontWeight: 'medium',
                lineHeight: 'flat',
              })}
            >
              #{t}
            </span>
          ))}
        </div>
      )}
    </header>
  );
};
