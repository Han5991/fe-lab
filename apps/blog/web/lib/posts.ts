import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const postsDirectory = join(process.cwd(), '..', 'posts');

export interface PostData {
  slug: string;
  originalSlug: string;
  relativeDir: string;
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

        // 오직 published: true 인 글만 가져오기
        if (data.published !== true) continue;

        const fileName = item.replace(/\.(md|mdx)$/, '');
        const rawSlug = currentPath ? `${currentPath}/${fileName}` : fileName;

        const slug = (data.slug || rawSlug)
          .replace(/\s+/g, '-')
          .replace(/[^\w\-가-힣/]/g, '')
          .toLowerCase();

        // 마크다운 문법 제거 후 순수 텍스트만 추출
        const cleanContent = content
          .replace(/!\[.*?\]\(.*?\)/g, '') // 이미지 제거
          .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // 링크 텍스트만 남기기
          .replace(/[#*`_>~]/g, '') // 마크다운 기호 제거
          .replace(/\n+/g, ' ') // 개행을 공백으로 변환
          .replace(/\s+/g, ' ') // 연속된 공백 제거
          .trim();

        posts.push({
          slug,
          originalSlug: rawSlug,
          relativeDir: currentPath,
          title: data.title || fileName,
          date: data.date || null,
          content,
          excerpt: data.excerpt || cleanContent.slice(0, 160) + '...',
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
