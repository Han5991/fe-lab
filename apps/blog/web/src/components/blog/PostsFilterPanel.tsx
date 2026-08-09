'use client';

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
 * 예전에는 `React.memo`로 감싸고 호출부에서 핸들러·items를 손으로 안정화했습니다.
 * 지금은 React Compiler가 그 일을 하므로 둘 다 두지 않습니다.
 */
export const PostsFilterPanel = ({
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
