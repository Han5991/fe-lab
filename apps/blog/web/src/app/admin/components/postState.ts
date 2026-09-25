// 배럴의 node:fs 모듈은 next.config.ts의 optimizePackageImports가 번들에서 걸러 준다.
import { postPath, type PostStatus } from '@blog/content';

/** 상태 배지의 색과 라벨 — `satisfies`라 `PostStatus`가 늘면 여기서 컴파일이 막힌다. */
export const STATUS_BADGE = {
  published: { color: 'moss.600', label: '공개' },
  draft: { color: 'ink.500', label: '비공개' },
  scheduled: { color: 'spot.600', label: '예약' },
} as const satisfies Record<PostStatus, { color: string; label: string }>;

/** 실제 글 주소 — 정적 export는 비공개 글의 페이지를 만들지 않아 공개 글에만 있다. */
export function livePostHref(slug: string, state: PostStatus): string | null {
  return state === 'published' ? postPath(slug) : null;
}
