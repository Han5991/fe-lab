import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const postsDirectory = join(process.cwd(), '..', 'posts');
const outputPath = join(process.cwd(), 'public', 'search-index.json');

function getAllPostsMeta() {
    const posts = [];

    function readDirectory(dirPath, currentPath = '') {
        const items = readdirSync(dirPath);

        for (const item of items) {
            const fullPath = join(dirPath, item);
            const stat = statSync(fullPath);

            if (stat.isDirectory()) {
                readDirectory(fullPath, join(currentPath, item));
            } else if (item.endsWith('.md') || item.endsWith('.mdx')) {
                const fileContents = readFileSync(fullPath, 'utf8');
                const { data, content } = matter(fileContents);

                if (data.published !== true) continue;

                const cleanContent = content
                    .replace(/!\[.*?\]\(.*?\)/g, '')
                    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
                    .replace(/[#*`_>~]/g, '')
                    .replace(/\n+/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                posts.push({
                    slug: data.slug,
                    title: data.title || item.replace(/\.(md|mdx)$/, ''),
                    date: data.date || null,
                    excerpt: data.excerpt || cleanContent.slice(0, 160) + '...',
                    tags: Array.isArray(data.tags) ? data.tags : [],
                    series: currentPath || null,
                });
            }
        }
    }

    readDirectory(postsDirectory);

    return posts.sort((a, b) => {
        if (a.date && b.date) {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        return a.title.localeCompare(b.title);
    });
}

const posts = getAllPostsMeta();
writeFileSync(outputPath, JSON.stringify(posts, null, 2), 'utf8');
console.log(`Search index generated: ${posts.length} posts`);
