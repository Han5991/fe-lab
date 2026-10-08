import { postPath, type PostStatus } from '@blog/content/client';
import { cva } from '@blog/styled-system/css';

/** 상태 배지의 라벨 — `satisfies`라 `PostStatus`가 늘면 여기서 컴파일이 막힌다. */
export const STATUS_BADGE = {
  published: { label: '공개' },
  draft: { label: '비공개' },
  scheduled: { label: '예약' },
} as const satisfies Record<PostStatus, { label: string }>;

/**
 * 상태 배지의 글자색. 상태는 런타임 값이라 `colors[state]` 같은 조회는 빌드 때 CSS가 되지
 * 않는다 — 변형(cva)으로 적어야 세 색이 모두 추출된다(styling/dynamic-styling). `PostStatus`가
 * 늘면 `statusTone({ state })` 호출이 컴파일되지 않는다.
 */
export const statusTone = cva({
  variants: {
    state: {
      // 글자색이라 moss.700 — moss.600은 아이콘·배경용으로 라이트에서 AA 미달이다.
      published: { color: 'moss.700' },
      draft: { color: 'ink.500' },
      scheduled: { color: 'spot.600' },
    },
  },
});

/** 실제 글 주소 — 정적 export는 비공개 글의 페이지를 만들지 않아 공개 글에만 있다. */
export function livePostHref(slug: string, state: PostStatus): string | null {
  return state === 'published' ? postPath(slug) : null;
}
