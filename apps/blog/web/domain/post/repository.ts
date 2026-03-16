import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import type { PostData, PostStatus } from './types';

const postsDirectory = join(process.cwd(), '..', 'posts');

/**
 * 마크다운 내용에서 순수 텍스트 추출
 */
function extractPlainText(content: string): string {
  return content
    .replace(/!\[.*?\]\(.*?\)/g, '') // 이미지 제거
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 링크 텍스트만 남기기
    .replace(/[#*`_>~]/g, '') // 마크다운 기호 제거
    .replace(/\n+/g, ' ') // 개행을 공백으로 변환
    .replace(/\s+/g, ' ') // 연속된 공백 제거
    .trim();
}

/**
 * status가 PostStatus 타입인지 확인하는 타입 가드 함수
 */
function isPostStatus(status: unknown): status is PostStatus {
  return (
    typeof status === 'string' &&
    ['published', 'draft', 'scheduled'].includes(status)
  );
}

/**
 * frontmatter에서 PostStatus를 결정합니다
 */
function determineStatus(data: Record<string, unknown>): PostStatus {
  if (isPostStatus(data.status)) {
    return data.status;
  }
  return data.published === true ? 'published' : 'draft';
}

/**
 * 디렉토리를 재귀적으로 순회하여 모든 마크다운 파일을 읽습니다.
 *
 * @param dirPath 탐색할 디렉토리 경로
 * @param currentPath 현재 상대 경로 (재귀 누적용)
 * @param results 결과 배열 (재귀 누적용)
 */
function collectPosts(
  dirPath: string,
  currentPath: string = '',
  results: PostData[] = [],
): PostData[] {
  const items = readdirSync(dirPath);

  for (const item of items) {
    const fullPath = join(dirPath, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      collectPosts(fullPath, join(currentPath, item), results);
      continue;
    }

    if (!item.endsWith('.md') && !item.endsWith('.mdx')) continue;

    const fileContents = readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    // slug가 없으면 스킵 (PLAN.md 등 메타 파일 제외)
    if (!data.slug && !data.published && !data.status) continue;

    const fileName = item.replace(/\.(md|mdx)$/, '');
    const rawSlug = currentPath ? `${currentPath}/${fileName}` : fileName;
    const cleanContent = extractPlainText(content);
    const tags: string[] | undefined = Array.isArray(data.tags)
      ? data.tags
      : undefined;
    const series: string | undefined = currentPath || undefined;
    const status = determineStatus(data);
    const dateString = data.date instanceof Date ? data.date.toISOString().split('T')[0] : (typeof data.date === 'string' ? data.date : null);

    results.push({
      slug: data.slug || rawSlug,
      originalSlug: rawSlug,
      relativeDir: currentPath,
      title: data.title || fileName,
      date: dateString,
      content,
      excerpt: data.excerpt || cleanContent.slice(0, 160) + '...',
      thumbnail:
        typeof data.thumbnail === 'string' ? data.thumbnail : undefined,
      tags,
      series,
      status,
      scheduledDate:
        typeof data.scheduledDate === 'string' ? data.scheduledDate : undefined,
    });
  }

  return results;
}

/**
 * 포스트를 날짜 내림차순으로 정렬합니다.
 */
function sortByDateDesc(posts: PostData[]): PostData[] {
  return posts.sort((a, b) => {
    if (a.date && b.date) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    return a.title.localeCompare(b.title);
  });
}

// ---------- Repository ----------

let _cache: PostData[] | null = null;

/**
 * 파일시스템에서 모든 포스트 데이터를 읽고 캐싱합니다.
 * 빌드 타임에 한 번만 읽어 O(N²) 파일 읽기를 방지합니다.
 * 단, 개발 모드에서는 수정 사항이 즉시 반영되도록 매번 새로 읽어옵니다.
 */
export function readAllPosts(): PostData[] {
  if (process.env.NODE_ENV === 'development') {
    return sortByDateDesc(collectPosts(postsDirectory));
  }

  if (_cache) return _cache;
  _cache = sortByDateDesc(collectPosts(postsDirectory));
  return _cache;
}

/**
 * 테스트나 watch 모드에서 캐시를 초기화할 때 사용합니다.
 */
export function clearPostsCache(): void {
  _cache = null;
}
