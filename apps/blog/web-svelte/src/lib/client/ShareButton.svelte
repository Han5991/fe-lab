<script lang="ts">
  import { css } from '../../../styled-system/css';

  /**
   * 공유하기. `apps/blog/web/src/components/mobile/ShareButton.tsx`의 이식이다.
   *
   * Web Share가 있으면 그쪽으로, 없으면 주소를 클립보드에 넣고 알린다 —
   * React 판과 같은 두 갈래다.
   */
  const { title }: { title: string } = $props();

  /**
   * `lib.dom`은 `navigator.share`를 항상 있는 것으로 선언하지만 실제로는
   * 데스크톱 브라우저 상당수에 없다. 넓혀서 받고 실제로 확인한다.
   */
  const canWebShare = (
    navigator as { share?: unknown }
  ).share !== undefined;

  async function share() {
    const url = window.location.href;
    if (canWebShare) {
      try {
        await navigator.share({ title, text: title, url });
      } catch (error: unknown) {
        // 사용자가 시트를 닫으면 reject된다 — 취소는 실패가 아니다.
        console.log('공유 취소', error);
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      alert('링크가 클립보드에 복사되었습니다.');
    } catch (error: unknown) {
      console.error('링크 복사 실패:', error);
    }
  }

  const button = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    px: '4',
    py: '2',
    bg: 'paper.200',
    rounded: 'full',
    color: 'ink.800',
    fontSize: 'sm',
    fontWeight: 'medium',
    cursor: 'pointer',
    transition: '[all 0.2s]',
    _hover: { bg: 'paper.300' },
  });

  const icon = css({ w: '[16px]', h: '[16px]', flexShrink: '0' });
</script>

<button
  type="button"
  onclick={() => {
    void share();
  }}
  class={button}
>
  <!-- lucide `share-2`와 같은 좌표다. -->
  <svg
    class={icon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
    <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
  </svg>
  <span>공유하기</span>
</button>
