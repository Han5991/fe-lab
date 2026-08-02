'use client';

import { memo } from 'react';
import { css } from '@design-system/ui-lib/css';
import { SortRadio, type SortKey } from './SortRadio';
import { ViewToggle, type ViewMode } from './ViewToggle';
import { FilterGroup, type FilterItem } from './FilterGroup';

const groupBlock = css({
  display: 'flex',
  flexDir: 'column',
  gap: '[12px]',
  pt: '[12px]',
  borderTopWidth: '[1px]',
  borderTopStyle: 'solid',
  borderTopColor: 'ink.border',
});

interface PostsFilterPanelProps {
  sort: SortKey;
  onSortChange: (v: SortKey) => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;

  tagItems: FilterItem[];
  activeTags: string[];
  onToggleTag: (tag: string) => void;

  seriesItems: FilterItem[];
  activeSeries: string | null;
  onToggleSeries: (id: string) => void;

  yearItems: FilterItem[];
  activeYear: string | null;
  onToggleYear: (id: string) => void;
}

/**
 * /posts 아카이브의 필터 컨트롤 패널.
 * 데스크톱 사이드바와 모바일 바텀시트 두 곳에서 동일하게 렌더됩니다.
 *
 * `React.memo`로 감싸 props가 같으면 리렌더를 건너뛰게 합니다.
 * 호출부에서 토글 핸들러는 `useCallback`, items 배열은 `useMemo`로 안정화하세요.
 */
const PostsFilterPanelImpl = ({
  sort,
  onSortChange,
  view,
  onViewChange,
  tagItems,
  activeTags,
  onToggleTag,
  seriesItems,
  activeSeries,
  onToggleSeries,
  yearItems,
  activeYear,
  onToggleYear,
}: PostsFilterPanelProps) => (
  <div className={css({ display: 'flex', flexDir: 'column', gap: '[16px]' })}>
    <div className={css({ display: 'flex', flexDir: 'column', gap: '[12px]' })}>
      <SortRadio value={sort} onChange={onSortChange} />
      <ViewToggle value={view} onChange={onViewChange} />
    </div>

    {tagItems.length > 0 && (
      <div className={groupBlock}>
        <FilterGroup
          label="태그"
          items={tagItems.slice(0, 12)}
          active={activeTags}
          onToggle={onToggleTag}
        />
      </div>
    )}

    {seriesItems.length > 0 && (
      <div className={groupBlock}>
        <FilterGroup
          label="시리즈"
          items={seriesItems}
          active={activeSeries ? [activeSeries] : []}
          onToggle={onToggleSeries}
        />
      </div>
    )}

    {yearItems.length > 0 && (
      <div className={groupBlock}>
        <FilterGroup
          label="연도"
          items={yearItems}
          active={activeYear ? [activeYear] : []}
          onToggle={onToggleYear}
        />
      </div>
    )}
  </div>
);

export const PostsFilterPanel = memo(PostsFilterPanelImpl);
