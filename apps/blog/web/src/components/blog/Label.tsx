import { css, cva } from '@blog/styled-system/css';
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

// 톤은 prop(런타임 값)이라 `toneColor[tone]` 같은 조회는 빌드 때 CSS가 되지 않는다 —
// 변형(cva)으로 적어야 모든 톤이 추출된다(styling/dynamic-styling).
const labelTone = cva({
  variants: {
    tone: {
      meta: { color: 'ink.500' },
    },
  },
});

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
        }),
        labelTone({ tone }),
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Tag>
  );
};
