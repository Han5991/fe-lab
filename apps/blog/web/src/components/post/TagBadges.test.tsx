/**
 * 글 아래의 태그 줄.
 *
 * 태그 링크를 잃으면 아카이브 태그 필터로 들어가는 유일한 입구가 끊긴다(글 카드 안의 태그는 링크가
 * 아니다). 그래서 링크 유지가 이 파일의 핵심 회귀 테스트다.
 */
import { describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { TagBadges } from './TagBadges';

// 링크가 현재 경로로 이동 방향을 고른다(TransitionLink) — 이 컴포넌트가 놓이는 글 상세에 둔다.
vi.mock('next/navigation', async () => {
  const { postPath } = await import('@blog/content/client');
  return { usePathname: () => postPath('some-post') };
});

// href는 archivePath 계약(`/posts/?tag=…`) 그대로다 — next/link의 후행 슬래시
// 정규화는 vitest.setup.ts가 next.config를 비춰 실제 빌드와 같게 맞춰 둔다.
const hrefOf = (name: string) =>
  screen.getByRole('link', { name }).getAttribute('href');

describe('TagBadges', () => {
  test('(회귀) 태그는 아카이브 태그 필터로 가는 링크다', () => {
    render(<TagBadges tags={['ecs']} />);

    expect(hrefOf('#ecs')).toBe('/posts/?tag=ecs');
  });

  test('태그에 쿼리 특수문자가 있어도 인코딩해서 넘긴다', () => {
    render(<TagBadges tags={['c++ & rust']} />);

    expect(hrefOf('#c++ & rust')).toBe('/posts/?tag=c%2B%2B%20%26%20rust');
  });

  test('태그는 줄여서 보이지 않는다 — 전부 목록 항목이다', () => {
    render(<TagBadges tags={['a', 'b', 'c', 'd', 'e', 'f']} />);

    const list = screen.getByRole('list', { name: '태그' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(6);
  });

  test('태그가 없으면 아무것도 그리지 않는다', () => {
    const { container } = render(<TagBadges tags={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
