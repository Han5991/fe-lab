'use client';

import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@/src/styles/globals.css';
import { useEffect, useSyncExternalStore } from 'react';
import { SITE_NAME } from '@/content.values.mts';
import { ErrorFallback } from '@/src/components/ErrorFallback';
import { readCookie, systemTheme, type Theme } from '@/src/hooks/useTheme';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  /** Next 16이 넘기는 복구 함수(세그먼트를 다시 받아 그린다) — 옛 이름 `reset`도 함께 온다. */
  retry: () => void;
}

const neverChanges = () => () => {
  // 에러 화면이 떠 있는 동안 테마를 바꿀 길이 없다 — 구독할 변화가 없다.
};
const clientTheme = (): Theme => readCookie() ?? systemTheme();
const serverTheme = (): Theme => 'dark';

/**
 * 루트 레이아웃이 던졌을 때의 마지막 경계 — 레이아웃을 대신하므로 `<html>`·전역
 * 스타일·테마(쿠키 → 시스템 설정)를 스스로 갖춘다.
 */
export default function GlobalError({ error, retry }: GlobalErrorProps) {
  const theme = useSyncExternalStore(neverChanges, clientTheme, serverTheme);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko" data-theme={theme}>
      <body>
        <title>{`오류 | ${SITE_NAME}`}</title>
        <main>
          <ErrorFallback onRetry={retry} />
        </main>
      </body>
    </html>
  );
}
