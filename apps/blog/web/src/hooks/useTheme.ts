'use client';

import { useSyncExternalStore } from 'react';
import { THEME_COOKIE, THEME_COOKIE_MATCH } from './theme-cookie';

export type Theme = 'light' | 'dark';

// html[data-theme]를 단일 진실원으로 삼는다. 초기값은 layout.tsx의 <head>
// 인라인 스크립트가 paint 전에 설정한다(쿠키 → 없으면 시스템 설정, FOUC 방지).
// useSyncExternalStore로 읽어 effect 내 setState 없이 외부 상태를 구독한다.
const listeners = new Set<() => void>();

// 쿠키 값도 data-theme 속성도 브라우저가 주는 그냥 문자열이다. 둘 다 Theme라고
// 단정하는 대신 여기서 리터럴 비교로 좁힌다 — 반환 타입이 단언이 아니라 컴파일러가
// 확인한 결과가 되고, 유니온에 값을 더하면 이 한 곳만 고치면 된다.
function toTheme(value: string | undefined): Theme | null {
  return value === 'light' || value === 'dark' ? value : null;
}

// readCookie/writeCookie/systemTheme/getSnapshot은 순수 헬퍼로 단위 테스트에서
// 직접 검증하려고 export한다(sibling useRecentViews와 동일한 컨벤션).
export function readCookie(): Theme | null {
  // 쿠키 정규식은 theme-cookie.ts의 THEME_COOKIE_MATCH 단일 소스를 쓴다
  // (layout.tsx의 FOUC 스크립트도 같은 소스를 주입 → 두 곳이 어긋날 수 없음).
  const m =
    typeof document !== 'undefined'
      ? document.cookie.match(new RegExp(THEME_COOKIE_MATCH))
      : null;
  return toTheme(m?.[1]);
}

export function writeCookie(t: Theme) {
  // 1년 유지 · path=/ · SameSite=Lax (구독/서버 어디서든 읽히도록 쿠키에 저장)
  document.cookie = `${THEME_COOKIE}=${t}; path=/; max-age=31536000; SameSite=Lax`;
}

export function systemTheme(): Theme {
  return typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getSnapshot(): Theme {
  // 속성이 없을 때뿐 아니라 모르는 값이 들어 있을 때도 dark로 떨어뜨린다. 그래야
  // 반환값이 getServerSnapshot과 같은 두 값 안에 머물러 hydration이 어긋나지 않는다.
  return toTheme(document.documentElement.dataset['theme']) ?? 'dark';
}

// SSG/SSR 기본은 dark (html data-theme="dark"와 일치 → hydration 안정)
function getServerSnapshot(): Theme {
  return 'dark';
}

/** 현재 테마를 구독한다. data-theme 변경 시 리렌더된다. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function applyTheme(next: Theme) {
  document.documentElement.dataset['theme'] = next;
  listeners.forEach(l => l());
}

// 테마 전환은 View Transitions API로 전체 페이지를 한 번의 컴포지터
// 크로스페이드로 처리한다. 예전처럼 모든 요소에 color/fill transition을 걸면
// 차트·코드 하이라이팅이 많은 페이지(analytics 등)에서 요소 수만큼 style/paint가
// 터져 버벅였다. 루트 스냅샷 크로스페이드는 요소 수와 무관하게 GPU에서 처리돼
// 매끄럽다. 미지원 브라우저·reduced-motion은 즉시 전환.
function applyWithTransition(next: Theme) {
  if (
    prefersReducedMotion() ||
    typeof document.startViewTransition !== 'function'
  ) {
    applyTheme(next);
    return;
  }
  document.startViewTransition(() => applyTheme(next));
}

/** 사용자가 명시적으로 테마를 바꾼다 → 쿠키에 저장하고 부드럽게 전환. */
export function setTheme(next: Theme) {
  writeCookie(next);
  applyWithTransition(next);
}

// 시스템 설정 변화 추적: 사용자가 아직 명시적 선택(쿠키)을 안 했다면 시스템을 따른다.
if (typeof window !== 'undefined' && window.matchMedia) {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (!readCookie()) applyWithTransition(systemTheme());
    });
}
