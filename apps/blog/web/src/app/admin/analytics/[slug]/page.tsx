import { getAllPostsIncludingHidden } from '@/lib/posts';
import PostDetailClient from './PostDetailClient';

// admin은 인증된 본인만 접근하는 페이지이므로 draft·scheduled 글까지 모두 정적 라우트로 생성합니다.
// 그렇지 않으면 draft가 published로 promote되거나 scheduled가 cron 사이에 활성화될 때
// admin 리스트엔 보이지만 detail 페이지는 GitHub Pages에서 404가 됩니다.
export function generateStaticParams() {
  return getAllPostsIncludingHidden().map(post => ({
    slug: post.slug,
  }));
}

export default function PostDetailAnalyticsPage() {
  return <PostDetailClient />;
}
