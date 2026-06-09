import { SITE_URL, OG_DEFAULT_IMAGE } from '../../lib/constants';
import type { PostData } from './types';
import { encodePostSlug } from './utils';

/**
 * 포스트의 thumbnail URL을 해결합니다.
 *
 * - thumbnail이 없으면 빌드 시 생성되는 글별 OG 카드(/og/{slug}.png) 사용
 *   (scripts/generate-og-images.ts가 발행 글 전체에 대해 생성을 보장)
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
