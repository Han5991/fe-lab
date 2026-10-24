import { postPath, type PostStatus } from '@blog/content/client';
import { cva } from '@blog/styled-system/css';

/** 상태 배지의 라벨 — `satisfies`라 `PostStatus`가 늘면 여기서 컴파일이 막힌다. */
export const STATUS_BADGE = {
  published: { label: '공개' },
  draft: { label: '비공개' },
  scheduled: { label: '예약' },
} as const satisfies Record<PostStatus, { label: string }>;

/**
 * 상태 배지의 글자색 — 배지 면(`pillBadge`, paper.200) 위 글자다. 상태는 런타임 값이라
 * `colors[state]` 같은 조회는 빌드 때 CSS가 되지 않는다 — 변형(cva)으로 적어야 세 색이 모두
 * 추출된다(styling/dynamic-styling). `PostStatus`가 늘면 `statusTone({ state })` 호출이 컴파일되지
 * 않는다. paper.200 위 대비(라이트 / 다크): moss.700 4.95 / 8.15, ink.700 6.44 / 7.22,
 * spot.600 4.57 / 7.34.
 */
export const statusTone = cva({
  variants: {
    state: {
      // 글자색이라 moss.700 — moss.600은 아이콘·배경용으로 라이트에서 AA 미달이다.
      published: { color: 'moss.700' },
      // ink.500은 paper.200 위 라이트 4.52로 문턱에 걸려 한 단계 진하게 둔다.
      draft: { color: 'ink.700' },
      scheduled: { color: 'spot.600' },
    },
  },
});

/** 실제 글 주소 — 정적 export는 비공개 글의 페이지를 만들지 않아 공개 글에만 있다. */
export function livePostHref(slug: string, state: PostStatus): string | null {
  return state === 'published' ? postPath(slug) : null;
}
