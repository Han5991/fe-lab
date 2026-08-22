import { parseScheduledDateKST } from '../shared/dates.ts';
import type { TimezoneConfig } from '../shared/contentConfig.ts';
import { POST_STATUSES, type PostStatus } from './types.ts';

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
  status?: string | undefined;
  // analytics의 PostStatDetail은 빈 값을 null로 정규화해 들고 옵니다.
  // `scheduledDate ?? date` 폴백이 null도 그대로 처리하므로 타입만 넓혀 받습니다.
  scheduledDate?: string | null | undefined;
  date?: string | null | undefined;
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
 * @param timezone 'YYYY-MM-DD'를 어느 타임존의 자정으로 볼지. 해석된 설정의
 *                 `timezone`(또는 앱 값 모듈의 `TIMEZONE`)을 넘깁니다.
 * @param now 기준 시각. 프로덕션은 빌드 시각(기본 new Date())을 쓰고,
 *            테스트는 경계를 결정적으로 검증하기 위해 주입합니다.
 */
export function isPostVisible(
  data: VisibilityData,
  timezone: Pick<TimezoneConfig, 'isoOffset'>,
  now: Date = new Date(),
): boolean {
  switch (data.status) {
    case 'published':
      return true;
    case 'scheduled': {
      const publishAt = data.scheduledDate ?? data.date;
      if (typeof publishAt !== 'string') return false;
      return parseScheduledDateKST(timezone, publishAt) <= now;
    }
    default:
      return false;
  }
}

/**
 * 포스트의 **현재 상태**를 계산합니다. 화면에 상태 배지를 그릴 때 씁니다.
 *
 * `status`(frontmatter)는 "언제 내보내기로 했는가"라는 **발행 의도**의 기록이고,
 * 사람이 화면에서 알고 싶은 것은 "지금 공개인가"입니다. 예약 시각이 지난 글은
 * 원본이 `scheduled`로 남아 있어도 이미 공개된 상태이므로 `'published'`를
 * 반환합니다. 원본 frontmatter를 `published`로 되돌리지는 않습니다 — 그러면
 * 예약 발행이었다는 사실이 파일에서 사라지고, 커밋 전 기간을 커버할 파생 판정도
 * 여전히 필요해 규칙이 두 벌이 됩니다.
 *
 * 공개 판정은 `isPostVisible`에 위임합니다. 이 규칙을 복사해서 쓰면 `date` 폴백이나
 * KST 파싱 중 하나가 빠진 채 갈라집니다 — admin 상태 배지가 실제로 그렇게 깨져서,
 * 이미 공개돼 조회수가 쌓이는 글을 몇 달째 "예약"으로 표시하고 있었습니다.
 *
 * @param data
 * @param timezone `isPostVisible`과 같은 타임존 슬라이스.
 * @param now 기준 시각. 테스트는 경계를 결정적으로 검증하기 위해 주입합니다.
 */
export function resolvePostState(
  data: VisibilityData,
  timezone: Pick<TimezoneConfig, 'isoOffset'>,
  now: Date = new Date(),
): PostStatus {
  if (isPostVisible(data, timezone, now)) return 'published';
  // 아직 공개 전인 예약 글만 'scheduled'.
  // status 누락·미지 값은 isPostVisible과 같은 이유로 draft 취급(fail-closed)입니다.
  return data.status === 'scheduled' ? 'scheduled' : 'draft';
}
