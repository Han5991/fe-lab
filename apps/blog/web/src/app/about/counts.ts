/**
 * About 페이지에 숫자로 뜨는 값들 — 헤더의 통계 3칸과 시리즈 카드의 편수.
 *
 * 페이지 컴포넌트 안에 있을 이유가 없는 값입니다. 요청이나 파라미터에 따라
 * 달라지지 않고 빌드 시각의 콘텐츠 집계와 env 하나로 정해지므로, 모듈이
 * 평가될 때 한 번 계산해 둡니다.
 */
import { getAllPostSummaries, getAllSeries } from '@/src/content';
import { MERGED_PR_COUNT_FALLBACK } from '@blog/content';

export interface AboutStat {
  value: string;
  label: string;
}

// PR 수만 비자명: CI가 빌드 타임에 NEXT_PUBLIC_PR_COUNT로 주입, 로컬·실패 시 폴백.
// 폴백 값은 홈의 오픈소스 스트립과 같은 숫자를 보여야 해서 상수 하나를 공유한다.
export const ABOUT_STATS: readonly AboutStat[] = [
  { value: String(getAllPostSummaries().length), label: '블로그 포스트' },
  {
    value: process.env.NEXT_PUBLIC_PR_COUNT || MERGED_PR_COUNT_FALLBACK,
    label: 'PR 승인',
  },
  { value: '2', label: '컨퍼런스' },
];

// 주요 시리즈 카드의 편수. 손으로 적어두면 글이 늘 때 조용히 어긋나므로
// /series 페이지와 같은 집계원(getAllSeries)에서 그때그때 읽는다.
export const SERIES_POST_COUNTS: ReadonlyMap<string, number> = new Map(
  getAllSeries().map(s => [s.id, s.count]),
);
