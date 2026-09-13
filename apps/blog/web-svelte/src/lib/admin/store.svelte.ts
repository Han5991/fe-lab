import type { AdminSession, PostStatDetail } from '@blog/analytics';
import {
  authRepository,
  getAdminPostsIndex,
  getAllPostStats,
  getAllPostsTrends,
} from '$lib/domain/admin';
import { buildDashboardData } from './dashboardData.ts';

/**
 * Admin 데이터 캐시 — **React Query 자리에 무엇이 오는가**에 대한 답이다.
 *
 * React 판은 `useSuspenseQuery`로 대시보드 데이터와 세션을 캐시하고, 라우트를
 * 오갈 때 재요청을 막고, 로그아웃에서 `removeQueries({ queryKey: ['admin'] })`로
 * 이전 계정의 집계를 비운다. 이 앱에는 그 라이브러리가 없다.
 *
 * 대신 필요한 것을 세어 보면 셋이다 — **한 번만 받기 · 라우트 간 공유 ·
 * 로그아웃에서 비우기**. 세 화면이 같은 데이터를 보는데 그게 왕복 세 번이면
 * 안 되고, 계정이 바뀌면 남아 있으면 안 된다. 나머지(재검증 정책·윈도우 포커스
 * 리페치·낙관적 갱신)는 이 대시보드가 쓰지 않는다.
 *
 * 그래서 **약속(Promise)을 모듈에 들고 있는 것**이 전부다. 두 번째 소비자는 같은
 * 약속을 기다리고, `clear()`가 그것을 버린다. 서버에서는 평가되지 않는다 —
 * 호출자가 브라우저에서만 부른다(`$effect`·이벤트 핸들러).
 *
 * 이게 React Query와 같다는 뜻은 아니다. 없는 것을 적어 두면: stale 판정,
 * 자동 재시도, 요청 취소, 여러 탭 동기화가 없다. 이 화면들이 그것을 쓰지 않을
 * 뿐이고, 쓰기 시작하면 라이브러리를 들이는 편이 낫다.
 */

let dashboard: Promise<PostStatDetail[]> | null = null;
let session: Promise<AdminSession | null> | null = null;

/** 대시보드 데이터 — 세 출처를 병렬로 받아 글 단위로 합친다. */
export function loadDashboard(): Promise<PostStatDetail[]> {
  dashboard ??= Promise.all([
    getAdminPostsIndex(),
    getAllPostStats(),
    getAllPostsTrends(),
  ])
    .then(([metadata, stats, trends]) =>
      buildDashboardData(metadata, stats, trends),
    )
    .catch((error: unknown) => {
      // 실패한 약속을 캐시에 남기면 다시 시도할 길이 없다 — 화면이 영영
      // 에러로 굳는다. 버리고 던져서, 다음 마운트가 새로 받게 한다.
      dashboard = null;
      throw error;
    });
  return dashboard;
}

/** 현재 세션. 가드와 로그인 화면이 함께 본다. */
export function loadSession(): Promise<AdminSession | null> {
  session ??= authRepository.getAdminSession().catch((error: unknown) => {
    session = null;
    throw error;
  });
  return session;
}

/**
 * 로그아웃·계정 전환에서 부른다. **비우지 않으면 이전 계정의 집계가 남는다** —
 * React 판이 `removeQueries`를 부르는 자리와 같은 이유다.
 */
export function clearAdminCache(): void {
  dashboard = null;
  session = null;
}
