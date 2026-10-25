import { ViewTransition, type ComponentPropsWithRef } from 'react';
import { NAV_TRANSITION, VIEW_TRANSITION } from '@/src/shared/viewTransitions';

/**
 * transition type별 클래스 — 방향 있는 이동(`NAV_TRANSITION`)은 type과 같은 이름의 클래스를 받고
 * (나가는 쪽·들어오는 쪽은 CSS의 `::view-transition-old`·`-new`가 가른다), 방향 type이 없는
 * 이동(같은 깊이의 형제 이동, 검색 결과)은 `fallback`이다.
 * 키는 `NAV_TRANSITION`에서 뽑는다 — 방향이 하나 늘면 여기서도 저절로 받는다.
 */
const byNavType = (fallback: string) => ({
  ...Object.fromEntries(
    Object.values(NAV_TRANSITION).map(type => [type, type]),
  ),
  default: fallback,
});

const ENTER = byNavType(VIEW_TRANSITION.pageEnter);
const EXIT = byNavType(VIEW_TRANSITION.pageExit);

/**
 * 페이지 내용의 경계 — 내비게이션이 페이지를 바꿀 때 나가는 쪽과 들어오는 쪽을 React
 * `<ViewTransition>`의 exit/enter로 움직인다. 움직임의 모양은 `panda.config.ts` globalCss의
 * `::view-transition-*` 규칙이다.
 *
 * - **방향**: 링크 이동의 transition type(`TransitionLink`가 앱의 계층으로 고른다)이
 *   `nav-forward`면 내용이 왼쪽으로 밀리고 새 내용이 오른쪽에서, `nav-back`이면 반대로 들어온다.
 *   type이 없으면 제자리 페이드(들어오는 쪽만 8px 떠오름)다 — Next view-transitions 가이드의
 *   "directional motion" 구성이고, 가이드가 `default: 'none'`으로 둔 자리를 페이드로 채웠다.
 * - 레이아웃이 아니라 **페이지마다** 둔다 — 레이아웃은 내비게이션을 건너 살아남아 enter/exit가
 *   발동하지 않는다(Next view-transitions 가이드). 예외는 admin 영역 하나(`src/app/admin/layout.tsx` —
 *   영역을 드나드는 이동만 움직인다).
 * - **라우트의 내용은 경계 안에** — 페이지만이 아니라 404(`not-found.tsx`)·admin도. 경계 밖 내용은
 *   전환 스냅샷에 담기지 않아 첫 프레임에 사라지고, 방향 있는 이동은 들어오는 페이지가 fast 뒤에
 *   나타나므로 그 사이 헤더만 남은 빈 지면이 보인다(404 → 헤더 '글'에서 175ms 실측). 에러 경계
 *   (`error.tsx`·`global-error.tsx`)만 일부러 뺐다 — 클라이언트 컴포넌트라 여기서 쓰면 이 컴포넌트와
 *   `VIEW_TRANSITION` 그룹 객체가 모든 페이지의 첫 로드에 실린다(실측 +314B gzip). 드문 에러 화면을
 *   떠날 때의 빈 지면과 바꾸지 않았다. 같은 이유로 이 컴포넌트는 **서버 컴포넌트에서만** 쓴다 —
 *   클라이언트 파일 하나가 쓰기만 해도 공유 모듈이 그 객체를 내보내 공개 페이지가 함께 무거워진다.
 * - `default="none"` — 페이지 안의 갱신(Suspense 드러남·전환으로 감싼 상태 변경)은 움직이지 않는다.
 * - 하드 로드에는 전환이 없다 — Next의 클라이언트 내비게이션만 transition이다. 브라우저
 *   뒤로·앞으로 가기에도 돌지 않는다(실측: startViewTransition이 불리지 않는다). Next는 popstate도
 *   startTransition으로 넘기지만, React DOM이 popstate 이벤트 안의 전환을 동기 레인과 묶어 그
 *   자리에서 커밋하고(브라우저의 스크롤 복원이 새 페이지에 걸리게) 동기 레인이 섞인 커밋은 View
 *   Transition 대상이 아니다. 그래서 방향도 링크 이동에서만 보인다.
 */
export const PageBoundary = (props: ComponentPropsWithRef<'div'>) => (
  <ViewTransition enter={ENTER} exit={EXIT} default="none">
    <div {...props} />
  </ViewTransition>
);
