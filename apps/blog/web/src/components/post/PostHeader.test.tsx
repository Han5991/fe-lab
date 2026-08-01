/**
 * 글 상세 헤더의 표기 규칙.
 *
 * 리뉴얼에서 태그 pill 그룹을 없애고 메타 줄 안의 해시태그로 인라인시켰는데,
 * 이때 `/posts/?tag=...` 링크가 같이 사라지면 아카이브 태그 필터로 들어가는
 * 유일한 진입점이 끊깁니다. 그래서 링크 유지가 이 파일의 핵심 회귀 테스트입니다.
 */
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostHeader } from './PostHeader';
import type { PostData } from '@/domain/post';

const basePost: PostData = {
  slug: 'next-js-ecs-deploy',
  originalSlug: 'next-js-ecs-deploy',
  relativeDir: 'nextjs deploy',
  title: 'ECS와 CodeDeploy를 활용한 Next.js 무중단 배포',
  date: '2025-03-31',
  content: '',
  readMin: 14,
  status: 'published',
};

describe('PostHeader', () => {
  test('시리즈 배지는 `시리즈 · 표시명 현재/전체` 형식이다', () => {
    render(
      <PostHeader
        post={basePost}
        seriesIndex={{ current: 3, total: 3, displayName: 'Turborepo 인프라' }}
      />,
    );
    expect(
      screen.getByText('시리즈 · Turborepo 인프라 3/3'),
    ).toBeInTheDocument();
  });

  test('시리즈가 없으면 배지를 그리지 않는다', () => {
    render(<PostHeader post={basePost} />);
    expect(screen.queryByText(/^시리즈 ·/)).not.toBeInTheDocument();
  });

  test('메타 줄은 날짜 · 읽기시간 · 해시태그 순으로 한 줄에 붙는다', () => {
    render(
      <PostHeader
        post={{ ...basePost, tags: ['ecs', 'docker', 'turborepo'] }}
      />,
    );
    const meta = screen.getByText(/2025-03-31/);
    expect(meta.textContent).toBe(
      '2025-03-31 · 14 min · #ecs #docker #turborepo',
    );
  });

  // next/link는 next.config의 trailingSlash를 보고 경로를 정규화하는데,
  // vitest에는 그 설정이 없어 `/posts/?tag=` 가 `/posts?tag=` 로 떨어집니다.
  // 검증 대상은 쿼리 문자열이므로 후행 슬래시는 선택으로 둡니다.
  const hrefOf = (name: string) =>
    screen.getByRole('link', { name }).getAttribute('href');

  test('(회귀) 태그는 아카이브 태그 필터로 가는 링크를 유지한다', () => {
    render(<PostHeader post={{ ...basePost, tags: ['ecs'] }} />);
    expect(hrefOf('#ecs')).toMatch(/^\/posts\/?\?tag=ecs$/);
  });

  test('태그에 쿼리 특수문자가 있어도 인코딩해서 넘긴다', () => {
    render(<PostHeader post={{ ...basePost, tags: ['c++ & rust'] }} />);
    expect(hrefOf('#c++ & rust')).toMatch(
      /^\/posts\/?\?tag=c%2B%2B%20%26%20rust$/,
    );
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
