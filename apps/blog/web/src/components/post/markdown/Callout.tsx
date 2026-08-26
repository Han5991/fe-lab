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

// RecipeVariant의 variant prop은 optional이라 exactOptionalPropertyTypes에서는
// undefined가 유니언에 남는다 — Record 키로 쓰는 여기서는 걷어낸다.
type CalloutType = NonNullable<RecipeVariant<typeof callout>['type']>;

// 아이콘을 이모지에서 hairline 원형 + 문자 하나로 바꿨다. 이모지는 색을 우리가
// 통제할 수 없어서 "무채색 베이스 + 포인트 1색" 팔레트 밖으로 튀고, 플랫한
// 보더 위계와도 톤이 맞지 않는다. 타입 구분은 글리프가 먼저 하고 색이 거든다.
//
// 주석이 아니라 `satisfies`로 계약을 건다 — 레시피가 variant를 얻거나 잃으면
// 키 누락·초과로 여기서 컴파일 에러가 나는 건 같고(그게 아래 판정이 기대는
// 성질이다), 대신 값이 `string`으로 넓어지지 않고 리터럴로 남는다.
const GLYPHS = {
  info: { icon: 'i', label: 'Info' },
  tip: { icon: '+', label: 'Tip' },
  warning: { icon: '!', label: 'Warning' },
  danger: { icon: '×', label: 'Danger' },
} as const satisfies Record<CalloutType, { icon: string; label: string }>;

/**
 * 원문 frontmatter/속성에서 온 값이 아는 타입인가.
 *
 * 판정은 `GLYPHS`의 키로 한다 — 그 레코드가 `Record<CalloutType, …>`라 레시피에
 * variant를 더하면 여기가 아니라 **GLYPHS가 컴파일 에러**를 내고, 그러면 판정도
 * 자동으로 따라온다. 예전에는 `callout.variantMap.type`을 `readonly string[]`로
 * **넓혀서** 봤다. `Array<CalloutType>.includes(value: string)`이 인자 타입 불일치로
 * 거부되기 때문인데, 그 한 줄 때문에 좁은 타입을 버리고 Panda 런타임 내부
 * (`variantMap`)에까지 기대고 있었다.
 */
function isCalloutType(value: unknown): value is CalloutType {
  return typeof value === 'string' && Object.hasOwn(GLYPHS, value);
}

interface CalloutProps {
  /**
   * **`CalloutType`이 아니라 `string`이다.** 이 컴포넌트는 react-markdown의
   * 컴포넌트 맵(`callout: Callout`)에 등록돼 원문의 raw HTML 속성을 그대로
   * 받는다 — 런타임 값은 언제나 문자열이고 오타·미지원 타입이 올 수 있는데,
   * 그 맵의 타입은 느슨해서 호출 지점에서는 아무것도 막히지 않는다. 좁혀
   * 적으면 실제 방어는 그대로인 채 아래 `isCalloutType`과 info 폴백만 죽은
   * 코드처럼 보이고, 임의 문자열을 넣는 테스트가 컴파일에서 막힌다.
   */
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
