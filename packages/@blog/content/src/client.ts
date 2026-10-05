/**
 * `@blog/content` 공개 API — 문 3: **클라이언트에서 안전한 것 전부.**
 *
 * ## 왜 따로 있나
 *
 * 큰 배럴(`@blog/content`)은 `export * from './series.ts'`로 `node:fs`를 함께
 * 연다. 그 배럴을 클라이언트 그래프에서 열어도 안전한지는 지금까지 **앱의 번들러
 * 설정이 정했다** — `apps/blog/web/next.config.ts`의
 * `experimental.optimizePackageImports`가 배럴 import를 leaf로 좁혀 주는 덕인데,
 * 그건 Next 전용·앱별 설정이고 dev 서버에는 트리 셰이킹이 없다. 패키지가 지켜야
 * 할 성질을 소비자의 설정 한 줄에 맡겨 두는 셈이라, 이 문이 그것을 **패키지
 * 계약**으로 끌어온다: 클라이언트 코드는 여기로 들어오면 설정과 상관없이 fs를
 * 끌지 않는다.
 *
 * ## 왜 하나인가
 *
 * leaf마다 문을 내는 길(`/urls`, `/dates`, `/viewCookie` …)도 있었다. 기준이
 * "이 모듈이 클라이언트에서 안전한가" **하나뿐**이므로 문도 하나여야 한다.
 * leaf마다 내면 소비자가 어느 문으로 들어가야 하는지를 매번 물어야 하고, 문
 * 목록이 곧 "무엇이 순수한가"의 두 번째 사본이 된다.
 *
 * ## 무엇이 들어오나
 *
 * **모듈 평가 시점에 I/O가 없고, 그 전이 import에도 없는 것.** 그게 전부다.
 * `clientDoor.test.ts`가 이 파일에서 시작해 import 그래프를 전부 따라가며
 * `node:` 빌트인도 외부 패키지도 없는지 확인한다 — 목록을 손으로 관리하는 대신
 * 성질을 검사한다. 여기 없는 것(로더·시리즈 선언·경로 해석·빌드 스크립트)은
 * 전부 서버·빌드 전용이고, 그쪽은 큰 배럴로 간다. 앱 쪽에서는 `eslint.config.mts`가
 * 서버 전용 파일 밖의 큰 배럴 값 import를 막는다.
 */

// ── shared: 순수 유틸 ────────────────────────────────────────────────────────
export * from './shared/dates.ts';
export * from './shared/format.ts';
export * from './shared/guards.ts';
export * from './shared/jsonLd.ts';
export * from './shared/markdownHeadings.ts';
export * from './shared/prismLanguages.ts';
export * from './shared/url.ts';
export * from './shared/viewCookie.ts';

// ── post: URL 계약 · 공개 판정 · 순수 필터 ───────────────────────────────────
export * from './post/types.ts';
export * from './post/urls.ts';
export * from './post/utils.ts';
export * from './post/visibility.ts';
export * from './post/assetUrl.ts';
export * from './post/filtering.ts';
export * from './post/thumbnail.ts';
