'use client';

import { useSelectedLayoutSegment } from 'next/navigation';
import type { ReactNode } from 'react';
import { ADMIN_SEGMENT } from '@/src/shared/routes';

interface ShellSwitchProps {
  /** 사이트 셸(헤더·본문·푸터, `Layout`)을 씌운 페이지. */
  site: ReactNode;
  /** 셸 없이 그대로 — 자기 셸을 가진 영역이 쓴다(admin의 `AdminShell`). */
  bare: ReactNode;
}

/**
 * 루트 레이아웃이 페이지에 사이트 셸을 씌울지 고른다 — admin 영역은 관리자 바와 자기 본문을 가진
 * 앱 화면이라, 사이트 헤더·푸터 아래에 두 번째 헤더로 끼우지 않는다.
 *
 * **경로(`usePathname`)가 아니라 라우트 트리의 세그먼트로 고른다.** 정적 export의 404 페이지는
 * 어느 주소에서든 같은 `404.html`이 나간다 — `/admin/없는-주소/`로 와도 그 HTML은 사이트 셸로
 * 그려져 있다. 주소로 고르면 하이드레이션이 admin으로 판정해 서버 HTML과 어긋나지만, 트리는 그
 * 페이지를 그린 트리(not-found) 그대로라 서버와 클라이언트가 같은 답을 낸다. 분석 화면이
 * `history.pushState`로 주소만 바꿔도 트리는 바뀌지 않는다.
 *
 * 레이아웃은 서버 컴포넌트라 세그먼트를 모른다 — 클라이언트에서 고르는 일만 여기 떼어 냈다.
 * 두 갈래 모두 서버가 그린 요소를 받으므로 셸 자체는 서버 컴포넌트로 남는다.
 */
export function ShellSwitch({ site, bare }: ShellSwitchProps) {
  return useSelectedLayoutSegment() === ADMIN_SEGMENT ? bare : site;
}
