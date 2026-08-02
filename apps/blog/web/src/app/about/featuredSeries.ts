/**
 * About 페이지 "주요 시리즈" 카드 목록.
 *
 * `id`는 표시명이 아니라 **`apps/blog/posts/` 아래 폴더 경로 그대로**입니다.
 * 카드 링크는 `/posts/?series=<id>`인데, 아카이브 필터는 이 값을
 * `post.series`(= 폴더 경로, `repository.ts`)와 **정확히 일치**로 비교합니다.
 * 축약어나 표시명을 넣으면 화면에는 아무 경고 없이 "조건에 맞는 글이 없습니다"
 * 빈 목록만 뜹니다 — 그래서 `featuredSeries.test.ts`가 실제 시리즈 집합과
 * 대조해 이 상수를 잠급니다.
 *
 * 편수는 여기 두지 않습니다. 글이 늘 때마다 손으로 고쳐야 하는 값이라
 * 조용히 어긋나기 때문에, 페이지가 `getAllSeries()`에서 그때그때 읽습니다.
 */
export interface FeaturedSeries {
  /** `apps/blog/posts/` 아래 폴더 경로 (= post.series) */
  id: string;
  /** 카드에 노출할 이름. 폴더명이 길거나 대괄호가 붙어 있어 따로 둡니다. */
  title: string;
  description: string;
}

export const FEATURED_SERIES: readonly FeaturedSeries[] = [
  {
    id: 'bundler',
    title: '번들러 만들기',
    description:
      '모듈 번들러를 밑바닥부터 직접 구현. AST 파싱, 의존성 그래프, 스코프 격리, 소스맵까지.',
  },
  {
    id: '[Typescript로 설계하는 프로젝트]',
    title: 'TypeScript로 설계하는 프로젝트',
    description:
      '타입을 설계 도구로 활용하는 방법. API, 서비스, 도메인 레이어 전반의 타입 시스템 설계.',
  },
  {
    id: 'open-source',
    title: '오픈소스 기여',
    description: 'Mantine, Node.js, Next.js, gemini-cli 기여 경험과 노하우.',
  },
  {
    id: '우아하게 에러 핸들링 하기',
    title: '에러 핸들링',
    description: 'JavaScript, React, Next.js 에러 처리 전략과 패턴.',
  },
];
