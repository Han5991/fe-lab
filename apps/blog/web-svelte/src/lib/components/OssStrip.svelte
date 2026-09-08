<script lang="ts">
  import { css, cva } from '../../../styled-system/css';
  import { postPath } from '@blog/content/client';
  import { MERGED_PR_COUNT_FALLBACK } from '@blog/site-values';

  /**
   * 오픈소스 기여를 칩 한 줄로만 노출한다. 네비에는 없고, 자세한 내용은
   * `/about/`이 담당하므로 여기서는 "어디에 기여했는지"만 보여준다.
   * `apps/blog/web/src/components/home/OssStrip.tsx`의 이식이다.
   *
   * 칩 목록·링크는 about 페이지의 기여 데이터와 같은 출처다 — 한쪽을 고칠 때
   * 다른 쪽도 함께 갱신할 것.
   */
  const OSS_CHIPS = [
    { label: 'node.js', href: postPath('nodejs-contribution') },
    { label: 'next.js', href: postPath('nextjs-contributor') },
    { label: 'gemini-cli', href: postPath('ai-opensource-contribution') },
    { label: 'mantine', href: postPath('first-open-source-contribution') },
  ] as const;

  /**
   * 머지된 PR 수. React 판은 CI가 `NEXT_PUBLIC_PR_COUNT`를 주입하고 없으면
   * 폴백을 쓴다. 이 앱은 그 주입을 받지 않으므로(빌드가 배포되지 않는다)
   * 폴백 하나만 쓴다 — 값이 갈리는 것이 아니라 주입 경로가 없는 것이다.
   */
  const mergedPrCount = MERGED_PR_COUNT_FALLBACK;

  const chip = cva({
    base: {
      display: 'inline-block',
      fontFamily: 'mono',
      fontWeight: 'normal',
      fontSize: '[12px]',
      color: 'ink.500',
      bg: 'paper.100',
      rounded: 'control',
      px: '[11px]',
      py: '[4px]',
      textDecoration: 'none',
    },
    variants: {
      kind: {
        link: { transition: '[color 0.15s]', _hover: { color: 'ink.950' } },
        highlight: { color: 'accent.600' },
      },
    },
  });

  const CAPTION_ID = 'oss-strip-caption';
</script>

<!-- section에 이름이 없으면 이름 없는 region 랜드마크로 노출된다 → 제목과 연결. -->
<section aria-labelledby={CAPTION_ID} class={css({ mt: '[26px]' })}>
  <h2
    id={CAPTION_ID}
    class={css({
      fontSize: '[12px]',
      fontWeight: 'normal',
      color: 'ink.600',
      mb: '[10px]',
    })}
  >
    오픈소스 기여
  </h2>
  <ul
    class={css({
      display: 'flex',
      flexWrap: 'wrap',
      gap: '[8px]',
      listStyleType: 'none',
      p: '0',
      m: '0',
    })}
  >
    {#each OSS_CHIPS as item (item.label)}
      <li><a href={item.href} class={chip({ kind: 'link' })}>{item.label}</a></li>
    {/each}
    <li>
      <span class={chip({ kind: 'highlight' })}>{mergedPrCount}+ merged</span>
    </li>
  </ul>
</section>
