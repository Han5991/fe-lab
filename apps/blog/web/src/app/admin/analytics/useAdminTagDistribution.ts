'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

interface AdminPostMeta {
  slug: string;
  title: string;
  tags?: string[];
}

/**
 * 외부에서 받은 unknown 객체를 AdminPostMeta로 안전하게 좁힙니다.
 * 필수 필드(slug)와 옵셔널 tags가 string[] 형태인지만 가볍게 확인합니다.
 */
function isAdminPostMeta(item: unknown): item is AdminPostMeta {
  if (typeof item !== 'object' || item === null) return false;
  const candidate = item as Record<string, unknown>;
  if (typeof candidate.slug !== 'string') return false;
  if (
    candidate.tags !== undefined &&
    !(
      Array.isArray(candidate.tags) &&
      candidate.tags.every(t => typeof t === 'string')
    )
  ) {
    return false;
  }
  return true;
}

/**
 * admin-posts-index.json을 그대로 가져와 태그별 빈도수를 계산한다.
 * (analytics/page.tsx는 client 컴포넌트라 server-side getAllTags()를 못 쓴다)
 */
export function useAdminTagDistribution() {
  const { data } = useSuspenseQuery({
    queryKey: ['admin', 'tag-distribution'],
    queryFn: async () => {
      // SSR 환경에서는 상대 URL fetch가 ERR_INVALID_URL이라 빈 결과로 대기.
      // (AdminGuard가 보통 children의 SSR을 막지만, 우회 빌드에서도 안전하도록.)
      if (typeof window === 'undefined') return [];
      // useSuspenseQuery는 가까운 ErrorBoundary로 throw를 위임하므로
      // 응답 코드와 형식을 명시적으로 검증합니다 (404나 깨진 JSON 시 .json()이
      // 그대로 throw되어 페이지 전체가 깨지는 것을 막습니다).
      const res = await fetch('/admin-posts-index.json');
      if (!res.ok) {
        throw new Error(
          `admin-posts-index.json fetch failed: ${res.status} ${res.statusText}`,
        );
      }
      const json: unknown = await res.json();
      // 배열이면서 각 원소가 AdminPostMeta shape인 것만 통과 (런타임 가드).
      const posts: AdminPostMeta[] = Array.isArray(json)
        ? json.filter(isAdminPostMeta)
        : [];
      const counts = new Map<string, number>();
      for (const post of posts) {
        for (const tag of post.tags ?? []) {
          counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
      }
      return Array.from(counts.entries())
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
    },
  });
  return data;
}
