<script lang="ts">
  import { css } from '../../../styled-system/css';
  import { postRowBorderRaw, postRowLinkLayoutRaw, postRowMeta } from './postRow';

  /**
   * 허브의 장식 없는 글 목록 한 줄. 마지막 줄의 아래 보더는 행이 스스로 알 수
   * 없으므로 목록 컨테이너(`ol`)가 `:last-child`로 붙인다.
   */
  const {
    href,
    title,
    date,
  }: { href: string; title: string; date?: string | null } = $props();

  /**
   * `2026-06-08` → `06-08`. 허브 목록은 같은 해 글이 대부분이라 연도를 떼고
   * 폭을 줄인다.
   */
  const monthDay = $derived(
    date && date.length >= 10 ? date.slice(5, 10) : (date ?? ''),
  );

  const rowLink = css(postRowBorderRaw, postRowLinkLayoutRaw, {
    fontSize: '[14px]',
    color: 'ink.950',
    textDecoration: 'none',
    transition: '[color 0.15s]',
    // 아카이브·시리즈 행과 달리 밑줄 없이 색만 바꾼다.
    _hover: { color: 'accent.600' },
  });
</script>

<!-- 제목은 h3다 — 홈은 h1(이름) → h2(대표 글) → h3(목록 행) 순이라 레벨을
     건너뛰지 않는다. Panda preflight가 헤딩의 font-size/weight를 inherit로
     리셋하므로 부모 <a>의 14px을 그대로 받는다. -->
<a {href} class={rowLink}>
  <h3 class={css({ minW: '0' })}>{title}</h3>
  {#if monthDay}
    <span class={postRowMeta}>{monthDay}</span>
  {/if}
</a>
