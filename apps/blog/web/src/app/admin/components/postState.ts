// 클라이언트 컴포넌트의 @blog/content 배럴 import — node:fs 모듈(series 등)은
// next.config.ts의 optimizePackageImports + sideEffects:false가 번들에서 걸러 준다.
import { postPath, type PostStatus } from '@blog/content';

/**
 * 상태 배지의 색과 라벨 — admin 두 화면(대시보드·글 목록)이 같은 표를 쓴다.
 *
 * 삼항 체인이 아니라 레코드인 건 망라 때문이다. 체인의 마지막 가지는 남은 상태를
 * 전부 받아서, `PostStatus`가 늘면 새 상태가 조용히 '예약'으로 그려진다.
 * `satisfies`가 그 자리를 컴파일 에러로 만든다.
 */
export const STATUS_BADGE = {
  published: { color: 'moss.600', label: '공개' },
  draft: { color: 'ink.500', label: '비공개' },
  scheduled: { color: 'spot.600', label: '예약' },
} as const satisfies Record<PostStatus, { color: string; label: string }>;

/**
 * 실제 글 페이지 주소 — 공개 중인 글에만 있다. 정적 export는 비공개 글의 페이지를
 * 만들지 않아, draft·공개 전 예약 글을 실제 글로 열면 404다.
 */
export function livePostHref(slug: string, state: PostStatus): string | null {
  return state === 'published' ? postPath(slug) : null;
}
