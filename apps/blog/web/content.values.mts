/**
 * 이 앱의 값 모듈 — **사이트 정체성은 `@blog/site-values`가 소유한다.**
 *
 * 예전에는 이 파일이 값 전부를 들고 있었다. 같은 사이트를 SvelteKit으로도 짓기
 * 시작하면서 사본이 둘이 됐고, 한쪽만 고치면 두 산출물이 조용히 갈라지는
 * 구조가 됐다(#392). 값은 패키지로 옮기고 여기는 **그대로 다시 내보낸다** —
 * 소비처 26곳의 `@/content.values.mts` import가 한 줄도 바뀌지 않는다.
 *
 * **값 import 금지 계약은 살아 있다.** 예외는 `@blog/site-values` 하나뿐이고,
 * 그 패키지도 같은 계약(순수 리터럴, 타입만 import)을 지킨다. 다른 모듈을
 * 여기서 끌면 클라이언트 그래프에 딸려 들어간다.
 *
 * **여기 남는 것은 번들 규칙뿐이다.** 마커가 이 앱의 어휘이기 때문이다 —
 * `recharts`·`GoTrueClient`·`mermaid`는 React 판의 라이브러리 이름이고,
 * SvelteKit 판은 자기 규칙을 따로 선언한다.
 */
import type { BundleGuardsConfig } from '@blog/content';
import { ADMIN_PATH_PREFIX, POSTS_PATH_PREFIX } from '@blog/site-values';

export * from '@blog/site-values';

// ── 번들 규칙 (check-bundle 배선 전용) ───────────────────────────────────────
//
// "어느 코드·값이 어느 라우트의 것인가"는 이 사이트의 어휘라 앱이 통째로
// 선언한다 — 패키지는 스코프(페이지·도달 청크·산출물)를 평가할 뿐, admin이니
// 서버 전용이니 하는 분류를 모른다. 규칙마다 음성(forbiddenIn)과
// 양성(requiredIn — 마커가 살아 있음의 증명)이 짝이다: 코드에서 이름·문구를
// 바꾸면 여기도 함께 바꿀 것(안 바꾸면 marker-dead로 빌드가 막히며 알려 준다).
//
// 마커는 minify를 살아남는 문자열이어야 한다 — export 이름(Turbopack이 청크에
// 문자열로 등록), 문자열 리터럴, 라이브러리 클래스명.

// 스코프 조각 — 규칙들이 공유한다.
const PUBLIC_CHUNKS = {
  kind: 'chunks',
  of: { notUnder: ADMIN_PATH_PREFIX },
} as const;
const ADMIN_CHUNKS = {
  kind: 'chunks',
  of: { under: ADMIN_PATH_PREFIX },
} as const;
const OUTSIDE_POSTS_CHUNKS = {
  kind: 'chunks',
  of: { notUnder: POSTS_PATH_PREFIX },
} as const;
const POSTS_CHUNKS = {
  kind: 'chunks',
  of: { under: POSTS_PATH_PREFIX },
} as const;

export const BUNDLE_GUARDS = [
  // admin 전용 코드가 공개 청크에 실리면 실패 — #326에서 실제로 있었던 누수.
  // 앞 둘은 src/domain/analytics의 admin 계산 export 이름, 셋째는 Edge Function
  // 이름 리터럴, 넷째는 세션용 supabase-js(auth 클라이언트 클래스명 —
  // src/domain/*/admin 배럴 분리가 지키는 것).
  {
    label: 'admin 전용 계산',
    marker: 'computeAnalyticsOverview',
    forbiddenIn: [PUBLIC_CHUNKS],
    requiredIn: [ADMIN_CHUNKS],
  },
  {
    label: 'admin 전용 계산',
    marker: 'computeDerivedStats',
    forbiddenIn: [PUBLIC_CHUNKS],
    requiredIn: [ADMIN_CHUNKS],
  },
  {
    label: 'admin Edge Function 클라이언트',
    marker: 'admin-analytics',
    forbiddenIn: [PUBLIC_CHUNKS],
    requiredIn: [ADMIN_CHUNKS],
  },
  {
    label: '세션용 supabase-js',
    marker: 'GoTrueClient',
    forbiddenIn: [PUBLIC_CHUNKS],
    requiredIn: [ADMIN_CHUNKS],
  },
  // admin 대시보드의 차트 라이브러리 — 공개 페이지에는 차트가 없다.
  {
    label: 'admin 차트(Recharts)',
    marker: 'recharts',
    forbiddenIn: [PUBLIC_CHUNKS],
    requiredIn: [ADMIN_CHUNKS],
  },
  // 글 상세에서만 지연 로드되는 것들 — 다른 라우트 청크에 실리면 실패.
  {
    label: '글 전용 다이어그램(Mermaid)',
    marker: 'mermaid',
    forbiddenIn: [OUTSIDE_POSTS_CHUNKS],
    requiredIn: [POSTS_CHUNKS],
  },
  {
    label: '글 전용 댓글(Giscus)',
    marker: 'giscus.app',
    forbiddenIn: [OUTSIDE_POSTS_CHUNKS],
    requiredIn: [POSTS_CHUNKS],
  },
  // 서버/빌드 전용 값의 클라이언트 유입 — 설정 객체나 값 모듈의 그룹 객체를
  // 클라이언트가 import하면 화면이 안 쓰는 값까지 번들에 실린다(위 "그룹
  // 객체는 설정 배선 전용" 규칙이 막는 바로 그 사고 — 실제로 홈 히어로
  // 소개문이 그렇게 샜다). llms 산문은 어떤 화면에도 렌더되지 않는 서버 전용
  // 값이면서 `LLMS_INTRO` 그룹·설정 객체 어느 쪽이 새도 함께 실려 온다.
  {
    label: '서버 전용 값(llms 산문)',
    marker: 'Deep-dive technical experiments in bundler architecture',
    forbiddenIn: [{ kind: 'chunks' }, { kind: 'pages' }],
    requiredIn: [{ kind: 'artifact', path: 'llms.txt' }],
  },
  // 구문 강조는 빌드 타임의 일이다(#319) — 하이라이트된 마크업(`class="token`)은
  // 글 HTML에만 있고 어떤 청크에도 없다. 렌더가 클라이언트로 돌아가면 글
  // HTML에서 마크업이 사라져 marker-dead로 걸린다.
  {
    label: '빌드 타임 구문 강조',
    marker: 'class="token',
    forbiddenIn: [{ kind: 'chunks' }],
    requiredIn: [{ kind: 'pages', of: { under: POSTS_PATH_PREFIX } }],
  },
] as const satisfies BundleGuardsConfig;
