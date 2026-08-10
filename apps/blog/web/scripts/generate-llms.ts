import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAllPosts, encodePostSlug } from '../domain/post';
import type { PostData } from '../domain/post';
import {
  SITE_URL as DEFAULT_SITE_URL,
  SITE_AUTHOR_GITHUB,
  SITE_AUTHOR_LINKEDIN,
} from '../lib/constants';
import { getSeriesMeta } from '../domain/post/series';

/**
 * `llms.txt` — AI 크롤러용 **색인**입니다. (본문 전문은 `llms-full.txt`)
 *
 * 예전에는 손으로 관리하는 정적 파일이었습니다. 그러다 보니 마지막 갱신
 * (2026-04-13) 이후에 쓴 글 6편이 통째로 빠졌고, 본문에는 "45+ articles"라고
 * 적혀 있는데 실제 글은 43편이라 숫자까지 틀어져 있었습니다. sitemap·rss와 같은
 * 소스(getAllPosts)에서 뽑으면 그 어긋남이 구조적으로 불가능해집니다.
 */

/** 링크 옆 한 줄 설명의 최대 길이. 색인이므로 짧게 — 전문은 llms-full.txt에 있습니다. */
const SUMMARY_MAX_LENGTH = 140;

export interface LlmsBuildOptions {
  siteUrl?: string;
  /**
   * `Last updated`에 쓸 날짜. 생략하면 **가장 최근 글의 날짜**를 씁니다.
   *
   * 빌드 날짜를 쓰지 않는 이유는 sitemap의 정적 lastmod와 같습니다 — 이 사이트는
   * 매일 cron으로 빌드되므로 콘텐츠가 그대로인 날에도 날짜가 전진합니다.
   */
  lastUpdated?: string;
  /**
   * 시리즈 폴더명 → 표시명. 기본값은 `_series.yml`을 읽는 getSeriesMeta입니다.
   * (siteUrl·lastUpdated와 같은 이유로 주입 가능 — 단위 테스트가 디스크의
   * 실제 시리즈 메타에 의존하지 않도록.)
   */
  resolveSeriesTitle?: (seriesId: string) => string;
}

