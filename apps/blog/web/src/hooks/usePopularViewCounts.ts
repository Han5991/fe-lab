import { useEffect, useState } from 'react';
import type { PostSummary } from '@blog/content/client';
import type { TopPostRow } from '@/src/domain/analytics';
import { reportError, type ReportError } from '@/src/components/errorReporting';

/**
 * 인기순 목록을 숨겨 두는 상한. 조회수가 이보다 늦게 오면 빈 자리보다 최신순 목록이 낫다 — 그때
 * 숨김을 풀고, 조회수가 나중에 오면 그때 다시 정렬한다(그 경우만 목록이 한 번 움직인다).
 */
export const POPULAR_HIDE_CAP_MS = 2000;

/** 받은 조회수를 다시 묻지 않는 시간 — 지나도 마지막 값은 보여 주고 뒤에서 다시 받는다. */
const FRESH_MS = 5 * 60 * 1000;

/** 조회수 행을 받아 오는 함수 — 테스트는 스텁을 넣는다. */
type FetchRows = (slugs: readonly string[]) => Promise<readonly TopPostRow[]>;

/**
 * 글 목록 인기순의 조회수 출처. 마지막 성공 값을 모듈 수명 동안 들고 있어, 글을 열었다가 뒤로 와서
 * 목록이 다시 마운트돼도 첫 렌더부터 정렬된 채로 그린다.
 */
export interface ViewCountsSource {
  /** 마지막 성공 값(나이와 무관) — 마운트 때 동기로 읽는다. 받은 적이 없으면 `undefined`. */
  read(): Map<string, number> | undefined;
  /** 마지막 성공 값이 아직 다시 묻지 않아도 될 만큼 새것인가. */
  isFresh(now: number): boolean;
  /** 이 slug들의 조회수를 받는다. 성공하면 `read()`가 이 값을 돌려준다. */
  load(slugs: readonly string[]): Promise<Map<string, number>>;
}

async function defaultFetchRows(slugs: readonly string[]) {
  // 조회 코드(PostgREST 클라이언트·repository)는 인기순을 고를 때만 받는다 — 글 목록 첫 로드에 싣지 않는다.
  const { getAllViewCounts } = await import('@/src/domain/analytics');
  return getAllViewCounts(slugs);
}

/** 캐시는 소스마다 하나다 — 테스트는 케이스마다 새 소스를 만들어 값이 케이스를 넘지 않게 한다. */
export function createViewCountsSource(
  fetchRows: FetchRows = defaultFetchRows,
): ViewCountsSource {
  let last: { counts: Map<string, number>; at: number } | undefined;
  return {
    read: () => last?.counts,
    isFresh: now => last !== undefined && now - last.at < FRESH_MS,
    load: async slugs => {
      const rows = await fetchRows(slugs);
      const counts = new Map(rows.map(row => [row.slug, row.view_count]));
      last = { counts, at: Date.now() };
      return counts;
    },
  };
}

/** 앱의 싱글턴 — 글 목록의 slug 집합은 빌드마다 하나라 캐시에 키가 없다. */
export const viewCountsSource = createViewCountsSource();

/**
 * 인기순 정렬에 쓸 조회수. 꺼져 있으면 묻지 않는다.
 *
 * `pending`은 "조회수가 아직 없어 인기순으로 그릴 수 없다" — 쓰는 쪽은 그동안 목록을 자리만 잡아
 * 숨긴다(최신순으로 그렸다가 재배열하면 목록 전체가 움직인다). 실패하면 바로, 응답이
 * `POPULAR_HIDE_CAP_MS` 안에 없으면 그때 풀리고, 한 번 풀리면 다시 숨기지 않는다.
 *
 * 재시도하지 않는다 — 숨김과 겹쳐 목록을 오래 가리지 않게. 실패는 화면에서 보이지 않으므로(최신순으로
 * 그린다) GA4로 보고한다(`useViewCount`와 같은 길).
 */
export function usePopularViewCounts(
  posts: readonly Pick<PostSummary, 'slug'>[],
  enabled: boolean,
  source: ViewCountsSource = viewCountsSource,
  report: ReportError = reportError,
) {
  const [counts, setCounts] = useState(() => source.read());
  const [released, setReleased] = useState(false);

  useEffect(() => {
    if (!enabled || source.isFresh(Date.now())) return;
    let live = true;
    const cap = setTimeout(() => setReleased(true), POPULAR_HIDE_CAP_MS);
    source.load(posts.map(post => post.slug)).then(
      next => {
        clearTimeout(cap);
        // 효과가 이미 정리됐어도(응답 전에 다른 정렬로 옮겼다) 받는다 — 출처의 캐시는 이 값으로 이미
        // 새것이라, 버리면 다시 인기순을 골랐을 때 `isFresh`가 조회를 건너뛰어 조회수 없이 숨김에 갇힌다.
        setCounts(next);
      },
      (err: unknown) => {
        clearTimeout(cap);
        report(err, false);
        if (live) setReleased(true);
      },
    );
    return () => {
      live = false;
      clearTimeout(cap);
    };
  }, [enabled, posts, source, report]);

  return { counts, pending: enabled && counts === undefined && !released };
}
