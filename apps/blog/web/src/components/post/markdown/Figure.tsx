import type { ReactNode } from 'react';
import { css } from '@design-system/ui-lib/css';

interface FigureProps {
  children?: ReactNode;
}

export function Figure({ children }: FigureProps) {
  return (
    <figure
      className={css({
        my: '8',
        textAlign: 'center',
        // MarkdownImage가 자기 클래스(명시도 0,1,0)로 상하 여백을 걸어둔다.
        // 여기서는 자손 셀렉터(0,1,1)라 그걸 덮어, figure 안에서는 여백 없이
        // 가운데 정렬되고 캡션과 붙는다.
        '& img': {
          mx: 'auto',
          mt: '0',
          mb: '0',
          rounded: 'control',
          borderWidth: 'hairline',
          borderColor: 'ink.border',
        },
        // 캡션은 날짜·수치와 같은 "메타" 계열이라 모노 12px.
        '& figcaption': {
          mt: '3',
          fontFamily: 'mono',
          fontSize: '[12px]',
          lineHeight: 'relaxed',
          color: 'ink.500',
        },
      })}
    >
      {children}
    </figure>
  );
}
