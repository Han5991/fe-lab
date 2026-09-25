'use client';

import { useEffect } from 'react';
import { ErrorFallback } from '@/src/components/ErrorFallback';

interface RouteErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

/**
 * 라우트 에러 경계. 예전엔 `src/app`에 에러 경계가 하나도 없어서, 글 페이지의
 * 부수효과 잎(최근 본 글 기록 등) 하나가 던진 예외가 헤더·푸터까지 통째로 Next
 * 기본 에러 화면으로 바꿨다. 여기서 받으면 루트 레이아웃(헤더·푸터)은 남고 본문
 * 자리만 이 화면으로 바뀐다. 정적 export라 서버 에러는 없고, 받는 건 전부
 * 클라이언트 렌더·effect 예외다.
 */
export default function RouteError({ error, retry }: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorFallback onRetry={retry} />;
}
