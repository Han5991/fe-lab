import { MERGED_PR_COUNT_FALLBACK } from '@/content.values.mts';

/**
 * 오픈소스 기여 목록 — 홈의 기여 칩(`home/OssStrip`)과 /about의 기여 목록이 함께 읽는 한 출처다.
 *
 * 예전엔 두 화면이 같은 목록을 따로 들고 "about 쪽을 고칠 때 여기도" 주석으로 맞췄다. 순서와
 * 표기(`node.js`/`Node.js`)부터 이미 어긋나 있었다. 항목을 더하거나 고칠 곳은 여기 하나다.
 *
 * `slug`는 그 기여를 다룬 글이다. 링크는 소비처가 `postPath(slug)`로 만든다 — 경로 규칙의
 * 출처는 패키지다(AGENTS.md §8).
 */
export interface OssContribution {
  /** 프로젝트 이름. 홈 칩의 글자이자 /about 항목의 제목이다. */
  project: string;
  /** /about에서 이름 옆에 붙는 소속. */
  org: string;
  /** /about 항목의 한 줄 설명. */
  description: string;
  /** 그 기여를 다룬 글의 slug. */
  slug: string;
}

export const OSS_CONTRIBUTIONS: readonly OssContribution[] = [
  {
    project: 'gemini-cli',
    org: 'Google',
    description:
      'Promise.allSettled 병렬 처리로 성능 74% 개선 (408ms → 107ms).',
    slug: 'ai-opensource-contribution',
  },
  {
    project: 'Mantine',
    org: 'Community',
    description: '27개 PR 병합. 컴포넌트 버그 수정 및 기능 개선.',
    slug: 'first-open-source-contribution',
  },
  {
    project: 'Node.js',
    org: 'OpenJS Foundation',
    description: 'util.inspect의 numeric separator 포매팅 버그 수정.',
    slug: 'nodejs-contribution',
  },
  {
    project: 'Next.js',
    org: 'Vercel',
    description: 'Next.js 코어 기여.',
    slug: 'nextjs-contributor',
  },
];

/**
 * 머지된 PR 수. 배포 빌드는 `NEXT_PUBLIC_PR_COUNT`를 GitHub에서 가져와 주입하고, 로컬이나
 * 주입 실패(빈 문자열 포함)면 폴백 상수로 떨어진다 — 홈 칩과 /about 통계가 같은 숫자를 보인다.
 */
export function mergedPrCount(): string {
  return process.env.NEXT_PUBLIC_PR_COUNT || MERGED_PR_COUNT_FALLBACK;
}
