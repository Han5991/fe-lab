import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isCliEntry } from './cliEntry';
import { archiveUrl, postUrl, sortByDateDesc } from '../post';
import { POST_SETS } from './artifacts';
import type { PostData } from '../post';
import {
  SITE_URL as DEFAULT_SITE_URL,
  SITE_NAME,
  SITE_AUTHOR_GITHUB,
  SITE_AUTHOR_LINKEDIN,
} from '../shared/constants';
import { CONTENT } from '../shared/contentConfig';
import { CONTENT_PATHS } from '../shared/contentPaths';
import {
  getSeriesMeta,
  isSeriesFolder,
  sortPostsBySeriesOrder,
  type SeriesMeta,
} from '../post/series';

/**
 * `llms.txt` — AI 크롤러용 **색인**입니다. (본문 전문은 `llms-full.txt`)
 *
 * 예전에는 손으로 관리하는 정적 파일이었습니다. 그러다 보니 마지막 갱신
 * (2026-04-13) 이후에 쓴 글 6편이 통째로 빠졌고, 본문에는 "45+ articles"라고
 * 적혀 있는데 실제 글은 43편이라 숫자까지 틀어져 있었습니다. sitemap·rss와 같은
 * 소스(getAllPosts)에서 뽑고 URL도 같은 빌더(src/post/urls.ts)로 조립하면
 * 그 어긋남이 구조적으로 불가능해집니다.
 */

/** 링크 옆 한 줄 설명의 최대 길이. 색인이므로 짧게 — 전문은 llms-full.txt에 있습니다. */
const SUMMARY_MAX_LENGTH = CONTENT.llms.summaryMaxLength;

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
   * 시리즈 폴더명 → 메타(`_series.yml`). 기본값은 디스크를 읽는 getSeriesMeta입니다.
   * (siteUrl·lastUpdated와 같은 이유로 주입 가능 — 단위 테스트가 디스크의
   * 실제 시리즈 메타에 의존하지 않도록.)
   */
  resolveSeriesMeta?: (seriesId: string) => SeriesMeta | null;
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

/**
 * llms.txt 본문을 생성합니다.
 *
 * **시리즈 판정과 정렬은 사이트와 같은 규칙을 씁니다** — `isSeriesFolder`(`_series.yml`이
 * 있는 폴더만 시리즈)와 `sortPostsBySeriesOrder`(`_series.yml`의 `order` 우선).
 * 여기서 따로 구현하면 `/series` 페이지에는 없는 "시리즈"가 색인에만 생기고,
 * 저자가 `order`로 정해둔 읽는 순서도 무시됩니다.
 *
 * 시리즈로 인정되지 않은 폴더의 글은 단독 포스트로 내려갑니다.
 */
