/**
 * 다이어그램 배럴 — 스펙 §6 인터페이스 계약.
 *
 * 프리미티브(`primitives`)는 문법을 강제하는 재료이고, 나머지는 그 재료로 그린
 * 구체 다이어그램이다. 새 글의 다이어그램도 프리미티브만 조합해서 이 폴더에 추가한다.
 */
export {
  DiagramFrame,
  DiagramNode,
  DiagramEdge,
  DiagramLabel,
} from './primitives';

export { ParallelThumb } from './ParallelThumb';
export { DeployPipeline } from './DeployPipeline';

/**
 * 선언형 다이어그램 — 마크다운에서 `<diagram>` / `<diagram-node>` /
 * `<diagram-edge>` 로 쓴다. PostBody의 components 맵에 소문자 태그로 등록한다.
 */
export {
  Diagram,
  DiagramNodeTag,
  DiagramEdgeTag,
  type DiagramProps,
  type DiagramNodeTagProps,
  type DiagramEdgeTagProps,
} from './declarative';
// 이름 레지스트리 — frontmatter `hero`와 `<diagram name="…">`가 공유하는 진입점.
export { DIAGRAMS, DIAGRAM_NAMES, getDiagram, isDiagramName } from './registry';
export type { DiagramName, NamedDiagramProps } from './registry';
