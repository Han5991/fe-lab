<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { css } from '../../../../styled-system/css';
  import Rail from '$lib/components/Rail.svelte';
  import { authRepository } from '$lib/domain/admin';
  import { ADMIN_PATH } from '$lib/shared/routes';

  /**
   * Google OAuth 로그인 — 화면은 버튼 하나다.
   *
   * `signInWithOAuth`가 리다이렉트를 시작하고, 돌아오면 supabase-js가 URL의
   * 토큰을 세션으로 바꾼 뒤 `subscribeAdminSession`이 발화한다(가드가 그걸
   * 듣는다). 그래서 여기서 성공을 기다릴 것이 없다 — 실패만 화면에 남긴다.
   */
  let error = $state<string | null>(null);
  let busy = $state(false);
  let redirectTo = $state(ADMIN_PATH);

  const unauthorized = $derived(page.url.searchParams.get('e') === 'unauthorized');

  onMount(() => {
    // 정적 export라 origin을 빌드 타임에 알 수 없다 — 프리뷰 URL과 커스텀
    // 도메인이 갈리므로 브라우저에서 읽는다.
    redirectTo = `${window.location.origin}${ADMIN_PATH}`;
  });

  async function signIn() {
    busy = true;
    error = null;
    const result = await authRepository.signInAdminWithGoogle(redirectTo);
    if (result.error) {
      error = result.error.message;
      busy = false;
    }
  }
</script>

<Rail width="form">
  <div class={css({ my: '24', display: 'flex', flexDirection: 'column', gap: '5' })}>
    <h1 class={css({ fontSize: '2xl', fontWeight: 'bold', color: 'ink.950' })}>
      관리자 로그인
    </h1>

    {#if unauthorized}
      <p
        class={css({
          p: '4',
          borderWidth: 'hairline',
          borderColor: 'ink.border',
          rounded: 'card',
          color: 'ink.700',
          fontSize: 'sm',
        })}
      >
        이 계정에는 권한이 없습니다. 관리자 계정으로 다시 로그인하세요.
      </p>
    {/if}

    <button
      type="button"
      class={css({
        px: '5',
        py: '3',
        rounded: 'control',
        borderWidth: 'hairline',
        borderColor: 'ink.border',
        bg: 'transparent',
        color: 'ink.950',
        cursor: 'pointer',
        fontSize: 'sm',
        _hover: { borderColor: 'ink.borderStrong' },
        _disabled: { opacity: '0.5', cursor: 'default' },
      })}
      disabled={busy}
      onclick={signIn}
    >
      {busy ? '이동 중…' : 'Google로 로그인'}
    </button>

    {#if error}
      <p class={css({ color: 'ink.700', fontSize: 'sm', fontFamily: 'mono' })}>
        로그인 실패: {error}
      </p>
    {/if}

    <p class={css({ color: 'ink.500', fontSize: 'xs', lineHeight: 'relaxed' })}>
      이 실험 앱의 Supabase는 <strong>로컬 인스턴스</strong>만 가리킵니다. 배포된
      프리뷰에서는 로그인이 동작하지 않습니다 — 의도된 제약입니다.
    </p>
  </div>
</Rail>
