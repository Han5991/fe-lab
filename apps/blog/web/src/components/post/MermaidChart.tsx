'use client';

import { useState, useEffect, useId } from 'react';
import mermaid from 'mermaid';
import { css } from '@design-system/ui-lib/css';
import { useTheme } from '@/src/hooks/useTheme';

let renderSeq = 0;

export function MermaidChart({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>('');
  const id = useId();
  const theme = useTheme();

  useEffect(() => {
    let cancelled = false;
    // 앱 테마 → mermaid 테마 매핑 (mermaid의 라이트 테마 이름은 'default').
    const mermaidTheme = theme === 'dark' ? 'dark' : 'default';

    const renderChart = async () => {
      try {
        // mermaid는 테마를 전역 config로 캐시하므로, 테마가 바뀌면 render 전에
        // 다시 initialize해야 새 색상으로 그려진다. initialize/render 모두
        // effect 안에서만 호출하므로 SSR(window 없음)에서 실행되지 않는다.
        mermaid.initialize({
          startOnLoad: false,
          theme: mermaidTheme,
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
        rounded: '2xl',
        borderWidth: '[1px]',
        borderColor: 'ink.border',
        display: 'flex',
        justifyContent: 'center',
        overflow: 'auto',
        transition: '[all 0.3s]',
        _hover: {
          shadow: 'xl',
          transform: '[translateY(-2px)]',
          bg: 'paper.50',
        },
      })}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
