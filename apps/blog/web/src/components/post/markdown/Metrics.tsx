import type { ReactNode } from 'react';
import { css, cva } from '@design-system/ui-lib/css';
import type { RecipeVariant } from '@design-system/ui-lib/css';

import {
  isOptionalString,
  markdownChildren,
  optionalString,
  parseItemsProp,
} from './signatureProps';

/**
 * `<metrics>` / `<metric>` — before/after 성과 수치 카드.
 *
 * 두 가지로 쓸 수 있다. 저자가 편한 쪽을 고르면 된다.
 *
 * ```html
 * <metrics items='[{"label":"배포 소요","value":"22분 → 8분"}]'></metrics>
 *
 * <metrics>
 * <metric label="다운타임" value="0초"></metric>
 * <metric label="롤백" value="자동" tone="success"></metric>
 * </metrics>
 * ```
 */

interface MetricItem {
  label?: string | undefined;
  value?: string | undefined;
  /** 문서상 값은 'default' | 'success'. raw HTML은 임의 문자열이 올 수 있어 넓게 받는다. */
  tone?: string | undefined;
}

function isMetricItem(candidate: unknown): candidate is MetricItem {
  if (typeof candidate !== 'object' || candidate === null) return false;
  const { label, value, tone } = candidate as MetricItem;
  // 읽는 필드는 전부 "없거나 문자열"이어야 한다. 하나라도 객체/배열이면 그대로
  // JSX 자식이 되어 React가 throw한다(`isOptionalString` 주석 참고).
  if (
    !isOptionalString(label) ||
    !isOptionalString(value) ||
    !isOptionalString(tone)
  ) {
    return false;
  }
  // 라벨·값이 둘 다 없으면 빈 카드다 — 그릴 이유가 없다.
  return (
    optionalString(label) !== undefined || optionalString(value) !== undefined
  );
}

// 열 수는 아이템 개수에서 나온다. Panda는 정적 추출이라 런타임 값으로는 CSS를
// 만들 수 없지만, cva는 1~4열 variant 전부를 빌드 타임에 만들어 두고 선택만
// 런타임에 하므로 개수로 고를 수 있다.
// 모바일에서 3~4열은 값이 잘려 읽히지 않으므로 2열로 접는다(레퍼런스는 데스크톱만 정의).
const grid = cva({
  base: {
    display: 'grid',
    gap: '3',
    mt: '[18px]',
    mb: '6',
    fontFamily: 'sans',
  },
  variants: {
    columns: {
      1: { gridTemplateColumns: '[minmax(0, 1fr)]' },
      2: { gridTemplateColumns: '[repeat(2, minmax(0, 1fr))]' },
      3: {
        gridTemplateColumns: {
          base: '[repeat(2, minmax(0, 1fr))]',
          md: '[repeat(3, minmax(0, 1fr))]',
        },
      },
      4: {
        gridTemplateColumns: {
          base: '[repeat(2, minmax(0, 1fr))]',
          md: '[repeat(4, minmax(0, 1fr))]',
        },
      },
    },
  },
  defaultVariants: { columns: 1 },
});

// RecipeVariant의 variant prop은 optional이라 undefined가 유니언에 남는다.
// 여기서는 언제나 값을 정하므로 걷어낸다(Callout의 CalloutType과 같은 이유).
type GridColumns = NonNullable<RecipeVariant<typeof grid>['columns']>;

/**
 * 항목 수를 열 수로 자른다 — 1열 미만·4열 초과는 레이아웃이 망가진다
 * (핸드오프 §6 "2~4열 그리드").
 *
 * `Math.min(Math.max(count, 1), 4)`로 계산하면 결과가 `number`라 레시피에 넘길
 * 때 캐스트가 필요했다. 클램프가 1~4만 낸다는 것은 사람만 알고 타입은 모르기
 * 때문이다.
 *
 * 분기로 적으면 반환값마다 컴파일러가 확인한다. 잡히는 건 **레시피에서 열이
 * 사라지는 쪽**이다 — 예를 들어 4열 variant를 지우면 `return 4`가 TS2322로
 * 걸린다(캐스트 버전은 `number`를 좁은 유니언으로 단언하는 것이라 그대로
 * 통과하고, 없는 클래스를 런타임에 요구하게 된다). 반대로 5열이 **생기는**
 * 것은 잡히지 않는다. 유니언이 넓어질 뿐이라 1~4는 여전히 유효해서다 —
 * 열을 늘릴 때는 이 함수도 함께 고쳐야 한다.
 */
function clampColumns(count: number): GridColumns {
  if (count <= 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

const card = css({
  bg: 'paper.100',
  rounded: 'control',
  px: '4',
  py: '[14px]',
  minW: '0',
});

const cardLabel = css({
  fontSize: '[12px]',
  lineHeight: 'relaxed',
  color: 'ink.600',
  mb: '1.5',
});

const cardValue = cva({
  base: {
    // "측정하는 엔지니어" 무드 — 수치는 반드시 모노스페이스(핸드오프 §3).
    fontFamily: 'mono',
    fontSize: '[19px]',
    fontWeight: 'medium',
    lineHeight: 'tight',
    wordBreak: 'break-word',
    // 본문 스타일(`& p { margin-bottom }`)이 카드 안까지 내려오므로 마지막 블록만 끈다.
    '& > *:last-child': { mb: '0' },
  },
  variants: {
    tone: {
      default: { color: 'ink.950' },
      // success 값은 moss.700 — moss.600은 라이트 모드에서 3.6:1로 AA 미달(스펙 §3).
      success: { color: 'moss.700' },
    },
  },
  defaultVariants: { tone: 'default' },
});

interface MetricProps {
  label?: string | undefined;
  value?: string | undefined;
  tone?: string | undefined;
  children?: ReactNode;
}

export function Metric({ label, value, tone, children }: MetricProps) {
  const resolvedTone = tone === 'success' ? 'success' : 'default';

  return (
    <div className={card}>
      <div className={cardLabel}>{label}</div>
      <div
        data-tone={resolvedTone}
        className={cardValue({ tone: resolvedTone })}
      >
        {value ?? children}
      </div>
    </div>
  );
}

interface MetricsProps {
  /** JSON 문자열(raw HTML)과 배열(JSX)을 모두 받는다. */
  items?: string | MetricItem[];
  children?: ReactNode;
}

export function Metrics({ items, children }: MetricsProps) {
  const parsed = parseItemsProp(items, isMetricItem);
  const fallback = parsed ? null : markdownChildren(children);
  const columns = clampColumns(parsed?.length ?? fallback?.length ?? 0);

  return (
    <div className={grid({ columns })}>
      {parsed
        ? parsed.map((item, index) => (
            <Metric
              key={index}
              label={item.label}
              value={item.value}
              tone={item.tone}
            />
          ))
        : fallback}
    </div>
  );
}
