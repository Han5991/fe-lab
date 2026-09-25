/**
 * 빌드 한 번의 기준 시각을 프로세스 사이로 나르는 환경 변수와 파서 — 단계 프로세스와
 * `next build`가 각자 제 시계를 보면 예약 글 경계에서 산출물과 페이지의 글 집합이 갈린다.
 */
import { isIsoDateTimeWithOffset } from './dates.ts';

export const BUILD_NOW_ENV = 'BLOG_CONTENT_NOW';

/** `BLOG_CONTENT_NOW` → Date(비었으면 지금). offset을 명시한 ISO만 받고, 틀리면 조용히 "지금"으로 넘어가지 않고 던진다. */
export function resolveBuildNow(given: string | undefined): Date {
  if (given === undefined || given === '') return new Date();
  if (!isIsoDateTimeWithOffset(given)) {
    throw new Error(
      `기준 시각(${BUILD_NOW_ENV})은 offset을 명시한 ISO 시각이어야 합니다(예: 2026-06-01T09:00:00+09:00): ${given}`,
    );
  }
  return new Date(given);
}
