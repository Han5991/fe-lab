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

/** 계산된 스타일에서 transform 전환의 시간+지연(ms) — 전환이 없으면 0. */
function transformTransitionMs(el: Element): number {
  const style = getComputedStyle(el);
  const durations = parseTimes(style.transitionDuration);
  const delays = parseTimes(style.transitionDelay);
  return style.transitionProperty
    .split(',')
    .map(property => property.trim())
    .reduce((longest, property, i) => {
      if (property !== 'transform' && property !== 'all') return longest;
      const duration = durations[i % durations.length] ?? 0;
      const delay = delays[i % delays.length] ?? 0;
      return Math.max(longest, duration + delay);
    }, 0);
}

/**
 * 닫을 때 패널의 transform 퇴장 전환이 끝날 때까지 마운트를 유지한다(바텀시트용).
 *
 * - `open`·`close`는 이벤트 핸들러에서 부른다. `close`는 그 순간 패널의 계산된 전환 시간을
 *   읽어, 전환이 없으면(움직임이 꺼진 CSS 없는 환경 — jsdom) 곧바로 `closed`로 간다. 그래서
 *   테스트는 닫자마자 다이얼로그가 사라진 DOM을 본다.
 * - `closing` 동안 패널은 퇴장 스타일(쓰는 쪽의 `data-closing`)로 움직이고, `transitionend`가
 *   오면 `closed`가 된다. 이벤트가 끝내 오지 않아도(요소가 숨겨지는 등) 계산된 시간 +
 *   여유 뒤의 백스톱이 닫는다 — Astryx `useDrawerDialogPresence`와 같은 구조다.
 * - 열리는 중에 닫으면 열림 전환이 취소되며 `transitioncancel`이 온다. 퇴장의 끝은 `transitionend`와
 *   백스톱만으로 판정한다 — 취소를 끝으로 세면 시트가 되돌아가지 않고 사라진다.
 * - 움직임 줄이기에서는 시간 토큰이 0.01ms라 전환이 즉시 끝나고 이벤트는 그대로 온다.
 */
export function usePresence(panelRef: RefObject<HTMLElement | null>): {
  state: PresenceState;
  open: () => void;
  close: () => void;
} {
  const [state, setState] = useState<PresenceState>('closed');

  const open = useCallback(() => setState('open'), []);
  const close = useCallback(() => {
    const panel = panelRef.current;
    const animates = panel !== null && transformTransitionMs(panel) > 0;
    setState(current => {
      if (current === 'closed') return current;
      return animates ? 'closing' : 'closed';
    });
  }, [panelRef]);

  useEffect(() => {
    const panel = panelRef.current;
    if (state !== 'closing' || panel === null) return;
    // 다시 열린 뒤 늦게 온 이벤트가 열린 시트를 닫지 않게, 닫는 중일 때만 닫는다.
    const finish = () =>
      setState(current => (current === 'closing' ? 'closed' : current));
    const onEnd = (event: TransitionEvent) => {
      if (event.target === panel && event.propertyName === 'transform') {
        finish();
      }
    };
    // `transitioncancel`은 듣지 않는다 — 열리는 중에 닫으면 진행 중이던 열림 전환이 취소되며
    // 그 이벤트가 오는데, 이것을 퇴장 끝으로 세면 시트가 되돌아가지 않고 그 자리에서
    // 언마운트된다. 퇴장 전환이 끝내 오지 않는 경우는 아래 백스톱이 닫는다.
    panel.addEventListener('transitionend', onEnd);
    const backstop = setTimeout(
      finish,
      transformTransitionMs(panel) + BACKSTOP_BUFFER_MS,
    );
    return () => {
      panel.removeEventListener('transitionend', onEnd);
      clearTimeout(backstop);
    };
  }, [state, panelRef]);

  return { state, open, close };
}
