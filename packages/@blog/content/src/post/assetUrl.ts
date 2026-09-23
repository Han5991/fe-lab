import { encodePostSlug } from './utils.ts';

/**
 * 마크다운 본문 속 상대 URL(이미지 등)을 사이트 경로로 해석합니다.
 * 사이트 렌더링(MarkdownImage)이 쓰는 단일 소스 — 경로 해석은 여기서만 수정합니다.
 *
 * - 절대 URL(프로토콜·`//`), 앵커(`#`), 루트 경로(`/...`)는 그대로 반환
 * - 상대 경로는 sync-posts가 복사하는 public/posts/ 기준으로 변환
 *   (루트 레벨 포스트는 relativeDir가 없어도 `/posts/` 프리픽스 유지)
 * - relativeDir는 한글/공백이 흔해 세그먼트별 percent-encoding.
 *   파일명 부분은 markdown 파서(micromark)가 이미 인코딩하므로 그대로 둔다.
 */
export function resolvePostAssetUrl(url: string, relativeDir?: string): string {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\/)/i.test(url)) return url;
  const cleaned = url.replace(/^\.\//, '');
  const prefix = relativeDir ? `${encodePostSlug(relativeDir)}/` : '';
  return `/posts/${prefix}${cleaned}`;
}
