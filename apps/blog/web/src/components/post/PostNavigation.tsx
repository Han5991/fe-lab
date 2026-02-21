'use client';

import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostNavItem } from '@/lib/posts';

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
          mb: '6',
          p: { base: '4', md: '5' },
          rounded: 'xl',
          bg: 'gray.50',
          borderWidth: '1px',
          borderColor: 'gray.200',
        })}
      >
        <p
          className={css({
            fontSize: 'xs',
            fontWeight: 'semibold',
            color: 'blue.600',
            mb: '3',
            textTransform: 'uppercase',
            letterSpacing: 'wide',
          })}
        >
          📚 시리즈: {seriesNav.seriesName}
        </p>
        <div
          className={css({
            display: 'flex',
            flexDir: { base: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { base: 'stretch', md: 'center' },
            gap: { base: '2', md: '4' },
          })}
        >
          {seriesNav.prev ? (
            <Link
              href={`/posts/${seriesNav.prev.slug}`}
              className={css({
                display: 'flex',
                flexDir: 'column',
                gap: '1',
                flex: 1,
                p: '3',
                rounded: 'lg',
                _hover: { bg: 'gray.100' },
                _active: { bg: 'gray.200' },
                transition: 'background 0.2s',
                textDecoration: 'none',
              })}
            >
              <span className={css({ fontSize: 'xs', color: 'gray.500' })}>
                ← 이전
              </span>
              <span
                className={css({
                  fontSize: 'sm',
                  fontWeight: 'medium',
                  color: 'gray.700',
                  lineClamp: 1,
                })}
              >
                {seriesNav.prev.title}
              </span>
            </Link>
          ) : (
            <div
              className={css({
                flex: 1,
                display: { base: 'none', md: 'block' },
              })}
            />
          )}
          {seriesNav.next ? (
            <Link
              href={`/posts/${seriesNav.next.slug}`}
              className={css({
                display: 'flex',
                flexDir: 'column',
                alignItems: { base: 'flex-start', md: 'flex-end' },
                gap: '1',
                flex: 1,
                p: '3',
                rounded: 'lg',
                _hover: { bg: 'gray.100' },
                _active: { bg: 'gray.200' },
                transition: 'background 0.2s',
                textDecoration: 'none',
              })}
            >
              <span className={css({ fontSize: 'xs', color: 'gray.500' })}>
                다음 →
              </span>
              <span
                className={css({
                  fontSize: 'sm',
                  fontWeight: 'medium',
                  color: 'gray.700',
                  lineClamp: 1,
                })}
              >
                {seriesNav.next.title}
              </span>
            </Link>
          ) : (
            <div
              className={css({
                flex: 1,
                display: { base: 'none', md: 'block' },
              })}
            />
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
        gap: { base: '3', md: '4' },
        borderTopWidth: '1px',
        borderColor: 'gray.200',
        pt: '6',
      })}
    >
      {prev ? (
        <Link
          href={`/posts/${prev.slug}`}
          className={css({
            display: 'flex',
            flexDir: 'column',
            gap: '1',
            flex: 1,
            p: '4',
            rounded: 'lg',
            borderWidth: '1px',
            borderColor: 'gray.200',
            _hover: { borderColor: 'gray.400', bg: 'gray.50' },
            _active: { bg: 'gray.100' },
            transition: 'all 0.2s',
            textDecoration: 'none',
          })}
        >
          <span className={css({ fontSize: 'xs', color: 'gray.500' })}>
            ← 이전 글
          </span>
          <span
            className={css({
              fontSize: 'sm',
              fontWeight: 'medium',
              color: 'gray.800',
              lineClamp: 2,
            })}
          >
            {prev.title}
          </span>
        </Link>
      ) : (
        <div
          className={css({ flex: 1, display: { base: 'none', md: 'block' } })}
        />
      )}

      {next ? (
        <Link
          href={`/posts/${next.slug}`}
          className={css({
            display: 'flex',
            flexDir: 'column',
            alignItems: { base: 'flex-start', md: 'flex-end' },
            gap: '1',
            flex: 1,
            p: '4',
            rounded: 'lg',
            borderWidth: '1px',
            borderColor: 'gray.200',
            _hover: { borderColor: 'gray.400', bg: 'gray.50' },
            _active: { bg: 'gray.100' },
            transition: 'all 0.2s',
            textDecoration: 'none',
            textAlign: { base: 'left', md: 'right' },
          })}
        >
          <span className={css({ fontSize: 'xs', color: 'gray.500' })}>
            다음 글 →
          </span>
          <span
            className={css({
              fontSize: 'sm',
              fontWeight: 'medium',
              color: 'gray.800',
              lineClamp: 2,
            })}
          >
            {next.title}
          </span>
        </Link>
      ) : (
        <div
          className={css({ flex: 1, display: { base: 'none', md: 'block' } })}
        />
      )}
    </div>
  </div>
);
