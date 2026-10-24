import { css } from '@blog/styled-system/css';
import { fmtDate, fmtReadMin } from '@blog/content/client';
import type { PostSummary } from '@blog/content/client';
import { Fragment, type ReactNode } from 'react';

interface PostMetaProps {
  post: Pick<PostSummary, 'date' | 'readMin'>;
  /** 메타 줄 끝에 ` · `로 이어 붙일 태그. 몇 개를 보일지는 쓰는 쪽(카드 변형)이 고른다. */
  tags?: readonly string[] | undefined;
}

const metaRow = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '2',
  textStyle: 'supporting',
  // 날짜·읽기 시간·태그는 mono다(blog-design-system 타이포그래피 — 목업의 sans는 Astryx 테마에
  // mono가 연결되지 않은 부작용).
  fontFamily: 'mono',
  color: 'ink.700',
});

/** 항목 사이 세로 구분선 — 글자 높이의 3/4, 강조 보더 색. 읽을 거리가 아니라 숨긴다. */
const divider = css({
  h: '[0.75em]',
  borderLeftWidth: 'hairline',
  borderLeftStyle: 'solid',
  borderColor: 'ink.borderStrong',
});

/**
 * 카드·행의 메타 줄 — `날짜 | N분 | 태그 · 태그`. 날짜가 없는 글(dev의 draft)은 그 칸째 빠진다.
 * 구분선은 항목 사이에만 놓인다.
 */
export const PostMeta = ({ post, tags }: PostMetaProps) => {
  const items: { key: string; node: ReactNode }[] = [];
  if (post.date) {
    const date = fmtDate(post.date);
    items.push({ key: 'date', node: <time dateTime={date}>{date}</time> });
  }
  items.push({ key: 'read', node: <span>{fmtReadMin(post.readMin)}</span> });
  if (tags && tags.length > 0) {
    items.push({ key: 'tags', node: <span>{tags.join(' · ')}</span> });
  }

  return (
    <div className={metaRow}>
      {items.map(({ key, node }, index) => (
        <Fragment key={key}>
          {index > 0 && <span aria-hidden="true" className={divider} />}
          {node}
        </Fragment>
      ))}
    </div>
  );
};
