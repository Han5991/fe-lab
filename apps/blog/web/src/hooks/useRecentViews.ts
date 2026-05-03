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
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentView =>
        item != null &&
        typeof item === 'object' &&
        typeof item.slug === 'string' &&
        typeof item.title === 'string',
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

export function useRecordRecentView(
  slug: string | null,
  title: string,
): void {
  useEffect(() => {
    if (!slug) return;
    recordRecentView(slug, title);
  }, [slug, title]);
}
