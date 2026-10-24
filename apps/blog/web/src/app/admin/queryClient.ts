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
 * admin 영역의 QueryClient — `AdminQueryProvider`가 만든다.
 *
 * 쿼리 실패는 캐시에서 GA4로 보고한다. admin 데이터 쿼리는 에러 경계가 401·403을 거른 뒤
 * 보고하므로 meta(`errorsReportedByBoundary`)로 건너뛰고, 여기서 보고하는 것은 그 meta가 없는
 * 쿼리다 — 지금은 세션 조회뿐이고, 오류 응답은 저장소가 null로 바꾸므로 예외로 끝난 조회만 온다.
 * 경계 밖 쿼리가 새로 생겨도 실패가 묻히지 않게 두는 안전망이다. 재시도가 끝난 뒤 한 번만 불린다.
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
