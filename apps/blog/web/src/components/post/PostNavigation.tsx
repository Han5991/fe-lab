import { OG_DEFAULT_IMAGE } from '@/content.values.mts';
import { css, cx } from '@blog/styled-system/css';
import type { PostNavItem } from '@blog/content/client';
import { postPath, resolveThumbnailSrc } from '@blog/content/client';
import { coverFrameRaw, coverImage } from '@/src/components/blog/cardParts';
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

/** 썸네일 `<img>`의 width·height — 보이는 크기(96×54, 16:9) 그대로다. */
const THUMB_WIDTH = 96;
const THUMB_HEIGHT = 54;

// 좁은 화면(md 미만)은 한 열이다 — 두 열이면 375px에서 썸네일(96)을 빼고 글자 칸이 31px만 남는다.
const grid = css({
  display: 'grid',
  gridTemplateColumns: {
    base: '[minmax(0, 1fr)]',
    md: '[repeat(2, minmax(0, 1fr))]',
  },
  gap: '2',
  m: '0',
  p: '0',
  listStyleType: 'none',
});

// `muted` 면 위의 카드 — 보더 대신 면으로 갈린다(Astryx ClickableCard muted). 카드 전체가 링크 하나다.
// 두 열에서 한 줄의 칸(li)은 grid가 같은 높이로 늘리니, 카드가 그 높이를 채워야 옆 카드와 면이 맞는다
// (썸네일 없는 "시리즈 목록" 카드가 썸네일 카드보다 낮게 떠 있었다).
const card = css({
  display: 'flex',
  alignItems: 'center',
  gap: '3',
  h: 'full',
  minH: '0',
  p: '3',
  rounded: 'container',
  bg: 'paper.100',
  color: 'ink.950',
  transition: 'colors',
  _hover: { bg: 'paper.200' },
});

const thumb = css(coverFrameRaw, { w: '24', rounded: 'element' });

const texts = css({
  display: 'flex',
  flexDir: 'column',
  gap: '0.5',
  minW: '0',
});

const label = css({ textStyle: 'supporting', color: 'ink.700' });

const title = css({ textStyle: 'h3', lineClamp: 2 });

interface NavCardProps {
  href: string;
  title: string;
  label: string;
  /** 카드의 자리 — 다음 글은 두 열에서 오른쪽 칸에 서서, 이전 글이 없을 때도 오른쪽에 남는다. */
  side: SiblingOrder;
  /**
   * 형제 순서 — 이전·다음 글(편)처럼 같은 깊이의 형제로 가는 카드만 준다. 이전은 왼쪽에서, 다음은
   * 오른쪽에서 밀려 들어온다(`navTransitionType`). 자리와 따로 두는 이유: "시리즈 목록 →"은 다음
   * 자리에 서지만 형제가 아니라(글 → 섹션) 주지 않는다 — 방향은 깊이가 정한다(위로).
   */
  order?: SiblingOrder | undefined;
  /** 썸네일을 그릴 글 — 글이 아닌 곳으로 가는 카드("시리즈 목록")에는 없다. */
  post?: PostNavItem | undefined;
}

const NavCard = ({
  href,
  title: text,
  label: name,
  side,
  order,
  post,
}: NavCardProps) => (
  <li
    className={
      side === 'next' ? css({ md: { gridColumnStart: '2' } }) : undefined
    }
  >
    <TransitionLink href={href} order={order} className={cx('group', card)}>
      {post && (
        <span className={thumb}>
          <img
            // 카드·히어로와 같은 주소다 — posts/ 안의 png·jpg는 빌드가 만든 webp, 썸네일이 없는 글은
            // 생성 OG 카드(/og/{slug}.png).
            src={resolveThumbnailSrc(post, OG_DEFAULT_IMAGE)}
            alt=""
            width={THUMB_WIDTH}
            height={THUMB_HEIGHT}
            loading="lazy"
            decoding="async"
            className={coverImage}
          />
        </span>
      )}
      <span className={texts}>
        <span className={label}>{name}</span>
        <span className={title}>{text}</span>
      </span>
    </TransitionLink>
  </li>
);

const postHref = (item: PostNavItem) => postPath(item.slug);

/**
 * 글 아래 이동 카드 — `<nav aria-label="이전·다음 글">` 안의 목록이다. 글(article) 칼럼 안, 태그 줄 다음에
 * 선다.
 *
 * **시리즈 글이면 시리즈 네비만, 아니면 전체 이전/다음만** 보여준다.
 * 둘을 같이 그리면 순서 개념이 두 개가 되어 같은 글이 두 번 나온다 —
 * 시리즈 네비는 읽는 순서(`_series.yml` order / 날짜 오름차순)이고 전체
 * 이전/다음은 시간축(최신순 인접)이라, 연달아 발행한 시리즈에서는 같은 글이
 * `다음 편`이자 `이전 글`로 잡혔다. 라벨도 "편"과 "글" 한 글자 차이라
 * 구분이 안 됐다.
 *
 * 시리즈 마지막 편에는 나갈 곳이 없으므로 `시리즈 목록 →`을 대신 둔다.
 * 이전·다음 글이 둘 다 없으면(글이 하나뿐) 아무것도 그리지 않는다.
 */
export const PostNavigation = ({
  prev,
  next,
  seriesNav,
}: PostNavigationProps) => {
  const inSeries = Boolean(seriesNav && (seriesNav.prev || seriesNav.next));

  if (inSeries && seriesNav) {
    return (
      <nav
        aria-label="이전·다음 글"
        className={css({ display: 'flex', flexDir: 'column', gap: '2' })}
      >
        <p className={label}>시리즈 · {seriesNav.seriesName}</p>
        <ul className={grid}>
          {seriesNav.prev && (
            <NavCard
              href={postHref(seriesNav.prev)}
              title={seriesNav.prev.title}
              label="← 이전 편"
              side="prev"
              order="prev"
              post={seriesNav.prev}
            />
          )}
          {seriesNav.next ? (
            <NavCard
              href={postHref(seriesNav.next)}
              title={seriesNav.next.title}
              label="다음 편 →"
              side="next"
              order="next"
              post={seriesNav.next}
            />
          ) : (
            // 마지막 편. 여기서 끊기면 갈 곳이 없어 시리즈 목록으로 보낸다.
            <NavCard
              href={SERIES_PATH}
              title="다른 시리즈 둘러보기"
              label="시리즈 목록 →"
              side="next"
            />
          )}
        </ul>
      </nav>
    );
  }

  if (!prev && !next) return null;

  return (
    <nav aria-label="이전·다음 글">
      <ul className={grid}>
        {prev && (
          <NavCard
            href={postHref(prev)}
            title={prev.title}
            label="← 이전 글"
            side="prev"
            order="prev"
            post={prev}
          />
        )}
        {next && (
          <NavCard
            href={postHref(next)}
            title={next.title}
            label="다음 글 →"
            side="next"
            order="next"
            post={next}
          />
        )}
      </ul>
    </nav>
  );
};
