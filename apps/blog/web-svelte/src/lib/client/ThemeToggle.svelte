<script lang="ts">
  import { css } from '../../../styled-system/css';
  import { THEME_COOKIE, type Theme } from '$lib/shared/theme';

  /**
   * 라이트/다크 토글. `apps/blog/web/src/components/ThemeToggle.tsx`의 이식이다.
   *
   * **아이콘은 JS 상태가 아니라 CSS(`html[data-theme]`)로 토글한다.** 정적
   * export라 서버는 방문자의 테마를 모르고, 서버가 하나를 찍으면 절반이 틀린다.
   * 예전 구현은 그래서 `$effect`로 값을 읽을 때까지 아이콘 자리를 비워 뒀는데,
   * 첫 페인트에 빈 칸이 보였다가 채워진다. 둘 다 그려 두고 CSS로 하나만 보이면
   * 값을 몰라도 되고 깜빡임도 없다 — pre-paint 스크립트가 세운 `data-theme`에
   * CSS가 즉시 반응한다.
   *
   * 클릭 시점의 현재값은 상태가 아니라 **DOM에서 직접 읽는다.** hydration 창의
   * stale 상태로 첫 클릭이 no-op가 되는 것을 막는다.
   */
  function toggle() {
    const current: Theme =
      document.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark';
    const next: Theme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset['theme'] = next;
    // 1년. 명시 선택은 시스템 설정보다 오래간다.
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  // 아이콘 기하는 lucide(ISC)의 sun·moon을 그대로 옮긴 값이다 —
  // React 판이 `lucide-react`로 그리는 것과 같은 그림이어야 한다.
  const icon = css({ boxSize: '[16px]' });
  const sunOnly = css({ display: 'none', _dark: { display: 'inline-flex' } });
  const moonOnly = css({ display: 'inline-flex', _dark: { display: 'none' } });
</script>

<button
  type="button"
  onclick={toggle}
  aria-label="테마 전환 (라이트/다크)"
  title="테마 전환"
  class={css({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSize: '9',
    rounded: '[6px]',
    border: 'none',
    bg: 'transparent',
    color: 'ink.600',
    cursor: 'pointer',
    transition: '[all 0.15s]',
    _hover: { color: 'ink.950', bg: 'paper.100' },
  })}
>
  <!-- 다크일 때 Sun(→라이트 전환 안내), 라이트일 때 Moon(→다크 전환 안내) -->
  <svg
    class="{icon} {sunOnly}"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
  <svg
    class="{icon} {moonOnly}"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path
      d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"
    />
  </svg>
</button>
