import type { ReactNode } from 'react';
import { css } from '@design-system/ui-lib/css';

type CalloutType = 'info' | 'tip' | 'warning' | 'danger';

const STYLES: Record<
  CalloutType,
  { wrapper: string; icon: string; label: string }
> = {
  info: {
    wrapper: css({
      bg: 'blue.50',
      borderLeftWidth: '[4px]',
      borderLeftColor: 'blue.400',
      color: 'blue.900',
    }),
    icon: 'ℹ️',
    label: 'Info',
  },
  tip: {
    wrapper: css({
      bg: 'green.50',
      borderLeftWidth: '[4px]',
      borderLeftColor: 'green.500',
      color: 'green.900',
    }),
    icon: '💡',
    label: 'Tip',
  },
  warning: {
    wrapper: css({
      bg: 'amber.50',
      borderLeftWidth: '[4px]',
      borderLeftColor: 'amber.500',
      color: 'amber.900',
    }),
    icon: '⚠️',
    label: 'Warning',
  },
  danger: {
    wrapper: css({
      bg: 'red.50',
      borderLeftWidth: '[4px]',
      borderLeftColor: 'red.500',
      color: 'red.900',
    }),
    icon: '🚨',
    label: 'Danger',
  },
};

function isCalloutType(value: unknown): value is CalloutType {
  return (
    typeof value === 'string' &&
    (value === 'info' || value === 'tip' || value === 'warning' || value === 'danger')
  );
}

interface CalloutProps {
  type?: string;
  title?: string;
  children?: ReactNode;
}

export function Callout({ type, title, children }: CalloutProps) {
  const variant = isCalloutType(type) ? type : 'info';
  const { wrapper, icon, label } = STYLES[variant];

  return (
    <aside
      className={`${wrapper} ${css({
        rounded: 'md',
        my: '6',
        px: '5',
        py: '4',
        display: 'flex',
        gap: '3',
        alignItems: 'flex-start',
      })}`}
    >
      <span aria-hidden className={css({ fontSize: 'lg', lineHeight: 'headerSm' })}>
        {icon}
      </span>
      <div className={css({ flex: '1', minW: '0', '& > *:last-child': { mb: '0' } })}>
        <div
          className={css({
            fontWeight: 'bold',
            fontSize: 'sm',
            mb: '1',
            letterSpacing: 'wide',
          })}
        >
          {title ?? label}
        </div>
        {children}
      </div>
    </aside>
  );
}
