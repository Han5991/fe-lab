'use client';

import type { ReactNode } from 'react';
import type { TooltipContentProps } from 'recharts';
import { css } from '@blog/styled-system/css';

interface ChartTooltipFrameProps {
  /**
   * Recharts가 `content`에 넘기는 `accessibilityLayer` 그대로(Cartesian 차트는 기본 true).
   * 켜져 있으면 Recharts 기본 툴팁처럼 `role="status"`·`aria-live="assertive"`를 달아,
   * 키보드로 차트를 훑을 때 스크린리더가 값을 읽는다. 필수인 이유: 선택이면 넘기는 걸 잊은
   * 툴팁에서 알림이 말없이 사라진다.
   */
  accessibilityLayer: boolean;
  children: ReactNode;
}

/**
 * admin 차트 툴팁의 표면 — 모든 차트 툴팁이 이 상자 하나를 쓴다.
 *
 * Recharts가 툴팁을 차트 위에 absolute로 띄우고 포인터가 떠나면 지우므로 떠 있는
 * 표면이고, 그래서 overlay.med를 쓴다(AGENTS.md §9). 단계·보더·라운드·패딩은 Astryx
 * ChartTooltip과 같다. 예전엔 차트마다 Recharts `contentStyle`에 `token()` 문자열과
 * 원시 그림자를 인라인으로 넣었는데, 인라인 style은 Panda 추출 밖이라 strictTokens도
 * prefer-token도 보지 못했다. Panda 클래스로 그려야 토큰 검사가 닿는다.
 */
export function ChartTooltipFrame({
  accessibilityLayer,
  children,
}: ChartTooltipFrameProps) {
  return (
    <div
      role={accessibilityLayer ? 'status' : undefined}
      aria-live={accessibilityLayer ? 'assertive' : undefined}
      className={css({
        bg: 'ink.25',
        color: 'ink.900',
        px: '3',
        py: '2',
        rounded: 'container',
        borderWidth: 'hairline',
        borderColor: 'ink.border',
        boxShadow: 'overlay.med',
        fontSize: '[12px]',
        whiteSpace: 'nowrap',
      })}
    >
      {children}
    </div>
  );
}

/**
 * Recharts 기본 툴팁 내용(라벨 한 줄 + 계열마다 `이름 : 값`)을 위 표면에 그린다.
 *
 * `<Tooltip content={ChartTooltip} />`처럼 **함수로** 넘긴다 — Recharts가 이 컴포넌트를
 * `TooltipContentProps`로 만들므로 active·payload·label이 타입으로 맞물린다. 요소
 * (`content={<ChartTooltip />}`)로 넘기면 cloneElement가 props를 채워 넣어 검사되지 않는다.
 *
 * **기본 툴팁의 서식 옵션은 읽지 않는다** — `<Tooltip>`·계열의 `formatter`·`labelFormatter`·
 * `itemSorter`·`separator`·`unit`은 타입 검사는 통과하지만 여기서 무시된다. 쓰는 차트가 없어
 * 옮기지 않았다. 값 서식이 필요하면 TimeSeriesChart처럼 내용을 직접 그리는 컴포넌트를
 * ChartTooltipFrame 위에 따로 둔다.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  accessibilityLayer,
}: TooltipContentProps) {
  if (!active || payload.length === 0) return null;
  return (
    <ChartTooltipFrame accessibilityLayer={accessibilityLayer}>
      <p className={css({ color: 'ink.600', mb: '0.5' })}>{label}</p>
      <ul>
        {payload.map(entry => (
          <li
            key={entry.graphicalItemId}
            className={css({ color: 'ink.800', py: '1' })}
          >
            {entry.name} : {entry.value}
          </li>
        ))}
      </ul>
    </ChartTooltipFrame>
  );
}
