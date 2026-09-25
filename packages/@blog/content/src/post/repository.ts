import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import matter from 'gray-matter';
import { estimateReadMin } from '../shared/format.ts';
import { collectMarkdownFiles, hasFrontmatter } from '../shared/postFiles.ts';
import { pathSlug, resolvePostSlug } from './urls.ts';
import { isPostFile } from './visibility.ts';
import {
  toDateString,
  toOptionalString,
  toScheduledDate,
  toStringArray,
} from './frontmatterSchema.ts';
import type { TimezoneConfig } from '../shared/contentConfig.ts';
import type { PostData, RawFrontmatter } from './types.ts';

/** 펜스 코드 블록 — 캡처가 둘이라 split 결과가 [본문, 펜스 기호, 코드] 세 칸 주기다. */
const FENCED_CODE = /^[ \t]*(`{3,}|~{3,})[^\n]*\n([\s\S]*?)^[ \t]*\1[ \t]*$/gm;

/** 인라인 코드 — 캡처 그룹이라 split 결과의 홀수 칸이 된다 */
const INLINE_CODE = /(`[^`\n]+`)/;

/** HTML/JSX 태그(속성째). 식별자 바로 뒤의 여는 태그는 제네릭(`Promise<void>`)이라 둔다. */
const MARKUP_TAG =
  /<\/[A-Za-z][\w.:-]*\s*>|(?<![\w$])<[A-Za-z][\w.:-]*(?:\s[^<>]*)?\/?>/g;

/** 강조의 `_` — 글자 사이의 `_`(`snake_case`)는 식별자라 남긴다. */
const EMPHASIS_UNDERSCORE = /(?<![\p{L}\p{N}])_+|_+(?![\p{L}\p{N}])/gu;

/** 본문 평문 — excerpt·readMin·검색 미리보기·wordCount·llms 요약이 함께 쓴다(`dropCode`면 펜스 코드를 뺀다). */
export function extractPlainText(
  content: string,
  { dropCode = false }: { dropCode?: boolean } = {},
): string {
  // 인용 안의 펜스(`> ```ts`)도 코드로 빼도록 줄 머리의 인용 표시를 먼저 걷는다.
  return (dropCode ? content.replace(/^[ \t]*>+[ \t]?/gm, '') : content)
    .split(FENCED_CODE)
    .map((part, i) => {
      if (i % 3 === 1) return ''; // 펜스 기호(캡처 1)
      if (i % 3 === 2) return dropCode ? ' ' : ` ${part} `; // 펜스 안 코드(캡처 2)
      return extractProse(part);
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractProse(text: string): string {
  return text
    .replace(/!\[.*?]\(.*?\)/g, '') // 이미지 제거
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1') // 링크 텍스트만 남기기
    .replace(/^[ \t]*>+/gm, '') // 인용 표시(줄 머리의 >)
    .split(INLINE_CODE)
    .map((part, i) =>
      // 홀수 칸 = 인라인 코드: 백틱만 벗기고 내용은 그대로
      i % 2 === 1
        ? part.slice(1, -1)
        : part
            .replace(MARKUP_TAG, ' ')
            .replace(/[#*`~]/g, '')
            .replace(EMPHASIS_UNDERSCORE, ''),
    )
    .join('');
}

/**
 * frontmatter의 `excerpt`가 없거나 빈 문자열일 때 쓰는 본문 앞부분 발췌.
 *
 * 이 폴백이 그대로 meta description이 되므로, 도입부가 비슷한 글끼리는 발췌가
 * **글자 단위로 완전히 겹칩니다**. lint:posts가 그 중복을 원문에서 잡으려면
 * 똑같은 계산을 해야 해서, 규칙을 여기 한 곳에 두고 양쪽이 함께 씁니다.
 *
 * 잘릴 때만 '...'을 붙입니다(짧은 글에 오해 소지의 말줄임표가 붙지 않도록).
 *
 * `maxLength`는 인자다 — 설정의 `seo.descriptionMaxLength`를 넘긴다
 * (createRepository가 그렇게 한다). 기본값을 두면 설정을 덮었을 때 발췌 길이만
 * 옛 예산을 따라, lint:posts가 경고하는 길이와 실제 description이 갈라진다.
 */
export function resolveExcerpt(
  content: string,
  explicit: unknown,
  maxLength: number,
): string {
  return resolveExcerptFrom(extractPlainText(content), explicit, maxLength);
}

/**
 * `resolveExcerpt`와 **같은 규칙**을 이미 평문으로 만들어 둔 내용에 적용합니다.
 *
 * parsePost는 readMin 계산에 쓰려고 `extractPlainText`를 이미 한 번 돌립니다.
 * 거기서 `resolveExcerpt(content, …)`를 부르면 같은 정규식 5개를 본문 전체에
 * 한 번 더 돌리게 되는데, 개발 모드는 포스트 캐시를 건너뛰므로 그 두 배 비용을
 * **요청마다** 냅니다. 규칙이 갈라지지 않도록 폴백 계산은 여기 한 곳에만 둡니다.
 */
export function resolveExcerptFrom(
  plainText: string,
  explicit: unknown,
  maxLength: number,
): string {
  const given = toOptionalString(explicit);
  if (given) return given;
  if (plainText.length <= maxLength) return plainText;
  // 서로게이트 쌍 가운데서 자르지 않는다 — 외톨이는 encodeURIComponent가 URIError를 던진다.
  const cut = plainText.slice(0, maxLength);
  return `${/[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut}...`;
}

/** gray-matter로 읽되 YAML 오류에 파일 경로를 붙여 던진다(원래 오류는 `cause`) — 건너뛰면 발행 글이 조용히 빠진다. */
export function parseMatter(
  source: string,
  where: string,
): { data: Record<string, unknown>; content: string } {
  try {
    const {
      data,
      content,
    }: { data: Record<string, unknown>; content: string } = matter(source);
    return { data, content };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${where}: frontmatter YAML을 해석할 수 없습니다 — ${reason}`,
      {
        cause: error,
      },
    );
  }
}

export interface ParsePostOptions {
  /** excerpt 자동 발췌 길이 — 설정의 `seo.descriptionMaxLength` */
  excerptMaxLength: number;
  /** 따옴표 없는 datetime(YAML Date)을 적을 타임존 — UTC로 적으면 KST 오전이 전날이 된다 */
  timezone: Pick<TimezoneConfig, 'isoOffset'>;
}

/**
 * 마크다운 파일 1개의 내용 + (postsDir 기준) 상대 경로를 PostData로 파싱합니다.
 *
 * fs에 의존하지 않는 순수 함수라 단위 테스트가 가능합니다 — collectPosts가 파일을
 * 읽어 이 함수에 위임합니다. 빌드에서 제외할 파일은 null을 반환합니다:
 * - frontmatter delimiter(`---`)가 없는 메타 노트
 * - 유효한 `status`가 없는 파일 (기획 문서, 발표 스크립트 등)
 *
 * @param fileContents 파일 전체 내용(frontmatter 포함)
 * @param relPath      postsDir 기준 상대 경로 (예: '번들러/intro.md')
 */
export function parsePost(
  fileContents: string,
  relPath: string,
  opts: ParsePostOptions,
): PostData | null {
  // frontmatter delimiter 없는 메타 노트는 스킵 (validate-posts 와 동일 규칙)
  if (!hasFrontmatter(fileContents)) return null;

  const { data, content }: { data: RawFrontmatter; content: string } =
    parseMatter(fileContents, relPath);

  // 유효한 status가 없으면 포스트가 아니다 (validate-posts와 같은 isPostFile 규칙).
  // 타입 가드라서 이 아래에서 data.status는 PostStatus로 좁혀집니다.
  if (!isPostFile(data)) return null;

  // 상대 경로에서 series 계산. '/'와 '\\' 모두 분할해 OS 무관 처리.
  const parts = relPath.split(/[/\\]/);
  // split은 빈 배열을 만들지 않으므로 마지막 원소는 항상 존재한다.
  const fileName = (parts.at(-1) ?? '').replace(/\.(md|mdx)$/, '');
  const currentPath = parts.slice(0, -1).join('/');

  const cleanContent = extractPlainText(content);
  const series: string | undefined = currentPath || undefined;

  return {
    // `../admin`·`/foo` 같은 명시 slug는 쓰지 않고 파일 경로로 폴백한다(lint:posts가 에러).
    slug: resolvePostSlug(data.slug, relPath),
    originalSlug: pathSlug(relPath),
    relativeDir: currentPath,
    title: toOptionalString(data.title) ?? fileName,
    seoTitle: toOptionalString(data.seoTitle),
    date: toDateString(data.date, opts.timezone),
    updatedAt: toDateString(data.updatedAt, opts.timezone),
    content,
    readMin: estimateReadMin(cleanContent),
    excerpt: resolveExcerptFrom(
      cleanContent,
      data.excerpt,
      opts.excerptMaxLength,
    ),
    thumbnail: toOptionalString(data.thumbnail),
    // 등록되지 않은 이름인지까지는 여기서 보지 않는다 — 렌더 계층이 폴백하고
    // validate-posts가 unknown-hero-diagram으로 막는다.
    hero: toOptionalString(data.hero),
    tags: toStringArray(data.tags),
    series,
    status: data.status,
    scheduledDate: toScheduledDate(data.scheduledDate, opts.timezone),
  };
}

/**
 * dirPath 아래의 모든 마크다운 파일을 읽어 PostData 배열로 반환합니다.
 *
 * 파일 I/O(collectMarkdownFiles + readFileSync)만 담당하고, 내용 → PostData
 * 변환은 순수 함수 parsePost에 위임합니다(null이면 메타 파일이므로 제외).
 *
 * **`series`를 붙일지 말지는 여기서 한 번에 끝냅니다.** parsePost는 경로만 보는
 * 순수 함수라 폴더에 `_series.yml`이 있는지 알 수 없고, 디스크를 읽는 쪽은
 * 여기입니다. 판정을 소비처마다 두면(`isSeriesFolder`를 검색·OG·llms에서 각각
 * 부르면) 언젠가 한 곳을 빠뜨리고, 그게 정확히 예전 구조의 문제였습니다.
 *
 * 물리적 폴더는 `relativeDir`에 그대로 남습니다 — 시리즈가 아닌 폴더를 알아야
 * 하는 쪽(sitemap 우선순위, JSON-LD articleSection)은 그쪽을 봅니다.
 */
function collectPosts(
  dirPath: string,
  deps: {
    isSeriesFolder: (seriesName: string) => boolean;
    excerptMaxLength: number;
    timezone: Pick<TimezoneConfig, 'isoOffset'>;
    metaFilenames: ReadonlySet<string>;
  },
): PostData[] {
  const results: PostData[] = [];
  // 스캔 한 번 동안만 사는 메모. 인스턴스 캐시로 올리지 않는 이유는
  // getSeriesMeta가 dev에서 캐시를 우회하는 것과 같습니다 — `_series.yml`을
  // 새로 만들거나 지우면 다음 요청에 바로 반영돼야 합니다.
  const declaredSeries = new Map<string, boolean>();
  const parseOpts: ParsePostOptions = {
    excerptMaxLength: deps.excerptMaxLength,
    timezone: deps.timezone,
  };

  for (const fullPath of collectMarkdownFiles(dirPath, deps.metaFilenames)) {
    const fileContents = readFileSync(fullPath, 'utf8');
    const post = parsePost(
      fileContents,
      relative(dirPath, fullPath),
      parseOpts,
    );
    if (!post) continue;

    if (post.series) {
      let declared = declaredSeries.get(post.series);
      if (declared === undefined) {
        declared = deps.isSeriesFolder(post.series);
        declaredSeries.set(post.series, declared);
      }
      if (!declared) {
        results.push({ ...post, series: undefined });
        continue;
      }
    }

    results.push(post);
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
export function compareByCodePoint(a: string, b: string): number {
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

export interface Repository {
  readAllPosts: () => PostData[];
}

export interface RepositoryDeps {
  /** 마크다운 원본 디렉터리 절대 경로 */
  postsDir: string;
  /** dev면 캐시를 건너뛰어 수정 사항이 즉시 반영된다 */
  isDevelopment: () => boolean;
  /** excerpt 자동 발췌 길이 — SEO description 예산(seo.descriptionMaxLength) 재사용 */
  excerptMaxLength: number;
  /** 따옴표 없는 datetime을 적을 타임존 — 설정의 `timezone` */
  timezone: Pick<TimezoneConfig, 'isoOffset'>;
  /** 시리즈 선언 판정 — 같은 postsDir에 앵커한 SeriesReader의 것을 넘길 것 */
  isSeriesFolder: (seriesName: string) => boolean;
  /** 이름만 보고 건너뛸 작업 노트 파일 — `registries.metaFilenames` */
  metaFilenames: ReadonlySet<string>;
}

/**
 * 파일시스템 로더 factory. 캐시는 인스턴스(클로저) 안에 산다.
 * 빌드 타임에 한 번만 읽어 O(N²) 파일 읽기를 방지하고,
 * 개발 모드에서는 수정 사항이 즉시 반영되도록 매번 새로 읽습니다.
 */
export function createRepository(deps: RepositoryDeps): Repository {
  const {
    postsDir,
    isDevelopment,
    excerptMaxLength,
    timezone,
    isSeriesFolder,
    metaFilenames,
  } = deps;
  const collectDeps = {
    isSeriesFolder,
    excerptMaxLength,
    timezone,
    metaFilenames,
  };
  let cache: PostData[] | null = null;

  function readAllPosts(): PostData[] {
    if (isDevelopment()) {
      return sortByDateDesc(collectPosts(postsDir, collectDeps));
    }

    if (cache) return cache;
    cache = sortByDateDesc(collectPosts(postsDir, collectDeps));
    return cache;
  }

  return { readAllPosts };
}
