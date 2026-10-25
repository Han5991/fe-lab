/**
 * 글 아래 이동 카드 — 이름이 `이전·다음 글`인 내비게이션이고, 카드는 같은 주소의 썸네일을 단다.
 * 방향(transition type)은 `TransitionLink.test.tsx`가 본다.
 */
import { describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { PostNavItem } from '@blog/content/client';
import { PostNavigation } from './PostNavigation';
import { SERIES_PATH } from '@/src/shared/routes';

// 링크가 현재 경로로 이동 방향을 고른다(TransitionLink) — 이 컴포넌트가 놓이는 글 상세에 둔다.
vi.mock('next/navigation', async () => {
  const { postPath } = await import('@blog/content/client');
  return { usePathname: () => postPath('some-post') };
});

const item = (slug: string, over: Partial<PostNavItem> = {}): PostNavItem => ({
  slug,
  title: `제목 ${slug}`,
  relativeDir: '',
  ...over,
});

const thumbOf = (link: HTMLElement) => link.querySelector('img');

describe('PostNavigation', () => {
  test('전체 이전·다음 글은 이름 있는 내비게이션 안의 목록이다', () => {
    render(<PostNavigation prev={item('old')} next={item('new')} />);

    const nav = screen.getByRole('navigation', { name: '이전·다음 글' });
    expect(within(nav).getAllByRole('listitem')).toHaveLength(2);
    expect(
      within(nav).getByRole('link', { name: /이전 글.*제목 old/ }),
    ).toHaveAttribute('href', '/posts/old/');
    expect(
      within(nav).getByRole('link', { name: /다음 글.*제목 new/ }),
    ).toHaveAttribute('href', '/posts/new/');
  });

  test('썸네일은 장식이고, 자기 썸네일이 있으면 최적화본·없으면 OG 카드를 쓴다', () => {
    render(
      <PostNavigation
        prev={item('old', { relativeDir: 'ci', thumbnail: 'cover.png' })}
        next={item('new')}
      />,
    );

    const prevImg = thumbOf(screen.getByRole('link', { name: /이전 글/ }));
    expect(prevImg).toHaveAttribute('src', '/thumbs/ci/cover.webp');
    expect(prevImg).toHaveAttribute('alt', '');
    expect(
      thumbOf(screen.getByRole('link', { name: /다음 글/ })),
    ).toHaveAttribute('src', '/og/new.png');
  });

  test('한쪽만 있으면 그쪽만 그린다', () => {
    render(<PostNavigation prev={item('old')} next={null} />);

    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  test('이전·다음 글이 둘 다 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(<PostNavigation prev={null} next={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  test('시리즈 글은 시리즈 이름과 이전·다음 편만 그린다 — 전체 이전·다음 글은 그리지 않는다', () => {
    render(
      <PostNavigation
        prev={item('global-prev')}
        next={item('global-next')}
        seriesNav={{
          prev: item('part-1'),
          next: item('part-3'),
          seriesName: '번들러',
        }}
      />,
    );

    expect(screen.getByText('시리즈 · 번들러')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /이전 편/ })).toHaveAttribute(
      'href',
      '/posts/part-1/',
    );
    expect(screen.getByRole('link', { name: /다음 편/ })).toHaveAttribute(
      'href',
      '/posts/part-3/',
    );
    expect(screen.queryByText(/global-/)).not.toBeInTheDocument();
  });

  test('시리즈 마지막 편에는 시리즈 목록으로 가는 카드가 있고 썸네일은 없다', () => {
    render(
      <PostNavigation
        prev={null}
        next={null}
        seriesNav={{ prev: item('part-1'), next: null, seriesName: '번들러' }}
      />,
    );

    const toSeries = screen.getByRole('link', { name: /시리즈 목록/ });
    expect(toSeries).toHaveAttribute('href', SERIES_PATH);
    expect(thumbOf(toSeries)).toBeNull();
  });
});
