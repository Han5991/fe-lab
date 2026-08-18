/**
 * 이름으로 부를 수 있는 다이어그램 목록 — **이름만** 담는 모듈.
 *
 * 실제 컴포넌트 매핑은 `src/components/diagram/registry.ts`에 있는데, 그 파일은
 * React·Panda를 끌어오는 `.tsx`를 import합니다. `scripts/validate-posts.ts`는
 * node로 그대로 도는 순수 노드 스크립트라 거기까지 딸려 들어오면
 * 검증 스크립트가 UI 번들에 묶입니다. 그래서 "이름 목록"만 값-only 모듈
 * (`contentValues.ts`)에 두고, 레지스트리와 검증 스크립트가 같은 출처를
 * 공유하게 했습니다. 반대 방향도 마찬가지입니다 — registry.ts는 클라이언트
 * 그래프(PostClient → PostHero)에 있으므로, 여기서 설정 객체
 * (`contentConfig.ts`)를 import하면 og 팔레트·llms 산문까지 번들에 실립니다.
 *
 * 새 다이어그램을 추가할 때는 **값 모듈에 이름 한 줄 + registry.ts 한 줄**
 * 이면 됩니다. 둘 중 하나만 하면 registry.ts의 `Record<DiagramName, …>`가
 * 컴파일 에러를 냅니다.
 */
import { DEFAULT_DIAGRAM_NAMES } from '../shared/contentValues.ts';

// 타입 유니언(DiagramName)은 **기본값 리터럴**에서 파생됩니다. 런타임 판정
// (isDiagramName)도 같은 목록을 봅니다 — 설정(registries.diagramNames)의
// 기본값이 이 목록이므로 현재 오버라이드({})에서는 해석된 설정과 같습니다
// (갈라질 수 있다는 제약은 contentValues.ts 머리 주석 참고).
export const DIAGRAM_NAMES = DEFAULT_DIAGRAM_NAMES;

export type DiagramName = (typeof DIAGRAM_NAMES)[number];

/** frontmatter `hero`처럼 어떤 값이든 올 수 있는 자리에서 쓰는 좁히기 가드. */
export function isDiagramName(value: unknown): value is DiagramName {
  return (
    typeof value === 'string' &&
    (DIAGRAM_NAMES as readonly string[]).includes(value)
  );
}
