'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { reportWebVital } from './webVitals';

/**
 * 실사용자의 Core Web Vitals(LCP·INP·CLS)와 FCP·TTFB를 GA4로 보낸다. 레이아웃에서
 * `GoogleAnalytics` **뒤에** 둔다 — effect가 형제 순서대로 돌아, GA 초기화 스크립트가
 * `dataLayer`를 만든 뒤에 지표가 등록된다.
 */
export function WebVitalsReporter() {
  useReportWebVitals(reportWebVital);
  return null;
}
