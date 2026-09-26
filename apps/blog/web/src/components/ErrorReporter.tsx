'use client';

import { useEffect } from 'react';
import { reportError, type ReportError } from './errorReporting';

interface ErrorReporterProps {
  report?: ReportError;
}

/**
 * 에러 경계가 받지 못하는 예외(이벤트 핸들러·비동기)를 수집한다. 이 사이트의 스크립트에서 난
 * 에러와 `Error`로 거절된 promise만 — 확장 프로그램·교차 출처 태그의 에러까지 세면 신호가 묻힌다.
 */
export function ErrorReporter({ report = reportError }: ErrorReporterProps) {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (!event.filename.startsWith(window.location.origin)) return;
      report(event.error ?? event.message, false);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof Error) report(event.reason, false);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [report]);

  return null;
}
