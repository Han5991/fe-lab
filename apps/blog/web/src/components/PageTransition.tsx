'use client';

import type { ReactNode } from 'react';
import { Ssgoi, type SsgoiConfig } from '@ssgoi/react';
import { hero, fade } from '@ssgoi/react/view-transitions';
import { css } from '@design-system/ui-lib/css';
import {
  POST_HERO_TRANSITION_GLOB,
  POST_PLAIN_TRANSITION_GLOB,
  POSTS_TRANSITION_ID,
} from '@/src/shared/transitions';

// ssgoi v6 path-factory API. (v6에는 defaultTransition이 없고, 모든 전환을
// path 기반 팩토리로 매칭한다. 매처는 first-hit이라 더 구체적인 규칙을 먼저 둔다.)
//
// 글 목록 ↔ 글 상세(썸네일 있는 글): google-photos식 hero 모핑(type:'static' —
// 카드 썸네일이 상세 헤더 이미지로 위치+크기를 보간하며 커지고/작아진다. 주변
// 텍스트는 즉시 표시). 그 외 모든 이동(홈↔목록·홈↔글·글↔글·about, 썸네일 없는 글
// 등)은 fade(main 기본 전환과 동일한 결).
//
// hero({paths})는 symmetric 한 방향 엔트리 1개만 만들고, ssgoi 매처는
// "정방향(direct) 전체 검사 → symmetric 검사"의 2-pass라서, fade 와일드카드 {*,*}가
// direct pass에서 back(/posts/*→/posts)을 먼저 가로채 hero의 symmetric(2nd pass)보다
// 앞선다. → hero를 양방향 explicit 엔트리로 펼쳐 back도 direct 매칭이 되게 한다.
const heroEntries = hero({
  paths: [POSTS_TRANSITION_ID, POST_HERO_TRANSITION_GLOB],
  type: 'static',
});
const heroBidirectional = [
  ...heroEntries,
  ...heroEntries.map(e => ({ ...e, from: e.to, to: e.from })),
];

const config: SsgoiConfig = {
  transitions: [
    // 글 목록 ↔ 썸네일 있는 글 상세(id=/posts/*): hero 모핑(양방향)
    ...heroBidirectional,
    // 그 외 전부(홈↔목록·홈↔글·글↔글·about, 썸네일 없는 글 상세=/posts-plain/* 등): fade.
    // paths:['*','*'] = {from:'*', to:'*'} 와일드카드 catch-all.
    ...fade({ paths: ['*', '*'] }),
  ],
  // 데스크탑/모바일 동작 통일. 긴 글 상세(/posts/*, /posts-plain/*)는 항상 맨 위에서
  // 시작, 글 목록(/posts)은 back 시 스크롤 위치 복원.
  preserveScroll: {
    exclude: [POST_HERO_TRANSITION_GLOB, POST_PLAIN_TRANSITION_GLOB],
  },
};

export const PageTransition = ({ children }: { children: ReactNode }) => (
  <Ssgoi config={config}>
    {/* 전환 래퍼:
        - pos:relative → SSGOI가 hero 클론/OUT 페이지를 position:absolute로 띄울 때의 기준
        - zIndex:0 → stacking context. 이 안에서 inline 렌더된 fixed 풀스크린 오버레이
          (MobileTOC·PostsFilterSheet)는 갇히므로 그것들은 <Portal>로 body에 렌더한다.
        - overflowX:clip → 전환 중 가로 스크롤바 누출 방지 (overflowY는 visible 유지되어 sticky 정상) */}
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