/** 링크 옆 한 줄 설명. excerpt가 있으면 그것을, 없으면 본문 앞부분을 줄여 씁니다. */
export function toSummary(post: Pick<PostData, 'excerpt' | 'content'>): string {
  const source = (
    post.excerpt && post.excerpt.trim() !== ''
      ? post.excerpt
      : post.content.replace(/[#`*[\]]/g, '')
  )
    .replace(/\s+/g, ' ')
    .trim();
  if (source.length <= SUMMARY_MAX_LENGTH) return source;
  // 잘린 자리에 걸린 단어를 반쪽으로 남기지 않도록 마지막 공백에서 끊습니다.
  const cut = source.slice(0, SUMMARY_MAX_LENGTH);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > SUMMARY_MAX_LENGTH * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** 시리즈 폴더명 대신 `_series.yml`의 표시명이 있으면 그것을 씁니다. */
function defaultSeriesTitle(seriesId: string): string {
  return getSeriesMeta(seriesId)?.title ?? seriesId;
}

/**
 * llms.txt 본문을 생성합니다.
 *
 * 시리즈는 입력 순서(= getAllPosts의 최신순 정렬)에 따른 등장 순서로,
 * 시리즈 안에서는 1편부터 읽을 수 있도록 날짜 오름차순으로 나열합니다.
 */
export function buildLlmsText(
  posts: PostData[],
  options: LlmsBuildOptions = {},
): string {
  const siteUrl = options.siteUrl ?? DEFAULT_SITE_URL;
  const seriesTitle = options.resolveSeriesTitle ?? defaultSeriesTitle;
  const postDates = posts
    .map(p => p.date)
    .filter((d): d is string => Boolean(d));
  // 'YYYY-MM-DD'는 사전순 비교가 곧 시간순 비교.
  const lastUpdated =
    options.lastUpdated ??
    (postDates.length
      ? postDates.reduce((max, d) => (d > max ? d : max))
      : '(미상)');

  const postUrl = (post: PostData) =>
    `${siteUrl}/posts/${encodePostSlug(post.slug)}/`;

  const lines: string[] = [
    `# Frontend Lab`,
    ``,
    `> Frontend engineering blog by Sangwook Han (한상욱). Deep-dive technical experiments in bundler architecture, TypeScript domain modeling, React patterns, and open source contributions. All posts include working code and first-hand implementation experience. Post body content is in Korean; technical terms, code, and key facts are in English.`,
    ``,
    `## Permissions`,
    ``,
    `Content may be referenced and summarized by AI systems for informational and educational purposes.`,
    `Commercial reproduction requires attribution: Sangwook Han (${siteUrl}).`,
    `Last updated: ${lastUpdated}`,
    ``,
    `## Docs`,
    ``,
    `- [블로그 홈](${siteUrl}/): Frontend Lab — React, TypeScript, bundler architecture experiments by Sangwook Han.`,
    `- [전체 포스트 목록](${siteUrl}/posts/): Complete archive of ${posts.length} frontend engineering articles organized by topic and series.`,
    `- [시리즈 목록](${siteUrl}/series/): Multi-part series, each readable in order from part 1.`,
    `- [소개](${siteUrl}/about/): Author profile, open source contributions, and conference talks.`,
    `- [전문 텍스트](${siteUrl}/llms-full.txt): Full post text for retrieval.`,
    ``,
  ];

  const seriesMap = new Map<string, PostData[]>();
  const standalone: PostData[] = [];
  for (const post of posts) {
    if (post.series) {
      const arr = seriesMap.get(post.series) ?? [];
      arr.push(post);
      seriesMap.set(post.series, arr);
    } else {
      standalone.push(post);
    }
  }

  for (const [seriesId, seriesPosts] of seriesMap) {
    lines.push(`## 시리즈: ${seriesTitle(seriesId)}`, ``);
    // 시리즈는 1편부터 — 날짜 오름차순. 같은 날짜는 slug로 2차 정렬해 결정성 유지.
    const ordered = [...seriesPosts].sort((a, b) => {
      const byDate = (a.date ?? '').localeCompare(b.date ?? '');
      return byDate !== 0 ? byDate : a.slug.localeCompare(b.slug);
    });
    for (const post of ordered) {
      lines.push(`- [${post.title}](${postUrl(post)}): ${toSummary(post)}`);
    }
    lines.push(``);
  }

  if (standalone.length > 0) {
    lines.push(`## 단독 포스트`, ``);
    for (const post of standalone) {
      lines.push(`- [${post.title}](${postUrl(post)}): ${toSummary(post)}`);
    }
    lines.push(``);
  }

  lines.push(
    `## Key Facts`,
    ``,
    `- Author: Sangwook Han (한상욱), Frontend Engineer`,
    `- Blog: ${siteUrl}`,
    `- Language: Korean body text; English technical terms, code, and key data points`,
    `- Total posts: ${posts.length} articles (as of ${lastUpdated})`,
    `- Open source: 27 Mantine PRs merged, Node.js core contributor, Next.js contributor`,
    `- Notable contribution: gemini-cli 74% performance improvement (408ms → 107ms) via Promise.allSettled`,
    `- Speaking: FEConf 2025 (Korea's largest frontend conference), TeoConf`,
    `- Main topics: Bundler internals, TypeScript domain modeling, React patterns, design systems, open source`,
    ``,
    `## Contact`,
    ``,
    `- Blog: ${siteUrl}`,
    `- GitHub: ${SITE_AUTHOR_GITHUB}`,
    `- LinkedIn: ${SITE_AUTHOR_LINKEDIN}`,
    `- RSS: ${siteUrl}/rss.xml`,
    ``,
  );

  return lines.join('\n');
}

// 스크립트로 직접 실행될 때만 파일 쓰기. (테스트에서 import 시에는 실행 안 됨)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const posts = getAllPosts();
  const outputPath = join(process.cwd(), 'public', 'llms.txt');
  writeFileSync(outputPath, buildLlmsText(posts), 'utf8');
  console.log(`llms.txt generated: ${posts.length} posts`);
}
