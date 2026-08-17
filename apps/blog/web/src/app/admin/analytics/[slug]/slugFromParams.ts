/**
 * /admin/analytics/[slug] 세그먼트에서 데이터 조회용 slug를 만든다.
 *
 * useParams()의 세그먼트 값은 **인코딩된 채** 도착하고(한글 slug면
 * `%ED%95%9C%EA%B8%80…`), 대시보드 데이터의 post.slug는 디코드된 원문이다.
 * posts/[...slug]/page.tsx와 같은 규칙(join 후 decodeURIComponent)으로
 * 비교해야 한글 slug 글의 통계 화면이 빈 placeholder로 떨어지지 않는다.
 */
export function slugFromParams(param: string | string[] | undefined): string {
  const raw =
    typeof param === 'string'
      ? param
      : Array.isArray(param)
        ? param.join('/')
        : '';
  return decodeURIComponent(raw);
}
