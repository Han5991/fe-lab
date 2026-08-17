import { createElement, type ComponentProps } from 'react';
import type { Components } from 'react-markdown';
import { HEADING_TAG_MAP } from '@blog/content';

/**
 * 본문 마크다운의 최상위 `#`(h1)을 h2로 강등한다.
 *
 * 페이지의 h1은 PostHeader가 그리는 글 제목 **하나뿐**이어야 한다. 그런데 예전
 * 글들은 본문 첫 줄에도 제목을 `# 제목`으로 한 번 더 적거나, 절 제목을 `#`으로
 * 시작했다 — 렌더된 페이지에 h1이 2~4개 생겨서 검색엔진 입장에서는 "이 문서의
 * 주제가 뭔지" 신호가 흩어진다.
 *
 * 마크다운 원문을 고치는 것과 별개로 **렌더 계층에서 한 번 더 막는다**. 원문만
 * 고치면 다음 글에서 같은 실수가 반복될 때 아무도 모른 채 다시 h1이 두 개가
 * 되기 때문이다. (원문 쪽은 `lint:posts`의 `body-h1` 경고가 알려준다.)
 *
 * 강등은 h1 → h2 **한 단계만**이고 h2 이하는 건드리지 않는다. 문서 전체를 한
 * 칸씩 미는 방식(h2→h3, h3→h4 …)도 생각할 수 있지만, 실제 글들을 보면 본문 h1은
 * 대부분 (a) 제목의 중복이거나 (b) `## 절 제목`과 같은 층위의 절 제목이라
 * 어느 쪽이든 h2가 맞는 자리다. 전체를 밀면 멀쩡한 h2 절들이 h3로 내려가
 * 강조 색(accent)을 잃는 부작용만 남는다.
 *
 * rehype-raw가 살려낸 raw HTML `<h1>`도 같은 경로(tagName 기준 매핑)를 지나므로
 * 함께 강등된다 — 즉 이 매핑을 쓰는 렌더러에서는 본문에 h1이 나올 수 없다.
 */
function DemotedH1({
  node: _node,
  ...props
}: ComponentProps<'h1'> & { node?: unknown }) {
  // rehype-slug가 이미 붙인 id는 props에 실려 그대로 넘어간다 — 목차(TOC)와
  // 앵커 링크가 강등 전후로 동일하게 동작한다.
  return createElement(HEADING_TAG_MAP.h1, props);
}

/**
 * 사이트 본문의 헤딩 매핑. RSS `content:encoded`(feedRenderer.ts)와 **같은
 * 태그 매핑**(@blog/content의 HEADING_TAG_MAP)에서 파생한다 —
 * 한쪽만 적용하면 피드 리더에서만 h1이 살아남아 같은 문제가 남는다.
 */
export const HEADING_COMPONENTS: Pick<Components, 'h1'> = {
  h1: DemotedH1,
};
