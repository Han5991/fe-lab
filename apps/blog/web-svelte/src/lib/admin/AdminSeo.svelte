<script lang="ts">
  import { page } from '$app/state';

  /**
   * Admin 화면의 head — **레이아웃에서 한 번만** 쓴다.
   *
   * 페이지가 아니라 레이아웃에 있는 것이 핵심이다. 가드가 세션을 확인하는 동안
   * 본문을 그리지 않으므로, head를 페이지에 두면 **프리렌더된 HTML에 아무것도
   * 남지 않는다** — 그러면 `check-seo`가 admin 페이지 48개에 title·canonical·og
   * 누락을 쏟아낸다(실제로 그랬다). React 판이 `admin/layout.tsx`의 `metadata`에
   * 두는 것과 같은 자리다.
   *
   * `robots: noindex`가 특히 그렇다. `check-seo`는 noindex 페이지를 나머지 검사에서
   * 통째로 건너뛰는데(색인되지 않는 화면에 고유한 설명을 지어 넣을 이유가 없다),
   * 그 표시가 HTML에 실제로 있어야 건너뛴다. robots.txt의 Disallow는 크롤만 막고
   * 색인은 막지 못하므로 메타로 명시하는 것이기도 하다.
   */
  const site = $derived(
    page.data['site'] as { name: string; url: string; ogDefaultImage: string },
  );
</script>

<svelte:head>
  <title>admin | {site.name}</title>
  <meta name="robots" content="noindex, nofollow" />
  <meta name="description" content="관리자 전용 화면입니다." />
  <link rel="canonical" href={`${site.url}${page.url.pathname}`} />
  <meta property="og:title" content="admin | {site.name}" />
  <meta property="og:site_name" content={site.name} />
  <meta property="og:locale" content="ko_KR" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={`${site.url}${page.url.pathname}`} />
  <meta property="og:image" content={`${site.url}${site.ogDefaultImage}`} />
</svelte:head>
