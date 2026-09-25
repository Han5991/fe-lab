// `ogDefaultImage`·`siteUrl`을 설정 슬라이스가 아니라 **스칼라**로 받는 함수가
// 있는 이유: 이 둘은 클라이언트 컴포넌트(글 카드)가 부르는데, 소비자가 값을
// 객체째 넘기면 번들러가 필드 단위로 털어내지 못해 사이트 소개문 같은 큰 값까지
// 클라이언트 번들에 실린다. 서버 전용인 절대 URL 빌더만 슬라이스를 받는다.
import type { SiteConfig } from '../shared/contentConfig.ts';
import type { PostData } from './types.ts';
import { isExternalUrl } from './assetUrl.ts';
import { encodePostSlug } from './utils.ts';

/** 그대로 쓰는 값인가 — 외부 URL이거나 사이트 루트 경로(`/og/…`). */
function isAbsoluteThumbnail(thumbnail: string): boolean {
  return isExternalUrl(thumbnail) || thumbnail.startsWith('/');
}

/**
 * 포스트 디렉터리 기준 상대 경로를 정리한다 — 앞의 `./`만 벗긴다(assetUrl.ts와
 * 같은 규칙). 하위 폴더(`img/cover.png`)의 `/`는 경로 구분자로 남긴다.
 */
function toPostRelative(thumbnail: string): string {
  return thumbnail.replace(/^(?:\.\/)+/, '');
}

/**
 * 포스트의 thumbnail URL을 해결합니다.
 *
 * - thumbnail이 없으면 빌드 시 생성되는 글별 OG 카드(/og/{slug}.png) 사용
 *   (scripts/render/generate-og-images.ts가 발행 글 전체에 대해 생성을 보장)
 * - 외부 URL(스킴·`//`) 또는 /로 시작하는 절대 경로는 그대로 사용
 * - 상대 경로면 포스트 디렉토리 기반으로 변환. 디렉터리와 파일 경로 모두
 *   **세그먼트별** 인코딩이라 `img/cover.png`의 `/`가 `%2F`가 되지 않는다
 *   (`%2F`는 대부분의 정적 호스트에서 경로 구분자가 아니라 404가 된다).
 */
export function resolveThumbnailUrl(
  post: Pick<PostData, 'thumbnail' | 'relativeDir' | 'slug'>,
  ogDefaultImage: string,
): string {
  const { thumbnail, relativeDir, slug } = post;
  if (!thumbnail) {
    return slug ? `/og/${encodePostSlug(slug)}.png` : ogDefaultImage;
  }
  if (isAbsoluteThumbnail(thumbnail)) return thumbnail;
  const dir = relativeDir ? `${encodePostSlug(relativeDir)}/` : '';
  return `/posts/${dir}${encodePostSlug(toPostRelative(thumbnail))}`;
}

/** 빌드 시 WebP 최적화본을 만들 수 있는 원본 확장자 */
const OPTIMIZABLE_EXT = /\.(?:png|jpe?g)$/i;

/**
 * 상대 `thumbnail`이 글 폴더의 **파일 이름 하나**인가(`cover.png`).
 *
 * 경로가 섞이면(`./a.png`·`img/a.png`·`../a.png`) 최적화본의 URL과 생성 위치가
 * 갈리고 `../`는 `thumbs/` 밖에 쓴다 — 최적화 대상 판정과 lint:posts의
 * `invalid-thumbnail-path`가 이 함수 하나를 본다.
 */
export function isBareThumbnailName(thumbnail: string): boolean {
  return (
    thumbnail !== '' &&
    thumbnail !== '.' &&
    thumbnail !== '..' &&
    !/[/\\]/.test(thumbnail)
  );
}

/**
 * 최적화 대상 판정: 글 폴더의 png/jpg **파일 이름**인 thumbnail만.
 *
 * 외부 URL과 절대 경로(`/og/*` 생성 카드 포함)는 제외합니다. 생성 OG 카드는
 * satori가 이미 적정 크기로 만들고, 외부 URL은 우리가 변환할 수 없습니다.
 * 파일 이름이 아닌 상대 경로는 원본 URL(`resolveThumbnailUrl`)로 폴백합니다.
 */
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
  // 프로토콜 상대(`//cdn…`)는 origin을 앞에 붙이면 `https://blog//cdn…`이 된다 —
  // 사이트의 스킴만 빌려 절대 URL로 만든다.
  if (url.startsWith('//')) return `${new URL(site.url).protocol}${url}`;
  if (isExternalUrl(url)) return url;
  return `${site.url}${url}`;
}
