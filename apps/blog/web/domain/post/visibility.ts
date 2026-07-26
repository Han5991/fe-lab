import { parseScheduledDateKST } from '@/lib/dates';
import { POST_STATUSES, type PostStatus } from './types';

/**
 * frontmatter의 `status` 값이 유효한 PostStatus인지 확인합니다.
 */
export function isPostStatus(value: unknown): value is PostStatus {
  return (
    typeof value === 'string' &&
    (POST_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * frontmatter가 "빌드 대상 포스트"인지 판정하는 **단일 규칙**.
 *
 * repository.ts(빌드)와 validate-posts.ts(검증)가 같은 함수를 씁니다.
 * 예전에는 두 곳이 서로 다른 조건을 들고 있었습니다:
 *   - repository: `!slug && !published && !status` → 제외
 *   - validate  : `'status' in data || 'published' in data || 'slug' in data` → 포스트
 * `published: false`는 falsy라서, slug 없는 초안 11건을 repository는 "메타 파일"로
 * 통째로 버리는데 validate는 포스트로 보고 검사하는 불일치가 있었습니다.
 */
export function isPostFile<T extends { status?: unknown }>(
  data: T,
): data is T & { status: PostStatus } {
  return isPostStatus(data.status);
}

export interface VisibilityData {
  status?: string;
  scheduledDate?: string;
  date?: string | null;
}

/**
 * 포스트의 공개 여부를 판단합니다.
 *
 * - `published`  → 공개
 * - `draft`      → 비공개
 * - `scheduled`  → 공개 시각이 지났으면 공개
 * - 그 외 / 누락 → 비공개 (fail-closed)
 *
 * `status`는 **발행 의도**이고, 실제 공개 여부는 이 함수의 계산 결과입니다.
 * 예약 시각이 지난 글의 status를 손으로 `published`로 되돌릴 필요는 없습니다.
 *
 * 공개 시각은 `scheduledDate`가 있으면 그 값, 없으면 `date`를 씁니다.
 * 'YYYY-MM-DD' 형식은 KST 자정으로 해석합니다 — JS Date 기본 동작인 UTC 자정으로
 * 파싱하면 KST 기준 9시간 일찍 공개되는 버그가 됩니다.
 *
 * @param data
 * @param now 기준 시각. 프로덕션은 빌드 시각(기본 new Date())을 쓰고,
 *            테스트는 경계를 결정적으로 검증하기 위해 주입합니다.
 */
export function isPostVisible(
  data: VisibilityData,
  now: Date = new Date(),
): boolean {
  switch (data.status) {
    case 'published':
      return true;
    case 'scheduled': {
      const publishAt = data.scheduledDate ?? data.date;
      if (typeof publishAt !== 'string') return false;
      return parseScheduledDateKST(publishAt) <= now;
    }
    default:
      return false;
  }
}
