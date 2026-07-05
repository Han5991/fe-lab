'use client';

import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

// html[data-theme]를 단일 진실원으로 삼는다. 초기값은 layout.tsx의 <head>
// 인라인 스크립트가 paint 전에 설정한다(쿠키 → 없으면 시스템 설정, FOUC 방지).
// useSyncExternalStore로 읽어 effect 내 setState 없이 외부 상태를 구독한다.
const COOKIE = 'theme';
const listeners = new Set<() => void>();

function readCookie(): Theme | null {
  const m =
    typeof document !== 'undefined'
      ? document.cookie.match(/(?:^|;\s*)theme=(dark|light)/)
      : null;
  return m ? (m[1] as Theme) : null;
}

function writeCookie(t: Theme) {
  // 1년 유지 · path=/ · SameSite=Lax (구독/서버 어디서든 읽히도록 쿠키에 저장)
  document.cookie = `${COOKIE}=${t}; path=/; max-age=31536000; SameSite=Lax`;
}

function systemTheme(): Theme {
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

function getSnapshot(): Theme {
  return (
    (document.documentElement.dataset.theme as Theme | undefined) ?? 'dark'
  );
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
  document.documentElement.dataset.theme = next;
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
