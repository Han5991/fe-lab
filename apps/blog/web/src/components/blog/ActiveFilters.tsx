'use client';

import { css } from '@blog/styled-system/css';
import { pressButton } from '@/src/components/interaction';
import { tagBadge } from '@/src/components/tagBadge';

interface ActiveFiltersProps {
  tags: readonly string[];
  onRemoveTag: (tag: string) => void;
  /** 검색어·태그·시리즈를 지운다(정렬·보기는 남는다) */
  onClearAll: () => void;
}

const row = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '2',
});

// 태그는 코드 이름이라 mono다(카드 메타 줄의 배지와 같은 글자).
const tagButton = css(tagBadge.raw({ interactive: true }), {
  fontFamily: 'mono',
  gap: '1',
});

const removeIcon = css({ fontSize: '2xs', color: 'ink.700' });

// 독립 텍스트 버튼 — hover에 밑줄(색 표의 링크·버튼 hover 규칙). 글자뿐이어도 버튼이라 누름은
// `pressButton`이다.
const clearAll = css(pressButton, {
  textStyle: 'supporting',
  fontWeight: 'medium',
  color: 'ink.950',
  cursor: 'pointer',
  textDecorationLine: 'underline',
  textDecorationColor: 'transparent',
  textUnderlineOffset: '[2px]',
  _hover: { textDecorationColor: 'currentColor' },
});

/**
 * 적용된 태그 필터 — 태그는 글 상세의 태그 링크(`?tag=`)로만 들어오고 화면에 고르는 컨트롤이 없어,
 * 걸린 태그를 여기서 보이고 푼다. 시리즈는 칩이 이미 켜져 보여 여기 두지 않는다.
 */
export const ActiveFilters = ({
  tags,
  onRemoveTag,
  onClearAll,
}: ActiveFiltersProps) => {
  if (tags.length === 0) return null;

  return (
    <div role="group" aria-label="적용된 필터" className={row}>
      {tags.map(tag => (
        <button
          key={tag}
          type="button"
          onClick={() => onRemoveTag(tag)}
          // 누르면 그 필터가 풀린다 — 이름에 "해제"를 담는다.
          aria-label={`#${tag} 필터 해제`}
          className={tagButton}
        >
          #{tag}
          <span aria-hidden="true" className={removeIcon}>
            ✕
          </span>
        </button>
      ))}
      <button type="button" onClick={onClearAll} className={clearAll}>
        모두 지우기
      </button>
    </div>
  );
};
