import { css } from '@blog/styled-system/css';
import type { PostData } from '@blog/content/client';
import { PostDetailShared } from '@/src/components/shared/PostSharedElement';
import { Breadcrumbs } from './Breadcrumbs';
import { Byline } from './Byline';

interface PostHeaderProps {
  post: Pick<
    PostData,
    'slug' | 'title' | 'excerpt' | 'date' | 'readMin' | 'series'
  >;
  /** 시리즈 글이면 그 표시명 — 있을 때만 빵부스러기를 그린다. */
  seriesName?: string | undefined;
}

/**
 * 글 머리 — `[빵부스러기] 제목(h1) → dek → 바이라인 → 구분선`. 블록 사이는 16이다(목업).
 *
 * 제목은 display1(42/52)이지만 md(768px) 미만에서는 display3(29/36)으로 낮춘다 — 375px에서는 한 줄에
 * 한글 여덟 자 안팎이라 긴 제목이 네댓 줄로 쌓인다(목업은 폭을 정의하지 않았다).
 * dek는 frontmatter `excerpt`다. 태그와 공유는 본문 아래 `TagBadges` 줄로 갔다.
 */
export const PostHeader = ({ post, seriesName }: PostHeaderProps) => (
  <header className={css({ display: 'flex', flexDir: 'column', gap: '4' })}>
    {post.series && seriesName && (
      <Breadcrumbs series={{ id: post.series, name: seriesName }} />
    )}
    {/* 글 카드·목록 행의 제목이 이 h1로 이어진다(공유 요소). */}
    <PostDetailShared part="title" slug={post.slug}>
      <h1
        className={css({
          textStyle: { base: 'display3', md: 'display1' },
          // 글 제목은 본문 잉크다. 바로 아래 dek(ink.700)와는 크기·굵기·명도로 갈린다.
          color: 'ink.950',
        })}
      >
        {post.title}
      </h1>
    </PostDetailShared>
    {post.excerpt && (
      <p className={css({ textStyle: 'large', color: 'ink.700' })}>
        {post.excerpt}
      </p>
    )}
    <Byline date={post.date} readMin={post.readMin} />
    <hr className={css({ m: '0', borderColor: 'ink.border' })} />
  </header>
);
