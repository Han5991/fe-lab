/**
 * 공유 요소(`PostCardShared`·`PostDetailShared`)를 쓰는 자리 — 글 카드(홈 카드 두 변형·썸네일 행·
 * /posts 카드·글 목록 행)와 글 상세(히어로 이미지·h1)가 같은 글에 대해 **같은 이름**의
 * `<ViewTransition>`을 달고, 카드는 그 글을 여는 링크 이동이나 그 글의 상세에서 떠나 올 때만 짝이
 * 된다. 이름이나 짝의 조건이 한쪽만 어긋나면 빌드·브라우저 어디서도 에러 없이 모핑만 사라지거나
 * (이름) 목록 → 목록 이동에서 카드가 전부 날아다닌다(조건).
 *
 * jsdom에는 View Transitions가 없어 React가 이름을 DOM에 붙이지 않는다. `<ViewTransition>`과
 * `next/link`를 받은 props를 data 속성으로 드러내는 상자로 바꿔 끼워, 이름이 **어느 요소에** 붙는지와
 * 카드 링크가 여는 type(과 목록 → 글의 방향)을 다는지를 본다.
 */
import { describe, expect, test, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import type * as ReactModule from 'react';
import type { LinkProps } from 'next/link';
import type { PostData, PostSummary } from '@blog/content/client';
import { DIAGRAM_NAMES } from '@/src/components/diagram/registry';
import { PostCard } from '@/src/components/blog/PostCard';
import { PostGridCard } from '@/src/components/blog/PostGridCard';
import { PostListRow } from '@/src/components/blog/PostListRow';
import { PostThumbRow } from '@/src/components/blog/PostThumbRow';
import { PostHeader } from '@/src/components/post/PostHeader';
import { PostHero } from '@/src/components/post/PostHero';
import {
  NAV_TRANSITION,
  POST_OPEN_TRANSITION_TYPE,
  POST_SHARED,
  POST_SHARED_SIDE,
  postSharedName,
  type PostSharedPart,
} from '@/src/shared/viewTransitions';
import { PostCardShared, PostDetailShared } from './PostSharedElement';

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof ReactModule>('react');
  return {
    ...actual,
    ViewTransition: (props: ReactModule.ViewTransitionProps) => (
      <div
        data-vt-name={props.name}
        data-vt-share={JSON.stringify(props.share)}
        data-vt-default={props.default}
      >
        {props.children}
      </div>
    ),
  };
});

// 카드 링크는 현재 경로로 이동 방향을 고른다(TransitionLink) — 카드가 놓이는 목록(홈)에 둔다.
vi.mock('next/navigation', async () => {
  const routes = await import('@/src/shared/routes');
  return { usePathname: () => routes.HOME_PATH };
});

vi.mock('next/link', () => ({
  default: ({
    href,
    transitionTypes,
    children,
    className,
  }: LinkProps & { children: ReactModule.ReactNode; className?: string }) => {
    // 카드들은 문자열 href만 쓴다(postPath).
    if (typeof href !== 'string')
      throw new Error('카드 링크의 href는 문자열이다');
    return (
      <a
        href={href}
        className={className}
        data-transition-types={JSON.stringify(transitionTypes ?? [])}
      >
        {children}
      </a>
    );
  },
}));

// 폴더 slug·점·한글이 섞인 slug — 이름 인코딩을 거쳐도 양쪽이 같아야 한다. originalSlug를 일부러
// 다르게 둬서, 한쪽이 slug 대신 다른 필드로 이름을 만들면 어긋나게 한다.
const SLUG = 'react/component/토스트.v2';

const summary: PostSummary = {
  slug: SLUG,
  originalSlug: 'react/component/[React Component] 토스트',
  relativeDir: 'react/component',
  title: '토스트 구현하기',
  excerpt: '발췌',
  date: '2025-06-08',
  readMin: 4,
  tags: ['react'],
  status: 'published',
};

const detail: PostData = { ...summary, content: '' };

const cardClass = (part: PostSharedPart) =>
  `${POST_SHARED[part]} ${POST_SHARED_SIDE.card}`;
const detailClass = (part: PostSharedPart) =>
  `${POST_SHARED[part]} ${POST_SHARED_SIDE.detail}`;

