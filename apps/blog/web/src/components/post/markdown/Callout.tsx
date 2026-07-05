import type { ReactNode } from 'react';
import { css } from '@design-system/ui-lib/css';

type CalloutType = 'info' | 'tip' | 'warning' | 'danger';

const STYLES: Record<
  CalloutType,
  { wrapper: string; icon: string; label: string }
> = {
  info: {
    wrapper: css({
      bg: '[rgba(56,139,253,0.1)]',
      borderLeftWidth: '[4px]',
      borderLeftColor: '[#1f6feb]',
      color: '[#79c0ff]',
    }),
    icon: 'ℹ️',
    label: 'Info',
  },
  tip: {
    wrapper: css({
      bg: '[rgba(63,185,80,0.1)]',
      borderLeftWidth: '[4px]',
      borderLeftColor: '[#238636]',
      color: 'moss.600',
    }),
    icon: '💡',
    label: 'Tip',
  },
  warning: {
    wrapper: css({
      bg: '[rgba(210,153,34,0.1)]',
      borderLeftWidth: '[4px]',
      borderLeftColor: '[#9e6a03]',
      color: 'marker.600',
    }),
    icon: '⚠️',
    label: 'Warning',
  },
  danger: {
    wrapper: css({
      bg: '[rgba(248,81,73,0.1)]',
      borderLeftWidth: '[4px]',
      borderLeftColor: '[#da3633]',
      color: '[#f85149]',
    }),
    icon: '🚨',
    label: 'Danger',
  },
};

function isCalloutType(value: unknown): value is CalloutType {
  return (
    typeof value === 'string' &&
    (value === 'info' ||
      value === 'tip' ||
      value === 'warning' ||
      value === 'danger')
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
      <span
        aria-hidden
        className={css({ fontSize: 'lg', lineHeight: 'headerSm' })}
      >
        {icon}
      </span>
      <div
        className={css({
          flex: '1',
          minW: '0',
          '& > *:last-child': { mb: '0' },
        })}
      >
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
