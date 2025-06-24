import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const postsDirectory = join(process.cwd(), '..', 'posts');

export interface PostData {
  slug: string;
  originalSlug: string;
  title: string;
  date: string | null;
  content: string;
  excerpt?: string;
}

export function getAllPosts(): PostData[] {
  const posts: PostData[] = [];

  function readDirectory(dirPath: string, currentPath: string = ''): void {
    const items = readdirSync(dirPath);

    for (const item of items) {
      const fullPath = join(dirPath, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        readDirectory(fullPath, join(currentPath, item));
      } else if (item.endsWith('.md') || item.endsWith('.mdx')) {
        const fileContents = readFileSync(fullPath, 'utf8');
        const { data, content } = matter(fileContents);

        const fileName = item.replace(/\.md|mdx$/, '');
        const rawSlug = currentPath ? `${currentPath}/${fileName}` : fileName;

        // URL-safe slug 생성
        const slug = rawSlug
          .replace(/\s+/g, '-')
          .replace(/[^\w\-가-힣/]/g, '')
          .toLowerCase();

        posts.push({
          slug,
          originalSlug: rawSlug,
          title: data.title || item.replace(/\.md|mdx$/, ''),
          date: data.date || null,
          content,
          excerpt: data.excerpt || content.slice(0, 200) + '...',
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

export function getPostBySlug(slug: string): PostData | null {
  const posts = getAllPosts();
  return posts.find(post => post.slug === slug) || null;
}

export function getAllPostSlugs(): string[] {
  const posts = getAllPosts();
  return posts.map(post => post.slug);
}
