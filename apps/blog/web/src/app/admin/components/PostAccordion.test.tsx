/**
 * admin 글 목록의 한 행 — 링크 두 개와 펼침 버튼이 형제다.
 *
 * 예전엔 링크 두 개가 <button> 안에 있었다(버튼 내용에는 대화형 요소 금지).
 * 간이 통계 계산은 admin 배럴을 거치므로(저장소가 import 시점에 supabase
 * 클라이언트를 만든다) 그 배럴만 가짜로 바꾼다.
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
  test('링크는 펼침 버튼 밖에 있고 아이콘 링크마다 이름이 있다', () => {
    render(<PostAccordion post={POST} todayISO={TODAY} />);

    const toggle = screen.getByRole('button', { name: /내 글/ });
    expect(toggle.querySelector('a')).toBeNull();
    expect(
      screen.getByRole('link', { name: '내 글 상세 통계' }),
    ).toHaveAttribute('href', '/admin/analytics/my-post/');
    expect(
      screen.getByRole('link', { name: '내 글 글을 새 탭에서 열기' }),
    ).toHaveAttribute('href', '/posts/my-post/');
  });

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

  test('직전 주와 비교할 수 없는 증감률(null)은 하락이 아니라 비교 불가로 그린다', () => {
    derived.weekGrowthRate = null;
    render(<PostAccordion post={POST} todayISO={TODAY} />);
    fireEvent.click(screen.getByRole('button', { name: /내 글/ }));

    expect(screen.getByRole('img', { name: '비교 불가' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: '감소' })).not.toBeInTheDocument();
  });

  test('음수 증감률만 감소로 그린다', () => {
    derived.weekGrowthRate = -20;
    render(<PostAccordion post={POST} todayISO={TODAY} />);
    fireEvent.click(screen.getByRole('button', { name: /내 글/ }));

    expect(screen.getByRole('img', { name: '감소' })).toBeInTheDocument();
    expect(screen.getByText('-20%')).toBeInTheDocument();
  });

  test('비공개 글에는 404가 나는 공개 글 링크를 두지 않는다', () => {
    render(
      <PostAccordion post={{ ...POST, status: 'draft' }} todayISO={TODAY} />,
    );

    expect(
      screen.queryByRole('link', { name: /새 탭에서 열기/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '내 글 상세 통계' }),
    ).toBeInTheDocument();
  });
});