/** 렌더 결과의 공유 요소 — 이름, share(JSON), 이름을 받는 요소. */
function sharedElements(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>('[data-vt-name]')].map(
    box => ({
      name: box.dataset['vtName'],
      share: JSON.parse(box.dataset['vtShare'] ?? 'null') as unknown,
      default: box.dataset['vtDefault'],
      /** React가 이름을 붙이는 DOM 요소들 — 둘 이상이면 둘째부터 `_1`이 붙어 짝이 어긋난다. */
      targets: [...box.children],
    }),
  );
}

function sharedPart(container: HTMLElement, part: PostSharedPart) {
  const found = sharedElements(container).filter(
    s => s.name === postSharedName(part, SLUG),
  );
  expect(found, `${part} 공유 요소`).toHaveLength(1);
  const [shared] = found;
  if (!shared) throw new Error(`${part} 공유 요소가 없다`);
  // share 없이 default="none"이면 짝이 조용히 모핑을 멈추고, default가 없으면 상관없는 전환마다
  // 따로 찍힌다 — 둘은 한 짝이다.
  expect(shared.default).toBe('none');
  expect(shared.targets).toHaveLength(1);
  return { share: shared.share, target: shared.targets[0] };
}

const isCoverFrame = (el: Element | undefined) =>
  el?.tagName === 'DIV' && el.querySelector('img') !== null;
const isImage = (el: Element | undefined) => el?.tagName === 'IMG';
const isTitleHeading = (level: 1 | 3) => (el: Element | undefined) =>
  el?.tagName === `H${level}` && el.textContent.includes(summary.title);

describe('글 카드 → 글 상세 공유 요소', () => {
  test.each([
    {
      card: '홈 쇼케이스 카드',
      ui: <PostCard post={summary} variant="showcase" />,
      cover: isCoverFrame,
    },
    {
      card: '홈 작은 카드',
      ui: <PostCard post={summary} variant="default" />,
      cover: isCoverFrame,
    },
    {
      card: '홈 썸네일 행',
      ui: <PostThumbRow post={summary} />,
      cover: isCoverFrame,
    },
    // /posts 카드는 커버 틀이 없다 — 이미지가 자기 모서리를 들고 이름을 받는다.
    {
      card: '/posts 카드',
      ui: <PostGridCard post={summary} />,
      cover: isImage,
    },
    // /posts 목록 보기와 /series의 행 — 커버가 없어 제목만 이어진다.
    {
      card: '글 목록 행',
      ui: (
        <ol>
          <PostListRow post={summary} />
        </ol>
      ),
      cover: null,
    },
  ])(
    '$card — 커버(있으면)와 제목(h3)이 이 글의 이름을 달고, 이 글을 여는 링크 이동에서만 짝이 된다',
    ({ ui, cover }) => {
      const { container } = render(ui);
      const parts: [PostSharedPart, { share: unknown }][] = [];

      const titlePart = sharedPart(container, 'title');
      expect(isTitleHeading(3)(titlePart.target)).toBe(true);
      parts.push(['title', titlePart]);

      if (cover) {
        const coverPart = sharedPart(container, 'cover');
        expect(cover(coverPart.target)).toBe(true);
        parts.push(['cover', coverPart]);
      } else {
        expect(
          sharedElements(container).filter(
            s => s.name === postSharedName('cover', SLUG),
          ),
        ).toEqual([]);
      }

      for (const [part, { share }] of parts) {
        expect(share).toEqual({
          [POST_OPEN_TRANSITION_TYPE]: cardClass(part),
          default: 'none',
        });
      }
      // 카드의 링크는 하나이고(cardParts.ts), 그 링크가 여는 type을 목록 → 글의 방향과 함께 단다.
      const links = container.querySelectorAll('a');
      expect(links).toHaveLength(1);
      expect(links[0]?.dataset['transitionTypes']).toBe(
        JSON.stringify([POST_OPEN_TRANSITION_TYPE, NAV_TRANSITION.forward]),
      );
    },
  );

  test('글 상세 — 히어로 이미지와 h1이 같은 이름을 달고 언제나 짝이 될 수 있다', () => {
    const { container: hero } = render(
      <PostHero
        slug={detail.slug}
        title={detail.title}
        thumbnailUrl="/thumbs/react/component/toast.webp"
      />,
    );
    const cover = sharedPart(hero, 'cover');
    expect(isImage(cover.target)).toBe(true);
    expect(cover.share).toBe(detailClass('cover'));

    const { container: header } = render(<PostHeader post={detail} />);
    const title = sharedPart(header, 'title');
    expect(isTitleHeading(1)(title.target)).toBe(true);
    expect(title.share).toBe(detailClass('title'));
  });

  test('다이어그램 히어로와 히어로 없는 글은 커버 짝이 없다 — 카드에 없는 그림이다', () => {
    const { container: diagram } = render(
      <PostHero
        slug={detail.slug}
        title={detail.title}
        hero={DIAGRAM_NAMES[0]}
        thumbnailUrl="/thumbs/react/component/toast.webp"
      />,
    );
    expect(sharedElements(diagram)).toEqual([]);

    const { container: none } = render(
      <PostHero slug={detail.slug} title={detail.title} />,
    );
    expect(sharedElements(none)).toEqual([]);
  });
});

