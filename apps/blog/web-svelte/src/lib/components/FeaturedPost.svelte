<script lang="ts">
  import { css } from '../../../styled-system/css';
  import ParallelThumb from './ParallelThumb.svelte';

  /**
   * 홈 대표 글 카드. `apps/blog/web/src/components/blog/FeaturedPost.tsx`의 이식이다.
   *
   * 썸네일 판정은 서버(`+page.server.ts`)가 한다 — 자동 생성 OG 카드는
   * 1200×630 소셜 카드라 150px 칸에서 글자가 뭉갠다. thumbnail이 비었거나
   * `/og/*`를 가리키면(= 빌드가 OG 카드를 만들어 준 경우) 이미지 대신 다이어그램
   * 썸네일을 세운다.
   */
  const {
    href,
    title,
    excerpt,
    date,
    readMin,
    seriesLabel,
    thumbnailSrc,
  }: {
    href: string;
    title: string;
    excerpt?: string | undefined;
    date?: string | undefined;
    readMin: number;
    /** `시리즈 · 번들러 만들기 2/5` 형태. 시리즈에 속하지 않으면 생략. */
    seriesLabel?: string | undefined;
    /** 글이 **자기** 썸네일을 가진 경우에만 준다. 없으면 다이어그램 폴백. */
    thumbnailSrc?: string | undefined;
  } = $props();
</script>

<a
  {href}
  class={css({
    display: 'grid',
    gridTemplateColumns: { base: '1fr', md: '[minmax(0,1fr) 150px]' },
    gap: '[18px]',
    alignItems: 'center',
    borderWidth: 'hairline',
    borderStyle: 'solid',
    borderColor: 'ink.border',
    rounded: 'card',
    px: '[20px]',
    py: '[18px]',
    mb: '[26px]',
    textDecoration: 'none',
    transition: '[border-color 0.15s]',
    _hover: {
      borderColor: 'ink.borderStrong',
      // 제목이 기본부터 accent.900이라 hover는 한 단계 다른 700으로 간다.
      '& h2': { color: 'accent.700' },
    },
  })}
>
  <div class={css({ minW: '0' })}>
    {#if seriesLabel}
      <!-- 안에 `2/5` 같은 숫자가 있어도 sans다 — 글 상세·/series의 같은 배지와
           맞춘다. 숫자가 있다고 mono로 바꾸지 말 것. -->
      <span
        class={css({
          display: 'inline-block',
          fontFamily: 'sans',
          fontSize: '[12px]',
          color: 'accent.600',
          bg: 'accent.50',
          rounded: '[6px]',
          px: '[9px]',
          py: '[2px]',
        })}>{seriesLabel}</span
      >
    {/if}
    <!-- 대표 글 제목만 액센트다. 아래 `최근 글` 목록 제목은 무채색으로 남겨서
         색이 곧 "이게 대표글"이라는 위계 신호가 되게 한다. -->
    <h2
      class={css({
        fontSize: '[16px]',
        fontWeight: 'semibold',
        color: 'accent.900',
        mt: '[10px]',
        mb: '[5px]',
        transition: '[color 0.15s]',
      })}
    >
      {title}
    </h2>
    {#if excerpt}
      <p class={css({ fontSize: '[13px]', color: 'ink.600', lineClamp: 2 })}>
        {excerpt}
      </p>
    {/if}
    <p
      class={css({
        fontFamily: 'mono',
        fontWeight: 'normal',
        fontSize: '[12px]',
        color: 'ink.500',
        mt: '[10px]',
      })}
    >
      {date ? `${date} · ` : ''}{readMin} min
    </p>
  </div>

  <div class={css({ w: '[150px]', maxW: 'full' })}>
    {#if thumbnailSrc}
      <!-- 150px 미니 썸네일이라 우선순위를 올리지 않는다(LCP는 히어로 텍스트). -->
      <img
        src={thumbnailSrc}
        alt=""
        width="150"
        height="92"
        loading="lazy"
        decoding="async"
        class={css({
          display: 'block',
          w: 'full',
          h: '[92px]',
          objectFit: 'cover',
          rounded: 'control',
          borderWidth: 'hairline',
          borderStyle: 'solid',
          borderColor: 'ink.border',
        })}
      />
    {:else}
      <ParallelThumb />
    {/if}
  </div>
</a>
