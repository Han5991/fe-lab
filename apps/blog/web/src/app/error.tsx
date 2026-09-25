'use client';

import { useEffect } from 'react';
import { ErrorFallback } from '@/src/components/ErrorFallback';

interface RouteErrorProps {
  error: Error & { digest?: string };
  /** Next 16이 넘기는 복구 함수(세그먼트를 다시 받아 그린다) — 옛 이름 `reset`도 함께 온다. */
  retry: () => void;
}

/** 라우트 에러 경계 — 헤더·푸터는 남기고 본문 자리만 바꾼다(정적 export라 클라이언트 예외만 온다). */
export default function RouteError({ error, retry }: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorFallback onRetry={retry} />;
}
