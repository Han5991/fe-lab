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
        '& img': {
          mx: 'auto',
          mb: '0',
        },
        '& figcaption': {
          mt: '3',
          fontSize: 'sm',
          color: 'ink.500',
          fontStyle: 'italic',
        },
      })}
    >
      {children}
    </figure>
  );
}
