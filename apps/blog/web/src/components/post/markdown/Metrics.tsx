import type { ReactNode } from 'react';
import { css } from '@design-system/ui-lib/css';

import {
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

export interface MetricItem {
  label?: string;
  value?: string;
  /** 문서상 값은 'default' | 'success'. raw HTML은 임의 문자열이 올 수 있어 넓게 받는다. */
  tone?: string;
}

function isMetricItem(candidate: unknown): candidate is MetricItem {
  if (typeof candidate !== 'object' || candidate === null) return false;
  const { label, value } = candidate as MetricItem;
  // 라벨·값이 둘 다 없으면 빈 카드다 — 그릴 이유가 없다.
  return (
    optionalString(label) !== undefined || optionalString(value) !== undefined
  );
}

// 열 수는 아이템 개수에서 나오지만 Panda는 정적 추출이라 템플릿 문자열로 조립하면
// CSS가 생성되지 않는다. 그래서 1~4열을 미리 만들어 두고 골라 쓴다.
// 모바일에서 3~4열은 값이 잘려 읽히지 않으므로 2열로 접는다(레퍼런스는 데스크톱만 정의).
const COLUMN_STYLES: Record<number, string> = {
  1: css({ gridTemplateColumns: '[minmax(0, 1fr)]' }),
  2: css({ gridTemplateColumns: '[repeat(2, minmax(0, 1fr))]' }),
  3: css({
    gridTemplateColumns: {
      base: '[repeat(2, minmax(0, 1fr))]',
      md: '[repeat(3, minmax(0, 1fr))]',
    },
  }),
  4: css({
    gridTemplateColumns: {
      base: '[repeat(2, minmax(0, 1fr))]',
      md: '[repeat(4, minmax(0, 1fr))]',
    },
  }),
};

const grid = css({
  display: 'grid',
  gap: '3',
  mt: '[18px]',
  mb: '6',
  fontFamily: 'sans',
});

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

const cardValue = css({
  // "측정하는 엔지니어" 무드 — 수치는 반드시 모노스페이스(핸드오프 §3).
  fontFamily: 'mono',
  fontSize: '[19px]',
  fontWeight: 'medium',
  lineHeight: 'tight',
  wordBreak: 'break-word',
  // 본문 스타일(`& p { margin-bottom }`)이 카드 안까지 내려오므로 마지막 블록만 끈다.
  '& > *:last-child': { mb: '0' },
});

// success 값은 moss.700 — moss.600은 라이트 모드에서 3.6:1로 AA 미달(스펙 §3).
const cardValueSuccess = css({ color: 'moss.700' });
const cardValueDefault = css({ color: 'ink.950' });

interface MetricProps {
  label?: string;
  value?: string;
  tone?: string;
  children?: ReactNode;
}

export function Metric({ label, value, tone, children }: MetricProps) {
  const toneStyle = tone === 'success' ? cardValueSuccess : cardValueDefault;

  return (
    <div className={card}>
      <div className={cardLabel}>{label}</div>
      <div
        data-tone={tone === 'success' ? 'success' : 'default'}
        className={`${cardValue} ${toneStyle}`}
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
  // 1열 미만·4열 초과는 레이아웃이 망가지므로 잘라낸다(핸드오프 §6 "2~4열 그리드").
  const count = parsed?.length ?? fallback?.length ?? 0;
  const columns = Math.min(Math.max(count, 1), 4);

  return (
    <div className={`${grid} ${COLUMN_STYLES[columns]}`}>
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
