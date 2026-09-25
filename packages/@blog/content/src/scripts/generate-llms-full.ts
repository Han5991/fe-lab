import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  extractPlainText,
  postUrl,
  RSS_PATH,
  sortByDateDesc,
} from '../post/index.ts';
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
  /** 시리즈 폴더명 → 메타(`_series.yml`) — llms.txt와 같은 계약 */
  resolveSeriesMeta: (seriesId: string) => SeriesMeta | null;
}

/** 글 한 편의 항목 — `### [제목](url) (날짜)` + 요약 한 단락. */
function postEntry(post: PostData, siteUrl: string): string[] {
  const url = postUrl(post.slug, siteUrl);
  // 빈 excerpt('')도 본문 평문으로 폴백해 빈 항목을 막는다.
  const excerpt = (post.excerpt || extractPlainText(post.content)).slice(
    0,
    200,
  );
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
 * 시리즈 판정·이름·순서는 llms.txt(그리고 사이트)와 같은 규칙이다.
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
  const posts = resolvePostSet(ctx.content, 'visible');
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
