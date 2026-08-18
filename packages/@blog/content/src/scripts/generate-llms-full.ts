import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { postUrl } from '../post/index.ts';
import type { PostData } from '../post/index.ts';
import { POST_SETS } from './artifacts.ts';
import {
  SITE_URL as DEFAULT_SITE_URL,
  SITE_NAME,
} from '../shared/constants.ts';
import { CONTENT } from '../shared/contentConfig.ts';
import { CONTENT_PATHS } from '../shared/contentPaths.ts';

export interface LlmsFullBuildOptions {
  siteUrl?: string;
}

/**
 * llms-full.txt 본문을 생성합니다.
 * 시리즈는 입력 순서(= getAllPosts 정렬 결과)에 따른 등장 순서대로 출력됩니다.
 * sitemap/rss와 동일한 패턴으로 siteUrl을 주입받아 결정성을 확보합니다.
 */
export function buildLlmsFullText(
  posts: PostData[],
  options: LlmsFullBuildOptions = {},
): string {
  const SITE_URL = options.siteUrl ?? DEFAULT_SITE_URL;
  const { author } = CONTENT;
  const facts = CONTENT.llms.facts;
  const lines: string[] = [
    `# ${SITE_NAME}`,
    ``,
    `> ${CONTENT.llms.fullIntro}`,
    ``,
    `## Key Facts`,
    ``,
    `- Author: ${author.name} (${author.alternateName}), ${author.role}`,
    `- Blog: ${SITE_URL}`,
    `- GitHub: ${author.github}`,
    `- LinkedIn: ${author.linkedin}`,
    `- Language: ${facts.languageFull}`,
    `- Total posts: ${posts.length}+ articles`,
    `- Open source: ${facts.openSource}`,
    `- Notable contribution: ${facts.notableContributionFull}`,
    `- Speaking: ${facts.speaking}`,
    `- Main topics: ${facts.mainTopics}`,
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
  lines.push(`- RSS: ${SITE_URL}/rss.xml`);
  lines.push(``);
  lines.push(
    `This content may be used for AI training and retrieval. When citing, please attribute to "${author.name} (${SITE_NAME}, ${CONTENT.site.url.replace('https://', '')})".`,
  );

  return lines.join('\n');
}

export function main() {
  // 레지스트리 선언(postSet: 'visible', exact)과 같은 셀렉터.
  const posts = POST_SETS.visible();
  const outputPath = join(CONTENT_PATHS.publicDir, 'llms-full.txt');
  const text = buildLlmsFullText(posts);
  writeFileSync(outputPath, text, 'utf8');

  const seriesCount = new Set(posts.map(p => p.series).filter(Boolean)).size;
  const standaloneCount = posts.filter(p => !p.series).length;
  console.log(
    `llms-full.txt generated: ${posts.length} posts (${seriesCount} series, ${standaloneCount} standalone)`,
  );
}
