'use client';

import { useState, useEffect, useId } from 'react';
import mermaid from 'mermaid';
import { css } from '@design-system/ui-lib/css';

// Mermaid Initialization (once per module)
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: true,
    // 'strict' = HTML 허용, JS·이벤트 핸들러 차단. Mermaid가 내부적으로
    // DOMPurify를 돌리고, 입력도 작성자 신뢰 마크다운만이라 추가 sanitize 불필요.
    securityLevel: 'strict',
  });
}

export function MermaidChart({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>('');
  const id = useId();

  useEffect(() => {
    let cancelled = false;
    const renderChart = async () => {
      try {
        const rendered = await mermaid.render(`mermaid-${id}`, chart);
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
  }, [chart, id]);

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
