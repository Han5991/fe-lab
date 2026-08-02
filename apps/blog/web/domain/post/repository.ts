import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import matter from 'gray-matter';
import { estimateReadMin } from '@/lib/format';
import { collectMarkdownFiles, hasFrontmatter } from '@/lib/postFiles';
import { isPostFile } from './visibility';
import type { PostData, RawFrontmatter } from './types';

const postsDirectory = join(process.cwd(), '..', 'posts');

/**
 * 마크다운 내용에서 순수 텍스트 추출 (excerpt/readMin 계산용)
 */
export function extractPlainText(content: string): string {
  return content
    .replace(/!\[.*?]\(.*?\)/g, '') // 이미지 제거
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1') // 링크 텍스트만 남기기
    .replace(/[#*`_>~]/g, '') // 마크다운 기호 제거
    .replace(/\n+/g, ' ') // 개행을 공백으로 변환
    .replace(/\s+/g, ' ') // 연속된 공백 제거
    .trim();
}

/**
 * frontmatter의 date/updatedAt 값을 'YYYY-MM-DD' 문자열(또는 null)로 정규화합니다.
 * - YAML이 Date 객체로 파싱한 경우(`date: 2025-01-01`) → ISO 날짜 부분
 * - 문자열인 경우(`date: '2025-01-01'`) → 그대로
 * - 그 외 → null
 */
function toDateString(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'string') return value;
  return null;
}

/** 문자열이 아니면 undefined. 빈 문자열은 값이 없는 것으로 취급합니다. */
function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * `tags`를 string[]로 좁히고 **중복을 제거**합니다. 배열이 아니거나 문자열 아닌
 * 원소가 섞이면 undefined — validate-posts의 invalid-tags 규칙이 별도로 에러를 냅니다.
 *
 * 태그는 의미상 집합입니다. 중복이 그대로 흘러가면 글 메타에 `#ci #ci`가 두 번
 * 찍히고, `getAllTags()`의 개수가 부풀고, 목록 렌더에서 React key가 충돌합니다.
 * 세 증상 모두 원인이 하나라 여기서 한 번만 정규화합니다.
 * (frontmatter에 중복이 남아 있다는 사실 자체는 lint:posts가 경고로 알립니다.)
 */
function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.every(item => typeof item === 'string')
    ? Array.from(new Set(value as string[]))
    : undefined;
}

/**
 * 마크다운 파일 1개의 내용 + (postsDirectory 기준) 상대 경로를 PostData로 파싱합니다.
 *
 * fs에 의존하지 않는 순수 함수라 단위 테스트가 가능합니다 — collectPosts가 파일을
 * 읽어 이 함수에 위임합니다. 빌드에서 제외할 파일은 null을 반환합니다:
 * - frontmatter delimiter(`---`)가 없는 메타 노트
 * - 유효한 `status`가 없는 파일 (기획 문서, 발표 스크립트 등)
 *
 * @param fileContents 파일 전체 내용(frontmatter 포함)
 * @param relPath      postsDirectory 기준 상대 경로 (예: '번들러/intro.md')
 */
export function parsePost(
  fileContents: string,
  relPath: string,
): PostData | null {
  // frontmatter delimiter 없는 메타 노트는 스킵 (validate-posts 와 동일 규칙)
  if (!hasFrontmatter(fileContents)) return null;

  // gray-matter의 data는 `{ [key: string]: any }`라 그대로 두면 타입 검사가
  // 무력화됩니다. RawFrontmatter(전 필드 unknown)로 받아 아래에서 전부 좁힙니다.
  const { data, content }: { data: RawFrontmatter; content: string } =
    matter(fileContents);

  // 유효한 status가 없으면 포스트가 아니다 (validate-posts와 같은 isPostFile 규칙).
  // 타입 가드라서 이 아래에서 data.status는 PostStatus로 좁혀집니다.
  if (!isPostFile(data)) return null;

  // 상대 경로에서 series / rawSlug 계산. '/'와 '\\' 모두 분할해 OS 무관 처리.
  const parts = relPath.split(/[/\\]/);
  const fileName = parts[parts.length - 1].replace(/\.(md|mdx)$/, '');
  const currentPath = parts.slice(0, -1).join('/');
  const rawSlug = currentPath ? `${currentPath}/${fileName}` : fileName;

  const cleanContent = extractPlainText(content);
  const series: string | undefined = currentPath || undefined;

  return {
    slug: toOptionalString(data.slug) ?? rawSlug,
    originalSlug: rawSlug,
    relativeDir: currentPath,
    title: toOptionalString(data.title) ?? fileName,
    date: toDateString(data.date),
    updatedAt: toDateString(data.updatedAt),
    content,
    readMin: estimateReadMin(cleanContent),
    // excerpt 미지정 시 본문 평문 앞 160자. 잘릴 때만 '...'을 붙인다(짧은 글에
    // 오해 소지의 말줄임표가 붙지 않도록).
    excerpt:
      toOptionalString(data.excerpt) ??
      (cleanContent.length > 160
        ? cleanContent.slice(0, 160) + '...'
        : cleanContent),
    thumbnail: toOptionalString(data.thumbnail),
    // 등록되지 않은 이름인지까지는 여기서 보지 않는다 — 렌더 계층이 폴백하고
    // validate-posts가 unknown-hero-diagram으로 막는다.
    hero: toOptionalString(data.hero),
    tags: toStringArray(data.tags),
    series,
    status: data.status,
    scheduledDate: toOptionalString(data.scheduledDate),
  };
}

/**
 * postsDirectory 아래의 모든 마크다운 파일을 읽어 PostData 배열로 반환합니다.
 *
 * 파일 I/O(collectMarkdownFiles + readFileSync)만 담당하고, 내용 → PostData
 * 변환은 순수 함수 parsePost에 위임합니다(null이면 메타 파일이므로 제외).
 */
function collectPosts(dirPath: string): PostData[] {
  const results: PostData[] = [];
  for (const fullPath of collectMarkdownFiles(dirPath)) {
    const fileContents = readFileSync(fullPath, 'utf8');
    const post = parsePost(fileContents, relative(dirPath, fullPath));
    if (post) results.push(post);
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
