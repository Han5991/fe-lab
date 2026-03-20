import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostData } from '@/lib/posts';
import { encodePostSlug } from '@/domain/post/utils';

interface PostsArchiveProps {
  posts: PostData[];
}

export const PostsArchive = ({ posts }: PostsArchiveProps) => {
  return (
    <section
      aria-labelledby="posts-archive-heading"
      className={css({
        mt: '16',
        pt: '10',
        borderTopWidth: '1px',
        borderColor: 'gray.100',
      })}
    >
      <details
        className={css({
          rounded: '2xl',
          borderWidth: '1px',
          borderColor: 'gray.200',
          bg: 'gray.50/40',
          px: '5',
          py: '4',
        })}
      >
        <summary
          id="posts-archive-heading"
          className={css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '3',
            cursor: 'pointer',
            listStyle: 'none',
            fontSize: { base: 'lg', md: 'xl' },
            fontWeight: 'bold',
            color: 'gray.900',
            '&::-webkit-details-marker': {
              display: 'none',
            },
          })}
        >
          <span>전체 글 아카이브</span>
          <span
            aria-hidden="true"
            className={css({
              fontSize: 'sm',
              color: 'gray.500',
            })}
          >
            펼치기
          </span>
        </summary>
        <p
          className={css({
            mt: '3',
            color: 'gray.500',
            fontSize: 'sm',
            lineHeight: 'relaxed',
          })}
        >
          모든 글을 날짜순으로 바로 탐색할 수 있는 아카이브입니다.
        </p>

        <ul
          className={css({
            display: 'grid',
            gap: '3',
            mt: '6',
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
                    alignItems: { base: 'flex-start', md: 'center' },
                    gap: { base: '1', md: '4' },
                    px: '4',
                    py: '3',
                    rounded: 'xl',
                    borderWidth: '1px',
                    borderColor: 'gray.100',
                    bg: 'white',
                    transition: 'all 0.2s',
                    _hover: {
                      borderColor: 'blue.200',
                      bg: 'blue.50/30',
                    },
                  })}
                >
                  {post.date && (
                    <time
                      dateTime={post.date}
                      className={css({
                        flexShrink: 0,
                        minW: { md: '120px' },
                        fontSize: 'sm',
                        color: 'gray.400',
                      })}
                    >
                      {new Date(post.date).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        timeZone: 'Asia/Seoul',
                      })}
                    </time>
                  )}
                  <span
                    className={css({
                      fontSize: 'md',
                      fontWeight: 'medium',
                      color: 'gray.800',
                      lineHeight: 'relaxed',
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
