import { ViewTransition, type ComponentPropsWithRef } from 'react';
import { VIEW_TRANSITION } from '@/src/shared/viewTransitions';

/**
 * 페이지 내용의 경계 — 내비게이션이 페이지를 바꿀 때 나가는 쪽과 들어오는 쪽을 React
 * `<ViewTransition>`의 exit/enter로 움직인다. 움직임의 모양은 `panda.config.ts` globalCss의
 * `::view-transition-*` 규칙이다.
 *
 * - 레이아웃이 아니라 **페이지마다** 둔다 — 레이아웃은 내비게이션을 건너 살아남아 enter/exit가
 *   발동하지 않는다(Next view-transitions 가이드).
 * - `default="none"` — 페이지 안의 갱신(Suspense 드러남·전환으로 감싼 상태 변경)은 움직이지 않는다.
 * - 하드 로드에는 전환이 없다 — Next의 클라이언트 내비게이션만 transition이다. 브라우저
 *   뒤로·앞으로 가기에도 돌지 않는다(실측: startViewTransition이 불리지 않는다). Next는 popstate도
 *   startTransition으로 넘기지만, React DOM이 popstate 이벤트 안의 전환을 동기 레인과 묶어 그
 *   자리에서 커밋하고(브라우저의 스크롤 복원이 새 페이지에 걸리게) 동기 레인이 섞인 커밋은 View
 *   Transition 대상이 아니다.
 */
export const PageBoundary = (props: ComponentPropsWithRef<'div'>) => (
  <ViewTransition
    enter={VIEW_TRANSITION.pageEnter}
    exit={VIEW_TRANSITION.pageExit}
    default="none"
  >
    <div {...props} />
  </ViewTransition>
);
