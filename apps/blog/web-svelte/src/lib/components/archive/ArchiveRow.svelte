<script lang="ts">
  import {
    postRowItem,
    postRowLink,
    postRowMeta,
    postRowTitle,
  } from '../postRow';

  /**
   * 아카이브 리스트 뷰의 한 행. `PostsArchive.tsx`의 `ArchiveRow` 이식이다.
   *
   * **정적 HTML에 남는 목록도 이 컴포넌트를 쓴다.** 아카이브 뷰는 마운트 후에야
   * 켜지므로(주소의 쿼리를 프리렌더에서 읽을 수 없다) 프리렌더된 폴백 목록과
   * 하이드레이션 후 목록이 같은 행이어야 화면이 바뀌지 않는다 — React 판이
   * 이 컴포넌트를 export하는 이유와 같다.
   */
  const {
    href,
    title,
    dateLabel,
  }: { href: string; title: string; dateLabel: string } = $props();
</script>

<li class={postRowItem}>
  <a {href} class={postRowLink}>
    <h3 class={postRowTitle}>{title}</h3>
    <!-- 날짜가 없으면 태그 자체를 내지 않는다 — 내용 없는 span이 남지 않게. -->
    {#if dateLabel}
      <span class={postRowMeta}>{dateLabel}</span>
    {/if}
  </a>
</li>
