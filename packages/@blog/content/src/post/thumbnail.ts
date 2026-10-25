// `ogDefaultImage`·`siteUrl`을 설정 슬라이스가 아니라 **스칼라**로 받는 함수가
// 있는 이유: 이 둘은 클라이언트 컴포넌트(글 카드)가 부르는데, 소비자가 값을
// 객체째 넘기면 번들러가 필드 단위로 털어내지 못해 사이트 소개문 같은 큰 값까지
// 클라이언트 번들에 실린다. 서버 전용인 절대 URL 빌더만 슬라이스를 받는다.
import type { SiteConfig } from '../shared/contentConfig.ts';
import type { PostData } from './types.ts';
import { isExternalUrl } from './assetUrl.ts';
import { encodePostSlug } from './utils.ts';

/**
 * 빌드가 글마다 만드는 OG 카드의 경로 접두사(`/og/{slug}.png`). 이 경로는 글이 가진 이미지가 아니라
 * 생성기의 출력물이다 — frontmatter가 그 경로를 적어 두어도(`thumbnail: /og/{slug}.png`) 같은 카드다.
 */
export const OG_CARD_PREFIX = '/og/';

/**
 * 글이 **자기 썸네일**을 갖는가 — frontmatter `thumbnail`이 있고, 생성 OG 카드(`/og/…`)가 아니다.
 * 반대는 "OG 카드가 카드·메타의 이미지가 되는 글"이다(`썸네일 없음`과 `/og/…`를 적어 둔 글 둘 다).
 *
 * 생성기의 `needsGeneratedOg`가 이 함수의 반대다 — 판정을 쓰는 곳이 여럿이라 한 함수에 둔다. 호출마다
 * `Boolean(post.thumbnail)`을 적으면 `/og/…`를 적어 둔 글을 자기 썸네일로 읽는다. 글 상세의 커버가
 * 갈리는 기준은 이 함수가 아니라 `isWideThumbnail`이다.
 */
export function hasAuthoredThumbnail(
  post: Pick<PostData, 'thumbnail'>,
): boolean {
  const { thumbnail } = post;
  return (
    thumbnail !== undefined &&
    thumbnail !== '' &&
    !thumbnail.startsWith(OG_CARD_PREFIX)
  );
}

/**
 * 가로형으로 치는 가로/세로의 하한. OG 카드는 1200×630(약 1.905)이고 커버 틀은 16:9(약 1.78)다 —
 * 1.6 이상이면 틀의 양옆(또는 위아래)을 최대 약 10%만 잘라 cover로 채워도 그림이 읽힌다. 정사각(1.0)과
 * 4:3(약 1.33)은 cover로 채우면 위아래가 25~44% 잘린다.
 */
export const WIDE_THUMBNAIL_MIN_ASPECT = 1.6;

/**
 * 글의 커버 이미지가 가로형인가 — 참이면 16:9 커버 틀을 cover로 채우고(카드 커버와 같은 배율이라 글 카드 ↔ 글 상세가
 * 겹쳐 모핑한다), 거짓이면 contain으로 그리고 차례로 바뀐다(`PostHero`, `PostCardShared`의 `rescaled`).
 * 카드·상세·이전/다음 글이 **같은 함수**로 갈라야 한다 — 짝은 들어오는 쪽의 클래스만 받는다.
 *
 * - OG 카드(썸네일이 없거나 `/og/…`): 언제나 가로형이다(생성기가 1200×630으로 그린다).
 * - 자기 썸네일: 비율(`thumbnailAspect` — 빌드가 파일 머리말에서 읽는다)이 하한 이상일 때만. 비율을 모르면(외부 URL·
 *   없는 파일·다른 형식) 가로형이 아니다 — contain은 어떤 그림도 자르지 않는 쪽이다.
 */
export function isWideThumbnail(
  post: Pick<PostData, 'thumbnail' | 'thumbnailAspect'>,
): boolean {
  if (!hasAuthoredThumbnail(post)) return true;
  const { thumbnailAspect } = post;
  return (
    thumbnailAspect !== undefined &&
    thumbnailAspect >= WIDE_THUMBNAIL_MIN_ASPECT
  );
}

/** 그대로 쓰는 값인가 — 외부 URL이거나 사이트 루트 경로(`/og/…`). */
function isAbsoluteThumbnail(thumbnail: string): boolean {
  return isExternalUrl(thumbnail) || thumbnail.startsWith('/');
}

/** 앞의 `./`만 벗긴다 — 하위 폴더의 `/`는 구분자로 남긴다. */
function toPostRelative(thumbnail: string): string {
  return thumbnail.replace(/^(?:\.\/)+/, '');
}

