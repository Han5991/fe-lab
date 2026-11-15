'use client';

import { useCallback, useEffect, useState, type RefObject } from 'react';

/**
 * 퇴장 이벤트를 놓쳤을 때 백스톱이 계산된 시간 위에 더 기다리는 여유(ms) — Astryx
 * `useDrawerDialogPresence`와 같은 값.
 */
const BACKSTOP_BUFFER_MS = 50;

export type PresenceState = 'open' | 'closing' | 'closed';

/** `0.41s, 175ms` → [410, 175]. 읽을 수 없는 항목은 0이다. */
const parseTimes = (value: string): number[] =>
  value.split(',').map(part => {
    const trimmed = part.trim();
    const time = Number.parseFloat(trimmed);
    if (!Number.isFinite(time)) return 0;
    return trimmed.endsWith('ms') ? time : time * 1000;
  });

/** 계산된 스타일에서 `watched` 속성 전환의 시간+지연(ms) — 전환이 없으면 0. */
function transitionMs(el: Element, watched: string): number {
  const style = getComputedStyle(el);
  const durations = parseTimes(style.transitionDuration);
  const delays = parseTimes(style.transitionDelay);
  return style.transitionProperty
    .split(',')
    .map(property => property.trim())
    .reduce((longest, property, i) => {
      if (property !== watched && property !== 'all') return longest;
      const duration = durations[i % durations.length] ?? 0;
      const delay = delays[i % delays.length] ?? 0;
      return Math.max(longest, duration + delay);
    }, 0);
}

/**
 * 닫을 때 패널의 퇴장 전환이 끝날 때까지 마운트를 유지한다(바텀시트용). `property`는 퇴장을
 * 이끄는 CSS 속성이다 — 시트가 미끄러지면 `transform`, FAB에서 펼쳐지면 `clip-path`.
 *
 * - `open`·`close`는 이벤트 핸들러에서 부른다. `close`는 그 순간 패널의 계산된 전환 시간을
 *   읽어, 전환이 없으면(움직임이 꺼진 CSS 없는 환경 — jsdom) 곧바로 `closed`로 간다. 그래서
 *   테스트는 닫자마자 다이얼로그가 사라진 DOM을 본다.
 * - `closing` 동안 패널은 퇴장 스타일(쓰는 쪽의 `data-state="closing"`)로 움직이고, `transitionend`가
 *   오면 `closed`가 된다. 이벤트가 끝내 오지 않아도(요소가 숨겨지는 등) 계산된 시간 +
 *   여유 뒤의 백스톱이 닫는다 — Astryx `useDrawerDialogPresence`와 같은 구조다.
 * - 열리는 중에 닫으면 열림 전환이 취소되며 `transitioncancel`이 온다. 퇴장의 끝은 `transitionend`와
 *   백스톱만으로 판정한다 — 취소를 끝으로 세면 시트가 되돌아가지 않고 사라진다.
 * - 움직임 줄이기에서는 시간 토큰이 0.01ms라 전환이 즉시 끝나고 이벤트는 그대로 온다.
 */
export function usePresence(
  panelRef: RefObject<HTMLElement | null>,
  property: string,
): {
  state: PresenceState;
  open: () => void;
  close: () => void;
  /** 퇴장 전환 없이 곧바로 닫는다 — 닫힘과 겹치면 안 되는 다른 움직임(스크롤)이 따라올 때. */
  closeNow: () => void;
} {
  const [state, setState] = useState<PresenceState>('closed');

  const open = useCallback(() => setState('open'), []);
  const close = useCallback(() => {
    const panel = panelRef.current;
    const animates = panel !== null && transitionMs(panel, property) > 0;
    setState(current => {
      if (current === 'closed') return current;
      return animates ? 'closing' : 'closed';
    });
  }, [panelRef, property]);
  const closeNow = useCallback(() => setState('closed'), []);

  useEffect(() => {
    const panel = panelRef.current;
    if (state !== 'closing' || panel === null) return;
    // 다시 열린 뒤 늦게 온 이벤트가 열린 시트를 닫지 않게, 닫는 중일 때만 닫는다.
    const finish = () =>
      setState(current => (current === 'closing' ? 'closed' : current));
    const onEnd = (event: TransitionEvent) => {
      if (event.target === panel && event.propertyName === property) {
        finish();
      }
    };
    // `transitioncancel`은 듣지 않는다 — 열리는 중에 닫으면 진행 중이던 열림 전환이 취소되며
    // 그 이벤트가 오는데, 이것을 퇴장 끝으로 세면 시트가 되돌아가지 않고 그 자리에서
    // 언마운트된다. 퇴장 전환이 끝내 오지 않는 경우는 아래 백스톱이 닫는다.
    panel.addEventListener('transitionend', onEnd);
    const backstop = setTimeout(
      finish,
      transitionMs(panel, property) + BACKSTOP_BUFFER_MS,
    );
    return () => {
      panel.removeEventListener('transitionend', onEnd);
      clearTimeout(backstop);
    };
  }, [state, panelRef, property]);

  return { state, open, close, closeNow };
}

