<script lang="ts">
  import { page } from '$app/state';
  import { css } from '../../../styled-system/css';
  import Rail from '$lib/components/Rail.svelte';
  import Seo from '$lib/components/Seo.svelte';
  import { HOME_PATH } from '$lib/shared/routes';
  import { POSTS_PATH } from '@blog/content/client';

  /**
   * 없는 주소 — **호스팅이 물어 주는 페이지다.**
   *
   * 정적 export라 서버가 없으므로, 이 라우트는 평범하게 프리렌더돼
   * `build/404/index.html`이 되고 빌드가 그것을 `build/404.html`로 복사한다.
   * `wrangler.jsonc`의 `not_found_handling: 404-page`가 그 파일을 물린다.
   *
   * **`adapter-static`의 `fallback` 옵션을 쓰지 않은 이유가 이 복사다.** fallback을
   * 주면 어댑터가 404 페이지를 만들어 주지만, 동시에 "모든 라우트가 프리렌더
   * 가능한가" 검사를 통째로 건너뛴다(어댑터 소스: `if (!options?.fallback && …)`).
   * 그 검사가 없으면 프리렌더되지 않는 라우트가 조용히 들어와도 빌드가 통과하고,
   * 그 라우트는 배포된 사이트에서 fallback 화면이 된다. 정적 export의 계약이
   * 바로 그 검사라 포기할 수 없다.
   *
   * React 판도 같은 모양이다 — `not-found.tsx`가 `out/404.html`과 `/404/` 둘 다 낸다.
   */
  const site = $derived(
    page.data['site'] as { name: string; url: string; ogDefaultImage: string },
  );
</script>

<Seo
  title="페이지를 찾을 수 없습니다 | {site.name}"
  description="요청하신 주소에 해당하는 페이지가 없습니다."
  canonical={`${site.url}/404/`}
  ogImage={`${site.url}${site.ogDefaultImage}`}
  siteName={site.name}
  noindex
/>

<Rail width="text">
  <div class={css({ my: '24', display: 'flex', flexDirection: 'column', gap: '4' })}>
    <p class={css({ fontFamily: 'mono', fontSize: 'sm', color: 'ink.500' })}>404</p>
    <h1 class={css({ fontSize: '3xl', fontWeight: 'bold', color: 'ink.950' })}>
      페이지를 찾을 수 없습니다
    </h1>
    <p class={css({ color: 'ink.600', lineHeight: 'relaxed' })}>
      주소가 바뀌었거나 지워진 글일 수 있습니다.
    </p>
    <p class={css({ display: 'flex', gap: '4', mt: '2' })}>
      <a href={HOME_PATH} class={css({ color: 'accent.600' })}>홈으로</a>
      <a href={POSTS_PATH} class={css({ color: 'accent.600' })}>글 목록</a>
    </p>
  </div>
</Rail>
