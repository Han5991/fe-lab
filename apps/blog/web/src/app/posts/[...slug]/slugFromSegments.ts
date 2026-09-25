import { decodeUrlSafe } from '@blog/content';

/**
 * catch-all 세그먼트 배열을 글 slug(디코드된 원문)로 잇는다.
 *
 * 폴더 경로가 든 slug(`시리즈/파일명`)는 세그먼트 여럿으로 오고, 한글 slug는
 * 인코딩된 채 온다 — join 후 디코드한다. 디코드는 `decodeUrlSafe`다: 맨
 * `decodeURIComponent`는 `%` 뒤에 hex가 아닌 문자가 오는 값(파일명의 `%`, 오타
 * URL)에서 URIError를 던져, 빌드(generateStaticParams가 낸 slug)나 dev 라우트가
 * 통째로 죽는다. 원문을 돌려주면 조회만 빗나가 404로 끝난다.
 * (admin 통계 화면의 `slugFromParams`와 같은 규칙.)
 */
export function slugFromSegments(segments: readonly string[]): string {
  return decodeUrlSafe(segments.join('/'));
}
