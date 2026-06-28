import type { ComponentPropsWithRef } from 'react';

interface PageBoundaryProps extends ComponentPropsWithRef<'div'> {
  /**
   * `data-ssgoi-transition` 값 — 라우트 전환(hero/fade)을 매칭하는 키.
   * 보통 해당 페이지 경로("/posts" 등)를 쓴다.
   * (HTML 표준 `id` 속성과 충돌하지 않도록 별도 이름을 쓴다.)
   */
  transitionId: string;
}

export const PageBoundary = ({ transitionId, ...rest }: PageBoundaryProps) => (
  <div {...rest} data-ssgoi-transition={transitionId} />
);
