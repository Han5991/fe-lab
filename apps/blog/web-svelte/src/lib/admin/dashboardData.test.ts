import { expect, test } from 'vitest';
import type {
  AdminPostIndex,
  PostStatsRow,
  PostTrendRow,
} from '@blog/analytics';
import { buildDashboardData } from './dashboardData.ts';

/**
 * 대시보드 조립 계약.
 *
 * 세 출처를 slug로 잇는 자리다 — 어긋나면 **화면은 그려지고 숫자만 0이 된다.**
 * 빌드도 `check-bundle`도 통과하고, 눈으로는 "아직 조회수가 없나 보다"와
 * 구분되지 않는다.
 */

const meta = (
  over: Partial<AdminPostIndex> & { slug: string },
): AdminPostIndex => ({
  title: over.slug,
  date: '2026-01-01',
  tags: [],
  status: 'published',
  scheduledDate: null,
  ...over,
});

test('세 출처를 slug로 잇는다', () => {
  const [row] = buildDashboardData(
    [meta({ slug: 'a', title: '글 A' })],
    [{ slug: 'a', total_views: 10, today_views: 2 }] as PostStatsRow[],
    [
      { slug: 'a', view_date: '2026-01-01', view_count: 3 },
      { slug: 'a', view_date: '2026-01-02', view_count: 7 },
    ] as PostTrendRow[],
  );
  expect(row?.totalViews).toBe(10);
  expect(row?.todayViews).toBe(2);
  expect(row?.trends).toHaveLength(2);
});

test('통계·추이가 없는 글도 0으로 살아남는다', () => {
  // 새 글은 RPC 두 곳에 행이 없다. 여기서 떨어뜨리면 목록에서 사라진다.
  const [row] = buildDashboardData([meta({ slug: 'new' })], [], []);
  expect(row?.slug).toBe('new');
  expect(row?.totalViews).toBe(0);
  expect(row?.trends).toStrictEqual([]);
});

test('메타에 없는 slug의 통계는 버린다', () => {
  // 인덱스가 기준이다 — 지워진 글의 조회수 행이 목록에 유령으로 나오면 안 된다.
  const rows = buildDashboardData(
    [meta({ slug: 'a' })],
    [{ slug: 'gone', total_views: 99, today_views: 9 }] as PostStatsRow[],
    [],
  );
  expect(rows.map(r => r.slug)).toStrictEqual(['a']);
});

test('status 폴백은 fail-closed다', () => {
  // 'published'로 두면 인덱스가 깨졌을 때 draft 글이 공개 글로 보인다.
  const [row] = buildDashboardData(
    [meta({ slug: 'a', status: '' as AdminPostIndex['status'] })],
    [],
    [],
  );
  expect(row?.status).toBe('draft');
});

test('추이는 글마다 나뉜다', () => {
  const rows = buildDashboardData(
    [meta({ slug: 'a' }), meta({ slug: 'b' })],
    [],
    [
      { slug: 'a', view_date: '2026-01-01', view_count: 1 },
      { slug: 'b', view_date: '2026-01-01', view_count: 2 },
      { slug: 'a', view_date: '2026-01-02', view_count: 3 },
    ] as PostTrendRow[],
  );
  expect(rows[0]?.trends.map(t => t.view_count)).toStrictEqual([1, 3]);
  expect(rows[1]?.trends.map(t => t.view_count)).toStrictEqual([2]);
});
