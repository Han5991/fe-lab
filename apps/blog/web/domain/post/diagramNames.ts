/**
 * 이름으로 부를 수 있는 다이어그램 목록 — **이름만** 담는 모듈.
 *
 * 실제 컴포넌트 매핑은 `src/components/diagram/registry.ts`에 있는데, 그 파일은
 * React·Panda를 끌어오는 `.tsx`를 import합니다. `scripts/validate-posts.ts`는
 * `node --import tsx`로 도는 순수 노드 스크립트라 거기까지 딸려 들어오면
 * 검증 스크립트가 UI 번들에 묶입니다. 그래서 "이름 목록"만 여기로 떼어
 * 레지스트리와 검증 스크립트가 같은 출처를 공유하게 했습니다.
 *
 * 새 다이어그램을 추가할 때는 **여기 이름 한 줄 + registry.ts 한 줄**이면 됩니다.
 * 둘 중 하나만 하면 registry.ts의 `Record<DiagramName, …>`가 컴파일 에러를 냅니다.
 */
export const DIAGRAM_NAMES = ['deploy-pipeline'] as const;

export type DiagramName = (typeof DIAGRAM_NAMES)[number];

/** frontmatter `hero`처럼 어떤 값이든 올 수 있는 자리에서 쓰는 좁히기 가드. */
export function isDiagramName(value: unknown): value is DiagramName {
  return (
    typeof value === 'string' &&
    (DIAGRAM_NAMES as readonly string[]).includes(value)
  );
}
