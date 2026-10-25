import type { SeriesSummary } from '@blog/content';
import {
  ARCHIVE_SORT_KEYS,
  POSTS_PATH,
  archivePath,
  formatTagParam,
  parseTagParam,
  type ArchiveFilters,
  type ArchiveSortKey,
} from '@blog/content/client';

/**
 * 글 목록(`/posts/`)의 URL 계약 — 쿼리 다섯 키(`tag`·`series`·`q`·`sort`·`view`)를 화면 상태로 읽고,
 * 화면 상태를 다시 쿼리로 쓴다. 앞의 넷은 다른 화면의 필터 링크와 같은 계약이라 조립을 패키지의
 * `archivePath`에 맡기고, 이 화면만 아는 `view` 하나만 여기서 잇는다.
 */

/** 목록 보기 — 순서가 곧 뷰 토글의 칸 순서다. */
export const VIEW_MODES = ['cards', 'list'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

/** 뷰를 싣는 쿼리 키 — 읽기와 쓰기가 같은 상수를 쓴다. 다른 화면은 이 키로 링크하지 않는다. */
const VIEW_PARAM = 'view';

/** URL에 값이 없을 때의 정렬·뷰. 기본값은 URL에 쓰지 않는다. */
export const DEFAULT_SORT = 'recent' satisfies ArchiveSortKey;
export const DEFAULT_VIEW = 'cards' satisfies ViewMode;

/**
 * 검색어를 친 뒤 URL에 쓰기까지 기다리는 시간. 목록은 글자마다 바로 걸러지고, 히스토리 API 호출만
 * 늦춘다 — Safari는 짧은 시간 안의 `replaceState` 호출 수에 상한을 두고 넘으면 예외를 던진다.
 */
export const SEARCH_COMMIT_MS = 250;

/** 글 목록이 그리는 상태 — 검색어·태그(AND)·시리즈(`null`은 전체)·정렬·보기. */
export interface ArchiveState {
  q: string;
  tags: string[];
  series: string | null;
  sort: ArchiveSortKey;
  view: ViewMode;
}

/** 쿼리가 없을 때의 상태 — 정적 HTML(폴백)이 그리는 화면이다. */
export const DEFAULT_ARCHIVE_STATE: ArchiveState = {
  q: '',
  tags: [],
  series: null,
  sort: DEFAULT_SORT,
  view: DEFAULT_VIEW,
};

/** 시리즈 칩이 쓰는 요약 — 페이지가 `getAllSeries()`에서 이 셋만 골라 넘긴다(설명문을 RSC에 싣지 않는다). */
export type ArchiveSeries = Pick<SeriesSummary, 'id' | 'title' | 'count'>;

/**
 * 링크 계약(`ArchiveFilters`)의 키를 전부 읽는다. 반환형이 `Required<ArchiveFilters>`라 패키지에 키가
 * 늘면 여기서 컴파일이 막히고, 키 이름이 바뀌면 `get`의 인자가 막힌다 — 한쪽만 바뀌면 다른 화면의
 * 필터 링크가 경고 없이 빈 목록으로 떨어진다(실제로 있었던 사고).
 */
function readLinkParams(
  params: Pick<URLSearchParams, 'get'>,
): Required<ArchiveFilters> {
  const get = (key: keyof ArchiveFilters) => params.get(key) ?? '';
  const sort = get('sort');
  return {
    tag: get('tag'),
    series: get('series'),
    q: get('q'),
    sort: ARCHIVE_SORT_KEYS.find(key => key === sort) ?? DEFAULT_SORT,
  };
}

/**
 * URL 쿼리를 화면 상태로 읽는다. 모르는 값은 기본값이다 — 정렬·보기는 기본값, 모르는 시리즈 id는
 * 전체다(칩이 이미 "전체"를 켜 보여 이유가 화면에 드러난다). 계약 밖의 키(옛 `year` 등)는 무시한다.
 */
export function readArchiveParams(
  params: Pick<URLSearchParams, 'get'>,
  seriesIds: readonly string[],
): ArchiveState {
  const link = readLinkParams(params);
  const view = params.get(VIEW_PARAM);
  return {
    q: link.q,
    tags: parseTagParam(link.tag),
    series: seriesIds.includes(link.series) ? link.series : null,
    sort: link.sort,
    view: VIEW_MODES.find(mode => mode === view) ?? DEFAULT_VIEW,
  };
}

/**
 * 화면 상태를 URL로 — 기본값인 키는 싣지 않는다. 키 순서는 tag·series·q·sort·view이고 값 인코딩은
 * `archivePath`와 같다(`encodeURIComponent`, 들어오는 링크와 같은 모양).
 */
export function archiveHref(state: ArchiveState): string {
  const path = archivePath({
    ...(state.tags.length > 0 && { tag: formatTagParam(state.tags) }),
    ...(state.series !== null && { series: state.series }),
    ...(state.q !== '' && { q: state.q }),
    ...(state.sort !== DEFAULT_SORT && { sort: state.sort }),
  });
  if (state.view === DEFAULT_VIEW) return path;
  // 필터가 없으면 `archivePath`는 `?` 없는 경로를 돌려준다 — 이음표는 결과에 쿼리가 있는지로 고른다
  // (`&`를 바로 붙이면 `/posts/&view=…`라는 경로가 된다). 값은 고정 ASCII라 인코딩하지 않는다.
  return `${path}${path.includes('?') ? '&' : '?'}${VIEW_PARAM}=${state.view}`;
}

/** 지금 주소가 글 목록인가 — dev 서버는 슬래시 없는 `/posts`도 서빙한다. */
export function isArchiveLocation(pathname: string): boolean {
  return pathname === POSTS_PATH || `${pathname}/` === POSTS_PATH;
}
