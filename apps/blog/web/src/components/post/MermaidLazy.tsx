'use client';

import dynamic from 'next/dynamic';
import { css } from '@design-system/ui-lib/css';

// MermaidChart 내부 컨테이너와 같은 박스 — placeholder와 실제 도표의 자리가
// 어긋나지 않게 여기서도 동일한 여백/테두리를 쓴다. 값을 한쪽만 고치면 청크가
// 도착하는 순간 레이아웃이 튀므로, 동일성은 CodeBlock.test.tsx가 못박는다.
// (한 상수로 합치지 않는 이유: 이 파일이 MermaidChart 모듈을 정적으로 참조하는
//  순간 아래 dynamic import가 무의미해져 mermaid 청크가 초기 로드로 돌아온다.)
export const mermaidBoxStyle = css({
  my: '10',
  p: '6',
  minH: '[120px]',
  bg: 'paper.100',
  rounded: 'card',
  borderWidth: 'hairline',
  borderColor: 'ink.border',
});

// mermaid는 d3·dagre까지 끌고 와 raw 1.1MB(gzip 360KB)짜리 청크가 된다.
// 정적 import면 CodeBlock을 쓰는 모든 글 — 즉 mermaid 다이어그램이 하나도
// 없는 글까지 — 이 청크를 초기 로드에 포함한다(71편 중 mermaid를 쓰는 건 6편).
// `language === 'mermaid'` 분기에 도달할 때만 받아오도록 분리한다.
// MermaidChart는 원래도 useEffect 안에서만 렌더하므로 ssr: false로 잃는 건 없다.
//
// `ssr: false`는 클라이언트 컴포넌트에서만 허용되므로 이 래퍼가 'use client'를
// 지고, 서버 컴포넌트(CodeBlock)는 이 래퍼만 참조한다.
export const MermaidLazy = dynamic(
  () => import('./MermaidChart').then(m => m.MermaidChart),
  {
    ssr: false,
    // 청크를 받는 동안 도표 자리를 잡아둬 레이아웃 시프트를 막는다.
    loading: () => <div className={mermaidBoxStyle} />,
  },
);
