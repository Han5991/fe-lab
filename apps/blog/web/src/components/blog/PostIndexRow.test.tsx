/**
 * 허브 글 목록 한 줄의 표기 규칙.
 *
 * 날짜는 연도를 뗀 `MM-DD`(레퍼런스 `.date`)이고, 날짜 없는 글도 목록에서
 * 사라지면 안 됩니다.
 */
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { postPath, type PostSummary } from '@blog/content';
import { PostIndexRow } from './PostIndexRow';

/**
 * href는 postPath 계약(`/posts/{encoded}/`) 그대로여야 합니다. next/link의 후행
 * 슬래시 정규화는 vitest.setup.ts가 next.config를 비춰 실제 빌드와 같게 맞춰 둡니다.
 */
const hrefOf = (el: Element) => el.getAttribute('href');

const post = (over: Partial<PostSummary> = {}): PostSummary => ({
  slug: 'hello-world',
  originalSlug: 'hello-world',
  relativeDir: '',
  title: '테스트 글',
  date: '2025-06-08',
  readMin: 5,
  status: 'published',
  ...over,
});

describe('PostIndexRow', () => {
  test('제목이 글 상세로 연결된다', () => {
    render(<PostIndexRow post={post()} />);
    expect(hrefOf(screen.getByRole('link'))).toBe('/posts/hello-world/');
  });

  // 회귀: next/link는 trailingSlash: true에서도 마지막 세그먼트에 `.`이 있으면
  // 파일로 보고 후행 슬래시를 벗긴다. 실제로 `/posts/turborepo-next.js-docker`가
  // 아카이브·시리즈·이웃 글 내비 3곳에 슬래시 없이 나가 클릭마다 301을 한 번 더
  // 탔다. next.config의 skipTrailingSlashRedirect가 그 정규화를 끄며, 이 테스트는
  // 그 설정을 빼면 다시 빨개진다.
  test('slug에 `.`이 있어도 후행 슬래시가 살아남는다 (turborepo-next.js-docker 회귀)', () => {
    render(<PostIndexRow post={post({ slug: 'turborepo-next.js-docker' })} />);
    expect(hrefOf(screen.getByRole('link'))).toBe(
      postPath('turborepo-next.js-docker'),
    );
    expect(hrefOf(screen.getByRole('link'))).toBe(
      '/posts/turborepo-next.js-docker/',
    );
  });

  test('날짜는 연도를 뗀 MM-DD로 표기한다', () => {
    render(<PostIndexRow post={post()} />);
    expect(screen.getByText('06-08')).toBeInTheDocument();
    expect(screen.queryByText(/2025/)).toBeNull();
  });

  test('날짜가 없어도 제목 줄은 남는다', () => {
    render(<PostIndexRow post={post({ date: null })} />);
    expect(screen.getByRole('link')).toHaveTextContent('테스트 글');
  });

  test('slug에 한글이 있으면 인코딩해서 링크한다', () => {
    render(<PostIndexRow post={post({ slug: '번들러-만들기' })} />);
    expect(hrefOf(screen.getByRole('link'))).toBe(
      `/posts/${encodeURIComponent('번들러-만들기')}/`,
    );
  });
});
