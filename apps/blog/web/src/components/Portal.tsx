'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * 자식을 document.body로 portal한다.
 *
 * 풀스크린 오버레이(백드롭/바텀시트 등)가 조상의 stacking context나 overflow에
 * 갇히지 않도록 한다. 조상이 stacking context를 만들면(z-index·transform 등) 그 안에서
 * inline 렌더된 fixed 오버레이는 z값과 무관하게 조상의 층에 갇혀 sticky 헤더(z10)에
 * 덮이고, 조상에 backdrop-filter·transform이 있으면 fixed의 기준이 뷰포트가 아니라 그
 * 조상이 된다(헤더 안의 검색 다이얼로그). body로 portal하면 루트 stacking context로
 * 빠져나와 정상적으로 위에 그려진다.
 *
 * SSR/정적 export에는 document가 없으므로, 하이드레이션 이후(클라이언트)에만 portal한다.
 * useSyncExternalStore로 서버 스냅샷(false)·클라이언트 스냅샷(true)을 구분해 하이드레이션
 * 불일치 없이 mount 여부를 판별한다(useEffect+setState 패턴 대비 lint·성능상 권장).
 */
const emptySubscribe = () => () => {
  // 스토어가 변하지 않으므로 해지할 구독도 없다
};

export const Portal = ({ children }: { children: ReactNode }) => {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  return mounted ? createPortal(children, document.body) : null;
};
