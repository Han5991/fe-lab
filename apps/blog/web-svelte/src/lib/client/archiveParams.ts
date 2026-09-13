/**
 * `/posts` 아카이브의 **URL 계약** — 순수 함수 둘.
 *
 * React 판은 nuqs(`useQueryStates`)가 이 일을 한다. 여기서는 라이브러리 대신
 * 함수 두 개를 두는데, 이유는 검증 가능성이다: 읽기·쓰기가 문자열 in / 문자열
 * out이라 화면을 띄우지 않고 계약을 잠글 수 있다(`archiveParams.test.ts`).
 *
 * **기본값은 URL에 적지 않는다.** nuqs의 `withDefault` + `null` 클리어와 같은
 * 규칙이라, 두 사이트에서 같은 화면 상태가 같은 주소를 만든다. 쿼리 키
 * 넷(`q`·`tag`·`series`·`year`)은 `@blog/content`의 `archivePath`가 내보내는
 * 것과 같아야 한다 — 글 상세의 태그 링크와 `/series`의 시리즈 카드가 그
 * 주소로 걸어 들어온다.
 */
export type SortKey = 'recent' | 'popular' | 'shortest';
export type ViewMode = 'list' | 'cards';

const SORT_KEYS: readonly SortKey[] = ['recent', 'popular', 'shortest'];
const VIEW_KEYS: readonly ViewMode[] = ['list', 'cards'];

export interface ArchiveParams {
  q: string;
  tag: string;
  series: string;
  year: string;
  sort: SortKey;
  view: ViewMode;
}

/** 필터가 하나도 안 걸린 상태. 이 값과 같은 키는 주소에서 빠진다. */
export const ARCHIVE_DEFAULTS: ArchiveParams = {
  q: '',
  tag: '',
  series: '',
  year: '',
  sort: 'recent',
  view: 'cards',
};

/**
 * `?q=a&sort=popular` → 상태. 모르는 `sort`·`view` 값은 기본값으로 떨어진다
 * (nuqs의 `parseAsStringLiteral`과 같은 fail-soft — 손으로 고친 주소가 화면을
 * 깨뜨리지 않는다).
 */
export function readArchiveParams(search: string): ArchiveParams {
  const params = new URLSearchParams(search);
  const sort = params.get('sort');
  const view = params.get('view');
  return {
    q: params.get('q') ?? '',
    tag: params.get('tag') ?? '',
    series: params.get('series') ?? '',
    year: params.get('year') ?? '',
    sort: SORT_KEYS.find(key => key === sort) ?? ARCHIVE_DEFAULTS.sort,
    view: VIEW_KEYS.find(key => key === view) ?? ARCHIVE_DEFAULTS.view,
  };
}

/**
 * 상태 → `?q=a&sort=popular`. 기본값인 키는 빼고, 하나도 없으면 빈 문자열이다
 * (주소에 덩그러니 남는 `?`를 만들지 않는다).
 */
export function archiveSearchString(params: ArchiveParams): string {
  const query = new URLSearchParams();
  // 키 순서를 고정한다 — 같은 화면 상태가 항상 같은 주소를 만들어야
  // 히스토리·공유 링크·스냅샷이 흔들리지 않는다.
  for (const key of ['q', 'tag', 'series', 'year', 'sort', 'view'] as const) {
    const value = params[key];
    if (value === ARCHIVE_DEFAULTS[key]) continue;
    query.set(key, value);
  }
  const search = query.toString();
  return search ? `?${search}` : '';
}
