import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostsFilterPanel } from './PostsFilterPanel';

// 글 수 상위 12개 + 13번째 태그.
const TAG_ITEMS = Array.from({ length: 13 }, (_, i) => ({
  id: `tag${i + 1}`,
  label: `#tag${i + 1}`,
  count: 20 - i,
}));

const renderPanel = (activeTags: string[]) =>
  render(
    <PostsFilterPanel
      sort="recent"
      onSortChange={vi.fn()}
      view="cards"
      onViewChange={vi.fn()}
      tagItems={TAG_ITEMS}
      activeTags={activeTags}
      onToggleTag={vi.fn()}
      seriesItems={[]}
      activeSeries={null}
      onToggleSeries={vi.fn()}
      yearItems={[]}
      activeYear={null}
      onToggleYear={vi.fn()}
    />,
  );

describe('PostsFilterPanel 태그 목록', () => {
  // 다른 화면의 태그 링크로 들어온 ?tag=가 상위 밖이면 켜져 있는데 끌 버튼이 없다.
  test.each([
    ['평소에는 상위 12개만 보인다', [], null],
    ['상위 밖의 태그라도 켜져 있으면 눌린 버튼으로 보인다', ['tag13'], 'true'],
  ])('%s', (_name, activeTags, pressed) => {
    renderPanel(activeTags);

    expect(
      screen
        .queryByRole('button', { name: /#tag13/ })
        ?.getAttribute('aria-pressed') ?? null,
    ).toBe(pressed);
  });
});
