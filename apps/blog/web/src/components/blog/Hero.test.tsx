/**
 * 홈 히어로 — 이름과 버튼 셋. 바깥 채널 버튼은 셸의 `SOCIAL_LINKS`(헤더·푸터 아이콘과 같은 목록)를
 * 그리므로, 목록에서 빠지거나 가는 곳의 종류(새 탭 여부)가 갈리면 여기서 드러난다.
 */
import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SOCIAL_LINKS } from '@/src/components/shellLinks';
import { Hero } from './Hero';

// 링크가 현재 경로로 이동 방향을 고른다(TransitionLink) — 이 컴포넌트가 놓이는 홈에 둔다.
vi.mock('next/navigation', async () => {
  const { HOME_PATH } = await import('@/src/shared/routes');
  return { usePathname: () => HOME_PATH };
});

describe('Hero', () => {
  test('페이지 제목(h1)은 이름이다', () => {
    render(<Hero />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '한상욱',
    );
  });

  test('주 버튼은 글 목록으로 간다', () => {
    render(<Hero />);
    expect(screen.getByRole('link', { name: '모든 글 보기' })).toHaveAttribute(
      'href',
      '/posts/',
    );
  });

  test('바깥 채널 버튼은 셸 목록을 그대로 그린다', () => {
    render(<Hero />);
    for (const { label, href, kind } of SOCIAL_LINKS) {
      const link = screen.getByRole('link', { name: label });
      expect(link).toHaveAttribute('href', href);
      // 바깥 사이트(GitHub)만 새 탭이다 — RSS는 같은 도메인의 정적 파일.
      if (kind === 'external') {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      } else {
        expect(link).not.toHaveAttribute('target');
      }
    }
    expect(screen.getAllByRole('link')).toHaveLength(1 + SOCIAL_LINKS.length);
  });
});
