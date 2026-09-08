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
   * ## 세션 상태와 판정을 나눈다
   *
   * 초안은 `onMount` 안에서 `gate`를 직접 세웠는데, 그게 **가드를 통째로
   * 망가뜨렸다.** SvelteKit은 `/admin/` 아래를 오갈 때 이 레이아웃을 다시
   * 마운트하지 않는다 — `onMount`는 전체 로드당 한 번뿐이다. 그래서
   * ① 비로그인 방문자를 로그인 화면으로 보내면 `gate`가 `denied`에 굳어 **로그인
   * 화면 자체가 렌더되지 않았고**(영원한 "이동합니다…"), ② 첫 진입이 로그인
   * 화면이면 `allowed`로 굳어 거기서 대시보드로 클릭해 들어가는 길이 **세션
   * 검사를 통과하지 않았다.**
   *
   * React 판이 이 함정에 빠지지 않는 이유는 렌더마다 `isAdminLoginPath(pathname)`을
   * 다시 보기 때문이다. 여기서도 같게 만든다: `onMount`는 **세션을 읽고 구독하는
   * 일만** 하고, "지금 이 경로에서 무엇을 보여줄지"는 경로와 세션에서 매번
   * 파생시킨다.
   *
   * 판정이 나기 전에 본문을 그리지 않는 이유는 깜빡임이다: 세션이 없는
   * 방문자에게 대시보드가 한 프레임 보였다가 사라지면, 그 한 프레임 동안 빈
   * 숫자가 아니라 **이전 계정의 화면**처럼 읽힌다.
   */
  const { children }: { children: Snippet } = $props();

  /** 세션 자체의 상태 — 경로와 무관하다. */
  type SessionState = 'loading' | 'none' | 'wrong' | 'ok';
  let sessionState = $state<SessionState>('loading');
  let email = $state<string | null>(null);

  const onLoginPage = $derived(isAdminLoginPath(page.url.pathname));
  /** 로그인 화면은 가드를 지나지 않는다(무한 리다이렉트 방지). */
  const allowed = $derived(onLoginPage || sessionState === 'ok');

  onMount(() => {
    let cancelled = false;

    const apply = (session: { user: { email?: string | undefined } } | null) => {
      if (cancelled) return;
      if (!session) {
        sessionState = 'none';
        email = null;
        // 세션이 사라지면 캐시도 함께 버린다. 로그아웃 버튼만 비우면 다른 탭에서
        // 로그아웃했을 때 이전 계정의 집계가 이 탭에 남는다.
        clearAdminCache();
        return;
      }
      if (!isAdminEmail(session.user.email)) {
        sessionState = 'wrong';
        email = null;
        clearAdminCache();
        return;
      }
      email = session.user.email ?? null;
      sessionState = 'ok';
    };

    // 조회 실패는 저장소가 이미 `null`로 수렴시킨다(`AuthRepository`) — 여기
    // 거부 핸들러는 그 계약이 바뀌었을 때를 위한 fail-closed 폴백이다.
    loadSession().then(apply, () => {
      apply(null);
    });

    // 다른 탭에서 로그아웃하면 여기도 따라 나간다.
    const unsubscribe = authRepository.subscribeAdminSession(apply);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  });

  /**
   * 리다이렉트는 **경로가 바뀔 때도 다시 판정돼야 한다** — 그래서 `onMount`가
   * 아니라 이펙트다. 로그인 화면에서는 아무것도 하지 않는다.
   */
  $effect(() => {
    if (onLoginPage) return;
    if (sessionState === 'none') {
      void goto(ADMIN_LOGIN_PATH);
    } else if (sessionState === 'wrong') {
      // 잘못된 계정은 세션을 끊고 안내로 보낸다 — 그대로 두면 다음 방문에
      // 같은 화면을 다시 만난다.
      void authRepository
        .signOutAdmin()
        .then(() => goto(ADMIN_LOGIN_UNAUTHORIZED_PATH));
    }
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
      {#if allowed && !onLoginPage}
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

{#if allowed}
  {@render children()}
{:else}
  <Rail>
    <p class={css({ my: '16', color: 'ink.500', fontSize: 'sm' })}>
      {sessionState === 'loading' ? '세션 확인 중…' : '로그인 화면으로 이동합니다…'}
    </p>
  </Rail>
{/if}
