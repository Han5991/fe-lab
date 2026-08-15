import type { ReactNode } from 'react';
import { css, sva } from '@design-system/ui-lib/css';
import type { RecipeVariant } from '@design-system/ui-lib/css';

const callout = sva({
  slots: ['surface', 'badge'],
  base: {
    surface: {
      display: 'flex',
      gap: '3',
      alignItems: 'flex-start',
      my: '6',
      px: '4',
      py: '3.5',
      rounded: 'control',
      borderWidth: 'hairline',
    },
    // 아바타·타임라인 아이콘과 같은 어휘 — hairline 원형에 문자 하나.
    // 색은 wrapper에서 상속받고 보더만 타입별로 덧입힌다.
    badge: {
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
    },
  },
  variants: {
    type: {
      info: {
        surface: {
          bg: 'callout.info.bg',
          borderColor: 'callout.info.border',
          color: 'callout.info.text',
        },
        badge: { borderColor: 'callout.info.border' },
      },
      tip: {
        surface: {
          bg: 'callout.tip.bg',
          borderColor: 'callout.tip.border',
          color: 'callout.tip.text',
        },
        badge: { borderColor: 'callout.tip.border' },
      },
      warning: {
        surface: {
          bg: 'callout.warn.bg',
          borderColor: 'callout.warn.border',
          color: 'callout.warn.text',
        },
        badge: { borderColor: 'callout.warn.border' },
      },
      danger: {
        surface: {
          bg: 'danger.bg',
          borderColor: 'danger.border',
          color: 'danger.text',
        },
        badge: { borderColor: 'danger.border' },
      },
    },
  },
  defaultVariants: { type: 'info' },
});

type CalloutType = RecipeVariant<typeof callout>['type'];

// 아이콘을 이모지에서 hairline 원형 + 문자 하나로 바꿨다. 이모지는 색을 우리가
// 통제할 수 없어서 "무채색 베이스 + 포인트 1색" 팔레트 밖으로 튀고, 플랫한
// 보더 위계와도 톤이 맞지 않는다. 타입 구분은 글리프가 먼저 하고 색이 거든다.
const GLYPHS: Record<CalloutType, { icon: string; label: string }> = {
  info: { icon: 'i', label: 'Info' },
  tip: { icon: '+', label: 'Tip' },
  warning: { icon: '!', label: 'Warning' },
  danger: { icon: '×', label: 'Danger' },
};

const calloutTypes: readonly string[] = callout.variantMap.type;

function isCalloutType(value: unknown): value is CalloutType {
  return typeof value === 'string' && calloutTypes.includes(value);
}

interface CalloutProps {
  type?: string;
  title?: string;
  children?: ReactNode;
}

export function Callout({ type, title, children }: CalloutProps) {
  const variant = isCalloutType(type) ? type : 'info';
  const { surface, badge } = callout({ type: variant });
  const { icon, label } = GLYPHS[variant];

  return (
    <aside className={surface}>
      <span aria-hidden className={badge}>
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
