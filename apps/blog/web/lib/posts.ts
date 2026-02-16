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
  thumbnail?: string;
  tags?: string[];
  series?: string;
}

export interface PostNavItem {
  slug: string;
  title: string;
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

        // 마크다운 문법 제거 후 순수 텍스트만 추출
        const cleanContent = content
          .replace(/!\[.*?\]\(.*?\)/g, '') // 이미지 제거
          .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // 링크 텍스트만 남기기
          .replace(/[#*`_>~]/g, '') // 마크다운 기호 제거
          .replace(/\n+/g, ' ') // 개행을 공백으로 변환
          .replace(/\s+/g, ' ') // 연속된 공백 제거
          .trim();

        // tags 파싱: frontmatter에 있으면 사용
        const tags: string[] | undefined = Array.isArray(data.tags) ? data.tags : undefined;

        // series 파싱: relativeDir(폴더명) 기반 자동 추출
        const series: string | undefined = currentPath || undefined;

        posts.push({
          slug: data.slug,
          originalSlug: rawSlug,
          relativeDir: currentPath,
          title: data.title || fileName,
          date: data.date || null,
          content,
          excerpt: data.excerpt || cleanContent.slice(0, 160) + '...',
          thumbnail: typeof data.thumbnail === 'string' ? data.thumbnail : undefined,
          tags,
          series,
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

/**
 * 현재 포스트 기준으로 이전/다음 포스트를 반환합니다.
 * - prev: 더 오래된(과거) 글
 * - next: 더 최신(미래) 글
 *
 * posts는 날짜 내림차순 정렬 (index 0 = 최신)
 * 따라서 index+1 = prev(과거), index-1 = next(미래)
 */
export function getAdjacentPosts(
  currentSlug: string,
  options?: {
    filterTag?: string;
    filterSeries?: string;
    sortOrder?: 'newest' | 'oldest';
  }
): { prev: PostNavItem | null; next: PostNavItem | null } {
  let posts = getAllPosts();

  // 태그 필터
  if (options?.filterTag) {
    posts = posts.filter(p => p.tags?.includes(options.filterTag!));
  }

  // 시리즈 필터
  if (options?.filterSeries) {
    posts = posts.filter(p => p.series === options.filterSeries);
  }

  // 정렬 (기본: newest first)
  if (options?.sortOrder === 'oldest') {
    posts = [...posts].reverse();
  }

  const currentIndex = posts.findIndex(p => p.slug === currentSlug);

  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  // 날짜 내림차순 기준: index+1 = older(이전 글), index-1 = newer(다음 글)
  const prevPost = currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? posts[currentIndex - 1] : null;

  return {
    prev: prevPost ? { slug: prevPost.slug, title: prevPost.title } : null,
    next: nextPost ? { slug: nextPost.slug, title: nextPost.title } : null,
  };
}

/**
 * 같은 시리즈 내의 이전/다음 포스트를 반환
 */
export function getSeriesAdjacentPosts(
  currentSlug: string
): { prev: PostNavItem | null; next: PostNavItem | null; seriesName: string | null } {
  const currentPost = getPostBySlug(currentSlug);

  if (!currentPost?.series) {
    return { prev: null, next: null, seriesName: null };
  }

  const adjacent = getAdjacentPosts(currentSlug, {
    filterSeries: currentPost.series,
  });

  return {
    ...adjacent,
    seriesName: currentPost.series,
  };
}
