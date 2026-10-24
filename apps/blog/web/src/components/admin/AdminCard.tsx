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
  /** 머리 오른쪽의 보조 글자(편수·기준). */
  meta?: ReactNode;
  children: ReactNode;
  /** 화면에 처음 그려질 때의 진입 순서(`enterMotion` — 0이 먼저 선다). */
  enterOrder: number;
}

/**
 * 제목 있는 카드 — 승인 목업의 카드 머리(h3 17/24 ↔ supporting 보조 글자, 기준선 정렬, 아래 16).
 * 표는 `cardTableBleed`로 감싸 카드 가장자리까지 붙인다.
 */
export function AdminCard({
  title,
  level: Heading,
  meta,
  children,
  enterOrder,
}: AdminCardProps) {
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
      <div
        className={css({
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '3',
        })}
      >
        <Heading className={css({ textStyle: 'h3' })}>{title}</Heading>
        {meta !== undefined && (
          <span
            className={css({
              textStyle: 'supporting',
              color: 'ink.700',
              flexShrink: '0',
            })}
          >
            {meta}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
