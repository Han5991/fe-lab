import type { SsgoiConfig } from '@ssgoi/react';

type PreserveScroll = NonNullable<SsgoiConfig['preserveScroll']>;
type PreserveScrollValue = Exclude<
  PreserveScroll,
  (isMobile: boolean) => unknown
>;

/**
 * 첫 로드 동안 쓰는 공유 키. SSGOI는 공유 키에 저장된 위치가 **없으면** 스크롤을
 * 건드리지 않는다(있을 때만 복원한다). 첫 로드에는 아무것도 저장돼 있지 않으니
 * 이 키를 주면 SSGOI의 첫 스크롤이 통째로 빠진다.
 */
export const LANDING_KEY = 'landing-fragment';

/**
 * 이 문서가 조각이 붙은 주소로 열렸는가 — `#헤딩`이거나 문장 공유 링크(`#:~:text=`).
 *
 * 문장 지시어는 브라우저가 `location`에서 지운다(페이지가 어느 문장으로 들어왔는지
 * 못 보게 하려는 사양). 내비게이션 타이밍 항목의 주소에는 남아 있어(Chromium
 * 확인) 거기서 본다. 거기서도 지우는 브라우저라면 `#헤딩`만 살리고 문장 링크는
 * 예전처럼 맨 위에서 열린다.
 */
export function landedWithFragment(win: Window): boolean {
  if (win.location.hash !== '') return true;
  const entry = win.performance.getEntriesByType('navigation')[0];
  return entry?.name.includes('#') ?? false;
}

export interface LandingScroll {
  /** SSGOI config의 `preserveScroll`로 넘긴다. */
  preserveScroll: PreserveScroll;
  /** 아직 첫 로드 예외 중인가 */
  isLanding: () => boolean;
  /** 예외를 거둔다 — 다음 이동부터 `base` 규칙 그대로다. */
  end: () => void;
}

/**
 * SSGOI의 `preserveScroll`에 첫 로드 예외를 끼운다.
 *
 * 글 상세는 "언제나 맨 위에서 시작"(`base`의 exclude)인데, SSGOI는 이 규칙을
 * 클라이언트 이동뿐 아니라 **첫 로드**에도 적용한다 — 하이드레이션 직후
 * `scrollTo({top: 0})`을 부른다. 그래서 `#헤딩`으로 연 글도, 문장 공유 링크로 연
 * 글도 브라우저가 그 자리로 스크롤한 직후 맨 위로 되돌아갔다.
 *
 * 조각을 달고 열렸으면(`landed`) 예외를 거둘 때까지 공유 키를 줘서 SSGOI의 첫
 * 스크롤을 뺀다. 언제 거두는지는 호출부(PageTransition)가 정한다.
 */
export function createLandingScroll(
  base: PreserveScrollValue,
  landed: boolean,
): LandingScroll {
  let landing = landed;
  return {
    preserveScroll: () => (landing ? { key: LANDING_KEY } : base),
    isLanding: () => landing,
    end: () => {
      landing = false;
    },
  };
}
