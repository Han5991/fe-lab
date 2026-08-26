import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { postUrl, RSS_PATH } from '../post/index.ts';
import type { PostData } from '../post/index.ts';
import { resolvePostSet } from './artifacts.ts';
// Key Facts 조립은 색인(llms.txt)과 같은 규칙을 쓴다 — 한쪽만 빈 항목을 남기면
// 두 산출물이 저자에 대해 서로 다른 말을 하게 된다.
import { factLine, keepPresent } from './generate-llms.ts';
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
}

/**
 * llms-full.txt 본문을 생성합니다.
 * 시리즈는 입력 순서(= getAllPosts 정렬 결과)에 따른 등장 순서대로 출력됩니다.
 * sitemap/rss와 동일한 패턴으로 siteUrl을 주입받아 결정성을 확보합니다.
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

  for (const [seriesName, seriesPosts] of seriesMap) {
    lines.push(`## 시리즈: ${seriesName}`);
    lines.push(``);

    const sorted = [...seriesPosts].sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return a.date.localeCompare(b.date);
    });

    for (const post of sorted) {
      // 예전엔 `${SITE_URL}/posts/${post.slug}/`로 조립해 **인코딩이 빠져 있었다**
      // — sitemap·rss·llms.txt와 이 파일만 형태가 달랐다. 지역 상수명이
      // SITE_URL(옵션에서 해석한 값)이라 명시적으로 넘긴다 — 인자를 빼면
      // lib의 기본값으로 떨어져 주입한 siteUrl이 무시된다.
      const url = postUrl(post.slug, SITE_URL);
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

      lines.push(`### [${post.title}](${url})${date}`);
      lines.push(``);
      lines.push(`${excerpt.trim()}...${tags}`);
      lines.push(``);
    }
  }

  const sortedStandalone = [...standalone].sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return b.date.localeCompare(a.date);
  });

  if (sortedStandalone.length > 0) {
    lines.push(`## 단독 포스트`);
    lines.push(``);

    for (const post of sortedStandalone) {
      const url = postUrl(post.slug, SITE_URL);
      const excerpt = post.excerpt
        ? post.excerpt.slice(0, 200)
        : post.content
            .replace(/[#`*[\]]/g, '')
            .trim()
            .slice(0, 200);
      const tags = post.tags?.length ? ` Tags: ${post.tags.join(', ')}.` : '';
      const date = post.date ? ` (${post.date})` : '';

      lines.push(`### [${post.title}](${url})${date}`);
      lines.push(``);
      lines.push(`${excerpt.trim()}...${tags}`);
      lines.push(``);
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
  });
  writeFileSync(outputPath, text, 'utf8');

  const seriesCount = new Set(posts.map(p => p.series).filter(Boolean)).size;
  const standaloneCount = posts.filter(p => !p.series).length;
  console.log(
    `llms-full.txt generated: ${posts.length} posts (${seriesCount} series, ${standaloneCount} standalone)`,
  );
}
