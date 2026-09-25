import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { postUrl, RSS_PATH, sortByDateDesc } from '../post/index.ts';
import type { PostData } from '../post/index.ts';
import { sortPostsBySeriesOrder, type SeriesMeta } from '../post/series.ts';
import { resolvePostSet } from './artifacts.ts';
// Key Facts 조립은 색인(llms.txt)과 같은 규칙을 쓴다 — 한쪽만 빈 항목을 남기면
// 두 산출물이 저자에 대해 서로 다른 말을 하게 된다.
import { factLine, keepPresent, markdownLinkTarget } from './generate-llms.ts';
import {
  type AuthorConfig,
  type LlmsConfig,
  type SiteConfig,
} from '../shared/contentConfig.ts';
import type { ContentContext } from './context.ts';

export interface LlmsFullBuildOptions {
  /** 사이트 정체성 — 진입점이 컨텍스트의 설정을 넘긴다(기본값 없음) */
  site: Pick<SiteConfig, 'url' | 'name'>;
  /** 전문 산문·저자 소개 — 진입점이 컨텍스트의 설정을 넘긴다 */
  llms: LlmsConfig;
  author: AuthorConfig;
  /**
   * 시리즈 폴더명 → 메타(`_series.yml`). llms.txt(`LlmsBuildOptions`)와 같은
   * 계약이다 — 진입점은 컨텍스트 인스턴스의 getSeriesMeta를 넘긴다.
   */
  resolveSeriesMeta: (seriesId: string) => SeriesMeta | null;
}

/**
 * 글 한 편의 항목 — `### [제목](url) (날짜)` + 요약 한 단락.
 *
 * 시리즈 절과 단독 절이 같은 모양이라 한 곳에서 만든다(예전에는 같은 블록이
 * 두 벌 복사돼 있었다).
 */
function postEntry(post: PostData, siteUrl: string): string[] {
  // 예전엔 `${SITE_URL}/posts/${post.slug}/`로 조립해 **인코딩이 빠져 있었다**
  // — sitemap·rss·llms.txt와 이 파일만 형태가 달랐다.
  const url = postUrl(post.slug, siteUrl);
  // `truthy 체크` 의도적: 빈 문자열 excerpt('')도 content fallback으로 처리해
  // 빈 entry를 방지. excerpt 필드를 frontmatter에서 명시적으로 생략하면 동일 효과.
  const excerpt = post.excerpt
    ? post.excerpt.slice(0, 200)
    : post.content
        .replace(/[#`*[\]]/g, '')
        .trim()
        .slice(0, 200);
  const tags = post.tags?.length ? ` Tags: ${post.tags.join(', ')}.` : '';
  const date = post.date ? ` (${post.date})` : '';
  return [
    `### [${post.title}](${markdownLinkTarget(url)})${date}`,
    ``,
    `${excerpt.trim()}...${tags}`,
    ``,
  ];
}

/**
 * llms-full.txt 본문을 생성합니다.
 * sitemap/rss와 동일한 패턴으로 siteUrl을 주입받아 결정성을 확보합니다.
 *
 * **시리즈 판정·이름·순서는 llms.txt(그리고 사이트)와 같은 규칙이다** —
 * `_series.yml`이 있는 폴더만 시리즈이고, 표시명은 그 `title`, 순서는 그 `order`
 * (`sortPostsBySeriesOrder`)다. 예전에는 폴더명(`bundler`)과 날짜순을 따로 써서,
 * 같은 사이트의 색인(`## 시리즈: 누가 시키지도 않았는데 번들러 만들기`)과 전문
 * (`## 시리즈: bundler`)이 서로 다른 말을 했고, 저자가 `order`로 정한 읽는 순서도
 * 무시했다. 단독 절은 사이트 목록과 같은 `sortByDateDesc`다.
 */
export function buildLlmsFullText(
  posts: PostData[],
  options: LlmsFullBuildOptions,
): string {
  const SITE_URL = options.site.url;
  const { author, llms } = options;
  const facts = llms.facts;
  const lines: string[] = [
    `# ${options.site.name}`,
    ``,
    `> ${llms.fullIntro}`,
    ``,
    `## Key Facts`,
    ``,
    ...keepPresent([
      `- Author: ${author.name} (${author.alternateName}), ${author.role}`,
      `- Blog: ${SITE_URL}`,
      `- GitHub: ${author.github}`,
      `- LinkedIn: ${author.linkedin}`,
      factLine('Language', facts.languageFull),
      `- Total posts: ${posts.length}+ articles`,
      factLine('Open source', facts.openSource),
      factLine('Notable contribution', facts.notableContributionFull),
      factLine('Speaking', facts.speaking),
      factLine('Main topics', facts.mainTopics),
    ]),
    ``,
    `---`,
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
    const meta = options.resolveSeriesMeta(seriesId);
    // `_series.yml`이 없는 폴더는 시리즈가 아니다 — 단독 절로 내린다(llms.txt와 같은 판정).
    if (meta === null) {
      standalone.push(...seriesPosts);
      continue;
    }
    lines.push(`## 시리즈: ${meta.title ?? seriesId}`, ``);
    if (meta.description) lines.push(meta.description, ``);
    for (const post of sortPostsBySeriesOrder(seriesPosts, meta.order)) {
      lines.push(...postEntry(post, SITE_URL));
    }
  }

  if (standalone.length > 0) {
    lines.push(`## 단독 포스트`, ``);
    for (const post of sortByDateDesc(standalone)) {
      lines.push(...postEntry(post, SITE_URL));
    }
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`## Contact`);
  lines.push(``);
  lines.push(`- Blog: ${SITE_URL}`);
  lines.push(`- GitHub: ${author.github}`);
  lines.push(`- LinkedIn: ${author.linkedin}`);
  lines.push(`- RSS: ${SITE_URL}${RSS_PATH}`);
  lines.push(``);
  lines.push(
    `This content may be used for AI training and retrieval. When citing, please attribute to "${author.name} (${options.site.name}, ${SITE_URL.replace('https://', '')})".`,
  );

  return lines.join('\n');
}

export function main(ctx: ContentContext) {
  // 레지스트리 선언(postSet: 'visible', exact)과 같은 셀렉터.
  const posts = resolvePostSet(ctx, 'visible');
  const outputPath = join(ctx.content.paths.publicDir, 'llms-full.txt');
  const text = buildLlmsFullText(posts, {
    site: ctx.content.config.site,
    llms: ctx.content.config.llms,
    author: ctx.content.config.author,
    resolveSeriesMeta: ctx.content.getSeriesMeta,
  });
  writeFileSync(outputPath, text, 'utf8');

  const seriesCount = new Set(posts.map(p => p.series).filter(Boolean)).size;
  const standaloneCount = posts.filter(p => !p.series).length;
  console.log(
    `llms-full.txt generated: ${posts.length} posts (${seriesCount} series, ${standaloneCount} standalone)`,
  );
}
