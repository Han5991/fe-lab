'use client';

import type { ReactNode } from 'react';
import {
  environmentManager,
  type QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { createQueryClient } from './queryClient';

let browserQueryClient: QueryClient | undefined;

/**
 * 프리렌더(서버)에서는 렌더마다 새로 만들고, 브라우저에서는 모듈에 하나를 두고 재사용한다 — TanStack
 * Query 문서가 Next.js에 권하는 모양이다. admin 레이아웃은 공개 페이지로 나가면 언마운트되지만
 * 클라이언트는 남는다 — 루트에 Provider가 있던 때와 같은 수명이라, 캐시가 남아 있는 동안(gcTime)
 * 돌아오면 세션 확인 폴백 없이 캐시된 화면부터 그린다.
 */
function getAdminQueryClient() {
  if (environmentManager.isServer()) return createQueryClient();
  browserQueryClient ??= createQueryClient();
  return browserQueryClient;
}

/**
 * admin 영역의 React Query Provider — admin 레이아웃이 가장 바깥에서 렌더한다(`layout.tsx` 주석).
 * children만 받는다 — `PageBoundary`를 여기서 import하면 #573이 막은 클라이언트 그래프 유입이 다시 생긴다.
 */
export function AdminQueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={getAdminQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}
