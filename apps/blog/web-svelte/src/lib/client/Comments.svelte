<script lang="ts">
  import { onMount } from 'svelte';
  import { css } from '../../../styled-system/css';
  import { GISCUS } from '@blog/site-values';

  /**
   * Giscus 댓글 — **스크립트 태그 하나.**
   *
   * React 판은 `@giscus/react`(런타임 의존)를 쓴다. 그 래퍼가 하는 일은 이
   * 스크립트를 붙이고 테마 변경을 postMessage로 알리는 것이고, 여기서는 그
   * 둘을 직접 한다. 이미지 줌과 같은 이유로 직접 썼다 — 이 기능의 실제 비용이
   * 얼마인지가 비교의 재료다.
   *
   * 테마는 `html[data-theme]`을 읽어 정한다. paint 전 스크립트가 이미 세워
   * 두었으므로 여기서 쿠키를 다시 파싱하지 않는다.
   */
  const box = css({ mt: '16' });

  let host: HTMLDivElement;

  onMount(() => {
    const dark = document.documentElement.dataset['theme'] === 'dark';
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    const attrs: Record<string, string> = {
      'data-repo': GISCUS.repo,
      'data-repo-id': GISCUS.repoId,
      'data-category': GISCUS.category,
      'data-category-id': GISCUS.categoryId,
      'data-mapping': 'pathname',
      'data-strict': '1',
      'data-reactions-enabled': '1',
      'data-emit-metadata': '0',
      'data-input-position': 'top',
      'data-theme': dark ? 'dark' : 'light',
      'data-lang': 'ko',
      'data-loading': 'lazy',
    };
    for (const [key, value] of Object.entries(attrs)) {
      script.setAttribute(key, value);
    }
    host.append(script);

    // 테마를 바꾸면 iframe에도 알린다 — 안 하면 댓글만 옛 테마로 남는다.
    const observer = new MutationObserver(() => {
      const next =
        document.documentElement.dataset['theme'] === 'dark' ? 'dark' : 'light';
      host
        .querySelector<HTMLIFrameElement>('iframe.giscus-frame')
        ?.contentWindow?.postMessage(
          { giscus: { setConfig: { theme: next } } },
          'https://giscus.app',
        );
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => {
      observer.disconnect();
    };
  });
</script>

<div bind:this={host} class={box}></div>
