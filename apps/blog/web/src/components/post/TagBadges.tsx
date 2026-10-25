import { css } from '@blog/styled-system/css';
import { archivePath } from '@blog/content/client';
import { tagBadge } from '@/src/components/tagBadge';
import { TransitionLink } from '@/src/components/shared/TransitionLink';

interface TagBadgesProps {
  tags: readonly string[];
}

const list = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '1',
  m: '0',
  p: '0',
  listStyleType: 'none',
});

const badge = tagBadge({ interactive: true });

/**
 * 글 아래의 태그 줄 — `#태그` 배지가 글 목록을 그 태그로 거르는 링크(`/posts/?tag=…`)다. 글 카드 안의
 * 태그는 링크가 아니므로(카드 링크 안에 링크를 둘 수 없다) **이 줄이 아카이브 태그 필터로 들어오는
 * 유일한 입구**다. 태그가 없는 글은 아무것도 그리지 않는다.
 */
export const TagBadges = ({ tags }: TagBadgesProps) => {
  if (tags.length === 0) return null;
  return (
    <ul aria-label="태그" className={list}>
      {tags.map(tag => (
        <li key={tag}>
          <TransitionLink href={archivePath({ tag })} className={badge}>
            #{tag}
          </TransitionLink>
        </li>
      ))}
    </ul>
  );
};
