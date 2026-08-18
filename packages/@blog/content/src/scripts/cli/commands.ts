/**
 * 서브커맨드 표 — 이름을 단계 모듈에 잇는 유일한 곳.
 *
 * 앱이 아는 것은 **이름**뿐이다(`blog-content sitemap`). 예전에는 앱
 * package.json이 `npx tsx node_modules/@blog/content/src/scripts/…`처럼 파일
 * 경로를 직접 지목해서, 패키지 안에서 파일을 옮기면 앱이 조용히 깨졌다.
 *
 * 각 단계는 **동적 import**로 든다. rss·og-images·thumbnails는 React·satori·
 * sharp를 끌기 때문에, 정적 import로 묶으면 `sitemap` 한 단계를 부를 때도
 * 네이티브 모듈이 전부 로드된다.
 *
 * 진입점(`index.ts`)과 갈라 둔 이유는 테스트다 — 표만 import해도 CLI가
 * 실행되지 않아야 커맨드 목록을 검사할 수 있다.
 */

/** 단계의 `main`. 인자를 안 받는 단계도 이 타입에 들어맞는다. */
export type CommandHandler = (argv: string[]) => void | Promise<void>;

export const COMMANDS: Record<string, () => Promise<CommandHandler>> = {
  /** 콘텐츠 빌드 전체 (validate 게이트 → 생성 단계 병렬) */
  build: async () => (await import('../build-content.ts')).main,
  /** frontmatter 원문 검증 — `--strict`면 SEO 경고를 에러로 올린다 */
  validate: async () => (await import('../validate-posts.ts')).main,
  /** 빌드 산출물(out/) HTML의 SEO 계약 검사 */
  'check-seo': async () => (await import('../check-seo.ts')).main,
  /** 새 포스트 스캐폴딩 */
  'new-post': async () => (await import('../new-post.ts')).main,

  // ── build가 병렬로 돌리는 생성 단계들 ──
  'sync-posts': async () => (await import('../sync-posts.ts')).main,
  sitemap: async () => (await import('../generate-sitemap.ts')).main,
  rss: async () => (await import('../render/generate-rss.ts')).main,
  'og-images': async () =>
    (await import('../render/generate-og-images.ts')).main,
  thumbnails: async () =>
    (await import('../render/generate-thumbnails.ts')).main,
  'search-index': async () =>
    (await import('../generate-search-index.ts')).main,
  'llms-full': async () => (await import('../generate-llms-full.ts')).main,
  llms: async () => (await import('../generate-llms.ts')).main,
};
