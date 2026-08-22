import { POSTS_PATH, postUrl, type PostData } from '../post/index.ts';
import type { ContentApi } from '../post/createContent.ts';
import { decodeUrlSafe } from '../shared/url.ts';

/**
 * 빌드 산출물 레지스트리 — "어떤 산출물이, 어떤 글 집합을, 발행 글 기준(reference)
 * 대비 어떤 포함 관계로 담아야 하는가"의 단일 출처입니다.
 *
 * check-seo.ts가 이 목록을 **순회**하며 검사합니다. 예전 `checkFeeds(sitemap,
 * rss, llms)`는 인자가 3개로 고정돼 있어서 `llms-full.txt`와
 * `search-index.json`이 검사 대상 밖이었고, 실제로 llms-full.txt의 인코딩
 * 누락(contract/url PR이 수정)을 잡아줄 게이트가 없었습니다. 이제 여기에
 * 항목을 더하면 검사가 자동으로 붙고, 산출물이 없으면 `missing-artifact`로
 * 걸립니다.
 *
 * 위치가 post/(content 레이어)가 아니라 scripts/(build 레이어)인 이유: 항목이
 * `out/` 기준 경로와 추출 정규식을 들고 있는 **빌드 도구 관심사**라서다. content에
 * 두면 로더가 빌드 산출물 경로를 알게 된다.
 *
 * **레지스트리에 없는 산출물**: `public/thumbs/*.webp`는 파일명이
 * `{relativeDir}/{image}-thumb.webp`라 파일에서 글을 되돌릴 수 없어 글 단위
 * 집합 대조가 성립하지 않는다. 대신 generate-thumbnails.ts가 글 집합 선택만
 * 아래 resolvePostSet을 공유한다.
 */

/**
 * 생성기들이 쓰는 글 집합 셀렉터. 레지스트리 항목의 `postSet`이 이 키를
 * 가리키고, 생성기 진입점들도 같은 셀렉터를 불러 씁니다 — 생성기가 각자
 * getAllPosts류를 고르면 레지스트리 선언과 실제 생성 집합이 조용히 어긋날 수
 * 있습니다. 글을 읽는 인스턴스는 컨텍스트(`ContentContext.content`)에서 온다 —
 * 이름 → 로더 매핑만 여기 있고, 어느 루트를 읽을지는 호출자가 정한다.
 */
export const POST_SET_NAMES = ['visible', 'all'] as const;
export type PostSetName = (typeof POST_SET_NAMES)[number];

export function resolvePostSet(
  content: ContentApi,
  name: PostSetName,
): PostData[] {
  return name === 'visible'
    ? /** 공개 글 — isPostVisible 판정 통과. sitemap·rss·llms·검색 인덱스의 베이스 */
      content.getAllPosts()
    : /** draft·scheduled 포함 전체 — admin 대시보드용 */
      content.getAllPostsIncludingHidden();
}

/**
 * reference(= 발행 글 집합을 exact로 담는 sitemap) 대비 포함 관계.
 *
 * - `exact`: 발행 글 전부를, 그것만 담는다 — 빠져도(missing) 더 있어도(extra) 위반
 * - `subset`: 발행 글의 **일부만** 담는 것이 정상 — extra만 위반 (og 이미지)
 * - `superset`: 발행 글 **이상**을 담는 것이 정상 — missing만 위반 (admin 인덱스)
 */
export type ArtifactRelation = 'exact' | 'subset' | 'superset';

interface ArtifactSpecBase {
  /** 위반 메시지에 쓰는 이름 */
  name: string;
  /** out/ 기준 경로 (file이면 파일, dir이면 디렉터리) */
  path: string;
  /** 이 산출물을 만드는 생성기가 쓰는 글 집합 (POST_SET_NAMES 키) */
  postSet: PostSetName;
  relation: ArtifactRelation;
  /** 대조 기준 산출물 — 정확히 하나만 true */
  reference?: true;
}

export type ArtifactSpec =
  | (ArtifactSpecBase & {
      kind: 'file';
      /**
       * 산출물 텍스트 → 담긴 글 URL 집합 (디코드 정규화 완료 상태).
       * `siteUrl`은 설정의 origin — 산출물이 절대 URL로 적혀 있어서 필요하다.
       */
      extractUrls: (text: string, siteUrl: string) => Set<string>;
    })
  | (ArtifactSpecBase & {
      kind: 'dir';
      /** 디렉터리 안 파일들의 상대 경로('/' 구분) → 담긴 글 URL 집합 */
      extractUrls: (relPaths: string[], siteUrl: string) => Set<string>;
    });

/**
 * 각 산출물에서 **글 목록에 해당하는 자리**의 URL만 뽑아 포스트 URL로 좁힙니다.
 *
 * 문서 전체에서 정규식으로 긁으면 RSS `content:encoded`의 본문 링크와 이미지
 * 경로(`/posts/feconf/img/…`)까지 딸려 와 "rss에만 있는 글"로 오탐합니다.
 * 그래서 형식마다 목록 위치를 지정해서 읽습니다 — sitemap은 `<loc>`, rss는
 * `<guid>`, llms.txt·llms-full.txt는 마크다운 링크의 URL.
 *
 * 인코딩 차이로 오탐하지 않도록 URL은 디코드해서 정규화합니다(`decodeUrlSafe`
 * — 잘못된 시퀀스에 URIError로 도구가 멈추지 않게).
 */
