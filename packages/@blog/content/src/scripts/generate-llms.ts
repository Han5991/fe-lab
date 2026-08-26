import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  archiveUrl,
  postUrl,
  RSS_PATH,
  sortByDateDesc,
} from '../post/index.ts';
import { resolvePostSet } from './artifacts.ts';
import type { PostData } from '../post/index.ts';
import {
  type AuthorConfig,
  type LlmsConfig,
  type LlmsDocEntry,
  type SiteConfig,
} from '../shared/contentConfig.ts';
import type { ContentContext } from './context.ts';
import { sortPostsBySeriesOrder, type SeriesMeta } from '../post/series.ts';

/**
 * `llms.txt` — AI 크롤러용 **색인**입니다. (본문 전문은 `llms-full.txt`)
 *
 * 예전에는 손으로 관리하는 정적 파일이었습니다. 그러다 보니 마지막 갱신
 * (2026-04-13) 이후에 쓴 글 6편이 통째로 빠졌고, 본문에는 "45+ articles"라고
 * 적혀 있는데 실제 글은 43편이라 숫자까지 틀어져 있었습니다. sitemap·rss와 같은
 * 소스(getAllPosts)에서 뽑고 URL도 같은 빌더(src/post/urls.ts)로 조립하면
 * 그 어긋남이 구조적으로 불가능해집니다.
 */

export interface LlmsBuildOptions {
  /** 사이트 정체성 — 진입점이 컨텍스트의 설정을 넘긴다(기본값 없음) */
  site: Pick<SiteConfig, 'url' | 'name'>;
  /** 색인 산문·저자 소개 — 진입점이 컨텍스트의 설정을 넘긴다 */
  llms: LlmsConfig;
  author: AuthorConfig;
  /**
   * `Last updated`에 쓸 날짜. 생략하면 **가장 최근 글의 날짜**를 씁니다.
   *
   * 빌드 날짜를 쓰지 않는 이유는 sitemap의 정적 lastmod와 같습니다 — 이 사이트는
   * 매일 cron으로 빌드되므로 콘텐츠가 그대로인 날에도 날짜가 전진합니다.
   */
  lastUpdated?: string;
  /**
   * 시리즈 폴더명 → 메타(`_series.yml`). 진입점은 컨텍스트 인스턴스의
   * getSeriesMeta를 넘긴다. **필수**다 — 디스크를 읽는 기본값을 두면 어느
   * 루트를 읽을지가 다시 암묵이 된다(단위 테스트는 순수 함수를 넘긴다).
   */
  resolveSeriesMeta: (seriesId: string) => SeriesMeta | null;
}

/**
 * 링크 옆 한 줄 설명. excerpt가 있으면 그것을, 없으면 본문 앞부분을 줄여 씁니다.
 * 색인이므로 짧게(maxLength) — 전문은 llms-full.txt에 있습니다.
 */
