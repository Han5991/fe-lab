/**
 * 링크가 이동 방향을 **규칙 하나**(`navTransitionType`)에서 받는지 — 셸(헤더 워드마크·내비, 푸터)과
 * 글 상세의 링크(태그, 이전·다음 글)가 `TransitionLink`로 현재 경로를 넣어 type을 단다.
 *
 * 링크 하나가 `next/link`로 돌아가면 그 이동만 조용히 페이드로 남는다 — 빌드·브라우저 어디서도
 * 에러가 없다. jsdom에는 View Transitions가 없으므로 `next/link`를 받은 transition type을 data 속성으로
 * 드러내는 상자로 바꿔 끼우고, 현재 경로는 `usePathname`으로 넣는다.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type * as ReactModule from 'react';
import type { LinkProps } from 'next/link';
import {
  archivePath,
  POSTS_PATH,
  postPath,
  type PostNavItem,
} from '@blog/content/client';
import { Layout } from '@/src/components/Layout';
import { PostHeader } from '@/src/components/post/PostHeader';
import { PostNavigation } from '@/src/components/post/PostNavigation';
import {
  ABOUT_PATH,
  HOME_PATH,
  PRIVACY_PATH,
  SERIES_PATH,
} from '@/src/shared/routes';
import { NAV_TRANSITION } from '@/src/shared/viewTransitions';

const pathname = vi.hoisted(() => ({ current: '/' }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
  // 헤더의 검색 다이얼로그가 쓴다(열지 않는다).
  useRouter: () => ({ push: () => undefined }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    transitionTypes,
    children,
    ...rest
  }: LinkProps & {
    children: ReactModule.ReactNode;
    'aria-label'?: string;
    'aria-current'?: ReactModule.AriaAttributes['aria-current'];
  }) => {
    if (typeof href !== 'string') throw new Error('href는 문자열이다');
    return (
      <a
        href={href}
        aria-label={rest['aria-label']}
        aria-current={rest['aria-current']}
        data-transition-types={JSON.stringify(transitionTypes ?? [])}
      >
        {children}
      </a>
    );
  },
}));

const POST = postPath('vitest-project-split');
const { forward, back } = NAV_TRANSITION;

const typesOf = (link: HTMLElement): unknown =>
  JSON.parse(link.dataset['transitionTypes'] ?? 'null');

/** 셸의 사이트 안 링크 — 헤더 워드마크·내비 셋, 푸터 About·개인정보. */
function shellLinks() {
  const header = screen.getByRole('banner');
  const footer = screen.getByRole('contentinfo');
  const byHref = (scope: HTMLElement, href: string) => {
    const found = within(scope)
      .getAllByRole('link')
      .filter(a => a.getAttribute('href') === href);
    expect(found, href).toHaveLength(1);
    const [link] = found;
    if (!link) throw new Error(href);
    return link;
  };
  return {
    wordmark: byHref(header, HOME_PATH),
    posts: byHref(header, POSTS_PATH),
    series: byHref(header, SERIES_PATH),
    about: byHref(header, ABOUT_PATH),
    footerAbout: byHref(footer, ABOUT_PATH),
    footerPrivacy: byHref(footer, PRIVACY_PATH),
  };
}

const renderShellAt = (path: string) => {
  pathname.current = path;
  render(
    <Layout>
      <p>본문</p>
    </Layout>,
  );
  return shellLinks();
};

beforeEach(() => {
  pathname.current = '/';
});

describe('셸 링크 — 현재 경로에서 앱의 계층으로 방향을 고른다', () => {
  test('홈에서는 섹션으로 들어가는 이동이다', () => {
    const links = renderShellAt(HOME_PATH);
    expect(typesOf(links.posts)).toEqual([forward]);
    expect(typesOf(links.series)).toEqual([forward]);
    expect(typesOf(links.about)).toEqual([forward]);
    expect(typesOf(links.footerAbout)).toEqual([forward]);
    expect(typesOf(links.footerPrivacy)).toEqual([forward]);
    // 홈에서 홈으로는 방향이 없다.
    expect(typesOf(links.wordmark)).toEqual([]);
  });

  test('글 목록에서 워드마크는 위로, 헤더 형제(시리즈·About)는 방향 없는 페이드다', () => {
    const links = renderShellAt(POSTS_PATH);
    expect(typesOf(links.wordmark)).toEqual([back]);
    expect(typesOf(links.series)).toEqual([]);
    expect(typesOf(links.about)).toEqual([]);
    expect(typesOf(links.footerPrivacy)).toEqual([]);
  });

  test('글 상세에서는 셸의 모든 링크가 위로 돌아가는 이동이다', () => {
    const links = renderShellAt(POST);
    for (const link of Object.values(links)) {
      expect(typesOf(link), link.getAttribute('href') ?? '').toEqual([back]);
    }
  });
});

describe('글 상세의 링크', () => {
  const item = (slug: string): PostNavItem => ({
    slug,
    title: slug,
    relativeDir: '',
  });

  beforeEach(() => {
    pathname.current = POST;
  });

  test('이전 글은 왼쪽에서(back), 다음 글은 오른쪽에서(forward) 들어온다', () => {
    render(
      <PostNavigation prev={item('older-post')} next={item('newer-post')} />,
    );
    const prev = screen.getByRole('link', { name: /이전 글/ });
    const next = screen.getByRole('link', { name: /다음 글/ });
    expect(typesOf(prev)).toEqual([back]);
    expect(typesOf(next)).toEqual([forward]);
  });

  test('시리즈 마지막 편의 "시리즈 목록 →"은 오른쪽 자리여도 위로 가는 이동이다', () => {
    render(
      <PostNavigation
        prev={null}
        next={null}
        seriesNav={{ prev: item('part-1'), next: null, seriesName: '번들러' }}
      />,
    );
    expect(typesOf(screen.getByRole('link', { name: /이전 편/ }))).toEqual([
      back,
    ]);
    const toSeries = screen.getByRole('link', { name: /시리즈 목록/ });
    expect(toSeries).toHaveAttribute('href', SERIES_PATH);
    expect(typesOf(toSeries)).toEqual([back]);
  });

  test('태그 링크는 필터된 글 목록으로 돌아가는 이동이다', () => {
    render(
      <PostHeader
        post={{
          slug: 'vitest-project-split',
          originalSlug: 'vitest-project-split',
          relativeDir: '',
          title: '제목',
          excerpt: '',
          date: '2026-09-18',
          readMin: 3,
          tags: ['ci'],
          status: 'published',
          content: '',
        }}
      />,
    );
    const tag = screen.getByRole('link', { name: '#ci' });
    expect(tag).toHaveAttribute('href', archivePath({ tag: 'ci' }));
    expect(typesOf(tag)).toEqual([back]);
  });
});
