/**
 * 다이어그램 노드·엣지의 **역할 값**.
 *
 * 원래 이 두 타입은 `apps/blog/web`의 Panda recipe variant 키에서 파생됐다
 * (`RecipeVariant<typeof node>['tone']`) — 값 목록을 따로 관리하지 않으려는
 * 설계였다. 레이아웃 엔진을 두 앱이 공유하게 되면서 방향이 뒤집힌다: **여기가
 * 선언이고 recipe가 그것을 만족해야 한다.** 파생을 잃지 않도록 소비 쪽에서
 * 타입 수준으로 대조한다(`primitives.tsx`의 `satisfies`).
 *
 * 이름이 색이 아니라 역할인 데는 이유가 있다. 예전엔 `'gray' | 'teal'`이었는데
 * 포인트색을 틸에서 cyan으로 바꾸자 값 이름이 곧바로 거짓말이 됐다.
 */

/** `gray`(구조) | `accent`(핵심 경로). */
export type DiagramTone = 'gray' | 'accent';

/** `sync`(실선=동기) | `async`(점선=비동기·데이터). */
export type DiagramFlow = 'sync' | 'async';
