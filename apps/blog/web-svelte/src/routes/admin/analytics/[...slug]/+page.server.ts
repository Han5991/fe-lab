import { getAllPostsIncludingHidden } from '$lib/server/content';

/**
 * 프리렌더 대상 열거 — **비공개 글까지 전부** 만든다.
 *
 * admin은 본인만 보는 화면이라 draft·scheduled의 통계도 열 수 있어야 하고,
 * 정적 호스팅에서는 라우트가 미리 있어야 404가 안 난다. 그러지 않으면 draft가
 * published로 바뀌거나 예약 글이 cron 사이에 공개될 때 목록에는 보이는데
 * 상세는 404가 된다(React 판 주석이 같은 사고를 기록하고 있다).
 *
 * slug를 세그먼트로 쪼개 넘기지 않는 이유는 라우트 모양이 다르기 때문이다 —
 * Next의 catch-all은 배열을 받지만 SvelteKit의 rest 파라미터는 문자열 하나다.
 * `시리즈/파일명` 꼴이 그대로 들어가 `admin/analytics/시리즈/파일명/`으로 나간다.
 */
export const entries = () =>
  getAllPostsIncludingHidden().map(post => ({ slug: post.slug }));

/** 화면이 쓰는 slug. rest 파라미터가 후행 슬래시를 삼키는 문제는 공개 글 상세와 같다. */
export const load = ({ params }: { params: { slug: string } }) => ({
  slug: params.slug.replace(/\/+$/, ''),
});
