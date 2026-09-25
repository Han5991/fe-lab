/**
 * admin 글 목록의 한 행 — 링크와 펼침 버튼은 형제다(버튼 안에 대화형 요소 금지).
 * admin 배럴은 import 시점에 supabase 클라이언트를 만들어 가짜로 바꾼다.
 */
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { PostStatDetail } from '@/src/domain/analytics';

const { derived } = vi.hoisted(() => ({
  derived: { weekGrowthRate: null as number | null },
}));
vi.mock('@/src/domain/analytics/admin', () => ({
  analyticsService: {
    computeDerivedStats: () => ({
      weekGrowthRate: derived.weekGrowthRate,
      peakDay: null,
      dailyAverage: 0,
      milestones: [],
    }),
  },
}));

import { PostAccordion } from './PostAccordion';

const POST: PostStatDetail = {
  slug: 'my-post',
  title: '내 글',
  date: '2026-01-01',
  totalViews: 1234,
  todayViews: 0,
  // 추이가 없으면 펼쳐도 차트(ResizeObserver가 필요한 recharts) 대신 안내가 그려진다.
  trends: [],
  status: 'published',
  scheduledDate: null,
};
const TODAY = '2026-05-01';

describe('PostAccordion', () => {
  // 정적 export는 비공개 글의 페이지를 만들지 않는다 — 공개 글 링크는 404다.
  test.each([
    ['published', '/posts/my-post/'],
    ['draft', null],
  ] as const)(
    '%s 글: 링크는 펼침 버튼 밖에 있고, 공개 글에만 실제 글 링크가 있다',
    (status, liveHref) => {
      render(<PostAccordion post={{ ...POST, status }} todayISO={TODAY} />);

      const toggle = screen.getByRole('button', { name: /내 글/ });
      expect(toggle.querySelector('a')).toBeNull();
      expect(
        screen.getByRole('link', { name: '내 글 상세 통계' }),
      ).toHaveAttribute('href', '/admin/analytics/my-post/');
      expect(
        screen
          .queryByRole('link', { name: '내 글 글을 새 탭에서 열기' })
          ?.getAttribute('href') ?? null,
      ).toBe(liveHref);
    },
  );

  test('펼침 버튼은 aria-expanded로 상태를, aria-controls로 패널을 알린다', () => {
    render(<PostAccordion post={POST} todayISO={TODAY} />);
    const toggle = screen.getByRole('button', { name: /내 글/ });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panelId = toggle.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId ?? '')).toHaveTextContent(
      '해당 기간에 데이터가 없습니다.',
    );
  });

  // 직전 주와 비교할 수 없는 증감률(null)은 하락이 아니다.
  test.each([
    [null, '비교 불가', '감소'],
    [-20, '감소', '비교 불가'],
  ])('증감률 %s는 "%s"로 그린다', (rate, shown, hidden) => {
    derived.weekGrowthRate = rate;
    render(<PostAccordion post={POST} todayISO={TODAY} />);
    fireEvent.click(screen.getByRole('button', { name: /내 글/ }));

    expect(screen.getByRole('img', { name: shown })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: hidden })).not.toBeInTheDocument();
  });
});
