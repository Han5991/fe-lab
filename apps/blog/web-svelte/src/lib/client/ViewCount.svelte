<script lang="ts">
  import {
    buildViewCookieStr,
    getViewCookieExpiry,
    hasViewCookie,
    slugToViewKey,
  } from '@blog/content/client';
  import { incrementViewCount } from '$lib/domain/analytics';

  /**
   * 글 조회수 +1 — 화면에 아무것도 그리지 않는다.
   *
   * 쿨다운 판정(6시간)과 쿠키 키 규칙은 `@blog/content`가 소유한다. React 판의
   * `useViewCount` 훅과 **같은 순서**를 지킨다: 쿠키를 RPC **전에** 심는다.
   * 두 탭이 동시에 열리면 둘 다 `hasViewed=false`를 통과해 RPC를 두 번 부르는데,
   * 쿠키를 먼저 심으면 그 창이 닫힌다. RPC가 실패하면 6시간 동안 한 번을 잃지만,
   * 중복 카운트가 무한 반복되는 것보다 안전하다.
   */
  const { slug }: { slug: string } = $props();

  $effect(() => {
    const key = slugToViewKey(slug);
    if (hasViewCookie(document.cookie, key)) return;
    document.cookie = buildViewCookieStr(key, getViewCookieExpiry());

    incrementViewCount(slug).catch((error: unknown) => {
      // 조회수는 글을 읽는 것과 무관하다 — 실패해도 화면은 그대로 둔다.
      // 이 앱의 Supabase는 로컬만 가리키므로(.env.production 주석) 배포된
      // 프리뷰에서는 여기가 항상 실패한다. 의도다.
      console.error('조회수 증가 실패:', error);
    });
  });
</script>
