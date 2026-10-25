'use client';

import { useSyncExternalStore } from 'react';
import { css } from '@blog/styled-system/css';
import { siteHeaderStyle } from '../siteHeader';

/** 카카오톡 인앱 브라우저 — 안드로이드·iOS 모두 user-agent에 이 표식을 단다. */
const KAKAOTALK_UA = /KAKAOTALK/i;

// user-agent는 바뀌지 않는다 — 구독할 것이 없다.
const subscribeNever = () => () => undefined;
const isKakaoTalk = () => KAKAOTALK_UA.test(navigator.userAgent);
// 정적 HTML에는 바가 있다(대부분의 방문). 카카오톡에서는 하이드레이션 직후 빠진다.
const serverIsKakaoTalk = () => false;

/**
 * 페이지 최상단 sticky 진행률 바.
 * scroll() 타임라인으로 애니메이션 진행도를 스크롤 위치에 직접 묶는다
 * (JS scroll 리스너 없이 프레임 지연 없음). width가 아닌 transform: scaleX()를
 * 움직여 레이아웃을 건드리지 않는다 — width는 매 스크롤 프레임마다 reflow를 돌린다.
 *
 * **카카오톡 인앱 브라우저에서는 그리지 않는다.** transform이어도 메인 스레드가 비지는 않는다 —
 * Chromium은 스크롤 프레임마다 이 애니메이션의 스타일을 다시 계산한다(2026-10-25, 모바일 에뮬레이션·CPU
 * 4배 감속·터치 스크롤 세 번: 바가 있으면 스타일 재계산 230~250회, 없으면 45회 안팎, `will-change`로는
 * 그대로). 크롬·사파리에서는 스크롤이 부드러웠지만 카카오톡 인앱 브라우저에서는 글 상세의 스크롤이
 * 버벅였고, 바를 빼자 사라졌다(실기기 확인). 그 브라우저만 user-agent로 가려 바를 빼고, 위치는 목차
 * 버튼이 대신한다.
 *
 * 바를 IntersectionObserver로 칸마다 갱신하는 방식(#594)도 재 봤다 — 스크롤은 부드러웠지만 바가 계단처럼
 * 올라갔고, 다른 브라우저의 매끄러운 바까지 내줄 이유가 없어 닫았다.
 *
 * scroll(root block): 인자 없는 scroll()은 가장 가까운 스크롤 조상을
 * 찾는데(nearest), 이 바가 position: fixed라 의도한 document 스크롤러가 안
 * 잡힐 수 있어 명시한다.
 */
export const ReadingProgress = () => {
  const hidden = useSyncExternalStore(
    subscribeNever,
    isKakaoTalk,
    serverIsKakaoTalk,
  );
  if (hidden) return null;

  return (
    <div
      aria-hidden="true"
      style={siteHeaderStyle}
      className={css({
        pos: 'fixed',
        // 사이트 헤더 바로 아래 — 헤더 높이는 siteHeader가 정한다.
        top: '[var(--site-header-height)]',
        left: '0',
        right: '0',
        h: '[3px]',
        zIndex: '9',
        bg: 'transparent',
        pointerEvents: 'none',
        '@supports not (animation-timeline: scroll())': {
          display: 'none',
        },
      })}
    >
      <div
        className={css({
          h: 'full',
          w: 'full',
          bg: 'accent.solid',
          transformOrigin: '[0% 50%]',
          transform: '[scaleX(0)]',
          // 단축 속성 `animation`을 쓰지 않고 longhand만 준다. 단축 속성은
          // animation-timeline까지 auto로 리셋하므로, 같이 쓰면 선언 순서(단축이
          // 먼저)에 기대야 했다 — longhand끼리는 서로를 건드리지 않아 순서와 무관하다.
          // 키프레임 이름은 panda.config.ts의 keyframes에서 오므로 타입이 검사한다.
          animationName: 'reading-progress-fill',
          animationTimingFunction: 'linear',
          animationTimeline: 'scroll(root block)',
          // 움직임 줄이기는 여기서 직접 끈다 — 이 애니메이션은 시간이 아니라 스크롤에 묶여 있어
          // 시간 토큰(0.01ms)이 끄지 못한다. 이름만 지워도 애니메이션이 사라진다.
          _motionReduce: {
            animationName: 'none',
          },
        })}
      />
    </div>
  );
};
