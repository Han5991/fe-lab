<script lang="ts">
  import { css } from '../../../styled-system/css';
  import { THEME_COOKIE, type Theme } from '$lib/shared/theme';

  /**
   * 라이트/다크 토글.
   *
   * **초기값을 서버에서 정하지 않는다.** 정적 export라 모든 방문자가 같은
   * HTML을 받으므로, 서버가 테마를 고르면 절반이 틀린다. paint 전 인라인
   * 스크립트(`app.html`)가 `html[data-theme]`을 세우고, 이 버튼은 그 값을
   * 읽어 뒤집기만 한다.
   *
   * 그래서 첫 렌더에는 아이콘이 비어 있다 — 무엇이 켜져 있는지 아직 모르기
   * 때문이다. 서버가 하나를 찍어 두면 절반의 방문자에게 아이콘이 깜빡인다.
   */
  let theme = $state<Theme | undefined>(undefined);

  $effect(() => {
    const current = document.documentElement.dataset['theme'];
    theme = current === 'light' ? 'light' : 'dark';
  });

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset['theme'] = next;
    // 1년. 명시 선택은 시스템 설정보다 오래간다.
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    theme = next;
  }

  const button = css({
    border: 'none',
    bg: 'transparent',
    cursor: 'pointer',
    color: 'ink.600',
    fontFamily: 'mono',
    fontSize: 'sm',
    p: '1',
    _hover: { color: 'ink.950' },
  });

  // 쿠키를 직접 파싱하지 않는다 — pre-paint 스크립트가 이미 그 일을 했고
  // 결과가 `html[data-theme]`에 있다. 여기서 또 파싱하면 두 판정이 갈릴 수 있다.
</script>

<button
  type="button"
  class={button}
  onclick={toggle}
  aria-label={theme === 'dark' ? '라이트 모드로' : '다크 모드로'}
>
  {theme === undefined ? '' : theme === 'dark' ? '☾' : '☀'}
</button>
