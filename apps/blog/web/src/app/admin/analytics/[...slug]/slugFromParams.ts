import { decodeUrlSafe } from '@blog/content';

/**
 * /admin/analytics/[...slug] 세그먼트에서 데이터 조회용 slug를 만든다.
 *
 * useParams()의 세그먼트 값은 **인코딩된 채** 도착하고(한글 slug면
 * `%ED%95%9C%EA%B8%80…`), 대시보드 데이터의 post.slug는 디코드된 원문이다.
 * posts/[...slug]/page.tsx와 같은 규칙(join 후 디코드)으로 비교해야 한글 slug
 * 글의 통계 화면이 빈 placeholder로 떨어지지 않는다. catch-all이라 값은 보통
 * 배열이고, 폴더 경로가 든 slug(`시리즈/파일명`)는 세그먼트 둘로 온다.
 *
 * 디코드는 `decodeUrlSafe`다 — 맨 `decodeURIComponent`는 `%`뒤에 hex가 아닌
 * 문자가 오는 URL(오타·봇 크롤링)에서 URIError를 던져 페이지가 통째로 죽는다.
 * 원문을 돌려주면 lookup만 빗나가 placeholder로 끝난다.
 */
export function slugFromParams(param: string | string[] | undefined): string {
  const raw =
    typeof param === 'string'
      ? param
      : Array.isArray(param)
        ? param.join('/')
        : '';
  return decodeUrlSafe(raw);
}
