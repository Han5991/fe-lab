import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAllPosts } from '../lib/posts';

const SITE_URL = 'https://blog.sangwook.dev';
const outputPath = join(process.cwd(), 'public', 'llms-full.txt');

const posts = getAllPosts();

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

// 시리즈별로 포스트 분류
const seriesMap = new Map<string, typeof posts>();
const standalone: typeof posts = [];

for (const post of posts) {
  if (post.series) {
    if (!seriesMap.has(post.series)) seriesMap.set(post.series, []);
    seriesMap.get(post.series)!.push(post);
  } else {
    standalone.push(post);
  }
}

// 시리즈 포스트 출력
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
      : post.content.replace(/[#`*\[\]]/g, '').trim().slice(0, 200);
    const tags = post.tags?.length ? ` Tags: ${post.tags.join(', ')}.` : '';
    const date = post.date ? ` (${post.date})` : '';

    lines.push(`### [${post.title}](${url})${date}`);
    lines.push(``);
    lines.push(`${excerpt.trim()}...${tags}`);
    lines.push(``);
  }
}

// 단독 포스트 출력 (날짜 내림차순)
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
      : post.content.replace(/[#`*\[\]]/g, '').trim().slice(0, 200);
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

writeFileSync(outputPath, lines.join('\n'), 'utf8');
console.log(
  `llms-full.txt generated: ${posts.length} posts (${seriesMap.size} series, ${standalone.length} standalone)`,
);
