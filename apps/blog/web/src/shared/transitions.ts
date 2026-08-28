/**
 * 페이지 전환(ssgoi) 네임스페이스의 **단일 출처**.
 *
 * 전환 ID는 URL이 아니라 매칭 키지만 값이 라우트 모양과 묶여 돈다 — 매처
 * (`PageTransition.tsx`)와 각 페이지의 `transitionId`, 목록 카드/상세 히어로의
 * 모핑 키가 서로 맞아야 동작한다. 예전에는 `/posts` 접두가 세 파일에 리터럴로
 * 흩어져 있었고, 어긋나면 빌드·테스트가 잡지 못한 채 hero 모핑이 fade로 조용히
 * 폴백했다.
 *
 * 규칙 둘:
 * - 페이지 전환 ID는 **무슬래시형 라우트 경로**다(라우트 상수에서 파생).
 * - 글 상세는 썸네일 유무로 매칭이 갈린다 — 썸네일 있는 글만 hero 모핑 대상
 *   (`/posts/*`)이고, 없는 글은 가상 네임스페이스 `/posts-plain/*`로 보내
 *   fade로 폴백한다. URL은 어느 쪽이든 그대로 `/posts/{slug}`다.
 */
import { POSTS_PATH } from '@blog/content';
import { ABOUT_PATH, HOME_PATH, PRIVACY_PATH, SERIES_PATH } from './routes';

/** 전환 ID는 무슬래시형을 쓴다 — 라우트 상수(슬래시형)에서 여기서만 벗긴다. */
const transitionIdOf = (path: string): string =>
  path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;

export const HOME_TRANSITION_ID = HOME_PATH;
export const POSTS_TRANSITION_ID = transitionIdOf(POSTS_PATH);
export const SERIES_TRANSITION_ID = transitionIdOf(SERIES_PATH);
export const ABOUT_TRANSITION_ID = transitionIdOf(ABOUT_PATH);
export const PRIVACY_TRANSITION_ID = transitionIdOf(PRIVACY_PATH);

/**
 * 썸네일 없는 글 상세의 가상 네임스페이스. 실제 라우트가 아니다 — hero 매처
 * (`/posts/*`)에 걸리지 않게 다른 접두로 빼내는 전환 전용 이름이다.
 */
const POSTS_PLAIN_TRANSITION_PREFIX = `${POSTS_TRANSITION_ID}-plain`;

/** hero 모핑 대상(썸네일 있는 글 상세)을 매칭하는 글롭. */
export const POST_HERO_TRANSITION_GLOB = `${POSTS_TRANSITION_ID}/*`;
/** fade 폴백(썸네일 없는 글 상세)을 매칭하는 글롭. */
export const POST_PLAIN_TRANSITION_GLOB = `${POSTS_PLAIN_TRANSITION_PREFIX}/*`;

/** 글 상세의 전환 ID — 썸네일 유무로 hero/fade 매칭을 라우팅한다. */
export function postTransitionId(slug: string, hasThumbnail: boolean): string {
  return `${hasThumbnail ? POSTS_TRANSITION_ID : POSTS_PLAIN_TRANSITION_PREFIX}/${slug}`;
}

/**
 * hero 모핑 키 — 목록 카드(`data-hero-exit-key`)와 상세 히어로 이미지
 * (`data-hero-enter-key`)가 **같은 값**을 붙여야 카드↔헤더가 모핑한다.
 * 양쪽 다 이 함수를 쓰고, 썸네일 있는 글에만 붙인다(짝은 PostHero.test가 잠금).
 */
export function postHeroKey(slug: string): string {
  return `post-${slug}`;
}
