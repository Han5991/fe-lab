import { css } from '@blog/styled-system/css';

const stack = css({
  display: 'inline-grid',
  justifyItems: 'center',
  '& > *': { gridArea: '1 / 1' },
});

const widthCopy = css({ visibility: 'hidden', fontWeight: 'semibold' });

interface SteadyLabelProps {
  children: string;
  /** 글자를 감싸는 면(칩·토글 칸)의 클래스 — 켜짐·hover·초점 링을 형제 선택자로 받는 그 요소다 */
  className: string;
}

/**
 * 굵기가 바뀌어도 폭이 그대로인 글자를 담은 면 — 켜지면 semibold가 되는 칩·토글 칸이 쓴다. 같은
 * 글자의 semibold 사본을 숨긴 채 같은 칸에 겹쳐 폭을 굵은 쪽에 미리 맞춘다(Astryx ToggleButton과
 * 같은 동작). 켜고 끌 때 옆 칩들이 밀리지 않는다.
 *
 * 사본은 `aria-hidden`이라 접근 가능한 이름에 두 번 들어가지 않는다. 면을 이 컴포넌트가 그리는
 * 것은 `label` 안의 글자가 JSX에 바로 드러나게 하려는 것이다(jsx-a11y가 label의 글자를 찾는 깊이).
 */
export const SteadyLabel = ({ children, className }: SteadyLabelProps) => (
  <span className={className}>
    <span className={stack}>
      <span>{children}</span>
      <span aria-hidden="true" className={widthCopy}>
        {children}
      </span>
    </span>
  </span>
);
