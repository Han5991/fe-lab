'use client';

import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostNavItem } from '@/lib/posts';
import { encodePostSlug } from '@/domain/post/utils';

interface PostNavigationProps {
  prev: PostNavItem | null;
  next: PostNavItem | null;
  seriesNav?: {
    prev: PostNavItem | null;
    next: PostNavItem | null;
    seriesName: string;
  } | null;
}

export const PostNavigation = ({
  prev,
  next,
  seriesNav,
}: PostNavigationProps) => (
  <div className={css({ mt: '12', mb: '8' })}>
    {/* 시리즈 네비게이션 */}
    {seriesNav && (seriesNav.prev || seriesNav.next) && (
      <div
        className={css({
          mb: '8',
          pb: '8',
          borderBottomWidth: '1px',
          borderColor: 'ink.border',
        })}
      >
        <p
          className={css({
            fontSize: 'xs',
            fontWeight: 'bold',
            color: 'accent.600',
            mb: '4',
            textTransform: 'uppercase',
            letterSpacing: 'widest',
          })}
        >
          Series · {seriesNav.seriesName}
        </p>
        <div
          className={css({
            display: 'flex',
            flexDir: { base: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { base: 'stretch', md: 'start' },
            gap: { base: '2', md: '4' },
          })}
        >
          {seriesNav.prev ? (
            <Link
              href={`/posts/${encodePostSlug(seriesNav.prev.slug)}/`}
              className={css({
                display: 'flex',
                flexDir: 'column',
                gap: '1',
                flex: 1,
                py: '3',
                _hover: { color: 'accent.600' },
                transition: 'color 0.15s',
              })}
            >
              <span className={css({ fontSize: 'xs', color: 'ink.500' })}>
                ← 이전 편
              </span>
              <span
                className={css({
                  fontSize: 'sm',
                  fontWeight: 'medium',
                  color: 'ink.950',
                  lineClamp: 1,
                })}
              >
                {seriesNav.prev.title}
              </span>
            </Link>
          ) : (
            <div className={css({ flex: 1, display: { base: 'none', md: 'block' } })} />
          )}
          {seriesNav.next ? (
            <Link
              href={`/posts/${encodePostSlug(seriesNav.next.slug)}/`}
              className={css({
                display: 'flex',
                flexDir: 'column',
                alignItems: { base: 'flex-start', md: 'flex-end' },
                gap: '1',
                flex: 1,
                py: '3',
                _hover: { color: 'accent.600' },
                transition: 'color 0.15s',
              })}
            >
              <span className={css({ fontSize: 'xs', color: 'ink.500' })}>
                다음 편 →
              </span>
              <span
                className={css({
                  fontSize: 'sm',
                  fontWeight: 'medium',
                  color: 'ink.950',
                  lineClamp: 1,
                  textAlign: { base: 'left', md: 'right' },
                })}
              >
                {seriesNav.next.title}
              </span>
            </Link>
          ) : (
            <div className={css({ flex: 1, display: { base: 'none', md: 'block' } })} />
          )}
        </div>
      </div>
    )}

    {/* 전체 글 이전/다음 네비게이션 */}
    <div
      className={css({
        display: 'flex',
        flexDir: { base: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: 'stretch',
        gap: { base: '0', md: '4' },
        borderTopWidth: '1px',
        borderColor: 'ink.border',
      })}
    >
      {prev ? (
        <Link
          href={`/posts/${encodePostSlug(prev.slug)}/`}
          className={css({
            display: 'flex',
            flexDir: 'column',
            gap: '1',
            flex: 1,
            py: '5',
            pr: { md: '6' },
            borderRightWidth: { md: next ? '1px' : '0' },
            borderColor: 'ink.border',
            transition: 'color 0.15s',
            _hover: { color: 'accent.600' },
          })}
        >
          <span className={css({ fontSize: 'xs', color: 'ink.500' })}>
            ← 이전 글
          </span>
          <span
            className={css({
              fontSize: 'sm',
              fontWeight: 'medium',
              color: 'ink.950',
              lineClamp: 2,
              mt: '1',
            })}
          >
            {prev.title}
          </span>
        </Link>
      ) : (
        <div className={css({ flex: 1, display: { base: 'none', md: 'block' } })} />
      )}

      {next ? (
        <Link
          href={`/posts/${encodePostSlug(next.slug)}/`}
          className={css({
            display: 'flex',
            flexDir: 'column',
            alignItems: { base: 'flex-start', md: 'flex-end' },
            gap: '1',
            flex: 1,
            py: '5',
            pl: { md: '6' },
            borderTopWidth: { base: '1px', md: '0' },
            borderColor: 'ink.border',
            transition: 'color 0.15s',
            _hover: { color: 'accent.600' },
          })}
        >
          <span className={css({ fontSize: 'xs', color: 'ink.500' })}>
            다음 글 →
          </span>
          <span
            className={css({
              fontSize: 'sm',
              fontWeight: 'medium',
              color: 'ink.950',
              lineClamp: 2,
              textAlign: { base: 'left', md: 'right' },
              mt: '1',
            })}
          >
            {next.title}
          </span>
        </Link>
      ) : (
        <div className={css({ flex: 1, display: { base: 'none', md: 'block' } })} />
      )}
    </div>
  </div>
);
