<script lang="ts">
  /**
   * 페이지 head 태그 — `check-seo`가 산출물에서 검사하는 계약을 한곳에서 채운다.
   *
   * 검사 항목과 짝: `<title>` 길이, description 존재·길이·중복, canonical
   * 자기참조, og:title·og:description·og:url·og:image·og:type·og:site_name·
   * og:locale. 페이지마다 손으로 적으면 한 곳만 빠져도 조용히 통과하지 못한다.
   */
  const {
    title,
    description,
    canonical,
    ogImage,
    ogType = 'website',
    siteName,
    locale = 'ko_KR',
    noindex = false,
  }: {
    title: string;
    description: string;
    canonical: string;
    ogImage: string;
    ogType?: 'website' | 'article';
    siteName: string;
    locale?: string;
    /**
     * 검색 대상이 아닌 화면(admin·개인정보처리방침). robots.txt의 Disallow는
     * 크롤만 막고 색인은 막지 못하므로 메타로 명시한다 — React 판의 admin
     * layout이 같은 이유로 같은 값을 넣는다.
     *
     * `check-seo`도 이 값을 본다: noindex 페이지는 description 중복·길이 검사에서
     * 빠진다(색인되지 않는 화면끼리 설명이 같은 것은 문제가 아니다).
     */
    noindex?: boolean;
  } = $props();
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonical} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={canonical} />
  <meta property="og:image" content={ogImage} />
  <meta property="og:type" content={ogType} />
  <meta property="og:site_name" content={siteName} />
  <meta property="og:locale" content={locale} />
  {#if noindex}
    <meta name="robots" content="noindex, nofollow" />
  {/if}
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>
