'use client';

import type { ReactNode } from 'react';
import { Ssgoi, type SsgoiConfig } from '@ssgoi/react';
import { drill } from '@ssgoi/react/view-transitions';
import { css } from '@design-system/ui-lib/css';

// ssgoi v6 path-factory API. (v6에는 defaultTransition이 없고, 모든 전환을
// path 기반 팩토리로 매칭한다. 매처는 first-hit이라 더 구체적인 규칙을 먼저 둔다.)
//
// 사이트 전체를 drill 한 가지 모션으로 통일한다. drill은 페이지를 통째로 가로
// 슬라이드(parallax)하므로 텍스트·이미지가 한 덩어리로 함께 움직인다.
// (google-photos식 hero 모핑은 텍스트 많은 글 상세에서 텍스트가 이미지와 따로
//  놀아 어색해 채택하지 않았다 — static=글자 즉시 뜸, fade=전체가 부산스러움.)
//
// 방향성: 깊이 들어가면 enter(새 페이지 오른쪽→), 나오면 exit(왼쪽→)이라
// back-nav가 반대 방향으로 슬라이드한다. drill({enter, exit})는
// {from:exit, to:enter}=enter, {from:enter, to:exit}=exit 두 규칙을 만든다.
const config: SsgoiConfig = {
  transitions: [
    // 글 목록 ↔ 글 상세
    ...drill({ enter: '/posts/*', exit: '/posts' }),
    // 홈 ↔ 하위 페이지(계층 이동)
    ...drill({ enter: '/posts', exit: '/' }),
    ...drill({ enter: '/about', exit: '/' }),
    ...drill({ enter: '/privacy', exit: '/' }),
    // 그 외 측면 이동(글↔글, posts↔about 등) 및 미매칭: 일관된 enter 방향 fallback
    ...drill({ enter: '*', exit: '*' }),
  ],
  // 데스크탑/모바일 동작 통일. 기본값 (isMobile)=>isMobile은 모바일만 스크롤을
  // 복원해 플랫폼마다 체감이 달라진다. exclude로 일관되게:
  //   - 긴 글 상세(/posts/*)는 항상 맨 위에서 시작(재방문 시 본문 중간으로 점프 방지)
  //   - 글 목록(/posts)은 exclude 대상이 아니라 back 시 스크롤 위치가 복원됨
  preserveScroll: { exclude: ['/posts/*'] },
};

export const PageTransition = ({ children }: { children: ReactNode }) => (
  <Ssgoi config={config}>
    {/* 가로 전환(drill)용 필수 래퍼:
        - pos:relative → SSGOI가 OUT 페이지를 position:absolute 클론으로 띄울 때의 기준
        - zIndex:0 → stacking context 생성(drill의 z-index:-1 OUT 페이지가 배경 뒤로 가라앉는 것 방지).
          단 이 stacking context는 내부 inline 풀스크린 오버레이를 가두므로,
          그런 오버레이(MobileTOC·PostsFilterSheet)는 <Portal>로 body에 렌더한다.
        - overflowX:clip → 전환 중 오프스크린 페이지의 가로 스크롤바 누출 방지 (overflowY는 visible 유지되어 sticky 정상) */}
    <div
      className={css({
        pos: 'relative',
        w: 'full',
        zIndex: '0',
        overflowX: 'clip',
      })}
    >
      {children}
    </div>
  </Ssgoi>
);
