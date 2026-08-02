import { css } from '@design-system/ui-lib/css';
import type { ReactNode, HTMLAttributes } from 'react';

interface LabelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  tone?: 'meta';
  /**
   * 렌더링할 태그. 기본은 의미 없는 `span`이지만, 라벨이 섹션 제목 역할을
   * 하는 자리(예: 아카이브 목록의 섹션 머리)에서는 레벨을 건너뛰지 않도록
   * `as="h2"`처럼 헤딩으로 올려준다.
   */
  as?: 'span' | 'h2';
}

const toneColor = {
  meta: 'ink.500',
} as const;

export const Label = ({
  children,
  tone = 'meta',
  as: Tag = 'span',
  className,
  ...rest
}: LabelProps) => {
  return (
    <Tag
      {...rest}
      className={[
        css({
          fontFamily: 'mono',
          fontSize: 'xs',
          fontWeight: 'medium',
          letterSpacing: 'mono',
          textTransform: 'uppercase',
          color: toneColor[tone],
        }),
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Tag>
  );
};
