import { css, sva } from '@blog/styled-system/css';
import type { RecipeVariant } from '@blog/styled-system/css';
import type { PostNavItem } from '@blog/content/client';
import { postPath } from '@blog/content/client';
import { TransitionLink } from '@/src/components/shared/TransitionLink';
import { SERIES_PATH } from '@/src/shared/routes';
import type { SiblingOrder } from '@/src/shared/viewTransitions';

interface PostNavigationProps {
  prev: PostNavItem | null;
  next: PostNavItem | null;
  seriesNav?: {
    prev: PostNavItem | null;
    next: PostNavItem | null;
    seriesName: string;
  } | null;
}

const navCard = sva({
  slots: ['card', 'title'],
  base: {
    // 위계는 그림자 없이 hairline 보더 하나로만 만들고, hover에서 보더만 진해진다.
    card: {
      display: 'flex',
      flexDir: 'column',
      gap: '1',
      flex: '1',
      borderWidth: 'hairline',
      borderStyle: 'solid',
      borderColor: 'ink.border',
      rounded: 'container',
      p: '[16px]',
      transition: 'colors',
      _hover: { borderColor: 'ink.borderStrong' },
    },
    title: {
      fontSize: '[14px]',
      fontWeight: 'medium',
      color: 'accent.solid',
    },
  },
  variants: {
    // 카드의 자리 — 이전은 왼쪽, 다음은 오른쪽.
    side: {
      prev: {},
      // 다음 글 카드만 우측 정렬. 모바일은 세로 스택이라 좌측 정렬을 유지한다.
      next: {
        card: {
          alignItems: { base: 'flex-start', md: 'flex-end' },
          textAlign: { base: 'left', md: 'right' },
        },
      },
    },
    clamp: {
      1: { title: { lineClamp: 1 } },
      2: { title: { lineClamp: 2 } },
    },
  },
});

const labelStyle = css({
  fontFamily: 'mono',
  fontSize: '[12px]',
  color: 'ink.500',
});

const rowStyle = css({
  display: 'flex',
  flexDir: { base: 'column', md: 'row' },
  justifyContent: 'space-between',
  alignItems: 'stretch',
  gap: '3',
});

// 카드들이 같은 블록을 복붙하고 있어 한 컴포넌트로 모았다.
interface NavCardProps {
  href: string;
  title: string;
  /** 카드의 자리 — 이전은 왼쪽, 다음은 오른쪽 정렬. */
  side: NonNullable<RecipeVariant<typeof navCard>['side']>;
  /**
   * 형제 순서 — 이전·다음 글(편)처럼 같은 깊이의 형제로 가는 카드만 준다. 이전은 왼쪽에서, 다음은
   * 오른쪽에서 밀려 들어온다(`navTransitionType`). 자리와 따로 두는 이유: "시리즈 목록 →"은 다음
   * 자리에 서지만 형제가 아니라(글 → 섹션) 주지 않는다 — 방향은 깊이가 정한다(위로).
   */
  order?: SiblingOrder | undefined;
  label: string;
  /** 제목 줄 수 — 시리즈 카드는 1줄, 전체 이전/다음은 2줄까지 */
  clamp: RecipeVariant<typeof navCard>['clamp'];
}

const NavCard = ({ href, title, side, order, label, clamp }: NavCardProps) => {
  const classes = navCard({ side, clamp });
  return (
    <TransitionLink href={href} order={order} className={classes.card}>
      <span className={labelStyle}>{label}</span>
      <span className={classes.title}>{title}</span>
    </TransitionLink>
  );
};

const postHref = (item: PostNavItem) => postPath(item.slug);

// 한쪽만 있을 때 남은 칸을 차지해 좌/우 정렬을 유지하는 자리끝. 모바일에서는
// 세로 스택이라 빈 칸이 필요 없다.
const NavSpacer = () => (
  <div className={css({ flex: '1', display: { base: 'none', md: 'block' } })} />
);

/**
 * 글 하단 이동 카드.
 *
 * **시리즈 글이면 시리즈 네비만, 아니면 전체 이전/다음만** 보여준다.
 * 둘을 같이 그리면 순서 개념이 두 개가 되어 같은 글이 두 번 나온다 —
 * 시리즈 네비는 읽는 순서(`_series.yml` order / 날짜 오름차순)이고 전체
 * 이전/다음은 시간축(최신순 인접)이라, 연달아 발행한 시리즈에서는 같은 글이
 * `다음 편`이자 `이전 글`로 잡혔다. 라벨도 "편"과 "글" 한 글자 차이라
 * 구분이 안 됐다.
 *
 * 시리즈 마지막 편에는 나갈 곳이 없으므로 `시리즈 목록 →`을 대신 둔다.
 */
export const PostNavigation = ({
  prev,
  next,
  seriesNav,
}: PostNavigationProps) => {
  const inSeries = Boolean(seriesNav && (seriesNav.prev || seriesNav.next));

  return (
    <div className={css({ mb: '8' })}>
      {inSeries && seriesNav ? (
        <>
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
                href={postHref(seriesNav.prev)}
                title={seriesNav.prev.title}
                side="prev"
                order="prev"
                label="← 이전 편"
                clamp={1}
              />
            ) : (
              <NavSpacer />
            )}
            {seriesNav.next ? (
              <NavCard
                href={postHref(seriesNav.next)}
                title={seriesNav.next.title}
                side="next"
                order="next"
                label="다음 편 →"
                clamp={1}
              />
            ) : (
              // 마지막 편. 여기서 끊기면 갈 곳이 없어 시리즈 목록으로 보낸다.
              <NavCard
                href={SERIES_PATH}
                title="다른 시리즈 둘러보기"
                side="next"
                label="시리즈 목록 →"
                clamp={1}
              />
            )}
          </div>
        </>
      ) : (
        <div className={rowStyle}>
          {prev ? (
            <NavCard
              href={postHref(prev)}
              title={prev.title}
              side="prev"
              order="prev"
              label="← 이전 글"
              clamp={2}
            />
          ) : (
            <NavSpacer />
          )}
          {next ? (
            <NavCard
              href={postHref(next)}
              title={next.title}
              side="next"
              order="next"
              label="다음 글 →"
              clamp={2}
            />
          ) : (
            <NavSpacer />
          )}
        </div>
      )}
    </div>
  );
};
