<script lang="ts">
  import { recordRecentView } from './recentViews';

  /**
   * 지금 읽는 글을 최근 목록에 남긴다 — 검색 다이얼로그의 빈 검색어 기본 목록이
   * 이것이다.
   *
   * 컴포넌트로 둔 이유는 `$effect`를 브라우저에서만 돌리기 위해서다. 글 페이지는
   * 프리렌더되므로 서버에서도 한 번 평가되는데, `localStorage`는 거기 없다.
   * React 판의 `useRecordRecentView` 훅과 같은 자리다.
   */
  const { slug, title }: { slug: string; title: string } = $props();

  $effect(() => {
    recordRecentView(slug, title);
  });
</script>
