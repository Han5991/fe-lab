import { css } from '@design-system/ui-lib/css';
import type { ReactNode, HTMLAttributes } from 'react';

interface LabelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  tone?: 'meta' | 'marker' | 'moss' | 'ink';
  /**
   * 렌더링할 태그. 기본은 의미 없는 `span`이지만, 라벨 뒤에 곧바로 헤딩이
   * 오는 섹션(예: 홈의 "이번 주 함께 읽기 좋은 글" → MiniPostCard의 h4)에서는
   * 레벨을 건너뛰지 않도록 `as="h3"`처럼 헤딩으로 올려준다.
   */
  as?: 'span' | 'h2' | 'h3' | 'h4';
}

const toneColor = {
  meta: 'ink.500',
  marker: 'marker.600',
  moss: 'moss.600',
  ink: 'ink.950',
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