describe('열린 글 — 상세에서 링크로 목록에 돌아갈 때', () => {
  const card = (slug: string) => (
    <PostCardShared part="title" slug={slug}>
      <h3>{slug}</h3>
    </PostCardShared>
  );
  // 실제로는 상세와 목록이 한 화면에 함께 있지 않다 — 여기서는 "목록이 렌더되는 순간 상세가 아직
  // 마운트돼 있다"를 한 트리로 흉내 내므로 같은 이름이 둘이다. 카드 쪽(h3)만 고른다.
  const shareOf = (container: HTMLElement, slug: string) =>
    sharedElements(container).find(
      s =>
        s.name === postSharedName('title', slug) &&
        s.targets[0]?.tagName === 'H3',
    )?.share;

  test('그 글의 상세가 마운트돼 있는 동안 그 글의 카드만 type 없이 짝이 되고, 상세가 떠나면 거둔다', () => {
    const { container, rerender } = render(
      <>
        <PostDetailShared part="title" slug={SLUG}>
          <h1>상세</h1>
        </PostDetailShared>
        {card(SLUG)}
        {card('other-post')}
      </>,
    );
    expect(shareOf(container, SLUG)).toBe(cardClass('title'));
    // 다른 글의 카드는 여는 type이 있을 때만 — 목록 → 목록 이동에서 짝이 되지 않는다.
    expect(shareOf(container, 'other-post')).toEqual({
      [POST_OPEN_TRANSITION_TYPE]: cardClass('title'),
      default: 'none',
    });

    act(() => {
      rerender(
        <>
          {card(SLUG)}
          {card('other-post')}
        </>,
      );
    });
    expect(shareOf(container, SLUG)).toEqual({
      [POST_OPEN_TRANSITION_TYPE]: cardClass('title'),
      default: 'none',
    });
  });

  // 이전·다음 글로 상세 → 상세를 건넌 뒤 목록으로 돌아가면 짝은 **마지막에 연 글**의 카드다. 정리
  // (이 글이 열린 글일 때만 비움)와 다음 상세의 등록이 effect 순서로 맞물리는데, 같은 인스턴스가 slug만
  // 바뀌는 경우와 상세가 통째로 바뀌는 경우 모두 열린 글이 B로 끝나야 한다 — 비면 B 카드와 짝 없이
  // 페이드만 남는다(진단 없음).
  test.each<[string, (slug: string) => string]>([
    ['같은 상세가 slug만 바뀔 때', () => 'detail'],
    ['상세가 통째로 바뀔 때', (slug: string) => slug],
  ])('상세 → 상세(%s) 뒤에는 마지막 글의 카드가 짝이 된다', (_when, keyOf) => {
    const B = 'next-post';
    const detail = (slug: string) => (
      <PostDetailShared key={keyOf(slug)} part="title" slug={slug}>
        <h1>{slug}</h1>
      </PostDetailShared>
    );
    const { container, rerender } = render(detail(SLUG));
    act(() => {
      rerender(detail(B));
    });
    act(() => {
      rerender(
        <>
          {detail(B)}
          {card(SLUG)}
          {card(B)}
        </>,
      );
    });

    expect(shareOf(container, B)).toBe(cardClass('title'));
    expect(shareOf(container, SLUG)).toEqual({
      [POST_OPEN_TRANSITION_TYPE]: cardClass('title'),
      default: 'none',
    });
  });
});
