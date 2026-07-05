import type { ReactNode } from 'react';
import { css } from '@design-system/ui-lib/css';

type CalloutType = 'info' | 'tip' | 'warning' | 'danger';

const STYLES: Record<
  CalloutType,
  { wrapper: string; icon: string; label: string }
> = {
  info: {
    wrapper: css({
      bg: 'callout.info.bg',
      borderLeftWidth: '[4px]',
      borderLeftColor: 'callout.info.border',
      color: 'callout.info.text',
    }),
    icon: 'ℹ️',
    label: 'Info',
  },
  tip: {
    wrapper: css({
      bg: 'callout.tip.bg',
      borderLeftWidth: '[4px]',
      borderLeftColor: 'callout.tip.border',
      color: 'callout.tip.text',
    }),
    icon: '💡',
    label: 'Tip',
  },
  warning: {
    wrapper: css({
      bg: 'callout.warn.bg',
      borderLeftWidth: '[4px]',
      borderLeftColor: 'callout.warn.border',
      color: 'callout.warn.text',
    }),
    icon: '⚠️',
    label: 'Warning',
  },
  danger: {
    wrapper: css({
      bg: 'danger.bg',
      borderLeftWidth: '[4px]',
      borderLeftColor: 'danger.border',
      color: 'danger.text',
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
