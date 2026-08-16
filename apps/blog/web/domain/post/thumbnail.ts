import { SITE_URL, OG_DEFAULT_IMAGE } from '../../lib/shared/constants';
import type { PostData } from './types';
import { encodePostSlug } from './utils';

/**
 * 포스트의 thumbnail URL을 해결합니다.
 *
 * - thumbnail이 없으면 빌드 시 생성되는 글별 OG 카드(/og/{slug}.png) 사용
 *   (scripts/render/generate-og-images.ts가 발행 글 전체에 대해 생성을 보장)
 * - http/https 또는 /로 시작하는 절대 경로는 그대로 사용
 * - 상대 경로면 포스트 디렉토리 기반으로 변환
 */
export function resolveThumbnailUrl(
  post: Pick<PostData, 'thumbnail' | 'relativeDir' | 'slug'>,
): string {
  const { thumbnail, relativeDir, slug } = post;
  if (!thumbnail) {
    return slug ? `/og/${encodePostSlug(slug)}.png` : OG_DEFAULT_IMAGE;
  }
  if (thumbnail.startsWith('http') || thumbnail.startsWith('/')) {
    return thumbnail;
  }
  const dir = relativeDir ? `${encodePostSlug(relativeDir)}/` : '';
  return `/posts/${dir}${encodeURIComponent(thumbnail)}`;
}

/** 빌드 시 WebP 최적화본을 만들 수 있는 원본 확장자 */
const OPTIMIZABLE_EXT = /\.(?:png|jpe?g)$/i;

/**
 * 최적화 대상 판정: posts/ 안의 실제 이미지 파일을 가리키는 thumbnail만.
 *
 * 외부 URL(http)과 절대 경로(`/og/*` 생성 카드 포함)는 제외합니다. 생성 OG
 * 카드는 satori가 이미 적정 크기로 만들고, 외부 URL은 우리가 변환할 수 없습니다.
 */
export function isOptimizableThumbnail(
  thumbnail?: string,
): thumbnail is string {
  if (!thumbnail) return false;
  if (thumbnail.startsWith('http') || thumbnail.startsWith('/')) return false;
  return OPTIMIZABLE_EXT.test(thumbnail);
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
): string {
  if (!isOptimizableThumbnail(post.thumbnail)) {
    return resolveThumbnailUrl(post);
  }
  // 디렉터리는 세그먼트별(구분자 보존), 파일명은 통째로 인코딩 —
  // resolveThumbnailUrl과 같은 규칙이라 경로 형태가 어긋나지 않습니다.
  const dir = post.relativeDir ? `${encodePostSlug(post.relativeDir)}/` : '';
  return `/thumbs/${dir}${encodeURIComponent(toWebpName(post.thumbnail))}`;
}

/**
 * 절대 URL 형태의 thumbnail URL을 반환합니다. (Schema.org, OG 등에 사용)
 */
export function resolveAbsoluteThumbnailUrl(
  post: Pick<PostData, 'thumbnail' | 'relativeDir' | 'slug'>,
): string {
  const url = resolveThumbnailUrl(post);
  if (url.startsWith('http')) return url;
  return `${SITE_URL}${url}`;
}
