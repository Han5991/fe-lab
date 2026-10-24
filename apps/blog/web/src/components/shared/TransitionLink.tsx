'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';
import {
  linkTransitionTypes,
  type SiblingOrder,
} from '@/src/shared/viewTransitions';

interface TransitionLinkProps extends Omit<
  ComponentProps<typeof Link>,
  'href' | 'transitionTypes'
> {
  /** 사이트 안 라우트(후행 슬래시 계약 — `postPath`·`POSTS_PATH`·`archivePath`…). */
  href: string;
  /** 같은 깊이 형제 사이의 순서 — 글 하단의 이전·다음 글만 준다(`navTransitionType`). */
  order?: SiblingOrder | undefined;
  /** 글 카드·목록 행의 제목 링크 — 그 카드의 공유 요소가 글 상세로 이어진다(`PostCardShared`). */
  opensPost?: boolean | undefined;
}

/**
 * 사이트 안 링크 — 이 링크 이동이 앱의 계층에서 어느 방향인지(`navTransitionType`)를 현재 경로와
 * 도착 경로로 골라 transition type으로 단다. 링크는 방향을 적지 않는다 — 규칙은
 * `src/shared/viewTransitions.ts` 한 곳이고, 페이지가 그 type을 받아 움직이는 곳은 `PageBoundary`다.
 *
 * `next/link`를 바로 여는 것은 lint가 막는다(`eslint.config.mts`의 `NEXT_LINK_DIRECT`) — 빠뜨린 링크는
 * 에러 없이 그 이동만 페이드로 남기 때문이다. 일부러 방향을 달지 않는 곳(검색 다이얼로그 결과 —
 * 모달을 닫으며 가는 이동, 에러 경계가 그리는 `ErrorFallback`, admin)은 그 설정의
 * `NEXT_LINK_FILES`에 사유와 함께 있다.
 */
export const TransitionLink = ({
  href,
  order,
  opensPost,
  ...props
}: TransitionLinkProps) => {
  const pathname = usePathname();
  return (
    <Link
      {...props}
      href={href}
      transitionTypes={linkTransitionTypes(pathname, href, {
        order,
        opensPost,
      })}
    />
  );
};
