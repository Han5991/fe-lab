'use client';

import type { ReactNode } from 'react';
import { Ssgoi, type SsgoiConfig } from '@ssgoi/react';
import { drill, fade } from '@ssgoi/react/view-transitions';
import { css } from '@design-system/ui-lib/css';

// ssgoi v6 path-factory API. (v6에는 defaultTransition이 없고, 모든 전환을
// path 기반 팩토리로 매칭한다. 매처는 first-hit이라 더 구체적인 규칙을 먼저 둔다.)
//
// main과 동일한 구조: 글 목록 ↔ 글 상세만 drill(iOS식 가로 푸시/팝), 그 외 모든
// 이동(홈↔목록·홈↔글·글↔글·about 등)은 fade. drill은 들어갈 때 enter(우측 진입),
// 나올 때 exit(좌측 복귀)로 방향성이 있다.
const config: SsgoiConfig = {
  transitions: [
    // 글 목록 ↔ 글 상세: drill (목록→글 우측 진입, 글→목록 좌측 복귀)
    ...drill({ enter: '/posts/*', exit: '/posts' }),
    // 그 외 전부(홈↔목록·홈↔글·글↔글·about 등): fade — main 기본 전환과 동일한 결.
    // (fade는 순차적이라 전환 중 잠깐 빈 화면이 생길 수 있으나 main과 동일.)
    // paths:['*','*'] = {from:'*', to:'*'} 와일드카드 catch-all.
    ...fade({ paths: ['*', '*'] }),
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
