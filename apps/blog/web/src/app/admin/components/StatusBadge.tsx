import { css } from '@blog/styled-system/css';
import {
  localeTag,
  parseScheduledDateKST,
  publishAtOf,
  type PostStatus,
  type VisibilityData,
} from '@blog/content/client';
import { SITE_LOCALE, TIMEZONE } from '@/content.values.mts';
import { pillBadge } from '@/src/components/admin/adminStyles';
import { STATUS_BADGE, statusTone } from './postState';

interface StatusBadgeProps {
  /** frontmatter의 status가 아니라 **지금 실제로 공개 중인지** — 호출자가 `resolvePostState`로 구한다. */
  state: PostStatus;
  post: VisibilityData;
}

/**
 * 상태마다 정적 클래스 — 배지 면(`pillBadge`)에 글자색(`statusTone`)만 다르다. 상태를 런타임에 골라 한
 * `css()`에 섞으면 Panda가 그 호출을 추출하지 못해, 같은 원자 클래스가 다른 곳에 있을 때만 모양이 난다.
 */
const BADGE_CLASS = {
  published: css(pillBadge, statusTone.raw({ state: 'published' })),
  draft: css(pillBadge, statusTone.raw({ state: 'draft' })),
  scheduled: css(pillBadge, statusTone.raw({ state: 'scheduled' })),
} as const satisfies Record<PostStatus, string>;

/**
 * 글 상태 배지 — 라벨은 `STATUS_BADGE`, 글자색은 `statusTone`. 배지는 상태만 말하고, 공개 예정
 * 시각은 예약 글의 툴팁에 있다.
 */
export function StatusBadge({ state, post }: StatusBadgeProps) {
  const publishAt = publishAtOf(post);
  return (
    <span
      className={BADGE_CLASS[state]}
      title={
        state === 'scheduled' && publishAt
          ? // 'YYYY-MM-DD'를 native Date에 넣으면 UTC 자정으로 파싱돼 KST 09:00으로 잘못 표시된다.
            `예약: ${parseScheduledDateKST(TIMEZONE, publishAt).toLocaleString(localeTag(SITE_LOCALE), { timeZone: TIMEZONE.iana })}`
          : undefined
      }
    >
      {STATUS_BADGE[state].label}
    </span>
  );
}
