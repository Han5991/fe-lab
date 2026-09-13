<script lang="ts">
  import { css } from '../../../styled-system/css';

  /**
   * 글 상세의 머리 — 시리즈 배지 · 제목 · 메타 줄 · 리드 문단.
   * `apps/blog/web/src/components/post/PostHeader.tsx`의 이식이다.
   */
  const {
    title,
    date,
    dateLabel,
    readMin,
    excerpt,
    tags,
    seriesIndex,
  }: {
    title: string;
    date?: string | null;
    dateLabel: string;
    readMin: number;
    excerpt?: string;
    tags: readonly { tag: string; href: string }[];
    seriesIndex?:
      | { current: number; total: number; displayName: string }
      | undefined;
  } = $props();

  /** `2026-08-16 · 18 min` — 날짜가 없으면 읽는 시간만. */
  const lead = $derived(date ? `${dateLabel} · ${readMin} min` : `${readMin} min`);

  // 메타 줄(mono 12px) 안에서 태그를 해시태그로 인라인시킨다. 별도 pill 그룹은
  // 없지만 필터 링크는 그대로라 `/posts/?tag=…` 아카이브 필터가 계속 산다.
  const tagLink = css({
    color: 'ink.500',
    textDecorationLine: 'none',
    transition: '[color 0.15s]',
    _hover: { color: 'accent.600' },
  });
</script>

<header>
  {#if seriesIndex}
    <!-- 안에 `3/3` 같은 숫자가 있어도 sans다 — 홈·/series의 같은 배지와 맞춘다.
         배지는 accent.50 배경 위 작은 글씨라 제목용 accent.900을 쓰면 배경과
         붙어 답답해진다. 링크와 같은 accent.600을 쓴다. -->
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
      })}
      >시리즈 · {seriesIndex.displayName}
      {seriesIndex.current}/{seriesIndex.total}</span
    >
  {/if}

  <!-- 글 제목은 액센트. 바로 아래 메타 줄(ink.500)·리드(ink.600)와 본문
       h3·h4는 무채색이라, 색이 제목 계열의 표식이 된다. -->
  <h1
    class={css({
      fontFamily: 'sans',
      fontSize: '[22px]',
      fontWeight: 'bold',
      lineHeight: 'headerSm',
      color: 'accent.900',
      mt: '[12px]',
      mb: '[6px]',
    })}
  >
    {title}
  </h1>

  <!-- 표기: `2026-03-31 · 14 min · #ecs #docker` — 태그 묶음 앞에만 가운뎃점을
       두고 태그끼리는 공백으로 잇는다. 리드가 뒤따르면 메타는 제목 쪽에
       붙여 두고 히어로 앞 여백은 리드가 대신 만든다.

       **구분자 공백은 마크업이 아니라 문자열로 만든다.** Svelte는 블록
       경계의 공백을 잘라내서, `… · {/if}` 처럼 적으면 렌더 결과가
       `2026-08-16 ·18 min` 이 된다(실제로 그랬다). 눈에 띄지 않는 자리라
       마크업으로 두면 다시 깨져도 모른다. -->
  <p
    class={css({
      fontFamily: 'mono',
      fontSize: '[12px]',
      color: 'ink.500',
      fontVariantNumeric: 'tabular-nums',
      mb: excerpt ? '[10px]' : '[22px]',
    })}
  >{lead}{#each tags as t, i (t.tag)}{i === 0 ? ' · ' : ' '}<a
        href={t.href}
        class={tagLink}>#{t.tag}</a
      >{/each}</p
  >

  {#if excerpt}
    <p
      class={css({
        fontSize: '[14px]',
        color: 'ink.600',
        lineHeight: 'comfortable',
        mb: '[22px]',
      })}
    >
      {excerpt}
    </p>
  {/if}
</header>
