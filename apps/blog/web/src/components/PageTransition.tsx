'use client';

import type { ReactNode } from 'react';
import { Ssgoi, type SsgoiConfig } from '@ssgoi/react';
import { drill, hero } from '@ssgoi/react/view-transitions';
import { css } from '@design-system/ui-lib/css';

// ssgoi v6 path-factory API. (v6에는 defaultTransition이 없고, 모든 전환을
// path 기반 팩토리로 매칭한다.)
//
// 글 목록 ↔ 글 상세: google-photos식 hero(shared-element morph).
// 카드 썸네일(data-hero-exit-key)과 상세 헤더 <img>(data-hero-enter-key)가 같은 키를
// 가지면 그 이미지가 위치+크기를 보간하며 모핑한다. type:'static'은 주변 텍스트/chrome을
// 즉시 snap(크로스페이드 없음)하고 공유 이미지 클론만 모핑한다 — 텍스트가 같이 움직이지
// 않아 "이미지만 커지고 작아지는" 깔끔한 모션이 된다.
//
// hero({paths})는 symmetric 한 방향 엔트리({from:'/posts', to:'/posts/*'}) 1개만 만든다.
// 그런데 ssgoi 매처는 "정방향(direct) 전체 검사 → symmetric 검사"의 2-pass라서, drill
// 와일드카드 {from:'*', to:'*'}가 direct pass에서 back(/posts/*→/posts)을 먼저 가로채
// hero의 symmetric(2nd pass)보다 앞서 매칭돼 버린다. (데모는 와일드카드가 없어 무사.)
// → hero를 양방향 explicit 엔트리로 펼쳐 back도 direct 매칭이 되게 한다.
const heroEntries = hero({ paths: ['/posts', '/posts/*'], type: 'static' });
const heroBidirectional = [
  ...heroEntries,
  ...heroEntries.map(e => ({
    from: e.to,
    to: e.from,
    transition: e.transition,
  })),
];

const config: SsgoiConfig = {
  transitions: [
    ...heroBidirectional,
    // 그 외 모든 라우트 이동(홈↔목록, 홈↔about, 글↔글 등): drill catch-all.
    // 와일드카드 '*'로 hero가 잡지 않은 나머지를 모두 처리한다(가로 패럴랙스).
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
    {/* 가로 전환(drill/hero)용 필수 래퍼:
        - pos:relative → SSGOI가 OUT 페이지를 position:absolute 클론으로 띄울 때의 기준
        - zIndex:0 → stacking context 생성(클론이 배경 뒤로 가라앉는 것 방지)
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
