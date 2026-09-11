<script lang="ts">
  import { css } from '../../../styled-system/css';

  interface Item {
    slug: string;
    /** 서버에서 postPath()로 푼 완성된 href — 화면은 URL 계약을 모른다 */
    href: string;
    title: string;
    date: string | null;
    excerpt: string;
    readMin: number;
  }

  const { posts }: { posts: Item[] } = $props();
</script>

<ul class={css({ listStyle: 'none', mt: '6', display: 'grid', gap: '8' })}>
  {#each posts as post (post.slug)}
    <li>
      <a
        href={post.href}
        class={css({ color: 'ink.950', textDecoration: 'none' })}
      >
        <h3 class={css({ fontSize: 'lg', fontWeight: 'bold' })}>{post.title}</h3>
      </a>
      <p class={css({ mt: '2', color: 'ink.600', fontSize: 'sm' })}>{post.excerpt}</p>
      <p class={css({ mt: '2', color: 'ink.600', fontSize: 'xs' })}>
        {#if post.date}<time datetime={post.date}>{post.date}</time> · {/if}{post.readMin}분
      </p>
    </li>
  {/each}
</ul>
