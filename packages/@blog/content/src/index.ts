/**
 * @blog/content 공개 API — 문(door) 1: 콘텐츠 프레임워크.
 *
 * 스키마(frontmatter 서술자) · 로더(repository/service) · 공개 판정(visibility) ·
 * 시리즈 선언(series) · URL 계약(urls) · 순수 유틸(shared)을 한 문으로 연다.
 * SEO 빌더는 별도 문(`@blog/content/seo`)이고, 빌드 스크립트(src/scripts/)는
 * API가 아니라 실행 파일이라 문을 열지 않는다 — 앱이 파일 경로로 직접 돌린다.
 *
 * 이 배럴은 `series.ts`·`service.ts` 등 node 전용 모듈(node:fs)을 함께 연다.
 * 클라이언트 번들이 안전한 이유는 두 겹이다: package.json `sideEffects: false` +
 * 앱 next.config.ts의 `optimizePackageImports`가 배럴 import를 실제 사용 모듈로
 * 좁혀 준다. 배럴에 모듈을 추가할 때 이 전제를 깨는 부수효과(모듈 평가 시점
 * I/O 실행)를 넣지 말 것.
 */
export * from './post/index.ts';
// 옛 domain/post 배럴이 큐레이션에서 뺐지만 앱이 leaf로 쓰던 모듈들 — 패키지
// 문은 이 배럴 하나뿐이므로 여기서 연다.
export * from './post/filtering.ts';
export * from './post/assetUrl.ts';
// shared 순수 유틸 — 옛 lib/shared. contentPaths(절대 경로 해석)는 node 전용.
// 사이트 고유 값(SITE_URL·TIMEZONE·다이어그램 이름 …)은 여기서 나가지 않는다 —
// 소비자의 값 모듈이 소유하고, 이 패키지는 그것을 설정으로 받는다
// (contentConfig.ts의 `ContentValues`).
export * from './shared/contentConfig.ts';
export * from './shared/contentPaths.ts';
export * from './shared/dates.ts';
export * from './shared/format.ts';
export * from './shared/jsonLd.ts';
export * from './shared/markdownHeadings.ts';
export * from './shared/postFiles.ts';
export * from './shared/prismLanguages.ts';
export * from './shared/url.ts';
export * from './shared/viewCookie.ts';
