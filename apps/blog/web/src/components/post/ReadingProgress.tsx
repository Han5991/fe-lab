import { css } from '@blog/styled-system/css';
import { siteHeaderStyle } from '../siteHeader';

/**
 * 페이지 최상단 sticky 진행률 바.
 * scroll() 타임라인으로 애니메이션 진행도를 스크롤 위치에 직접 묶는다
 * (JS scroll 리스너 없이 프레임 지연 없음). width가 아닌 transform: scaleX()를
 * 움직여 컴포지터 스레드에서만 처리되게 한다 — width는 레이아웃을 유발해
 * 매 스크롤 프레임마다 reflow가 돈다.
 *
 * scroll(root block): 인자 없는 scroll()은 가장 가까운 스크롤 조상을
 * 찾는데(nearest), 이 바가 position: fixed라 의도한 document 스크롤러가 안
 * 잡힐 수 있어 명시한다.
 */
export const ReadingProgress = () => (
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
