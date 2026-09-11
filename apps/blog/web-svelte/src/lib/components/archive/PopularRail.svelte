<script lang="ts">
  import { fmtNum } from '@blog/content/client';
  import { css } from '../../../../styled-system/css';
  import { getTopPosts } from '$lib/domain/analytics';
  import type { ArchivePost } from './types';

  /**
   * 조회수 상위 글 레일. `apps/blog/web/src/components/blog/PopularRail.tsx`의
   * 이식이다. 데스크톱은 사이드바 아래, 모바일은 목록 아래에 같은 컴포넌트가
   * 한 번씩 서고 브레이크포인트상 배타적으로만 보인다.
   *
   * **실패하면 최신 글로 내려앉는다.** 이 앱의 Supabase는 로컬만 가리키므로
   * (`.env.production` 주석) 배포된 프리뷰에서는 언제나 그 경로다 — 레일이
   * 통째로 사라지는 대신 목록 모양이 남는다. React 판이 `useQuery`로 같은
   * graceful degrade를 한다.
   */
  const {
    posts,
    limit = 5,
  }: { posts: ArchivePost[]; limit?: number } = $props();

  /** slug → 조회수. 도착 전에는 비어 있고, 그동안은 최신 글이 선다. */
  let viewCounts = $state<Record<string, number>>({});
  /** 조회수 순서. 도착 전에는 비어 있다. */
  let ranking = $state<string[]>([]);

  $effect(() => {
    let cancelled = false;
    getTopPosts(limit)
      .then(rows => {
        if (cancelled) return;
        viewCounts = Object.fromEntries(
          rows.map(row => [row.slug, row.view_count]),
        );
        ranking = rows.map(row => row.slug);
      })
      .catch((error: unknown) => {
        console.error('인기 글 조회 실패:', error);
      });
    return () => {
      cancelled = true;
    };
  });

  const bySlug = $derived(new Map(posts.map(post => [post.slug, post])));

  /**
   * 랭킹에 있는 글만, 랭킹 순서대로. 하나도 못 맞추면(아직 안 왔거나 실패)
   * 최신 글 `limit`편으로 폴백한다.
   */
  const items = $derived.by(() => {
    const ranked = ranking
      .map(slug => bySlug.get(slug))
      .filter((post): post is ArchivePost => post !== undefined);
    return ranked.length > 0 ? ranked : posts.slice(0, limit);
  });

  const heading = css({
    display: 'block',
    mb: '3',
    fontFamily: 'sans',
    fontSize: '[12px]',
    fontWeight: 'semibold',
    color: 'ink.500',
  });

  const list = css({
    listStyleType: 'none',
    p: '0',
    m: '0',
    display: 'flex',
    flexDir: 'column',
  });

  const rowFirst = css({ borderTopWidth: '[0]' });
  const row = css({
    borderTopWidth: '[1px]',
    borderStyle: 'solid',
    borderColor: 'ink.border',
  });

  const link = css({
    display: 'flex',
    gap: '[10px]',
    alignItems: 'baseline',
    py: '[10px]',
    transition: '[all 0.15s]',
    _hover: { '& h4': { color: 'accent.700', textDecoration: 'underline' } },
  });

  const rank = css({
    fontFamily: 'mono',
    fontSize: 'sm',
    fontWeight: 'medium',
    color: 'ink.500',
    minW: '6',
    flexShrink: 0,
  });

  const title = css({
    fontFamily: 'sans',
    fontSize: 'sm',
    fontWeight: 'semibold',
    lineHeight: 'headerSm',
    color: 'accent.600',
    transition: '[color 0.15s]',
  });

  const reads = css({
    fontFamily: 'sans',
    fontSize: '[12px]',
    color: 'ink.500',
    mt: '1',
    display: 'inline-block',
  });
</script>

<aside class={css({ position: 'sticky', top: '20' })}>
  <!-- 섹션 라벨은 h3다 — 아래 글 제목이 h4라 span으로 두면 헤딩 레벨이
       건너뛰어진다(페이지 기준 h1 → h2 → h3 → h4). -->
  <h3 class={heading}>Popular · 30일</h3>
  <ol class={list}>
    {#each items as post, i (post.slug)}
      {@const count = viewCounts[post.slug] ?? 0}
      <li class={i === 0 ? rowFirst : row}>
        <a href={post.href} class={link}>
          <span class={rank}>{String(i + 1).padStart(2, '0')}</span>
          <div class={css({ flex: '1', minW: '0' })}>
            <h4 class={title}>{post.title}</h4>
            {#if count > 0}
              <span class={reads}>{fmtNum(count)} reads</span>
            {/if}
          </div>
        </a>
      </li>
    {/each}
  </ol>
</aside>
