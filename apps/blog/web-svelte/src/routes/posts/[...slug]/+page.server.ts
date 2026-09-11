import { error } from '@sveltejs/kit';
import {
  buildPostSeo,
  getAllPostSlugs,
  getPostBySlug,
} from '$lib/server/content';
import { renderMarkdown } from '$lib/server/markdown';

/**
 * 프리렌더 대상 열거 — 정적 export라 SvelteKit이 어떤 slug가 있는지 알아야 한다.
 * React 판의 `generateStaticParams`에 대응한다.
 */
export const entries = () => getAllPostSlugs().map(slug => ({ slug }));

/**
 * rest 파라미터는 **후행 슬래시를 삼킨다.**
 *
 * `trailingSlash: 'always'`라 URL이 `/posts/foo/`인데, `[...slug]`가 그 마지막
 * 빈 세그먼트까지 잡아 `params.slug`가 `'foo/'`가 된다. Next.js의 catch-all은
 * 세그먼트 배열(`['foo']`)이라 이 문제가 없다 — 같은 URL 계약을 걸어도 라우터가
 * 넘겨주는 값의 모양이 다르다는 뜻이라, 옮길 때 조용히 전 글이 404가 됐다
 * (프리렌더가 fail로 잡아 줬다).
 */
const normalizeSlug = (raw: string): string => raw.replace(/\/+$/, '');

export const load = ({ params }: { params: { slug: string } }) => {
  const slug = normalizeSlug(params.slug);
  const post = getPostBySlug(slug);
  if (!post) error(404, `글을 찾을 수 없습니다: ${slug}`);

  return {
    post: {
      title: post.title,
      date: post.date,
      readMin: post.readMin,
      tags: post.tags ?? [],
      html: renderMarkdown(post.content, post.relativeDir),
    },
    seo: buildPostSeo(post, post.slug),
  };
};
