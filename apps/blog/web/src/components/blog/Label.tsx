import { css } from '@design-system/ui-lib/css';
import type { ReactNode, HTMLAttributes } from 'react';

interface LabelProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  tone?: 'meta' | 'marker' | 'moss' | 'ink';
}

const toneColor = {
  meta: 'ink.500',
  marker: 'marker.600',
  moss: 'moss.600',
  ink: 'ink.950',
} as const;

export const Label = ({
  children,
  tone = 'meta',
  className,
  ...rest
}: LabelProps) => {
  return (
    <span
      {...rest}
      className={[
        css({
          fontFamily: 'mono',
          fontSize: 'xs',
          fontWeight: 'medium',
          letterSpacing: 'mono',
          textTransform: 'uppercase',
          color: toneColor[tone],
        }),
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
};