function extractPostUrls(
  text: string,
  pattern: RegExp,
  siteUrl: string,
): Set<string> {
  const postPrefix = `${siteUrl}${POSTS_PATH}`;
  return new Set(
    [...text.matchAll(pattern)]
      // 이 파일의 패턴들은 전부 1번 캡처 그룹이 매치에 항상 참여한다.
      .map(m => decodeUrlSafe((m[1] ?? '').trim()))
      // `/posts/` 자체는 아카이브 목록 페이지지 글이 아니다 — sitemap에만 있는 게 정상.
      .filter(url => url.startsWith(postPrefix) && url !== postPrefix),
  );
}

const SITEMAP_LOC = /<loc>([^<]+)<\/loc>/g;
const RSS_GUID = /<guid[^>]*>([^<]+)<\/guid>/g;
// llms.txt(`- [제목](url): 요약`)와 llms-full.txt(`### [제목](url) (날짜)`)가
// 같은 마크다운 링크 형식이라 추출 패턴 하나를 공유한다.
const LLMS_LINK = /\]\((https?:\/\/[^)\s]+)\)/g;

/**
 * slug 배열을 담는 JSON 인덱스 → 글 URL 집합. URL 조립은 페이지 링크와 같은
 * 빌더(postUrl)를 쓰고, 비교 정규화를 위해 디코드해 둔다.
 *
 * 깨진 JSON은 빈 집합으로 처리한다 — 그러면 reference의 글 전부가
 * `artifact-missing-posts`로 보고되어 게이트는 확실히 실패하되, 검사 도구가
 * 스택 트레이스로 멈추지는 않는다.
 */
function extractJsonIndexUrls(text: string, siteUrl: string): Set<string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return new Set();
  }
  if (!Array.isArray(parsed)) return new Set();
  return new Set(
    parsed
      .filter(
        (entry): entry is { slug: string } =>
          typeof (entry as { slug?: unknown } | null)?.slug === 'string',
      )
      .map(entry => decodeUrlSafe(postUrl(entry.slug, siteUrl))),
  );
}

/** `og/{slug}.png` 파일 경로 → 글 URL 집합. 중첩 slug는 하위 폴더로 보존돼 있다. */
function extractOgImageUrls(relPaths: string[], siteUrl: string): Set<string> {
  return new Set(
    relPaths
      .filter(p => p.endsWith('.png'))
      .map(p => decodeUrlSafe(postUrl(p.slice(0, -'.png'.length), siteUrl))),
  );
}

export const ARTIFACTS: readonly ArtifactSpec[] = [
  {
    name: 'sitemap.xml',
    path: 'sitemap.xml',
    kind: 'file',
    postSet: 'visible',
    relation: 'exact',
    // 대조 기준. 색인 제출의 원장(원 소스)이고 발행 글 전부를 exact로 담는다.
    reference: true,
    extractUrls: (text, siteUrl) => extractPostUrls(text, SITEMAP_LOC, siteUrl),
  },
  {
    name: 'rss.xml',
    path: 'rss.xml',
    kind: 'file',
    postSet: 'visible',
    relation: 'exact',
    extractUrls: (text, siteUrl) => extractPostUrls(text, RSS_GUID, siteUrl),
  },
  {
    name: 'llms.txt',
    path: 'llms.txt',
    kind: 'file',
    postSet: 'visible',
    relation: 'exact',
    extractUrls: (text, siteUrl) => extractPostUrls(text, LLMS_LINK, siteUrl),
  },
  {
    name: 'llms-full.txt',
    path: 'llms-full.txt',
    kind: 'file',
    postSet: 'visible',
    relation: 'exact',
    extractUrls: (text, siteUrl) => extractPostUrls(text, LLMS_LINK, siteUrl),
  },
  {
    name: 'search-index.json',
    path: 'search-index.json',
    kind: 'file',
    postSet: 'visible',
    relation: 'exact',
    extractUrls: extractJsonIndexUrls,
  },
  {
    // generate-search-index.ts는 산출 파일이 **두 개**다 — 공개 검색용
    // search-index.json(visible)과 admin 대시보드용 이 파일(all). 한 줄로
    // 합치면 admin 인덱스가 검사에서 빠지거나, hidden 글이 extra로 오탐된다.
    name: 'admin-posts-index.json',
    path: 'admin-posts-index.json',
    kind: 'file',
    postSet: 'all',
    // draft·scheduled가 더 들어 있는 것이 정상 — 발행 글이 빠졌을 때만 위반.
    relation: 'superset',
    extractUrls: extractJsonIndexUrls,
  },
  {
    // og 카드는 visible 전체가 아니라 그 **부분집합**이다 — thumbnail이 없거나
    // `/og/*`를 가리키는 글만 생성한다(generate-og-images.ts의
    // needsGeneratedOg). exact로 선언하면 손수 썸네일을 지정한 글마다
    // "og에 없는 글"이 떠서 게이트가 항상 실패한다. 그래서 subset — 발행되지
    // 않은 글의 잔여 이미지(extra)만 잡는다.
    name: 'og 이미지 (og/*.png)',
    path: 'og',
    kind: 'dir',
    postSet: 'visible',
    relation: 'subset',
    extractUrls: extractOgImageUrls,
  },
];
