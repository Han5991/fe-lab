import { archivePath, postPath } from '@blog/content';
import { MERGED_PR_COUNT_FALLBACK } from '@blog/site-values';
import { getAllPostSummaries, getAllSeries } from '$lib/server/content';

/**
 * About 페이지에 숫자로 뜨는 값들 — 헤더 통계 3칸과 시리즈 카드의 편수.
 *
 * 손으로 적어 두면 글이 늘 때 조용히 어긋나므로 `/series`와 같은 집계원에서
 * 그때그때 읽는다. PR 수는 React 판이 CI의 `NEXT_PUBLIC_PR_COUNT`를 쓰는데 이
 * 앱에는 그 주입 경로가 없어(배포되지 않는다) 폴백 상수만 쓴다.
 */

/**
 * "주요 시리즈" 카드 목록.
 *
 * `id`는 표시명이 아니라 **`apps/blog/posts/` 아래 폴더 경로 그대로**다. 카드
 * 링크는 `/posts/?series=<id>`인데 아카이브 필터가 이 값을 `post.series`와
 * **정확히 일치**로 비교한다 — 축약어를 넣으면 화면에는 아무 경고 없이 빈
 * 목록만 뜬다. React 판과 같은 값이어야 한다.
 */
const FEATURED_SERIES = [
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
] as const;

export const load = () => {
  const counts = new Map(getAllSeries().map(s => [s.id, s.count]));

  return {
    stats: [
      { value: String(getAllPostSummaries().length), label: '블로그 포스트' },
      { value: MERGED_PR_COUNT_FALLBACK, label: 'PR 승인' },
      { value: '2', label: '컨퍼런스' },
    ],
    oss: [
      {
        project: 'gemini-cli',
        org: 'Google',
        description:
          'Promise.allSettled 병렬 처리로 성능 74% 개선 (408ms → 107ms).',
        href: postPath('ai-opensource-contribution'),
      },
      {
        project: 'Mantine',
        org: 'Community',
        description: '27개 PR 병합. 컴포넌트 버그 수정 및 기능 개선.',
        href: postPath('first-open-source-contribution'),
      },
      {
        project: 'Node.js',
        org: 'OpenJS Foundation',
        description: 'util.inspect의 numeric separator 포매팅 버그 수정.',
        href: postPath('nodejs-contribution'),
      },
      {
        project: 'Next.js',
        org: 'Vercel',
        description: 'Next.js 코어 기여.',
        href: postPath('nextjs-contributor'),
      },
    ],
    talks: [
      {
        event: 'FEConf 2025',
        description: '한국 최대 프론트엔드 컨퍼런스 라이트닝 토크',
        href: postPath('feconf-2025-lightning-speaker'),
      },
      {
        event: 'TeoConf',
        description: '개발자 컨퍼런스 발표',
        href: postPath('2025-teoconf-presentation'),
      },
    ],
    // 폴더가 사라지면 집계에도 없다 — 0편 대신 배지를 뺀다(fail-soft).
    series: FEATURED_SERIES.map(s => ({
      ...s,
      href: archivePath({ series: s.id }),
      count: counts.get(s.id),
    })),
    retrospectHref: postPath('2025-retrospect'),
  };
};
