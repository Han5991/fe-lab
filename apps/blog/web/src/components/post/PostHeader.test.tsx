/**
 * 글 상세 머리의 구성 — `[빵부스러기] h1 → dek → 바이라인 → 구분선`.
 *
 * 태그 링크(아카이브 태그 필터의 입구)는 머리가 아니라 본문 아래 `TagBadges`의 몫이고, 그 회귀는
 * `TagBadges.test.tsx`가 잠근다.
 */
import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostHeader } from './PostHeader';

// 링크가 현재 경로로 이동 방향을 고른다(TransitionLink) — 이 컴포넌트가 놓이는 글 상세에 둔다.
vi.mock('next/navigation', async () => {
  const { postPath } = await import('@blog/content/client');
  return { usePathname: () => postPath('some-post') };
});

const basePost = {
  slug: 'next-js-ecs-deploy',
  title: 'ECS와 CodeDeploy를 활용한 Next.js 무중단 배포',
  date: '2025-03-31',
  readMin: 14,
};

describe('PostHeader', () => {
  test('제목은 이 페이지의 h1 하나다', () => {
    render(<PostHeader post={basePost} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      basePost.title,
    );
  });

  test('시리즈 글은 빵부스러기를 그린다', () => {
    render(
      <PostHeader
        post={{ ...basePost, series: 'turborepo-infra' }}
        seriesName="Turborepo 인프라"
      />,
    );

    expect(
      screen.getByRole('navigation', { name: '위치' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Turborepo 인프라' }),
    ).toHaveAttribute('href', '/posts/?series=turborepo-infra');
  });

  test('시리즈가 아닌 글에는 빵부스러기가 없다', () => {
    render(<PostHeader post={basePost} />);

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  test('시리즈 id만 있고 표시명을 알 수 없으면 빵부스러기를 그리지 않는다', () => {
    render(<PostHeader post={{ ...basePost, series: 'x' }} />);

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  test('바이라인은 날짜와 읽기 시간을 보인다', () => {
    render(<PostHeader post={basePost} />);

    expect(screen.getByText('2025-03-31')).toBeInTheDocument();
    expect(screen.getByText('14분 읽기')).toBeInTheDocument();
  });

  test('(회귀) 시리즈 배지와 메타 줄의 해시태그는 머리에 없다', () => {
    render(
      <PostHeader
        post={{ ...basePost, series: 's' }}
        seriesName="시리즈 이름"
      />,
    );

    expect(screen.queryByText(/^시리즈 ·/)).not.toBeInTheDocument();
    expect(screen.queryByText(/min$/)).not.toBeInTheDocument();
  });

  test('excerpt는 있을 때만 그린다', () => {
    const { unmount } = render(<PostHeader post={basePost} />);
    expect(screen.queryByText('무중단 배포까지의 두 번의 실패')).toBeNull();
    unmount();

    render(
      <PostHeader
        post={{ ...basePost, excerpt: '무중단 배포까지의 두 번의 실패' }}
      />,
    );
    expect(
      screen.getByText('무중단 배포까지의 두 번의 실패'),
    ).toBeInTheDocument();
  });
});
