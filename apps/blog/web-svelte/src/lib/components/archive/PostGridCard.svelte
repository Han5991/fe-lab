<script lang="ts">
  import { css } from '../../../../styled-system/css';
  import Label from '../Label.svelte';
  import { tagPillRaw } from '../tagPill';
  import type { ArchivePost } from './types';

  /**
   * 카드 뷰의 글 카드. `apps/blog/web/src/components/blog/PostGridCard.tsx`의
   * 이식이다. 썸네일 경로는 서버가 `resolveThumbnailSrc`로 풀어 준다.
   */
  const {
    post,
    priority = false,
  }: {
    post: ArchivePost;
    /**
     * 첫 화면에 들어오는 카드. LCP 후보라 lazy 대신 우선 로드한다. 목록 전체에
     * 걸면 화면 밖 이미지까지 한꺼번에 받아 오히려 LCP가 밀린다.
     */
    priority?: boolean;
  } = $props();

  /** CSS가 실제 크기를 정하므로 이 둘은 종횡비 힌트다(표시 346×160). */
  const THUMB_WIDTH = 692;
  const THUMB_HEIGHT = 320;

  const meta = $derived(
    post.dateLabel ? `${post.dateLabel} · ${post.readMin}분` : `${post.readMin}분`,
  );

  const card = css({
    display: 'flex',
    flexDir: 'column',
    bg: 'paper.100',
    borderWidth: '[1px]',
    borderColor: 'ink.border',
    rounded: '[12px]',
    overflow: 'hidden',
    transition: '[border-color 0.15s]',
    _hover: {
      borderColor: 'ink.borderStrong',
      '& h3': { textDecoration: 'underline' },
    },
  });

  const thumbImage = css({
    display: 'block',
    w: 'full',
    h: '[160px]',
    objectFit: 'cover',
    borderBottomWidth: '[1px]',
    borderColor: 'ink.border',
  });

  const body = css({
    p: '[16px]',
    display: 'flex',
    flexDir: 'column',
    gap: '2',
    flex: '1',
  });

  const cardTitle = css({
    fontFamily: 'sans',
    fontSize: 'md',
    fontWeight: 'semibold',
    lineHeight: 'header',
    color: 'accent.600',
    lineClamp: 2,
  });

  const cardExcerpt = css({
    fontFamily: 'sans',
    fontSize: 'sm',
    color: 'ink.600',
    lineHeight: 'snug',
    lineClamp: 2,
  });

  const footer = css({
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '2',
    pt: '2',
  });

  const tagPill = css(tagPillRaw, { fontFamily: 'sans' });
</script>

<a href={post.href} class={card}>
  <img
    src={post.thumb}
    alt={post.title}
    width={THUMB_WIDTH}
    height={THUMB_HEIGHT}
    loading={priority ? 'eager' : 'lazy'}
    fetchpriority={priority ? 'high' : 'auto'}
    decoding="async"
    class={thumbImage}
  />
  <div class={body}>
    <h3 class={cardTitle}>{post.title}</h3>
    {#if post.excerpt}
      <p class={cardExcerpt}>{post.excerpt}</p>
    {/if}
    <div class={css({ flex: '1' })}></div>
    <div class={footer}>
      <Label>{meta}</Label>
      {#if post.tags.length > 0}
        <span class={tagPill}>#{post.tags[0]}</span>
      {/if}
    </div>
  </div>
</a>
