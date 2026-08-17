import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostData } from '@blog/content';
// leaf import — 글 상세에서 쓰는 프레젠테이션 컴포넌트라 배럴(node:fs)을 물리지 않는다.
import { archivePath } from '@blog/content';
import { fmtDate } from '@blog/content';

interface PostHeaderProps {
  post: PostData;
  /** 시리즈 내 위치 — 있다면 `시리즈 · {표시명} 3/3` 배지로 표시 */
  seriesIndex?:
    { current: number; total: number; displayName: string } | undefined;
}

// 메타 줄(mono 12px) 안에서 태그를 해시태그로 인라인시킨다. 별도 pill 그룹을
// 없앴을 뿐 필터 링크는 그대로라, /posts/?tag=... 아카이브 필터가 계속 산다.
const tagLinkStyle = css({
  color: 'ink.500',
  textDecorationLine: 'none',
  transition: '[color 0.15s]',
  _hover: { color: 'accent.600' },
});

export const PostHeader = ({ post, seriesIndex }: PostHeaderProps) => {
  const tags = post.tags?.slice(0, 4) ?? [];

  return (
    <header>
      {seriesIndex && (
        <span
          className={css({
            display: 'inline-block',
            // 안에 `3/3` 같은 숫자가 있어도 sans다(레퍼런스 `.badge` 기준).
            // 홈·/series의 같은 배지와 맞춘다.
            fontFamily: 'sans',
            fontSize: '[12px]',
            // 배지는 accent.50 배경 위 작은 글씨라 제목용 accent.900을 쓰면
            // 배경과 붙어 답답해진다. 링크와 같은 accent.600을 유지한다.
            color: 'accent.600',
            bg: 'accent.50',
            rounded: '[6px]',
            px: '[9px]',
            py: '[2px]',
          })}
        >
          시리즈 · {seriesIndex.displayName} {seriesIndex.current}/
          {seriesIndex.total}
        </span>
      )}
      <h1
        className={css({
          fontFamily: 'sans',
          // 레퍼런스(화면 2)의 22px을 그대로 쓴다. 목업 콘텐츠 폭(640px)과
          // 실제 본문 칼럼(railText 680px)이 거의 같아 반응형 분기가 필요 없다.
          fontSize: '[22px]',
          fontWeight: 'bold',
          lineHeight: 'headerSm',
          // 글 제목은 액센트. 바로 아래 메타 줄(ink.500)·excerpt(ink.600)와
          // 본문 h3·h4는 무채색이라, 색이 제목 계열의 표식이 된다.
          color: 'accent.900',
          mt: '[12px]',
          mb: '[6px]',
        })}
      >
        {post.title}
      </h1>
      <p
        className={css({
          fontFamily: 'mono',
          fontSize: '[12px]',
          color: 'ink.500',
          fontVariantNumeric: 'tabular-nums',
          // excerpt가 뒤따르면 메타는 제목 쪽에 붙여두고, 히어로 앞 여백은
          // excerpt가 대신 만든다(레퍼런스의 리드 문단 mb 22px과 같은 리듬).
          mb: post.excerpt ? '[10px]' : '[22px]',
        })}
      >
        {post.date && `${fmtDate(post.date)} · `}
        {post.readMin} min
        {/* 레퍼런스 표기: `2025-03-31 · 14 min · #ecs #docker` — 태그 묶음
            앞에만 가운뎃점을 두고 태그끼리는 공백으로 잇는다. */}
        {tags.length > 0 && ' · '}
        {tags.map((t, i) => (
          <span key={t}>
            {i > 0 && ' '}
            <Link href={archivePath({ tag: t })} className={tagLinkStyle}>
              #{t}
            </Link>
          </span>
        ))}
      </p>
      {post.excerpt && (
        <p
          className={css({
            fontSize: '[14px]',
            color: 'ink.600',
            lineHeight: 'comfortable',
            mb: '[22px]',
          })}
        >
          {post.excerpt}
        </p>
      )}
    </header>
  );
};
