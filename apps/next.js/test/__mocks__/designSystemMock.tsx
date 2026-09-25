import type { ComponentProps } from 'react';

// @design-system/ui의 Button 대역. 렌더할 수 있는 React 요소를 돌려줘야 한다
export const Button = (props: ComponentProps<'button'>) => (
  <button {...props} />
);