export function toSummary(
  post: Pick<PostData, 'excerpt' | 'content'>,
  maxLength: number,
): string {
  const source = (
    post.excerpt && post.excerpt.trim() !== ''
      ? post.excerpt
      : post.content.replace(/[#`*[\]]/g, '')
  )
    .replace(/\s+/g, ' ')
    .trim();
  if (source.length <= maxLength) return source;
  // 잘린 자리에 걸린 단어를 반쪽으로 남기지 않도록 마지막 공백에서 끊습니다.
  const cut = source.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * `## Key Facts`의 한 줄 — 값이 없으면 `null`이라 줄 자체가 빠집니다.
 *
 * facts는 오픈소스 이력·발표 이력처럼 **소비자만 쓸 수 있는 내용**이라 전부
 * 선택 항목입니다(`LlmsFacts`). 빈 문자열도 없는 것으로 봅니다 — `- Speaking: `
 * 같은 빈 줄이 색인에 나가면 크롤러에게는 "없음"이 아니라 "미상"이 됩니다.
 */
export function factLine(
  label: string,
  value: string | undefined,
): string | null {
  return value === undefined || value.trim() === ''
    ? null
    : `- ${label}: ${value}`;
}

/** `factLine`이 섞인 줄 목록에서 살아남은 줄만 남깁니다. */
export function keepPresent(lines: (string | null)[]): string[] {
  return lines.filter((line): line is string => line !== null);
}

/**
 * `## Docs` 절의 한 줄을 조립합니다.
 *
 * **패키지가 소유한 셋(홈·글 목록·전문)은 URL을 여기서 조립하고, 문구만 설정에서
 * 옵니다** — 그 경로는 패키지가 정의하는 라우트·산출물이라 어떤 사이트에서도
 * 같기 때문입니다(`src/post/urls.ts`). 그 사이트에만 있는 페이지는 `llms.docs.extra`가
 * 경로까지 나릅니다. 예전에는 홈 링크의 설명이 이 파일에 리터럴로 박혀 설정을 덮어도
 * 남의 사이트 이름이 나갔고, `/series/`·`/about/`은 아예 지울 수 없는 고정 항목이었습니다.
 *
 * `{count}`는 발행 글 수로 치환합니다. 문구를 통째로 소비자에게 넘기면서도
 * "몇 편"만은 산출 시점의 실제 개수여야 하기 때문입니다.
 */
function docLine(entry: LlmsDocEntry, url: string, count: number): string {
  const summary = entry.summary.replaceAll('{count}', String(count));
  return `- [${entry.label}](${url}): ${summary}`;
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
  options: LlmsBuildOptions,
): string {
  const siteUrl = options.site.url;
  const { llms, author } = options;
  const seriesMeta = options.resolveSeriesMeta;
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
    `# ${options.site.name}`,
    ``,
    `> ${llms.indexIntro}`,
    ``,
    `## Permissions`,
    ``,
    `Content may be referenced and summarized by AI systems for informational and educational purposes.`,
    `Commercial reproduction requires attribution: ${author.name} (${siteUrl}).`,
    `Last updated: ${lastUpdated}`,
    ``,
    `## Docs`,
    ``,
    docLine(llms.docs.home, `${siteUrl}/`, posts.length),
    docLine(llms.docs.archive, archiveUrl(siteUrl), posts.length),
    ...llms.docs.extra.map(entry =>
      docLine(entry, `${siteUrl}${entry.path}`, posts.length),
    ),
    docLine(llms.docs.full, `${siteUrl}/llms-full.txt`, posts.length),
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
    // `_series.yml`이 없는 폴더(meta 없음)는 시리즈가 아니다 — `/series` 페이지와
    // 같은 판정(isSeriesFolder는 meta가 주어지면 null 여부만 본다).
    if (meta === null) {
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
        `- [${post.title}](${postUrl(post.slug, siteUrl)}): ${toSummary(post, llms.summaryMaxLength)}`,
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
        `- [${post.title}](${postUrl(post.slug, siteUrl)}): ${toSummary(post, llms.summaryMaxLength)}`,
      );
    }
    lines.push(``);
  }

  const facts = llms.facts;
  lines.push(
    `## Key Facts`,
    ``,
    // 선택 항목은 값이 없으면 줄째 빠진다 — 순서는 그대로 유지된다.
    ...keepPresent([
      `- Author: ${author.name} (${author.alternateName}), ${author.role}`,
      `- Blog: ${siteUrl}`,
      factLine('Language', facts.languageIndex),
      `- Total posts: ${posts.length} articles (as of ${lastUpdated})`,
      factLine('Open source', facts.openSource),
      factLine('Notable contribution', facts.notableContributionIndex),
      factLine('Speaking', facts.speaking),
      factLine('Main topics', facts.mainTopics),
    ]),
    ``,
    `## Contact`,
    ``,
    `- Blog: ${siteUrl}`,
    `- GitHub: ${author.github}`,
    `- LinkedIn: ${author.linkedin}`,
    `- RSS: ${siteUrl}${RSS_PATH}`,
    ``,
  );

  return lines.join('\n');
}

export function main(ctx: ContentContext) {
  // 레지스트리 선언(postSet: 'visible', exact)과 같은 셀렉터.
  const posts = resolvePostSet(ctx.content, 'visible');
  const outputPath = join(ctx.content.paths.publicDir, 'llms.txt');
  const text = buildLlmsText(posts, {
    site: ctx.content.config.site,
    llms: ctx.content.config.llms,
    author: ctx.content.config.author,
    resolveSeriesMeta: ctx.content.getSeriesMeta,
  });
  writeFileSync(outputPath, text, 'utf8');
  console.log(`llms.txt generated: ${posts.length} posts`);
}
