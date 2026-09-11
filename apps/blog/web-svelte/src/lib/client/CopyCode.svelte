<script lang="ts">
  import { onMount } from 'svelte';

  /**
   * 코드 복사 — **버튼은 이미 HTML에 있고, 여기서는 동작만 붙인다.**
   *
   * 마크업은 빌드 타임에 굽는다(`server/markdown/codeBlock.ts`). React 판도
   * 버튼은 프리렌더된 HTML에 있고 하이드레이션 전까지는 눌러도 아무 일이
   * 없으므로 계약이 같다. 다른 것은 여기에 컴포넌트가 없다는 점이다 — 본문이
   * `{@html}`이라 위임 리스너 하나로 끝난다(ImageZoom과 같은 방식).
   *
   * 복사 대상은 같은 `figure` 안의 `pre code`다. 코드 본문을 속성에 한 번 더
   * 싣지 않기 위해서고, 원고의 펜스가 500개라 그 차이가 HTML 크기에 그대로
   * 나온다.
   */

  /** 복사됨 표시를 유지하는 시간. React 판과 같은 2초다. */
  const FEEDBACK_MS = 2000;

  onMount(() => {
    const body = document.getElementById('post-content');
    if (body === null) return;

    // 버튼마다 되돌림 타이머를 따로 든다. `WeakMap`인 것은 키가 DOM 요소라서다 —
    // 본문이 사라지면 항목도 함께 사라지므로 따로 비울 것이 없다.
    const timers = new WeakMap<HTMLButtonElement, number>();

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('button[data-copy-code]');
      if (!(button instanceof HTMLButtonElement)) return;

      const code = button.closest('figure')?.querySelector('pre code');
      if (code === null || code === undefined) return;

      navigator.clipboard
        .writeText(code.textContent)
        .then(() => {
          // 아이콘 교체는 `data-copied` 하나로 끝난다 — 두 아이콘이 이미 굽혀
          // 있고 어느 쪽을 보일지는 CSS가 고른다.
          button.setAttribute('data-copied', '');
          // 아이콘이 바뀌는 것을 못 보는 사람에게도 결과를 알린다.
          button.setAttribute('aria-label', '코드 복사됨');
          const previous = timers.get(button);
          if (previous !== undefined) clearTimeout(previous);
          timers.set(
            button,
            window.setTimeout(() => {
              button.removeAttribute('data-copied');
              button.setAttribute('aria-label', '코드 복사');
              timers.delete(button);
            }, FEEDBACK_MS),
          );
        })
        .catch((error: unknown) => {
          // 클립보드는 권한·보안 컨텍스트에 달려 있다. 실패해도 코드는 화면에
          // 그대로 있으므로 화면을 건드리지 않는다.
          console.error('코드 복사 실패:', error);
        });
    };

    body.addEventListener('click', onClick);
    return () => {
      body.removeEventListener('click', onClick);
    };
  });
</script>
