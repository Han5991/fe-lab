import { parseScheduledDateKST } from '../../lib/dates';

/**
 * Frontmatter 데이터를 기반으로 포스트의 공개 여부를 판단합니다.
 *
 * - status가 없으면 published 필드로 하위호환 (기존 방식)
 * - status: 'published' → 공개
 * - status: 'draft' → 비공개
 * - status: 'scheduled' + scheduledDate가 현재 시간 이전 → 공개
 *
 * scheduledDate가 'YYYY-MM-DD' 형식이면 KST 자정으로 해석합니다.
 * (JS Date 기본 동작은 UTC 자정 → KST 기준으로 9시간 빨리 공개되는 버그)
 *
 * @param now 기준 시각. 프로덕션은 빌드 시각(기본 new Date())을 쓰고,
 *            테스트는 경계를 결정적으로 검증하기 위해 주입합니다.
 */
export interface VisibilityData {
  status?: string;
  scheduledDate?: string;
  published?: boolean;
}

export function isPostVisible(
  data: VisibilityData,
  now: Date = new Date(),
): boolean {
  if (!data.status) {
    return data.published === true;
  }

  switch (data.status) {
    case 'published':
      return true;
    case 'draft':
      return false;
    case 'scheduled': {
      if (typeof data.scheduledDate !== 'string') return false;
      // 'YYYY-MM-DD' 형식은 KST 자정으로 파싱 (UTC 자정 대신)
      return parseScheduledDateKST(data.scheduledDate) <= now;
    }
    default:
      return false;
  }
}
