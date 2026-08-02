import type { ReactNode } from 'react';
import { css } from '@design-system/ui-lib/css';

type CalloutType = 'info' | 'tip' | 'warning' | 'danger';

// 아이콘을 이모지에서 hairline 원형 + 문자 하나로 바꿨다. 이모지는 색을 우리가
// 통제할 수 없어서 "무채색 베이스 + 포인트 1색" 팔레트 밖으로 튀고, 플랫한
// 보더 위계와도 톤이 맞지 않는다. 타입 구분은 글리프가 먼저 하고 색이 거든다.
const STYLES: Record<
  CalloutType,
  { surface: string; badge: string; icon: string; label: string }
> = {
  info: {
    surface: css({
      bg: 'callout.info.bg',
      borderColor: 'callout.info.border',
      color: 'callout.info.text',
    }),
    badge: css({ borderColor: 'callout.info.border' }),
    icon: 'i',
    label: 'Info',
  },
  tip: {
    surface: css({
      bg: 'callout.tip.bg',
      borderColor: 'callout.tip.border',
      color: 'callout.tip.text',
    }),
    badge: css({ borderColor: 'callout.tip.border' }),
    icon: '+',
    label: 'Tip',
  },
  warning: {
    surface: css({
      bg: 'callout.warn.bg',
      borderColor: 'callout.warn.border',
      color: 'callout.warn.text',
    }),
    badge: css({ borderColor: 'callout.warn.border' }),
    icon: '!',
    label: 'Warning',
  },
  danger: {
    surface: css({
      bg: 'danger.bg',
      borderColor: 'danger.border',
      color: 'danger.text',
    }),
    badge: css({ borderColor: 'danger.border' }),
    icon: '×',
    label: 'Danger',
  },
};

const wrapperStyle = css({
  display: 'flex',
  gap: '3',
  alignItems: 'flex-start',
  my: '6',
  px: '4',
  py: '3.5',
  rounded: 'control',
  borderWidth: 'hairline',
});

// 아바타·타임라인 아이콘과 같은 어휘 — hairline 원형에 문자 하나.
// 색은 wrapper에서 상속받고 보더만 타입별로 덧입힌다.
const badgeStyle = css({
  flexShrink: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSize: '5',
  mt: '[1px]',
  rounded: 'full',
  borderWidth: 'hairline',
  fontFamily: 'mono',
  fontSize: 'xs',
  lineHeight: 'flat',
});

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
  const { surface, badge, icon, label } = STYLES[variant];

  return (
    <aside className={`${surface} ${wrapperStyle}`}>
      <span aria-hidden className={`${badge} ${badgeStyle}`}>
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
            fontWeight: 'semibold',
            fontSize: '[13px]',
            lineHeight: 'snug',
            mb: '1',
            letterSpacing: 'tightXs',
          })}
        >
          {title ?? label}
        </div>
        {children}
      </div>
    </aside>
  );
}
