import { useEffect } from 'react';

const KEY = 'blog_recent_views';
const MAX = 5;

export interface RecentView {
  slug: string;
  title: string;
  viewedAt: number;
}

function safeParse(raw: string | null): RecentView[] {
  if (!raw) return [];
  try {
    // localStorage 값은 외부 입력이다 — any로 흘리지 않고 unknown에서 좁힌다.
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item: unknown): item is RecentView =>
        item != null &&
        typeof item === 'object' &&
        typeof (item as Partial<RecentView>).slug === 'string' &&
        typeof (item as Partial<RecentView>).title === 'string',
    );
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
