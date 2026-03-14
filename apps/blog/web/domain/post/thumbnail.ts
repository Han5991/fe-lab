import { SITE_URL, OG_DEFAULT_IMAGE } from '../../lib/constants';
import type { PostData } from './types';

/**
 * 포스트의 thumbnail URL을 해결합니다.
 *
 * - thumbnail이 없으면 기본 OG 이미지 반환
 * - http/https 또는 /로 시작하는 절대 경로는 그대로 사용
 * - 상대 경로면 포스트 디렉토리 기반으로 변환
 */
export function resolveThumbnailUrl(
  post: Pick<PostData, 'thumbnail' | 'relativeDir'>,
): string {
  const { thumbnail, relativeDir } = post;
  if (!thumbnail) return OG_DEFAULT_IMAGE;
  if (thumbnail.startsWith('http') || thumbnail.startsWith('/')) {
    return thumbnail;
  }
  const dir = relativeDir
    ? `${relativeDir.split('/').map(encodeURIComponent).join('/')}/`
    : '';
  return `/posts/${dir}${encodeURIComponent(thumbnail)}`;
}

/**
 * 절대 URL 형태의 thumbnail URL을 반환합니다. (Schema.org, OG 등에 사용)
 */
export function resolveAbsoluteThumbnailUrl(
  post: Pick<PostData, 'thumbnail' | 'relativeDir'>,
): string {
  const url = resolveThumbnailUrl(post);
  if (url.startsWith('http')) return url;
  return `${SITE_URL}${url}`;
}
