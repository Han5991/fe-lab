import type { PostSummary } from '@blog/content/client';
import { fmtDate, postPath } from '@blog/content/client';

import { PostCardShared } from '@/src/components/shared/PostSharedElement';
import { TransitionLink } from '@/src/components/shared/TransitionLink';
import { HiddenPostBadge } from './HiddenPostBadge';
import { postRowItem, postRowLink, postRowMeta, postRowTitle } from './postRow';

interface PostListRowProps {
  post: PostSummary;
}

/**
 * 글 목록의 한 행 — 제목(h3) 좌 / 날짜 우. `/posts`의 목록 보기와 `/series`의 시리즈별 글 목록이
 * 함께 쓴다(감싸는 `<ol>`은 쓰는 쪽). 행 전체가 링크 하나이고, 커버가 없어 제목만 글 상세 h1로
 * 이어지는 공유 요소다(`PostCardShared`).
 */
export const PostListRow = ({ post }: PostListRowProps) => (
  <li className={postRowItem}>
    <TransitionLink
      href={postPath(post.slug)}
      // 이 행의 제목이 글 상세 h1로 이어지는 이동이라는 표시(PostCardShared).
      opensPost
      className={postRowLink}
    >
      <PostCardShared part="title" slug={post.slug}>
        <h3 className={postRowTitle}>
          {post.title}
          <HiddenPostBadge post={post} />
        </h3>
      </PostCardShared>
      {/* 날짜가 없으면 태그 자체를 뺀다 — fmtDate가 빈 문자열을 돌려주므로 크래시는 없지만 내용
          없는 span이 남는다(카드 메타 PostMeta와 같은 패턴). */}
      {post.date && <span className={postRowMeta}>{fmtDate(post.date)}</span>}
    </TransitionLink>
  </li>
);
