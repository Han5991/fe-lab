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
  }: {
    title: string;
    description: string;
    canonical: string;
    ogImage: string;
    ogType?: 'website' | 'article';
    siteName: string;
    locale?: string;
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
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>
