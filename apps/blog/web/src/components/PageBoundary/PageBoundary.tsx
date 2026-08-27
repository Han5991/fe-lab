import type { ComponentPropsWithRef } from 'react';

interface PageBoundaryProps extends ComponentPropsWithRef<'div'> {
  /**
   * `data-ssgoi-transition` 값 — 라우트 전환(hero/fade)을 매칭하는 키.
   * 리터럴을 적지 말고 `@/shared/transitions`의 전환 ID 상수/헬퍼를 쓸 것 —
   * 매처(PageTransition.tsx)와 어긋나면 전환이 조용히 fade로 폴백한다.
   * (HTML 표준 `id` 속성과 충돌하지 않도록 별도 이름을 쓴다.)
   */
  transitionId: string;
}

export const PageBoundary = ({ transitionId, ...rest }: PageBoundaryProps) => (
  <div {...rest} data-ssgoi-transition={transitionId} />
);
