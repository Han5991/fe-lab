<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { css } from '../../../styled-system/css';
  import Rail from '$lib/components/Rail.svelte';
  import AdminSeo from '$lib/admin/AdminSeo.svelte';
  import { authRepository } from '$lib/domain/admin';
  import { isAdminEmail } from '$lib/domain/adminAccess';
  import { clearAdminCache, loadSession } from '$lib/admin/store.svelte';
  import {
    ADMIN_ANALYTICS_PATH,
    ADMIN_LOGIN_PATH,
    ADMIN_LOGIN_UNAUTHORIZED_PATH,
    ADMIN_PATH,
    HOME_PATH,
    isAdminLoginPath,
  } from '$lib/shared/routes';
  import type { Snippet } from 'svelte';

  /**
   * Admin 가드 — React 판 `AdminGuard.tsx`에 대응한다.
   *
   * **화면 안내용 판정이다.** 정적 사이트라 여기서 막는 것은 UI뿐이고, 실제
   * 강제는 Edge Function `admin-analytics`가 호출자 JWT를 진짜 시크릿
   * `ADMIN_EMAIL`과 대조하며 한다. 이 파일을 통째로 지워도 데이터는 안 나온다.
   *
   * 상태를 셋으로 둔다 — `checking`(세션 확인 중) · `denied`(리다이렉트 진행 중)
   * · `allowed`. 첫 상태에서 본문을 그리지 않는 이유는 깜빡임이다: 세션이 없는
   * 방문자에게 대시보드가 한 프레임 보였다가 사라지면, 그 한 프레임 동안 빈
   * 숫자가 아니라 **이전 계정의 화면**처럼 읽힌다.
   */
  const { children }: { children: Snippet } = $props();

  type Gate = 'checking' | 'denied' | 'allowed';
  let gate = $state<Gate>('checking');
  let email = $state<string | null>(null);

  const onLoginPage = $derived(isAdminLoginPath(page.url.pathname));

  onMount(() => {
    if (onLoginPage) {
      gate = 'allowed';
      return;
    }
    let cancelled = false;

    const decide = (session: { user: { email?: string | undefined } } | null) => {
      if (cancelled) return;
      if (!session) {
        gate = 'denied';
        void goto(ADMIN_LOGIN_PATH);
        return;
      }
      if (!isAdminEmail(session.user.email)) {
        gate = 'denied';
        // 잘못된 계정은 세션을 끊고 안내로 보낸다 — 그대로 두면 다음 방문에
        // 같은 화면을 다시 만난다.
        void authRepository
          .signOutAdmin()
          .then(() => goto(ADMIN_LOGIN_UNAUTHORIZED_PATH));
        return;
      }
      email = session.user.email ?? null;
      gate = 'allowed';
    };

    loadSession().then(decide, () => {
      if (cancelled) return;
      // 세션 조회가 실패하면 **막는다**(fail-closed). 로컬 Supabase가 떠 있지
      // 않으면 여기로 온다 — 그때 대시보드를 열어 주면 빈 화면이 "데이터 없음"
      // 처럼 보인다.
      gate = 'denied';
      void goto(ADMIN_LOGIN_PATH);
    });

    // 다른 탭에서 로그아웃하면 여기도 따라 나간다.
    const unsubscribe = authRepository.subscribeAdminSession(session => {
      if (!cancelled) decide(session);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  });

  async function logout() {
    await authRepository.signOutAdmin({ scope: 'local' });
    // 비우지 않으면 이전 계정의 집계가 캐시에 남아 다음 로그인·뒤로가기에서
    // 보인다(React 판이 removeQueries를 부르는 자리와 같은 이유).
    clearAdminCache();
    await goto(ADMIN_LOGIN_PATH);
  }

  const link = css({
    color: 'ink.600',
    textDecoration: 'none',
    fontSize: 'sm',
    _hover: { color: 'ink.950' },
  });
</script>

<AdminSeo />

<header
  class={css({ borderBottomWidth: 'hairline', borderColor: 'ink.border', py: '4' })}
>
  <Rail>
    <nav
      class={css({ display: 'flex', alignItems: 'baseline', gap: '5' })}
      aria-label="관리"
    >
      <a
        href={ADMIN_PATH}
        class={css({ fontWeight: 'bold', color: 'ink.950', textDecoration: 'none' })}
        >admin</a
      >
      <a href={ADMIN_ANALYTICS_PATH} class={link}>글별 통계</a>
      <a href={HOME_PATH} class="{link} {css({ ml: 'auto' })}">사이트로</a>
      {#if gate === 'allowed' && !onLoginPage}
        <button
          type="button"
          class={css({
            border: 'none',
            bg: 'transparent',
            cursor: 'pointer',
            color: 'ink.600',
            fontSize: 'sm',
            p: '0',
            _hover: { color: 'ink.950' },
          })}
          onclick={logout}>로그아웃</button
        >
      {/if}
    </nav>
    {#if email}
      <p class={css({ mt: '1', fontSize: 'xs', color: 'ink.500', fontFamily: 'mono' })}>
        {email}
      </p>
    {/if}
  </Rail>
</header>

{#if gate === 'allowed'}
  {@render children()}
{:else}
  <Rail>
    <p class={css({ my: '16', color: 'ink.500', fontSize: 'sm' })}>
      {gate === 'checking' ? '세션 확인 중…' : '로그인 화면으로 이동합니다…'}
    </p>
  </Rail>
{/if}
