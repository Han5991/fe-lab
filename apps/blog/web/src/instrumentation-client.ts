/**
 * 실사용자 Web Vitals를 GA4로 보낸다(매개변수는 `components/webVitals.ts`).
 *
 * 이 파일은 Next가 hydrate 직전에 브라우저에서 한 번 실행한다 — 지표 등록에 컴포넌트도
 * 훅도 필요 없다. 다만 GA(`gtag`)는 레이아웃의 `GoogleAnalytics`가 hydration 뒤에 초기화하고,
 * 그 전에 보고된 지표는 `sendGAEvent`가 경고만 남기고 버린다(곧바로 등록하면 FCP·TTFB가
 * 사라지는 것을 e2e가 잡는다). web-vitals는 지난 성능 항목(buffered)도 읽으므로 늦게 등록해도
 * 잃는 지표가 없다 — `gtag`가 생긴 뒤에 등록한다. GA는 프로덕션에서만 실린다(레이아웃).
 */
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import { reportWebVital } from './components/webVitals';

declare global {
  interface Window {
    gtag?: unknown;
  }
}

function registerWhenGaReady(triesLeft: number): void {
  if (typeof window.gtag === 'function') {
    for (const on of [onCLS, onFCP, onINP, onLCP, onTTFB]) on(reportWebVital);
  } else if (triesLeft > 0) {
    setTimeout(registerWhenGaReady, 100, triesLeft - 1);
  }
}

// 100ms × 100 — GA가 10초 안에 초기화되지 않으면 기다림을 접는다.
if (process.env.NODE_ENV === 'production') registerWhenGaReady(100);
