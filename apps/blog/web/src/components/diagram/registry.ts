import type { ComponentType } from 'react';
import {
  DIAGRAM_NAMES,
  isDiagramName,
  type DiagramName,
} from '@/domain/post/diagramNames';
import { DeployPipeline } from './DeployPipeline';

/**
 * 이름 → 다이어그램 컴포넌트 레지스트리.
 *
 * 다이어그램은 이미지가 아니라 SVG React 컴포넌트라(다크모드 자동 전환을 얻는
 * 대신) frontmatter나 마크다운 태그에서 직접 가리킬 수 없습니다. 이름이라는
 * 얇은 간접층을 두어 `hero: deploy-pipeline` / `<diagram name="deploy-pipeline">`
 * 로 부를 수 있게 합니다.
 *
 * **새 다이어그램을 추가할 때**: `domain/post/diagramNames.ts`에 이름을 넣고
 * 아래 맵에 한 줄 추가하면 끝입니다. 타입이 `Record<DiagramName, …>`이라
 * 한쪽만 하면 컴파일이 막습니다.
 *
 * `ParallelThumb`은 홈 대표 글 카드의 썸네일이라 등록하지 않습니다 — 글 안에서
 * 부를 이유가 없고, 등록하면 본문에 뜻 없는 그림이 박힐 수 있습니다.
 */

/** 레지스트리에 등록되는 다이어그램이 공통으로 받는 prop. */
export interface NamedDiagramProps {
  /** 생략하면 각 다이어그램의 기본 설명이 `aria-label`로 쓰입니다. */
  label?: string | undefined;
}

export const DIAGRAMS: Record<DiagramName, ComponentType<NamedDiagramProps>> = {
  'deploy-pipeline': DeployPipeline,
};

/**
 * 이름으로 다이어그램을 찾습니다. 등록되지 않은 이름은 `undefined` —
 * 오타 하나로 글이 통째로 렌더 실패하면 안 되므로 throw하지 않고,
 * 호출부가 썸네일 등으로 폴백합니다. 오타 자체는 `lint:posts`의
 * `unknown-hero-diagram` 규칙이 빌드 전에 잡습니다.
 *
 * **렌더 중에는 이 함수 대신 `isDiagramName(x) ? DIAGRAMS[x] : undefined`를 쓰세요.**
 * react-hooks/static-components 린트가 "렌더 중 함수 호출로 얻은 대문자 값"을
 * 매 렌더 새로 만들어지는 컴포넌트로 오인해 에러를 냅니다(맵 인덱싱은 통과).
 * 이 함수는 렌더 밖(테스트·유틸)에서 쓰기 편하도록 남겨 둡니다.
 */
export function getDiagram(
  name: string | undefined,
): ComponentType<NamedDiagramProps> | undefined {
  return isDiagramName(name) ? DIAGRAMS[name] : undefined;
}

export { DIAGRAM_NAMES, isDiagramName };
export type { DiagramName };
