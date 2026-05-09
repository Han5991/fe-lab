import { css } from '@design-system/ui-lib/css';
import type { ReactNode } from 'react';

interface MarkerTextProps {
  children: ReactNode;
}

export const MarkerText = ({ children }: MarkerTextProps) => (
  <span
    className={css({
      backgroundImage:
        '[linear-gradient(180deg, transparent 55%, token(colors.marker.300) 55%, token(colors.marker.300) 92%, transparent 92%)]',
      px: '0.5',
    })}
  >
    {children}
  </span>
);
