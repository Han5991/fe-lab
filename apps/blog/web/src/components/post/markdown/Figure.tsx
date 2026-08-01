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
        // MarkdownImage가 자기 클래스로 2xl 라운드·그림자·큰 상하 여백을 걸어둔다.
        // 여기서는 자손 셀렉터(명시도 0,1,1)라 그걸 덮어 figure 안에서는
        // hairline + control 라운드 + 그림자 없음으로 통일된다.
        '& img': {
          mx: 'auto',
          mt: '0',
          mb: '0',
          rounded: 'control',
          borderWidth: 'hairline',
          borderColor: 'ink.border',
          shadow: '[none]',
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
