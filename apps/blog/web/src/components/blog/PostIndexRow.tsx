import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostSummary } from '@/domain/post';
import { encodePostSlug } from '@/domain/post/utils';
import { HiddenPostBadge } from './HiddenPostBadge';
import { postRowBorderRaw, postRowLinkLayoutRaw, postRowMeta } from './postRow';

/**
 * `2025-06-08` → `06-08`. 허브 목록은 같은 해 글이 대부분이라 연도를 떼고
 * 폭을 줄입니다(레퍼런스 `.date` 표기).
 */
function toMonthDay(date: string): string {
  return date.length >= 10 ? date.slice(5, 10) : date;
}

interface PostIndexRowProps {
  post: PostSummary;
}

/**
 * 허브의 장식 없는 글 목록 한 줄. 마지막 줄의 아래 보더는 행이 스스로 알 수
 * 없으므로 목록 컨테이너(`ol`)가 `:last-child` 선택자로 붙입니다.
 */
export const PostIndexRow = ({ post }: PostIndexRowProps) => {
  return (
    <Link
      href={`/posts/${encodePostSlug(post.slug)}/`}
      className={css(postRowBorderRaw, postRowLinkLayoutRaw, {
        // 좌우 패딩 없음(postRowLinkLayoutRaw) — 목록 제목이 Hero·대표 글과
        // 같은 세로선에서 시작해야 한다. 예전 2px 때문에 홈에서 이 목록만
        // 2px 오른쪽으로 밀려 있었다.
        fontSize: '[14px]',
        color: 'ink.950',
        transition: '[color 0.15s]',
        // 아카이브·시리즈 행(postRowLink)과 달리 밑줄 없이 색만 바꾼다.
        _hover: { color: 'accent.600' },
      })}
    >
      {/* 제목은 h3다. 아카이브(ArchiveRow)·/series의 글 행과 같은 레벨이라
          헤딩 탐색으로 목록을 훑을 수 있어야 한다. 홈은 h1(이름) → h2(대표 글)
          → h3(목록 행) 순이라 건너뛰지 않는다. Panda preflight가 헤딩의
          font-size/weight를 inherit로 리셋하므로 부모 <a>의 14px을 그대로 쓴다.

          dev에서 draft·예약 글이 여기 섞여 나오므로 다른 목록과 같은 배지를
          달아 발행 상태를 구분한다(프로덕션에서는 아무것도 렌더되지 않는다). */}
      <h3 className={css({ minW: '0' })}>
        {post.title}
        <HiddenPostBadge post={post} />
      </h3>
      {post.date && (
        <span className={postRowMeta}>{toMonthDay(post.date)}</span>
      )}
    </Link>
  );
};
