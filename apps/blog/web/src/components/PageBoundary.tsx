import type { ComponentPropsWithRef } from 'react';

interface PageBoundaryProps extends ComponentPropsWithRef<'div'> {
  /**
   * `data-ssgoi-transition` 값 — 라우트 전환(hero/fade)을 매칭하는 키.
   * 보통 해당 페이지 경로("/posts" 등)를 쓴다.
   */
  id: string;
}

export const PageBoundary = ({ id, ...rest }: PageBoundaryProps) => (
  <div data-ssgoi-transition={id} {...rest} />
);
