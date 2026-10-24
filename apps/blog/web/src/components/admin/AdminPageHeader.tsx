import { css } from '@blog/styled-system/css';
import type { ReactNode } from 'react';

interface AdminPageHeaderProps {
  title: string;
  /** 제목 아래 한 줄(supporting) — 기준·업데이트 시각·상태. */
  description: ReactNode;
  /** 오른쪽 컨트롤(검색·정렬·새로고침). 좁은 화면에서는 제목 아래로 내려간다. */
  actions?: ReactNode;
}

/**
 * admin 페이지 머리 — 승인 목업(Astryx comparison 템플릿의 LayoutHeader)이다. h1 24/32 + 보조 한 줄,
 * 오른쪽 컨트롤, 아래 hairline. 위 32 · 아래 16(목업 그대로).
 */
export function AdminPageHeader({
  title,
  description,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div
      className={css({
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: '4',
        pt: '8',
        pb: '4',
        borderBottomWidth: 'hairline',
        borderColor: 'ink.border',
      })}
    >
      <div className={css({ minW: '0' })}>
        <h1 className={css({ textStyle: 'h1' })}>{title}</h1>
        <p className={css({ textStyle: 'supporting', color: 'ink.700' })}>
          {description}
        </p>
      </div>
      {actions !== undefined && (
        <div
          className={css({
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '2',
          })}
        >
          {actions}
        </div>
      )}
    </div>
  );
}