/**
 * 포스트의 thumbnail URL을 해결합니다.
 *
 * - thumbnail이 없으면 빌드 시 생성되는 글별 OG 카드(/og/{slug}.png) 사용
 *   (scripts/render/generate-og-images.ts가 발행 글 전체에 대해 생성을 보장)
 * - 외부 URL(스킴·`//`) 또는 /로 시작하는 절대 경로는 그대로 사용
 * - 상대 경로면 포스트 디렉토리 기반으로 세그먼트별 인코딩(`%2F`는 정적 호스트에서 404)
 */
export function resolveThumbnailUrl(
  post: Pick<PostData, 'thumbnail' | 'relativeDir' | 'slug'>,
  ogDefaultImage: string,
): string {
  const { thumbnail, relativeDir, slug } = post;
  if (!thumbnail) {
    return slug
      ? `${OG_CARD_PREFIX}${encodePostSlug(slug)}.png`
      : ogDefaultImage;
  }
  if (isAbsoluteThumbnail(thumbnail)) return thumbnail;
  const dir = relativeDir ? `${encodePostSlug(relativeDir)}/` : '';
  return `/posts/${dir}${encodePostSlug(toPostRelative(thumbnail))}`;
}

/** 빌드 시 WebP 최적화본을 만들 수 있는 원본 확장자 */
const OPTIMIZABLE_EXT = /\.(?:png|jpe?g)$/i;

/** 상대 `thumbnail`이 글 폴더의 파일 이름 하나인가 — 경로가 섞이면 최적화본 URL과 생성 위치가 갈린다. */
export function isBareThumbnailName(thumbnail: string): boolean {
  return (
    thumbnail !== '' &&
    thumbnail !== '.' &&
    thumbnail !== '..' &&
    !/[/\\]/.test(thumbnail)
  );
}

/** 최적화 대상(글 폴더의 png/jpg 파일 이름)인가 — 나머지는 원본 URL로 폴백한다. */
export function isOptimizableThumbnail(
  thumbnail?: string,
): thumbnail is string {
  if (!thumbnail || isAbsoluteThumbnail(thumbnail)) return false;
  return isBareThumbnailName(thumbnail) && OPTIMIZABLE_EXT.test(thumbnail);
}

/** 확장자 치환 규칙의 단일 출처 — 아래 두 함수가 공유합니다. */
function toWebpName(thumbnail: string): string {
  return thumbnail.replace(OPTIMIZABLE_EXT, '.webp');
}

/**
 * 최적화본의 `public/thumbs/` 기준 상대 경로(인코딩 전). 대상이 아니면 null.
 * generate-thumbnails.ts가 파일을 쓸 위치를 정할 때 씁니다.
 */
export function thumbnailWebpRelPath(
  post: Pick<PostData, 'thumbnail' | 'relativeDir'>,
): string | null {
  const { thumbnail, relativeDir } = post;
  if (!isOptimizableThumbnail(thumbnail)) return null;
  const name = toWebpName(thumbnail);
  return relativeDir ? `${relativeDir}/${name}` : name;
}

/**
 * 화면에 실제로 띄울 이미지 URL. 최적화본이 있으면 그쪽(`/thumbs/*.webp`),
 * 아니면 원본 해석 결과로 폴백합니다.
 *
 * generate-thumbnails가 발행 글의 모든 대상 썸네일에 대해 생성을 보장하므로
 * (og-images와 같은 계약) 여기서 존재 여부를 확인하지 않습니다.
 *
 * OG/Schema.org 메타에는 이 함수가 아니라 resolveAbsoluteThumbnailUrl을
 * 그대로 쓰세요 — 일부 소셜 크롤러가 WebP를 렌더링하지 못합니다.
 */
export function resolveThumbnailSrc(
  post: Pick<PostData, 'thumbnail' | 'relativeDir' | 'slug'>,
  ogDefaultImage: string,
): string {
  if (!isOptimizableThumbnail(post.thumbnail)) {
    return resolveThumbnailUrl(post, ogDefaultImage);
  }
  const dir = post.relativeDir ? `${encodePostSlug(post.relativeDir)}/` : '';
  return `/thumbs/${dir}${encodePostSlug(toWebpName(post.thumbnail))}`;
}

/**
 * 절대 URL 형태의 thumbnail URL을 반환합니다. (Schema.org, OG 등에 사용)
 */
export function resolveAbsoluteThumbnailUrl(
  post: Pick<PostData, 'thumbnail' | 'relativeDir' | 'slug'>,
  site: Pick<SiteConfig, 'url' | 'ogDefaultImage'>,
): string {
  const url = resolveThumbnailUrl(post, site.ogDefaultImage);
  // 프로토콜 상대 URL은 사이트의 스킴만 빌린다(origin을 붙이면 `https://blog//cdn…`).
  if (url.startsWith('//')) return `${new URL(site.url).protocol}${url}`;
  if (isExternalUrl(url)) return url;
  return `${site.url}${url}`;
}
