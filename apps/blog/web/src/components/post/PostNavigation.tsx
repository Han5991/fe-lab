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

// 위계는 그림자 없이 hairline 보더 하나로만 만들고, hover에서 보더만 진해진다.
const cardStyle = css.raw({
  display: 'flex',
  flexDir: 'column',
  gap: '1',
  flex: '1',
  borderWidth: '[1px]',
  borderStyle: 'solid',
  borderColor: 'ink.border',
  rounded: 'card',
  p: '[16px]',
  transition: '[border-color 0.15s]',
  _hover: { borderColor: 'ink.borderStrong' },
});

// 다음 글 카드만 우측 정렬. 모바일은 세로 스택이라 좌측 정렬을 유지한다.
const cardNextStyle = css.raw({
  alignItems: { base: 'flex-start', md: 'flex-end' },
  textAlign: { base: 'left', md: 'right' },
});

const labelStyle = css({
  fontFamily: 'mono',
  fontSize: '[12px]',
  color: 'ink.500',
});

const titleStyle = css.raw({
  fontSize: '[14px]',
  fontWeight: 'medium',
  color: 'accent.600',
});

const rowStyle = css({
  display: 'flex',
  flexDir: { base: 'column', md: 'row' },
  justifyContent: 'space-between',
  alignItems: 'stretch',
  gap: '3',
});

// 카드 4장이 같은 블록을 복붙하고 있어 한 컴포넌트로 모았다.
interface NavCardProps {
  item: PostNavItem;
  direction: 'prev' | 'next';
  label: string;
  /** 제목 줄 수 — 시리즈 카드는 1줄, 전체 이전/다음은 2줄까지 */
  clamp: 1 | 2;
}

const NavCard = ({ item, direction, label, clamp }: NavCardProps) => (
  <Link
    href={`/posts/${encodePostSlug(item.slug)}/`}
    className={
      direction === 'next' ? css(cardStyle, cardNextStyle) : css(cardStyle)
    }
  >
    <span className={labelStyle}>{label}</span>
    <span
      className={
        clamp === 1
          ? css(titleStyle, { lineClamp: 1 })
          : css(titleStyle, { lineClamp: 2 })
      }
    >
      {item.title}
    </span>
  </Link>
);

// 한쪽만 있을 때 남은 칸을 차지해 좌/우 정렬을 유지하는 자리끝. 모바일에서는
// 세로 스택이라 빈 칸이 필요 없다.
const NavSpacer = () => (
  <div className={css({ flex: '1', display: { base: 'none', md: 'block' } })} />
);

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
            fontSize: '[12px]',
            color: 'ink.600',
            mb: '[10px]',
          })}
        >
          시리즈 · {seriesNav.seriesName}
        </p>
        <div className={rowStyle}>
          {seriesNav.prev ? (
            <NavCard
              item={seriesNav.prev}
              direction="prev"
              label="← 이전 편"
              clamp={1}
            />
          ) : (
            <NavSpacer />
          )}
          {seriesNav.next ? (
            <NavCard
              item={seriesNav.next}
              direction="next"
              label="다음 편 →"
              clamp={1}
            />
          ) : (
            <NavSpacer />
          )}
        </div>
      </div>
    )}

    {/* 전체 글 이전/다음 네비게이션 */}
    <div className={rowStyle}>
      {prev ? (
        <NavCard item={prev} direction="prev" label="← 이전 글" clamp={2} />
      ) : (
        <NavSpacer />
      )}
      {next ? (
        <NavCard item={next} direction="next" label="다음 글 →" clamp={2} />
      ) : (
        <NavSpacer />
      )}
    </div>
  </div>
);
