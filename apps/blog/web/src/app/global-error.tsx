'use client';

import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@/src/styles/globals.css';
import { useEffect, useSyncExternalStore } from 'react';
import { SITE_NAME } from '@/content.values.mts';
import { ErrorFallback } from '@/src/components/ErrorFallback';
import { readCookie, systemTheme, type Theme } from '@/src/hooks/useTheme';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

const neverChanges = () => () => {
  // 에러 화면이 떠 있는 동안 테마를 바꿀 길이 없다 — 구독할 변화가 없다.
};
const clientTheme = (): Theme => readCookie() ?? systemTheme();
const serverTheme = (): Theme => 'dark';

/**
 * 루트 레이아웃(헤더·Providers 포함) 자체가 던졌을 때의 마지막 경계.
 * 이 파일은 루트 레이아웃을 **대신**하므로 `<html>`·`<body>`와 전역 스타일을
 * 직접 가져와야 한다. 테마도 루트 레이아웃의 인라인 스크립트가 없으니, 같은
 * 규칙(쿠키 → 시스템 설정)으로 여기서 다시 고른다.
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
