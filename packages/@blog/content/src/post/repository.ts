import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import matter from 'gray-matter';
import { estimateReadMin } from '../shared/format.ts';
import { collectMarkdownFiles, hasFrontmatter } from '../shared/postFiles.ts';
import { isPostFile } from './visibility.ts';
// 좁히기 함수(toDateString·toOptionalString·toScheduledDate·toStringArray)는
// 서술자 테이블과 같은 파일에 있습니다 — 테이블의 `narrow`와 parsePost가 **같은
// 함수**를 가리켜야 선언과 실제 동작이 갈라지지 않습니다(frontmatterSchema.ts 참고).
import {
  toDateString,
  toOptionalString,
  toScheduledDate,
  toStringArray,
} from './frontmatterSchema.ts';
import type { TimezoneConfig } from '../shared/contentConfig.ts';
import type { PostData, RawFrontmatter } from './types.ts';

/**
 * 펜스 코드 블록(```` ``` ````·`~~~`, 3개 이상). 캡처 그룹이 둘이라 split 결과가
 * [본문, 펜스 기호, 코드, 본문, …]의 세 칸 주기가 된다. 닫히지 않은 펜스는 본문 취급.
 */
const FENCED_CODE = /^[ \t]*(`{3,}|~{3,})[^\n]*\n([\s\S]*?)^[ \t]*\1[ \t]*$/gm;

/** 한 줄 안의 인라인 코드(`` `x` ``) — 캡처 그룹이라 split 결과의 홀수 칸이 된다 */
const INLINE_CODE = /(`[^`\n]+`)/;

/**
 * HTML/JSX 태그(여는·닫는·자기 닫는, 속성 포함 — 여러 줄에 걸쳐도).
 * 바로 앞이 식별자 문자면 태그가 아니라 제네릭(`Promise<void>`)이라 건드리지 않는다.
 */
const MARKUP_TAG = /(?<![\w$])<\/?[A-Za-z][\w.:-]*(?:\s[^<>]*)?\/?>/g;

/**
 * 강조 표시의 `_`/`__` — 글자·숫자 사이에 낀 `_`(`snake_case`)는 식별자라 남긴다.
 */
const EMPHASIS_UNDERSCORE = /(?<![\p{L}\p{N}])_+|_+(?![\p{L}\p{N}])/gu;

/**
 * 마크다운 내용에서 순수 텍스트 추출 (excerpt/readMin 계산용)
 *
 * 예전 규칙은 `[#*`_>~]`를 전부 지우는 한 줄이라 여러 가지가 샜습니다:
 * - `<callout type="info">`에서 `>`만 빠져 `<callout type="info"`가 발췌에 남았고,
 *   다이어그램 태그의 속성 문자열이 readMin까지 부풀렸다 → 태그는 속성째 지운다.
 * - `snake_case` → `snakecase` → 단어 안의 `_`는 남긴다.
 * - `arr[0] > 1` → `arr[0] 1` → `>`는 줄 머리의 인용 표시만 지운다.
 * - 코드도 기호가 뜯겨 나갔다 → 펜스 코드와 인라인 코드는 원문 그대로 둔다
 *   (펜스 기호 줄 ```` ```ts title="a.ts" ````만 뺀다).
 */
export function extractPlainText(content: string): string {
  return content
    .split(FENCED_CODE)
    .map((part, i) => {
      if (i % 3 === 1) return ''; // 펜스 기호(캡처 1)
      if (i % 3 === 2) return ` ${part} `; // 펜스 안 코드(캡처 2) — 원문 그대로
      return extractProse(part);
    })
    .join('')
    .replace(/\s+/g, ' ') // 개행·연속 공백을 공백 하나로
    .trim();
}

/** 펜스 밖 본문: 이미지·링크·인용·태그·강조 기호를 벗긴다(인라인 코드는 보존). */
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
            .replace(MARKUP_TAG, ' ') // 커스텀 태그·HTML 통째로
            .replace(/[#*`~]/g, '') // 제목·강조·남은 백틱 기호
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
  // 길이 예산은 UTF-16 단위 그대로(lint:posts·check-seo가 재는 `.length`와 같은
  // 기준)지만, 이모지 같은 서로게이트 쌍의 **가운데**에서 자르지는 않는다 —
  // 외톨이 상위 서로게이트는 HTML에서 U+FFFD가 되고 encodeURIComponent가
  // URIError를 던진다.
  const cut = plainText.slice(0, maxLength);
  return `${/[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut}...`;
}

/**
 * gray-matter로 frontmatter를 읽되, YAML 오류에 **어느 파일인지**를 붙여 다시
 * 던집니다(`where`는 postsDir 기준 상대 경로나 파일 경로).
 *
 * 맨 `matter()`는 `YAMLException: incomplete explicit mapping pair … at line 3`
 * 처럼 파일 이름 없이 던져서, 70여 개 원고(`---`로 시작하는 작업 노트 포함) 중
 * 하나가 깨지면 dev는 모든 요청이 500이고 빌드는 첫 단계에서 죽는데 저자가 손으로
 * 이분 탐색해야 했습니다.
 *
 * 건너뛰지 않고 던지는(fail-loud) 이유: 깨진 블록 안에 `status: published`가
 * 있었다면 그 글은 조용히 사이트·sitemap에서 사라집니다. 빌드는 그런 상태로
 * 배포되면 안 되고, dev에서도 오류 화면에 경로가 바로 보이는 편이 경고 한 줄보다
 * 빨리 고쳐집니다.
 *
 * gray-matter의 data는 `{ [key: string]: any }`라 `unknown` 값의 레코드로 좁혀
 * 돌려줍니다 — 호출부가 타입 검사를 우회하지 못하도록.
 */
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
  /**
   * 따옴표 없는 datetime(YAML Date)을 문자열로 적을 타임존 — 설정의 `timezone`.
   * UTC로 적으면 KST 오전 시각이 전날로 밀린다(`toDateString` 참고).
   */
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

  // RawFrontmatter(전 필드 unknown)로 받아 아래에서 전부 좁힙니다.
  const { data, content }: { data: RawFrontmatter; content: string } =
    parseMatter(fileContents, relPath);

  // 유효한 status가 없으면 포스트가 아니다 (validate-posts와 같은 isPostFile 규칙).
  // 타입 가드라서 이 아래에서 data.status는 PostStatus로 좁혀집니다.
  if (!isPostFile(data)) return null;

  // 상대 경로에서 series / rawSlug 계산. '/'와 '\\' 모두 분할해 OS 무관 처리.
  const parts = relPath.split(/[/\\]/);
  // split은 빈 배열을 만들지 않으므로 마지막 원소는 항상 존재한다.
  const fileName = (parts.at(-1) ?? '').replace(/\.(md|mdx)$/, '');
  const currentPath = parts.slice(0, -1).join('/');
  const rawSlug = currentPath ? `${currentPath}/${fileName}` : fileName;

  const cleanContent = extractPlainText(content);
  const series: string | undefined = currentPath || undefined;

  return {
    slug: toOptionalString(data.slug) ?? rawSlug,
    originalSlug: rawSlug,
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
