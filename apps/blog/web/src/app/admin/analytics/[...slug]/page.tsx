import { getAllPostsIncludingHidden } from '@blog/content';
import PostDetailClient from './PostDetailClient';

// admin은 인증된 본인만 접근하는 페이지이므로 draft·scheduled 글까지 모두 정적 라우트로 생성합니다.
// 그렇지 않으면 draft가 published로 promote되거나 scheduled가 cron 사이에 활성화될 때
// admin 리스트엔 보이지만 detail 페이지는 GitHub Pages에서 404가 됩니다.
//
// 라우트는 공개 글 상세(posts/[...slug])와 같은 catch-all입니다. slug는 frontmatter
// `slug:`가 없으면 폴더 경로를 포함한 `시리즈/파일명` 꼴로 폴백되는데(repository.ts),
// 단일 `[slug]`로 두면 그 글의 통계 페이지가 2세그먼트 URL이 되어 라우트와 맞지 않고,
// export도 `admin/analytics/시리즈%2F파일명/`처럼 GitHub Pages가 못 찾는 디렉터리로
// 나갑니다. 세그먼트 배열로 넘겨 `admin/analytics/시리즈/파일명/index.html`이 되게 합니다.
export function generateStaticParams() {
  return getAllPostsIncludingHidden().map(post => ({
    slug: post.slug.split('/'),
  }));
}

export default function PostDetailAnalyticsPage() {
  return <PostDetailClient />;
}
