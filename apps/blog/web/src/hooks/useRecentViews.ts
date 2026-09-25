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

/**
 * 쓸 수 있는 localStorage, 아니면 null.
 *
 * `setItem`만 감싸서는 부족하다 — 쿠키·사이트 데이터를 차단하면(Chrome "모든
 * 쿠키 차단", 사이트별 차단, 일부 임베디드 웹뷰) **`window.localStorage` getter
 * 자체가** SecurityError를 던진다. 예전엔 그 접근이 try 밖에 있어, 글 페이지의
 * effect에서 던져진 예외가 페이지 전체를 Next 기본 에러 화면으로 날렸다.
 * 최근 본 글은 편의 기능이라, 저장소를 못 쓰면 기능만 조용히 빠진다.
 */
function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readRaw(store: Storage): string | null {
  try {
    return store.getItem(KEY);
  } catch {
    return null;
  }
}

export function getRecentViews(): RecentView[] {
  const store = storage();
  return store ? safeParse(readRaw(store)) : [];
}

export function recordRecentView(slug: string, title: string): void {
  const store = storage();
  if (!store) return;
  const list = safeParse(readRaw(store));
  const filtered = list.filter(item => item.slug !== slug);
  filtered.unshift({ slug, title, viewedAt: Date.now() });
  try {
    store.setItem(KEY, JSON.stringify(filtered.slice(0, MAX)));
  } catch {
    // localStorage 한도/사적 모드 등 — 조용히 무시
  }
}

export function useRecordRecentView(slug: string, title: string): void {
  useEffect(() => {
    recordRecentView(slug, title);
  }, [slug, title]);
}
