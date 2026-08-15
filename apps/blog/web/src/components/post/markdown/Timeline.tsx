import { cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { css, cva } from '@design-system/ui-lib/css';

import {
  isOptionalString,
  markdownChildren,
  optionalString,
  parseItemsProp,
} from './signatureProps';

/**
 * `<timeline>` / `<step>` — "시도1 실패 → 시도2 실패 → 시도3 성공" 서사.
 *
 * ```html
 * <timeline steps='[{"title":"시도 1 · pm2 롤링 재시작","desc":"전환 순간 504","result":"fail"}]'></timeline>
 *
 * <timeline>
 * <step title="시도 3 · CodeDeploy blue/green" desc="실패 시 자동 롤백" result="success"></step>
 * </timeline>
 * ```
 */

interface TimelineStep {
  title?: string;
  desc?: string;
  /** 문서상 값은 'fail' | 'success'. raw HTML은 임의 문자열이 올 수 있어 넓게 받는다. */
  result?: string;
}

function isTimelineStep(candidate: unknown): candidate is TimelineStep {
  if (typeof candidate !== 'object' || candidate === null) return false;
  const { title, desc, result } = candidate as TimelineStep;
  // 읽는 필드는 전부 "없거나 문자열"이어야 한다. 하나라도 객체/배열이면 그대로
  // JSX 자식이 되어 React가 throw한다(`isOptionalString` 주석 참고).
  if (
    !isOptionalString(title) ||
    !isOptionalString(desc) ||
    !isOptionalString(result)
  ) {
    return false;
  }
  return (
    optionalString(title) !== undefined || optionalString(desc) !== undefined
  );
}

const stepRow = css({
  display: 'flex',
  gap: '3',
  alignItems: 'flex-start',
  fontFamily: 'sans',
});

const railColumn = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  flexShrink: '0',
});

const icon = cva({
  base: {
    boxSize: '6',
    rounded: 'pill',
    borderWidth: 'hairline',
    borderStyle: 'solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '[13px]',
    lineHeight: 'flat',
  },
  variants: {
    result: {
      fail: { borderColor: 'danger.border', color: 'danger.text' },
      // 성공 아이콘은 테두리 moss.600 / 글자 moss.700 — 글자만 AA를 위해 한 톤 낮춘다(스펙 §3).
      success: { borderColor: 'moss.600', color: 'moss.700' },
    },
  },
  defaultVariants: { result: 'fail' },
});

const rail = css({
  w: '[1px]',
  h: '[34px]',
  bg: 'ink.border',
});

const stepBody = cva({
  base: {
    minW: '0',
    '& > *:last-child': { mb: '0' },
  },
  variants: {
    last: {
      true: {},
      // 마지막이 아닌 스텝만 아래 여백을 갖는다(연결선 길이와 짝).
      false: { pb: '3' },
    },
  },
  defaultVariants: { last: true },
});

const stepTitle = css({
  fontSize: '[13px]',
  fontWeight: 'semibold',
  lineHeight: 'relaxed',
  color: 'ink.950',
  my: '0.5',
});

const stepDesc = css({
  fontSize: '[12px]',
  lineHeight: 'relaxed',
  color: 'ink.600',
});

interface StepProps {
  title?: string;
  desc?: string;
  result?: string;
  children?: ReactNode;
  /**
   * 마지막 스텝이면 아이콘 아래 연결선을 그리지 않는다. Timeline이 주입하며,
   * 단독으로 쓰면 선이 허공에 뜨지 않도록 true가 기본이다.
   */
  isLast?: boolean;
}

export function Step({
  title,
  desc,
  result,
  children,
  isLast = true,
}: StepProps) {
  // 실패가 기본값이다 — 이 컴포넌트의 서사는 "실패를 쌓다가 마지막에 성공"이라,
  // result를 빠뜨린 스텝을 성공으로 그리면 글의 의미가 뒤집힌다.
  const succeeded = result === 'success';

  return (
    <div data-result={succeeded ? 'success' : 'fail'} className={stepRow}>
      <div className={railColumn}>
        <span
          role="img"
          aria-label={succeeded ? '성공' : '실패'}
          className={icon({ result: succeeded ? 'success' : 'fail' })}
        >
          {succeeded ? '✓' : '×'}
        </span>
        {/* 마지막 스텝에는 연결선이 없다 — 허공으로 이어지는 선을 그리지 않는다. */}
        {!isLast && <span aria-hidden data-timeline-rail="" className={rail} />}
      </div>
      <div className={stepBody({ last: isLast })}>
        <div className={stepTitle}>{title}</div>
        <div className={stepDesc}>{desc ?? children}</div>
      </div>
    </div>
  );
}

interface TimelineProps {
  /** JSON 문자열(raw HTML)과 배열(JSX)을 모두 받는다. */
  steps?: string | TimelineStep[];
  children?: ReactNode;
}

export function Timeline({ steps, children }: TimelineProps) {
  const parsed = parseItemsProp(steps, isTimelineStep);
  const nodes = parsed ? null : markdownChildren(children);

  return (
    <div className={css({ my: '6' })}>
      {parsed
        ? parsed.map((step, index) => (
            <Step
              key={index}
              title={step.title}
              desc={step.desc}
              result={step.result}
              isLast={index === parsed.length - 1}
            />
          ))
        : withLastFlag(nodes ?? [])}
    </div>
  );
}

/**
 * children으로 받은 `<step>` 중 마지막 것에만 `isLast`를 켠다.
 *
 * `:last-child` CSS로도 할 수 있지만, 마크다운이 자식을 어떻게 감싸든 결과가 같도록
 * 렌더 시점에 계산한다. Step이 아닌 노드에 prop을 주입하면 DOM 경고가 나므로
 * 타입이 Step인 엘리먼트만 손댄다.
 */
function withLastFlag(nodes: ReactNode[]): ReactNode[] {
  const lastStepIndex = nodes.reduce<number>(
    (last, node, index) => (isStepElement(node) ? index : last),
    -1,
  );

  return nodes.map((node, index) =>
    isStepElement(node)
      ? cloneElement(node, { isLast: index === lastStepIndex })
      : node,
  );
}

function isStepElement(node: ReactNode): node is ReactElement<StepProps> {
  return isValidElement(node) && node.type === Step;
}
