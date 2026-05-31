import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
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

    // postsDirectory 기준 상대 경로로 series / rawSlug 계산.
    // node:path의 sep으로 분할해 Windows('\\') / POSIX('/') 모두 안전하게 처리.
    const rel = relative(dirPath, fullPath);
    const parts = rel.split(sep);
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
 * 두 문자열을 코드포인트(UTF-16) 순서로 비교합니다.
 *
 * `localeCompare`를 쓰지 않는 이유: 인자 없는 localeCompare는 런타임 기본
 * locale/ICU 버전에 의존하고, 무시 가능 문자(ignorable) 때문에 *서로 다른*
 * 문자열에도 0(동등)을 반환할 수 있어 sort가 입력(readdir) 순서로 폴백할 수
 * 있습니다. 코드포인트 비교는 환경과 무관하게 결정적이며 서로 다른 문자열에
 * 절대 0을 반환하지 않습니다.
 */
function compareByCodePoint(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * 포스트를 날짜 내림차순으로 정렬합니다.
 *
 * 입력을 변형하지 않도록 복사본을 정렬합니다(순수 함수).
 * 같은 날짜의 글들은 originalSlug(파일 경로 기반의 고유·안정 키)로 2차 정렬해
 * readdir(파일시스템) 순서에 의존하던 비결정성을 제거합니다. 이 정렬 결과는
 * getAdjacentPosts의 prev/next와 llms-full 등장 순서의 기준이 되므로 빌드
 * 환경(locale/ICU/OS)에 따라 흔들리면 안 됩니다 — 그래서 결정적 비교를 씁니다.
 */
export function sortByDateDesc(posts: PostData[]): PostData[] {
  return [...posts].sort((a, b) => {
    if (a.date && b.date) {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      // 두 날짜가 모두 유효하고 서로 다르면 최신순(desc).
      // 같거나 한쪽이라도 파싱 불가(NaN)면 originalSlug로 폴백해 결정성을 유지한다.
      // (NaN을 그대로 반환하면 sort가 0(동등)으로 취급해 2차 정렬이 무시됨)
      if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) {
        return tb - ta;
      }
      return compareByCodePoint(a.originalSlug, b.originalSlug);
    }
    // 한쪽만 날짜가 있으면 날짜 있는 글을 앞으로 (날짜순 우선)
    if (a.date) return -1;
    if (b.date) return 1;
    // 둘 다 날짜가 없으면 제목순
    return compareByCodePoint(a.title, b.title);
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
