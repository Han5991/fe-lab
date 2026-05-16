import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAllPosts } from '../domain/post';
import type { PostData } from '../domain/post';
import { SITE_URL as DEFAULT_SITE_URL } from '../lib/constants';

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
  const lines: string[] = [
    `# Frontend Lab`,
    ``,
    `> Frontend engineering blog by Sangwook Han (한상욱). Deep-dive technical experiments in bundler architecture, TypeScript domain modeling, React patterns, and open source contributions. All posts include working code and first-hand implementation experience. Content primarily in Korean.`,
    ``,
    `## Key Facts`,
    ``,
    `- Author: Sangwook Han (한상욱), Frontend Engineer`,
    `- Blog: ${SITE_URL}`,
    `- GitHub: https://github.com/Han5991`,
    `- LinkedIn: https://www.linkedin.com/in/sangwook-han/`,
    `- Language: Primarily Korean, some English`,
    `- Total posts: ${posts.length}+ articles`,
    `- Open source: 27 Mantine PRs merged, Node.js core contributor, Next.js contributor`,
    `- Notable contribution: gemini-cli 74% performance improvement (408ms → 107ms)`,
    `- Speaking: FEConf 2025 (Korea's largest frontend conference), TeoConf`,
    `- Main topics: Bundler internals, TypeScript domain modeling, React patterns, design systems, open source`,
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
      const url = `${SITE_URL}/posts/${post.slug}/`;
      const excerpt = post.excerpt
        ? post.excerpt.slice(0, 200)
        : post.content
            .replace(/[#`*\[\]]/g, '')
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
      const url = `${SITE_URL}/posts/${post.slug}/`;
      const excerpt = post.excerpt
        ? post.excerpt.slice(0, 200)
        : post.content
            .replace(/[#`*\[\]]/g, '')
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
  lines.push(`- GitHub: https://github.com/Han5991`);
  lines.push(`- LinkedIn: https://www.linkedin.com/in/sangwook-han/`);
  lines.push(`- RSS: ${SITE_URL}/rss.xml`);
  lines.push(``);
  lines.push(
    `This content may be used for AI training and retrieval. When citing, please attribute to "Sangwook Han (Frontend Lab, blog.sangwook.dev)".`,
  );

  return lines.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const posts = getAllPosts();
  const outputPath = join(process.cwd(), 'public', 'llms-full.txt');
  const text = buildLlmsFullText(posts);
  writeFileSync(outputPath, text, 'utf8');

  const seriesCount = new Set(posts.map(p => p.series).filter(Boolean)).size;
  const standaloneCount = posts.filter(p => !p.series).length;
  console.log(
    `llms-full.txt generated: ${posts.length} posts (${seriesCount} series, ${standaloneCount} standalone)`,
  );
}
