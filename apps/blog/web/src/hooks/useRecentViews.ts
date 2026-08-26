import { useEffect } from 'react';
import { isRecord } from '@blog/content';

const KEY = 'blog_recent_views';
const MAX = 5;

export interface RecentView {
  slug: string;
  title: string;
  viewedAt: number;
}

/**
 * 확인된 필드로 RecentView를 **다시 만들어** 돌려준다. `item is RecentView` 술어로
 * 걸렀다면 컴파일러는 그 말을 믿기만 할 뿐이라, 검사에서 빠뜨린 필드(예전엔
 * viewedAt이 그랬다)나 필드명 오타를 잡지 못한다. 객체를 구성하면 세 필드가 다
 * 좁혀졌다는 것을 반환 타입이 강제한다.
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

function safeParse(raw: string | null): RecentView[] {
  if (!raw) return [];
  try {
    // localStorage 값은 외부 입력이다 — any로 흘리지 않고 unknown에서 좁힌다.
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(toRecentView).filter(view => view !== null);
  } catch {
    return [];
  }
}

export function getRecentViews(): RecentView[] {
  if (typeof window === 'undefined') return [];
  return safeParse(window.localStorage.getItem(KEY));
}

export function recordRecentView(slug: string, title: string): void {
  if (typeof window === 'undefined') return;
  const list = safeParse(window.localStorage.getItem(KEY));
  const filtered = list.filter(item => item.slug !== slug);
  filtered.unshift({ slug, title, viewedAt: Date.now() });
  try {
    window.localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, MAX)));
  } catch {
    // localStorage 한도/사적 모드 등 — 조용히 무시
  }
}

export function useRecordRecentView(slug: string, title: string): void {
  useEffect(() => {
    recordRecentView(slug, title);
  }, [slug, title]);
}
