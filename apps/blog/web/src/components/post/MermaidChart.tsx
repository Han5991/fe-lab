'use client';

import { useState, useEffect, useId } from 'react';
import mermaid from 'mermaid';
import DOMPurify from 'dompurify';
import { css } from '@design-system/ui-lib/css';

// Mermaid Initialization (once per module)
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: true,
    // 'strict' = HTML 허용, JS·이벤트 핸들러 차단. 작성자 신뢰 마크다운만 받지만
    // 추가 방어선으로 dangerouslySetInnerHTML 직전에도 DOMPurify를 한 번 더 통과시킵니다.
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
        // 이중 sanitize: Mermaid 자체 필터 + 명시적 DOMPurify SVG 프로파일.
        const safe = DOMPurify.sanitize(rendered.svg, {
          USE_PROFILES: { svg: true, svgFilters: true },
        });
        setSvg(safe);
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
