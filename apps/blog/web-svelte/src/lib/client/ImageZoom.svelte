<script lang="ts">
  import { onMount } from 'svelte';
  import { css } from '../../../styled-system/css';

  /**
   * 본문 이미지를 눌러 크게 본다 — **의존성 없이 30줄.**
   *
   * React 판은 `react-medium-image-zoom`(런타임 의존)을 쓴다. 여기서 라이브러리를
   * 쓰지 않은 것은 절약을 위한 것이 아니라, 이 기능이 실제로 무엇을 요구하는지
   * 재보기 위해서다 — 오버레이 하나, ESC/클릭으로 닫기, 스크롤 잠금이 전부다.
   * 그 비용이 얼마인지가 비교의 재료다.
   *
   * 본문은 `{@html}`이라 마운트 후 DOM에 위임 리스너를 하나 단다. 이미지가
   * 몇 장이든 리스너는 하나다.
   */

  const overlay = css({
    position: 'fixed',
    inset: '0',
    zIndex: '[50]',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    p: '6',
    bg: 'paper.50',
    cursor: 'zoom-out',
  });

  const zoomed = css({
    maxW: 'full',
    maxH: 'full',
    objectFit: 'contain',
    rounded: 'control',
  });

  onMount(() => {
    const body = document.getElementById('post-content');
    if (body === null) return;

    let open: HTMLDivElement | null = null;

    const close = () => {
      open?.remove();
      open = null;
      document.body.style.removeProperty('overflow');
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) return;
      // 링크로 감싼 이미지는 링크가 이긴다 — 글쓴이가 건 목적지가 우선이다.
      if (target.closest('a') !== null) return;

      close();
      const host = document.createElement('div');
      host.className = overlay;
      host.setAttribute('role', 'button');
      host.setAttribute('aria-label', '확대한 이미지 닫기');
      const big = document.createElement('img');
      big.src = target.currentSrc || target.src;
      big.alt = target.alt;
      big.className = zoomed;
      host.append(big);
      host.addEventListener('click', close);
      document.body.append(host);
      // 오버레이 뒤가 스크롤되면 닫았을 때 읽던 자리를 잃는다.
      document.body.style.overflow = 'hidden';
      open = host;
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    body.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      body.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      close();
    };
  });
</script>
