'use client';

import { useState, useEffect } from 'react';
import mermaid from 'mermaid';
import { css } from '@design-system/ui-lib/css';

// Mermaid Initialization (once per module)
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: true,
    securityLevel: 'strict',
  });
}

export function MermaidChart({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    const renderChart = async () => {
      try {
        const rendered = await mermaid.render(
          `mermaid-${Math.random().toString(36).substr(2, 9)}`,
          chart,
        );
        setSvg(rendered.svg);
      } catch (error) {
        console.error('Mermaid render failed:', error);
      }
    };
    renderChart();
  }, [chart]);

  return (
    <div
      className={css({
        my: '10',
        p: '6',
        bg: 'gray.50/50',
        rounded: '2xl',
        borderWidth: '1px',
        borderColor: 'gray.100',
        display: 'flex',
        justifyContent: 'center',
        overflow: 'auto',
        transition: 'all 0.3s',
        _hover: { shadow: 'xl', transform: 'translateY(-2px)', bg: 'white' },
      })}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
