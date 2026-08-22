/**
 * About 페이지에 숫자로 뜨는 값들 — 헤더의 통계 3칸과 시리즈 카드의 편수.
 *
 * 상수가 아니라 함수인 이유: dev에서 `readAllPosts()`는 캐시를 건너뛰고 매번
 * fs를 다시 읽는데(`repository.ts`), 그 설계는 요청마다 호출된다는 전제 위에
 * 있다. 모듈 평가 시 한 번 계산해 두면 dev 서버가 재시작 전까지 첫 요청 시점
 * 숫자에 고정돼, 글을 추가해도 화면의 편수가 그대로다.
 */
import { MERGED_PR_COUNT_FALLBACK } from '@/content.values.mts';
import { getAllPostSummaries, getAllSeries } from '@/src/content';

export interface AboutStat {
  value: string;
  label: string;
}

export function getAboutStats(): AboutStat[] {
  return [
    { value: String(getAllPostSummaries().length), label: '블로그 포스트' },
    {
      // PR 수만 비자명: CI가 빌드 타임에 NEXT_PUBLIC_PR_COUNT로 주입, 로컬·실패 시 폴백.
      // 폴백 값은 홈의 오픈소스 스트립과 같은 숫자를 보여야 해서 상수 하나를 공유한다.
      value: process.env.NEXT_PUBLIC_PR_COUNT || MERGED_PR_COUNT_FALLBACK,
      label: 'PR 승인',
    },
    { value: '2', label: '컨퍼런스' },
  ];
}

// 주요 시리즈 카드의 편수. 손으로 적어두면 글이 늘 때 조용히 어긋나므로
// /series 페이지와 같은 집계원(getAllSeries)에서 그때그때 읽는다.
export function getSeriesPostCounts(): ReadonlyMap<string, number> {
  return new Map(getAllSeries().map(s => [s.id, s.count]));
}
