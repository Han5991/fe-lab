'use client';

import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostNavItem } from '@/domain/post';
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
      <div className={css({ mb: '6' })}>
        <p
          className={css({
            fontSize: 'xs',
            fontWeight: 'medium',
            color: 'ink.500',
            mb: '3',
          })}
        >
          Series · {seriesNav.seriesName}
        </p>
        <div
          className={css({
            display: 'flex',
            flexDir: { base: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: 'stretch',
            gap: '3',
          })}
        >
          {seriesNav.prev ? (
            <Link
              href={`/posts/${encodePostSlug(seriesNav.prev.slug)}/`}
              className={css({
                display: 'flex',
                flexDir: 'column',
                gap: '1',
                flex: '1',
                bg: 'paper.100',
                borderWidth: '[1px]',
                borderStyle: 'solid',
                borderColor: 'ink.border',
                rounded: '[6px]',
                p: '[16px]',
                transition: '[border-color 0.15s]',
                _hover: { borderColor: 'ink.borderStrong' },
              })}
            >
              <span className={css({ fontSize: 'xs', color: 'ink.500' })}>
                ← 이전 편
              </span>
              <span
                className={css({
                  fontSize: 'sm',
                  fontWeight: 'medium',
                  color: 'accent.600',
                  lineClamp: 1,
                })}
              >
                {seriesNav.prev.title}
              </span>
            </Link>
          ) : (
            <div
              className={css({
                flex: '1',
                display: { base: 'none', md: 'block' },
              })}
            />
          )}
          {seriesNav.next ? (
            <Link
              href={`/posts/${encodePostSlug(seriesNav.next.slug)}/`}
              className={css({
                display: 'flex',
                flexDir: 'column',
                alignItems: { base: 'flex-start', md: 'flex-end' },
                gap: '1',
                flex: '1',
                bg: 'paper.100',
                borderWidth: '[1px]',
                borderStyle: 'solid',
                borderColor: 'ink.border',
                rounded: '[6px]',
                p: '[16px]',
                transition: '[border-color 0.15s]',
                _hover: { borderColor: 'ink.borderStrong' },
              })}
            >
              <span className={css({ fontSize: 'xs', color: 'ink.500' })}>
                다음 편 →
              </span>
              <span
                className={css({
                  fontSize: 'sm',
                  fontWeight: 'medium',
                  color: 'accent.600',
                  lineClamp: 1,
                  textAlign: { base: 'left', md: 'right' },
                })}
              >
                {seriesNav.next.title}
              </span>
            </Link>
          ) : (
            <div
              className={css({
                flex: '1',
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
        gap: '3',
      })}
    >
      {prev ? (
        <Link
          href={`/posts/${encodePostSlug(prev.slug)}/`}
          className={css({
            display: 'flex',
            flexDir: 'column',
            gap: '1',
            flex: '1',
            bg: 'paper.100',
            borderWidth: '[1px]',
            borderStyle: 'solid',
            borderColor: 'ink.border',
            rounded: '[6px]',
            p: '[16px]',
            transition: '[border-color 0.15s]',
            _hover: { borderColor: 'ink.borderStrong' },
          })}
        >
          <span className={css({ fontSize: 'xs', color: 'ink.500' })}>
            ← 이전 글
          </span>
          <span
            className={css({
              fontSize: 'sm',
              fontWeight: 'medium',
              color: 'accent.600',
              lineClamp: 2,
              mt: '1',
            })}
          >
            {prev.title}
          </span>
        </Link>
      ) : (
        <div
          className={css({ flex: '1', display: { base: 'none', md: 'block' } })}
        />
      )}

      {next ? (
        <Link
          href={`/posts/${encodePostSlug(next.slug)}/`}
          className={css({
            display: 'flex',
            flexDir: 'column',
            alignItems: { base: 'flex-start', md: 'flex-end' },
            gap: '1',
            flex: '1',
            bg: 'paper.100',
            borderWidth: '[1px]',
            borderStyle: 'solid',
            borderColor: 'ink.border',
            rounded: '[6px]',
            p: '[16px]',
            transition: '[border-color 0.15s]',
            _hover: { borderColor: 'ink.borderStrong' },
          })}
        >
          <span className={css({ fontSize: 'xs', color: 'ink.500' })}>
            다음 글 →
          </span>
          <span
            className={css({
              fontSize: 'sm',
              fontWeight: 'medium',
              color: 'accent.600',
              lineClamp: 2,
              textAlign: { base: 'left', md: 'right' },
              mt: '1',
            })}
          >
            {next.title}
          </span>
        </Link>
      ) : (
        <div
          className={css({ flex: '1', display: { base: 'none', md: 'block' } })}
        />
      )}
    </div>
  </div>
);
