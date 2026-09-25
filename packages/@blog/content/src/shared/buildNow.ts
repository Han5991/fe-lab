/**
 * 빌드 한 번의 **기준 시각**을 프로세스 사이로 나르는 계약 — 환경 변수 이름과 파서.
 *
 * 예약 글 공개 판정은 "지금"을 본다. 빌드는 `blog-content`의 단계 프로세스
 * 여럿과 `next build`(와 그 워커들)로 이루어져서, 각자 제 시계를 보면 예약 글의
 * 공개 시각이 빌드 도중에 지날 때 sitemap·og 카드와 페이지가 서로 다른 글 집합을
 * 담는다. 그래서 앱의 `build` 스크립트가 시각 하나를 이 변수로 내보내고, CLI
 * (`--now`가 없을 때)와 앱의 콘텐츠 인스턴스(`src/content.ts`)가 **같은 파서**로
 * 읽는다 — 파서가 둘이면 한쪽만 받아 주는 값에서 두 프로세스가 갈린다.
 */
import { isIsoDateTimeWithOffset } from './dates.ts';

export const BUILD_NOW_ENV = 'BLOG_CONTENT_NOW';

/**
 * `--now`/`BLOG_CONTENT_NOW` 값을 Date로. 비었으면 지금이다.
 *
 * offset(`Z` 또는 `±HH:MM`)을 명시한 ISO만 받는다 — offset 없는 시각은 실행
 * 환경의 로컬 시각으로 풀려 CI(UTC)와 로컬(KST)이 9시간 갈린다. 판정은
 * frontmatter 날짜와 같은 `isIsoDateTimeWithOffset`이라 받아 준 값은 언제나
 * 유효한 Date다(`2026-02-30T…` 같은 없는 날짜도 거절). 형식이 틀리면 던진다 —
 * 조용히 "지금"으로 넘어가면 고정했다고 믿은 시각이 풀린다.
 */
export function resolveBuildNow(given: string | undefined): Date {
  if (given === undefined || given === '') return new Date();
  if (!isIsoDateTimeWithOffset(given)) {
    throw new Error(
      `기준 시각(--now · ${BUILD_NOW_ENV})은 offset을 명시한 ISO 시각이어야 합니다(예: 2026-06-01T09:00:00+09:00): ${given}`,
    );
  }
  return new Date(given);
}
