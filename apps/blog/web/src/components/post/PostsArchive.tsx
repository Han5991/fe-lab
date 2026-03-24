import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostSummary } from '@/lib/posts';
import { encodePostSlug } from '@/domain/post/utils';

interface PostsArchiveProps {
  posts: PostSummary[];
}

export const PostsArchive = ({ posts }: PostsArchiveProps) => {
  return (
    <section
      aria-labelledby="posts-archive-heading"
      className={css({
        mt: '16',
        pt: '10',
        borderTopWidth: '1px',
        borderColor: 'ink.border',
      })}
    >
      <details>
        <summary
          id="posts-archive-heading"
          className={css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '3',
            cursor: 'pointer',
            listStyle: 'none',
            py: '3',
            '&::-webkit-details-marker': { display: 'none' },
          })}
        >
          <div className={css({ display: 'flex', alignItems: 'baseline', gap: '3' })}>
            <span
              className={css({
                fontSize: 'xs',
                fontWeight: 'bold',
                letterSpacing: 'widest',
                textTransform: 'uppercase',
                color: 'ink.500',
              })}
            >
              Archive
            </span>
            <span
              className={css({
                fontSize: 'sm',
                fontWeight: 'semibold',
                color: 'ink.950',
              })}
            >
              전체 글 아카이브
            </span>
            <span
              className={css({
                fontSize: 'xs',
                color: 'ink.500',
                fontVariantNumeric: 'tabular-nums',
              })}
            >
              {posts.length}편
            </span>
          </div>
          <span
            aria-hidden="true"
            className={css({
              fontSize: 'xs',
              color: 'ink.500',
            })}
          >
            펼치기 ↓
          </span>
        </summary>

        <ul
          className={css({
            mt: '4',
            borderTopWidth: '1px',
            borderColor: 'ink.border',
          })}
        >
          {posts.map(post => {
            const href = `/posts/${encodePostSlug(post.slug)}/`;

            return (
              <li key={post.slug}>
                <Link
                  href={href}
                  className={css({
                    display: 'flex',
                    flexDir: { base: 'column', md: 'row' },
                    alignItems: { base: 'flex-start', md: 'baseline' },
                    gap: { base: '0.5', md: '5' },
                    py: '3',
                    px: '6',
                    mx: '-6',
                    borderBottomWidth: '1px',
                    borderColor: 'ink.border',
                    transition: 'background 0.15s, box-shadow 0.15s',
                    _hover: { bg: 'ink.50', boxShadow: 'accentLeft' },
                  })}
                >
                  {post.date && (
                    <time
                      dateTime={post.date}
                      className={css({
                        flexShrink: 0,
                        minW: { md: '110px' },
                        fontSize: 'xs',
                        color: 'ink.500',
                        letterSpacing: 'wide',
                        fontVariantNumeric: 'tabular-nums',
                      })}
                    >
                      {new Date(post.date).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'Asia/Seoul',
                      })}
                    </time>
                  )}
                  <span
                    className={css({
                      fontSize: 'sm',
                      fontWeight: 'medium',
                      color: 'ink.950',
                      lineHeight: '1.5',
                    })}
                  >
                    {post.title}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </details>
    </section>
  );
};
