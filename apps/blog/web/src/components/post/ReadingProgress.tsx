import { css } from '@blog/styled-system/css';

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
    className={css({
      pos: 'fixed',
      top: '14',
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
        bg: 'accent.600',
        transformOrigin: '[0% 50%]',
        transform: '[scaleX(0)]',
        // 단축 속성 `animation`을 쓰지 않고 longhand만 준다. 단축 속성은
        // animation-timeline까지 auto로 리셋하므로, 같이 쓰면 선언 순서(단축이
        // 먼저)에 기대야 했다 — longhand끼리는 서로를 건드리지 않아 순서와 무관하다.
        // 키프레임 이름은 panda.config.ts의 keyframes에서 오므로 타입이 검사한다.
        animationName: 'reading-progress-fill',
        animationTimingFunction: 'linear',
        animationTimeline: 'scroll(root block)',
        // 여기만 단축 속성 — 미디어 규칙이 기본 규칙보다 뒤에 나와 애니메이션을
        // 통째로 끈다(타임라인 리셋도 애니메이션이 없으니 무해).
        '@media (prefers-reduced-motion: reduce)': {
          animation: '[none]',
        },
      })}
    />
  </div>
);
