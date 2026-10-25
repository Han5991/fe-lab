import { QueryCache, QueryClient } from '@tanstack/react-query';
import { reportError, type ReportError } from '@/src/components/errorReporting';

declare module '@tanstack/react-query' {
  interface Register {
    // 쿼리 meta의 모양은 여기 한 곳에서 정한다 — 쓰는 쪽(쿼리 기본값)과 읽는 쪽(아래
    // QueryCache)이 이 선언으로 대조돼, 키 이름이 어긋나면 컴파일 에러다.
    queryMeta: {
      /**
       * 이 쿼리의 실패는 감싼 에러 경계가 종류를 가려 보고한다(admin: 401·403은 정상
       * 흐름이라 보고하지 않는다). 캐시는 같은 실패를 다시 보고하지 않는다.
       */
      errorsReportedByBoundary?: true;
    };
  }
}

/**
 * 앱 전체가 쓰는 QueryClient.
 *
 * 쿼리 실패는 캐시에서 GA4로 보고한다. 공개 화면은 지금 쿼리를 쓰지 않는다(인기순 조회수는
 * `usePopularViewCounts`가 직접 보고한다). 에러 경계 밖 쿼리가 생기면 여기서 보고한다 — 화면에
 * 드러나지 않는 실패는 보고하지 않으면 Supabase가 멈춰도 아무 데도 남지 않는다. 재시도가 끝난 뒤
 * 한 번만 불린다.
 */
export function createQueryClient(report: ReportError = reportError) {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.meta?.errorsReportedByBoundary) return;
        report(error, false);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
