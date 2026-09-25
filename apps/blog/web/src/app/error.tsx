'use client';

import { useEffect } from 'react';
import { ErrorFallback } from '@/src/components/ErrorFallback';

interface RouteErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

/** 라우트 에러 경계 — 헤더·푸터는 남기고 본문 자리만 바꾼다(정적 export라 클라이언트 예외만 온다). */
export default function RouteError({ error, retry }: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorFallback onRetry={retry} />;
}
