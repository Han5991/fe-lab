import type { ReactNode } from 'react';
import { css } from '@design-system/ui-lib/css';

interface FigureProps {
  children?: ReactNode;
}

export function Figure({ children }: FigureProps) {
  return (
    <figure
      className={css({
        my: '8',
        textAlign: 'center',
        // 자손 셀렉터(0,1,1)라 MarkdownImage의 여백(0,1,0)을 덮어 캡션과 붙는다.
        '& img': {
          mx: 'auto',
          mt: '0',
          mb: '0',
          rounded: 'control',
          borderWidth: 'hairline',
          borderColor: 'ink.border',
        },
        // 캡션은 날짜·수치와 같은 "메타" 계열이라 모노 12px.
        '& figcaption': {
          mt: '3',
          fontFamily: 'mono',
          fontSize: '[12px]',
          lineHeight: 'relaxed',
          color: 'ink.500',
        },
      })}
    >
      {children}
    </figure>
  );
}
