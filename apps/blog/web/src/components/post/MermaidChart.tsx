'use client';

import { useState, useEffect, useId } from 'react';
import mermaid from 'mermaid';
import { css } from '@design-system/ui-lib/css';
import { useTheme } from '@/src/hooks/useTheme';

let renderSeq = 0;

/**
 * mermaid 기본 테마('default'/'dark')는 라벤더 계열이라 리뉴얼 팔레트와 따로 논다.
 * 손으로 그린 `<diagram>` 과 mermaid 그림이 같은 글에 섞이면 색이 두 벌이 되므로,
 * 커스터마이즈용 'base' 테마에 blog-preset 값을 그대로 먹인다.
 *
 * mermaid는 CSS 변수를 못 읽고(SVG를 문자열로 만들어 주입한다) 보더에 알파 색을
 * 쓰면 겹친 도형에서 톤이 어긋나므로, `ink.border` 의 알파를 각 지면 위에 미리
 * 합성한 불투명 값을 쓴다. 팔레트를 바꾸면 여기도 같이 고쳐야 한다.
 */
const MERMAID_VARS = {
  light: {
    background: '#ffffff', // paper.50
    mainBkg: '#f7f7f5', // paper.100 — 노드 채움
    primaryColor: '#f7f7f5',
    primaryTextColor: '#1a1a1a', // ink.950
    primaryBorderColor: '#dedede', // ink.border를 paper.50 위에 합성
    secondaryColor: '#e6f4f7', // accent.50
    secondaryBorderColor: '#0891b2', // accent.500
    tertiaryColor: '#ededea', // paper.200
    tertiaryBorderColor: '#dedede',
    lineColor: '#6b7280', // ink.600
    textColor: '#1a1a1a',
    nodeBorder: '#dedede',
    clusterBkg: '#ededea',
    clusterBorder: '#dedede',
    titleColor: '#1a1a1a',
    edgeLabelBackground: '#ffffff',
  },
  dark: {
    background: '#0b0d10',
    mainBkg: '#14171c',
    primaryColor: '#14171c',
    primaryTextColor: '#e6e8eb',
    primaryBorderColor: '#333941',
    secondaryColor: '#182c31', // accent.50을 paper.50 위에 합성
    secondaryBorderColor: '#67e8f9',
    tertiaryColor: '#1b1f26',
    tertiaryBorderColor: '#333941',
    lineColor: '#8b919a',
    textColor: '#e6e8eb',
    nodeBorder: '#333941',
    clusterBkg: '#1b1f26',
    clusterBorder: '#333941',
    titleColor: '#e6e8eb',
    edgeLabelBackground: '#0b0d10',
  },
} as const;

export function MermaidChart({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>('');
  const id = useId();
  const theme = useTheme();

  useEffect(() => {
    let cancelled = false;
    const themeVariables =
      theme === 'dark' ? MERMAID_VARS.dark : MERMAID_VARS.light;

    const renderChart = async () => {
      try {
        // mermaid는 테마를 전역 config로 캐시하므로, 테마가 바뀌면 render 전에
        // 다시 initialize해야 새 색상으로 그려진다. initialize/render 모두
        // effect 안에서만 호출하므로 SSR(window 없음)에서 실행되지 않는다.
        mermaid.initialize({
          startOnLoad: false,
          // 'base' 만이 themeVariables를 받는다 — 'default'/'dark'는 자기 팔레트를 고집한다.
          theme: 'base',
          themeVariables: {
            ...themeVariables,
            fontFamily:
              '"Pretendard Variable", Pretendard, -apple-system, system-ui, sans-serif',
            fontSize: '14px',
          },
          // 'strict' = HTML 허용, JS·이벤트 핸들러 차단. Mermaid가 내부적으로
          // DOMPurify를 돌리고, 입력도 작성자 신뢰 마크다운만이라 추가 sanitize 불필요.
          securityLevel: 'strict',
        });
        // useId 값(:r0: 등)에서 셀렉터 부적합 문자를 제거하고, 매 렌더마다
        // 고유하도록 카운터를 덧붙인다.
        renderSeq += 1;
        const renderId = `mermaid-${id.replace(/[^a-zA-Z0-9-_]/g, '')}-${renderSeq}`;
        const rendered = await mermaid.render(renderId, chart);
        if (cancelled) return;
        setSvg(rendered.svg);
      } catch (error) {
        console.error('Mermaid render failed:', error);
      }
    };
    renderChart();
    return () => {
      cancelled = true;
    };
  }, [chart, id, theme]);

  return (
    <div
      className={css({
        my: '10',
        p: '6',
        bg: 'paper.100',
        rounded: 'card',
        borderWidth: 'hairline',
        borderColor: 'ink.border',
        display: 'flex',
        justifyContent: 'center',
        overflow: 'auto',
        transition: '[all 0.3s]',
        // hover 강조도 그림자·들어올리기가 아니라 보더 톤으로만 준다(플랫 유지).
        _hover: {
          borderColor: 'ink.borderStrong',
          bg: 'paper.50',
        },
      })}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