export function buildLlmsText(
  posts: PostData[],
  options: LlmsBuildOptions = {},
): string {
  const siteUrl = options.siteUrl ?? DEFAULT_SITE_URL;
  const seriesMeta = options.resolveSeriesMeta ?? getSeriesMeta;
  const postDates = posts
    .map(p => p.date)
    .filter((d): d is string => Boolean(d));
  // 'YYYY-MM-DD'는 사전순 비교가 곧 시간순 비교.
  const lastUpdated =
    options.lastUpdated ??
    (postDates.length
      ? postDates.reduce((max, d) => (d > max ? d : max))
      : '(미상)');

  const lines: string[] = [
    `# ${SITE_NAME}`,
    ``,
    `> ${CONTENT.llms.indexIntro}`,
    ``,
    `## Permissions`,
    ``,
    `Content may be referenced and summarized by AI systems for informational and educational purposes.`,
    `Commercial reproduction requires attribution: ${CONTENT.author.name} (${siteUrl}).`,
    `Last updated: ${lastUpdated}`,
    ``,
    `## Docs`,
    ``,
    `- [블로그 홈](${siteUrl}/): Frontend Lab — React, TypeScript, bundler architecture experiments by Sangwook Han.`,
    `- [전체 포스트 목록](${archiveUrl(siteUrl)}): Complete archive of ${posts.length} frontend engineering articles organized by topic and series.`,
    `- [시리즈 목록](${siteUrl}/series/): Multi-part series, each readable in order from part 1.`,
    `- [소개](${siteUrl}/about/): Author profile, open source contributions, and conference talks.`,
    `- [전문 텍스트](${siteUrl}/llms-full.txt): Full post text for retrieval.`,
    ``,
  ];

  const byFolder = new Map<string, PostData[]>();
  const standalone: PostData[] = [];
  for (const post of posts) {
    if (post.series) {
      const arr = byFolder.get(post.series) ?? [];
      arr.push(post);
      byFolder.set(post.series, arr);
    } else {
      standalone.push(post);
    }
  }

  for (const [seriesId, folderPosts] of byFolder) {
    const meta = seriesMeta(seriesId);
    // `_series.yml`이 없는 폴더는 시리즈가 아니다 — `/series` 페이지와 같은 판정.
    // meta를 넘겨 주입된 조회를 쓰게 한다(미지정이면 디스크를 읽는다).
    if (!isSeriesFolder(seriesId, meta)) {
      standalone.push(...folderPosts);
      continue;
    }
    // 표시명은 사이트와 **같은 식**이다(`meta?.title ?? post.series` — page.tsx).
    // `_series.yml`이 없는 폴더는 사이트에서도 `회고/2025`처럼 경로가 그대로
    // 나오므로, 여기서만 다듬으면 색인과 화면의 시리즈명이 갈린다.
    // 이름을 고치고 싶으면 그 폴더에 `_series.yml`의 `title`을 넣으면 양쪽이 함께 바뀐다.
    lines.push(`## 시리즈: ${meta?.title ?? seriesId}`, ``);
    if (meta?.description) lines.push(meta.description, ``);
    // 1편부터 읽을 수 있도록 — `_series.yml`의 order가 있으면 그 순서.
    for (const post of sortPostsBySeriesOrder(folderPosts, meta?.order)) {
      lines.push(
        `- [${post.title}](${postUrl(post.slug, siteUrl)}): ${toSummary(post)}`,
      );
    }
    lines.push(``);
  }

  if (standalone.length > 0) {
    lines.push(`## 단독 포스트`, ``);
    // 시리즈에서 내려온 글이 섞이므로 다시 정렬한다. 사이트 목록과 **같은 함수**를
    // 쓴다 — 여기서 따로 비교자를 만들면 색인이 사이트와 다른 순서를 말하게 되고,
    // 인자 없는 localeCompare는 repository.ts가 경고하는 ICU 의존 비교자다.
    const ordered = sortByDateDesc(standalone);
    for (const post of ordered) {
      lines.push(
        `- [${post.title}](${postUrl(post.slug, siteUrl)}): ${toSummary(post)}`,
      );
    }
    lines.push(``);
  }

  const { author } = CONTENT;
  const facts = CONTENT.llms.facts;
  lines.push(
    `## Key Facts`,
    ``,
    `- Author: ${author.name} (${author.alternateName}), ${author.role}`,
    `- Blog: ${siteUrl}`,
    `- Language: ${facts.languageIndex}`,
    `- Total posts: ${posts.length} articles (as of ${lastUpdated})`,
    `- Open source: ${facts.openSource}`,
    `- Notable contribution: ${facts.notableContributionIndex}`,
    `- Speaking: ${facts.speaking}`,
    `- Main topics: ${facts.mainTopics}`,
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
if (isCliEntry(import.meta.url)) {
  // 레지스트리 선언(postSet: 'visible', exact)과 같은 셀렉터.
  const posts = POST_SETS.visible();
  const outputPath = join(CONTENT_PATHS.publicDir, 'llms.txt');
  writeFileSync(outputPath, buildLlmsText(posts), 'utf8');
  console.log(`llms.txt generated: ${posts.length} posts`);
}