/** `useHeldUntilExit`가 돌려주는 것. */
export interface HeldValue<T> {
  /** 그릴 값 — 값이 있으면 그 값이고, 값이 막 사라졌으면 퇴장 전환이 끝날 때까지 직전 값이다. */
  value: T | null;
  /**
   * 이 값이 빈 자리에 생겼는가 — 열림(없음 → 값)과 교체(값 → 다른 값)를 가른다. 처음 그릴 때부터 있던
   * 값은 생긴 것이 아니다.
   */
  appeared: boolean;
  /** 값은 사라졌고, 퇴장 전환 동안 직전 값을 붙들고 있다. */
  leaving: boolean;
}

/**
 * 값이 사라져도(`null`) `elementRef` 요소의 `property` 전환이 끝날 때까지 직전 값을 붙든다 — 닫히며 빠져나가는
 * 칼럼이 그동안 내용을 그리게. 전환은 값을 그리는 요소가 아니라 바깥 요소(트랙을 바꾸는 그리드)의 것이어도 된다.
 *
 * `usePresence`와 달리 열고 닫음을 이벤트 핸들러가 아니라 값이 정한다 — 주소에서 읽은 값이면 뒤로 가기처럼 쓰는
 * 쪽이 부르지 않은 닫힘도 같은 길로 나간다.
 *
 * - 값이 생기거나 바뀌면 렌더 중에 바로 따른다(이전 렌더의 값을 상태로 들고 비교하는 React 패턴).
 * - 붙드는 동안 `transitionend`(그 요소·그 속성)가 오면 놓는다. 오지 않아도 계산된 시간 + 여유 뒤의 백스톱이
 *   놓는다 — 전환이 없는 환경(jsdom)에서는 여유만큼 뒤다. 놓는 갱신은 transition이 아니라 React가 View
 *   Transition을 열지 않는다.
 * - 붙드는 중에 같은 값이 다시 오면 그대로 이어 그리고(전환이 되돌아간다), 다른 값이 오면 교체다.
 * - 움직임 줄이기에서는 시간 토큰이 0.01ms라 전환이 바로 끝나고 이벤트는 그대로 온다.
 */
export function useHeldUntilExit<T>(
  value: T | null,
  elementRef: RefObject<HTMLElement | null>,
  property: string,
): HeldValue<T> {
  const [held, setHeld] = useState({ value, appeared: false });
  if (value !== null && value !== held.value) {
    setHeld({ value, appeared: held.value === null });
  }
  const leaving = value === null && held.value !== null;

  useEffect(() => {
    if (!leaving) return;
    const element = elementRef.current;
    const release = () => setHeld({ value: null, appeared: false });
    const onEnd = (event: TransitionEvent) => {
      if (event.target === element && event.propertyName === property) {
        release();
      }
    };
    // `transitioncancel`은 듣지 않는다 — 닫히는 중에 다시 열면 그 퇴장이 취소되며 오는 이벤트다.
    element?.addEventListener('transitionend', onEnd);
    const backstop = setTimeout(
      release,
      (element === null ? 0 : transitionMs(element, property)) +
        BACKSTOP_BUFFER_MS,
    );
    return () => {
      element?.removeEventListener('transitionend', onEnd);
      clearTimeout(backstop);
    };
  }, [leaving, elementRef, property]);

  return { value: held.value, appeared: held.appeared, leaving };
}
