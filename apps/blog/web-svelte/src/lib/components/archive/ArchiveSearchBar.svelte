<script lang="ts">
  import { css } from '../../../../styled-system/css';

  /**
   * 아카이브 검색창. `PostsArchive.tsx`의 `ArchiveSearchBar` 이식이다.
   * 데스크톱(사이드바)과 모바일(목록 위) 두 자리에 한 번씩 선다.
   */
  const {
    value,
    onChange,
  }: { value: string; onChange: (next: string) => void } = $props();

  const frame = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    px: '3',
    py: '2.5',
    borderWidth: '[1px]',
    borderStyle: 'solid',
    borderColor: 'ink.border',
    rounded: 'control',
    bg: 'paper.100',
    _focusWithin: { borderColor: 'accent.500' },
    transition: '[border-color 0.15s]',
  });

  const glyph = css({
    fontFamily: 'mono',
    fontSize: '[12px]',
    color: 'ink.500',
    flexShrink: 0,
  });

  const field = css({
    flex: '1',
    bg: 'transparent',
    border: '[none]',
    outline: '[none]',
    fontSize: '[13px]',
    color: 'ink.950',
    fontFamily: 'sans',
    _placeholder: { color: 'ink.500' },
  });

  const clear = css({
    fontFamily: 'mono',
    fontSize: '[12px]',
    color: 'ink.500',
    flexShrink: 0,
    cursor: 'pointer',
    _hover: { color: 'ink.950' },
  });
</script>

<div class={frame}>
  <span aria-hidden="true" class={glyph}>⌕</span>
  <input
    type="search"
    {value}
    oninput={event => {
      onChange(event.currentTarget.value);
    }}
    placeholder="제목, 본문, 태그 검색…"
    aria-label="글 검색"
    class={field}
  />
  {#if value}
    <button
      type="button"
      onclick={() => {
        onChange('');
      }}
      class={clear}
    >
      지우기
    </button>
  {/if}
</div>
