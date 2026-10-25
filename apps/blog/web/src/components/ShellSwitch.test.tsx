/**
 * 루트 레이아웃의 셸 고르기 — admin 세그먼트만 사이트 셸 없이 그린다. 세그먼트는 주소가 아니라
 * 라우트 트리에서 온다(404 페이지가 admin 주소로 열려도 사이트 셸 그대로 — ShellSwitch 주석).
 */
import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const { segment } = vi.hoisted(() => ({
  segment: { current: null as string | null },
}));

vi.mock('next/navigation', () => ({
  useSelectedLayoutSegment: () => segment.current,
}));

import { ShellSwitch } from './ShellSwitch';

function renderSwitch(current: string | null) {
  segment.current = current;
  render(<ShellSwitch site={<p>사이트 셸</p>} bare={<p>셸 없음</p>} />);
}

describe('ShellSwitch', () => {
  test('admin 세그먼트는 사이트 셸을 씌우지 않는다', () => {
    renderSwitch('admin');

    expect(screen.getByText('셸 없음')).toBeInTheDocument();
    expect(screen.queryByText('사이트 셸')).not.toBeInTheDocument();
  });

  // 홈(null)·글·404(Next의 not-found 세그먼트)는 사이트 셸이다.
  test.each([null, 'posts', '/_not-found'])(
    '%s 세그먼트는 사이트 셸을 씌운다',
    current => {
      renderSwitch(current);

      expect(screen.getByText('사이트 셸')).toBeInTheDocument();
      expect(screen.queryByText('셸 없음')).not.toBeInTheDocument();
    },
  );
});
