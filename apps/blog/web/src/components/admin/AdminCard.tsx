import { css } from '@blog/styled-system/css';
import type { ReactNode } from 'react';
import {
  adminCard,
  enterMotion,
  enterOrderStyle,
  type CardHeadingLevel,
} from './adminStyles';

interface AdminCardProps {
  title: string;
  level: CardHeadingLevel;
  /** 머리의 보조 글자(편수·기준). 컨트롤이 없으면 오른쪽 끝, 있으면 제목 바로 뒤에 붙는다. */
  meta?: ReactNode;
  /** 머리 오른쪽 컨트롤(정렬·새로고침) — 좁으면 제목 아래로 내려간다. */
  actions?: ReactNode;
  children: ReactNode;
  /** 화면에 처음 그려질 때의 진입 순서(`enterMotion` — 0이 먼저 선다). */
  enterOrder: number;
}

const metaClass = css({
  textStyle: 'supporting',
  color: 'ink.700',
  flexShrink: '0',
});

/**
 * 제목 있는 카드 — 승인 목업의 카드 머리(h3 17/24 ↔ supporting 보조 글자, 기준선 정렬, 아래 16).
 * 컨트롤이 있는 머리(「모든 글」)는 제목·편수가 왼쪽, 컨트롤이 오른쪽이고 세로 가운데로 맞춘다.
 * 표는 `cardTableBleed`로 감싸 카드 가장자리까지 붙인다.
 */
export function AdminCard({
  title,
  level: Heading,
  meta,
  actions,
  children,
  enterOrder,
}: AdminCardProps) {
  const metaNode = meta !== undefined && (
    <span className={metaClass}>{meta}</span>
  );
  return (
    <section
      style={enterOrderStyle(enterOrder)}
      className={css(adminCard, enterMotion, {
        display: 'flex',
        flexDir: 'column',
        gap: '4',
        minW: '0',
      })}
    >
      {actions === undefined ? (
        <div
          className={css({
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '3',
          })}
        >
          <Heading className={css({ textStyle: 'h3' })}>{title}</Heading>
          {metaNode}
        </div>
      ) : (
        <div
          className={css({
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '3',
          })}
        >
          <div
            className={css({
              display: 'flex',
              alignItems: 'baseline',
              gap: '2',
            })}
          >
            <Heading className={css({ textStyle: 'h3' })}>{title}</Heading>
            {metaNode}
          </div>
          <div
            className={css({ display: 'flex', alignItems: 'center', gap: '2' })}
          >
            {actions}
          </div>
        </div>
      )}
      {children}
    </section>
  );
}
