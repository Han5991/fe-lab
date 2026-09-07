<script lang="ts">
  import { onMount } from 'svelte';
  import { css } from '../../../styled-system/css';
  import { THEME_COOKIE_MATCH } from '$lib/shared/theme';

  /**
   * 본문의 ```mermaid 펜스를 그림으로 바꾼다 — **점진적 향상**이다.
   *
   * 본문은 `{@html}`로 꽂히므로 그 안에 컴포넌트를 둘 수 없다. 대신 마운트 후
   * DOM에서 mermaid 코드 블록을 찾고, **하나라도 있을 때만** 라이브러리를
   * 동적으로 들여온다.
   *
   * mermaid는 d3·dagre까지 끌고 와 gzip 360KB짜리 청크다. 원고 70편 중 이걸
   * 쓰는 건 10곳뿐이라, 정적 import면 mermaid가 없는 글까지 그 무게를 진다.
   * React 판이 `next/dynamic` + `ssr: false`로 같은 판단을 한다 — 여기서는
   * 프레임워크 기능이 아니라 그냥 `await import()`다.
   *
   * 서버에서는 아무 일도 하지 않는다(`onMount`는 브라우저에서만 돈다). JS가
   * 꺼져 있으면 mermaid 소스가 코드 블록으로 남는다 — 빈 자리보다 낫다.
   */

  const box = css({
    my: '10',
    p: '6',
    minH: '[120px]',
    bg: 'paper.100',
    rounded: 'card',
    borderWidth: 'hairline',
    borderColor: 'ink.border',
    overflowX: 'auto',
  });

  onMount(() => {
    const blocks = [
      ...document.querySelectorAll<HTMLElement>('code.language-mermaid'),
    ];
    // 없으면 여기서 끝 — 청크를 받지 않는다. 이 한 줄이 이 컴포넌트의 요점이다.
    if (blocks.length === 0) return;

    // 함수로 읽는 이유는 타입 좁히기 때문이다. 값을 직접 보면 TS가 "여기서는
    // 항상 false"로 좁혀 검사를 죽은 코드로 판정한다 — 대입이 정리 함수
    // 클로저에서 일어나는 것을 제어 흐름 분석이 보지 못한다. 호출 결과는
    // 좁혀지지 않는다.
    const state = { cancelled: false };
    const cancelled = () => state.cancelled;

    void (async () => {
      const { default: mermaid } = await import('mermaid');
      if (cancelled()) return;

      const cookie = new RegExp(THEME_COOKIE_MATCH).exec(document.cookie);
      const dark =
        cookie?.[1] === 'dark' ||
        (cookie === null &&
          document.documentElement.dataset['theme'] === 'dark');

      mermaid.initialize({
        startOnLoad: false,
        theme: dark ? 'dark' : 'default',
        securityLevel: 'strict',
        fontFamily: 'inherit',
      });

      for (const [i, block] of blocks.entries()) {
        const source = block.textContent;
        const host = document.createElement('div');
        host.className = box;
        try {
          const { svg } = await mermaid.render(`mermaid-${i}`, source);
          if (cancelled()) return;
          host.innerHTML = svg;
          // 코드 블록 껍데기(<div><pre><code>)를 통째로 바꾼다.
          const shell = block.closest('pre')?.parentElement ?? block;
          shell.replaceWith(host);
        } catch {
          // 문법 오류난 다이어그램 하나가 나머지를 막지 않는다. 소스는
          // 코드 블록으로 그대로 남으므로 글쓴이가 무엇이 문제인지 볼 수 있다.
        }
      }
    })();

    return () => {
      state.cancelled = true;
    };
  });
</script>
