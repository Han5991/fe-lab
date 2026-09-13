import { isRecord } from '@blog/content/client';

/**
 * 최근 본 글 — `localStorage`에 다섯 편.
 *
 * `apps/blog/web/src/hooks/useRecentViews.ts`의 포팅이다. 저장 키·개수·모양을
 * 일부러 그대로 뒀다(`blog_recent_views`) — 두 앱을 같은 브라우저로 오가며
 * 비교할 때 목록이 이어져야 화면 차이가 데이터 차이에 가려지지 않는다.
 *
 * React 판과 다른 것은 훅이 없다는 것뿐이다. `useRecordRecentView`가 하던 일은
 * `RecordRecentView.svelte`의 `$effect` 한 줄이 한다.
 */

const KEY = 'blog_recent_views';
const MAX = 5;

export interface RecentView {
  slug: string;
  title: string;
  viewedAt: number;
}

/**
 * 확인된 필드로 `RecentView`를 **다시 만들어** 돌려준다. `item is RecentView`
 * 술어로 걸렀다면 컴파일러는 그 말을 믿기만 할 뿐이라, 검사에서 빠뜨린 필드나
 * 필드명 오타를 잡지 못한다. 객체를 구성하면 세 필드가 다 좁혀졌다는 것을
 * 반환 타입이 강제한다(React 판 주석과 같은 이유다).
 */
function toRecentView(item: unknown): RecentView | null {
  if (!isRecord(item)) return null;
  const { slug, title, viewedAt } = item;
  if (
    typeof slug !== 'string' ||
    typeof title !== 'string' ||
    typeof viewedAt !== 'number'
  ) {
    return null;
  }
  return { slug, title, viewedAt };
}

/** `localStorage` 값은 외부 입력이다 — `any`로 흘리지 않고 `unknown`에서 좁힌다. */
export function parseRecentViews(raw: string | null): RecentView[] {
  if (raw === null || raw.length === 0) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(toRecentView).filter(view => view !== null);
  } catch {
    return [];
  }
}

export function getRecentViews(): RecentView[] {
  try {
    return parseRecentViews(window.localStorage.getItem(KEY));
  } catch {
    // 사적 모드에서는 읽기부터 던진다.
    return [];
  }
}

/** 같은 글을 다시 보면 맨 앞으로 올라온다(중복이 쌓이지 않는다). */
export function nextRecentViews(
  list: RecentView[],
  entry: RecentView,
): RecentView[] {
  return [entry, ...list.filter(item => item.slug !== entry.slug)].slice(
    0,
    MAX,
  );
}

export function recordRecentView(
  slug: string,
  title: string,
  now: number = Date.now(),
): void {
  try {
    const next = nextRecentViews(getRecentViews(), {
      slug,
      title,
      viewedAt: now,
    });
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 한도 초과·사적 모드 — 조용히 무시한다. 최근 목록이 없다고 글을 못 읽는
    // 것은 아니다.
  }
}
