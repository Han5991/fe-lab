import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import matter from 'gray-matter';
import { estimateReadMin } from '../../lib/format';
import { collectMarkdownFiles, hasFrontmatter } from '../../lib/postFiles';
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
 * postsDirectory 아래의 모든 마크다운 파일을 읽어 PostData 배열로 반환합니다.
 *
 * collectMarkdownFiles (lib/postFiles.ts) 로 파일 목록을 가져오고,
 * hasFrontmatter / 가시성 필드 검사로 메타 파일을 제외합니다.
 * — 기존 인라인 재귀 로직을 공통 헬퍼로 교체하여 validate-posts.ts 와 일관성을 유지합니다.
 */
function collectPosts(dirPath: string): PostData[] {
  const results: PostData[] = [];

  for (const fullPath of collectMarkdownFiles(dirPath)) {
    const fileContents = readFileSync(fullPath, 'utf8');

    // frontmatter delimiter 없는 메타 노트는 스킵 (validate-posts 와 동일 규칙)
    if (!hasFrontmatter(fileContents)) continue;

    const { data, content } = matter(fileContents);

    // slug / published / status 중 하나도 없으면 빌드 제외 (기존 메타 파일 제외 규칙)
    if (!data.slug && !data.published && !data.status) continue;

    // postsDirectory 기준 상대 경로로 series / rawSlug 계산
    const rel = relative(dirPath, fullPath);
    const parts = rel.split('/');
    const fileName = parts[parts.length - 1].replace(/\.(md|mdx)$/, '');
    const currentPath = parts.slice(0, -1).join('/');

    const rawSlug = currentPath ? `${currentPath}/${fileName}` : fileName;
    const cleanContent = extractPlainText(content);
    const tags: string[] | undefined = Array.isArray(data.tags)
      ? data.tags
      : undefined;
    const series: string | undefined = currentPath || undefined;
    const status = determineStatus(data);
    const dateString =
      data.date instanceof Date
        ? data.date.toISOString().split('T')[0]
        : typeof data.date === 'string'
          ? data.date
          : null;
    const updatedAtString =
      data.updatedAt instanceof Date
        ? data.updatedAt.toISOString().split('T')[0]
        : typeof data.updatedAt === 'string'
          ? data.updatedAt
          : null;

    results.push({
      slug: data.slug || rawSlug,
      originalSlug: rawSlug,
      relativeDir: currentPath,
      title: data.title || fileName,
      date: dateString,
      updatedAt: updatedAtString,
      content,
      readMin: estimateReadMin(cleanContent),
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
