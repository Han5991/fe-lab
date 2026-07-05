import { css } from '@design-system/ui-lib/css';
import type { ReactNode } from 'react';

interface MarkerTextProps {
  children: ReactNode;
}

export const MarkerText = ({ children }: MarkerTextProps) => (
  <span
    className={css({
      backgroundImage:
        '[linear-gradient(180deg, transparent 55%, rgba(210,153,34,0.40) 55%, rgba(210,153,34,0.40) 92%, transparent 92%)]',
      px: '0.5',
    })}
  >
    {children}
  </span>
);
