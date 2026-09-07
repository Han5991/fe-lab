/**
 * 이 앱의 값 모듈 — **사이트 정체성은 `@blog/site-values`가 소유한다.**
 *
 * 뼈대 단계에서는 React 판 값 모듈의 부분 사본을 들고 있었다. 같은 사이트를 두
 * 곳에서 선언하면 한쪽만 고쳤을 때 두 산출물이 조용히 갈라지므로(sitemap·RSS·
 * OG 카드는 그대로 생성되고 빌드도 성공한다) 값을 패키지로 빼고 여기는 그대로
 * 다시 내보낸다. `apps/blog/web/content.values.mts`와 같은 모양이다.
 *
 * **여기 남는 것은 번들 규칙뿐이다.** 마커가 이 앱의 어휘이기 때문이다 —
 * React 판의 `recharts`·`GoTrueClient`·`mermaid`는 여기 없고, 대신 이 앱이
 * 지켜야 할 것을 따로 적는다.
 */
import type { BundleGuardsConfig } from '@blog/content';

export * from '@blog/site-values';

/**
 * 번들 누수 가드.
 *
 * 규칙마다 음성(`forbiddenIn`)과 양성(`requiredIn`)이 짝이다 — 마커가 죽으면
 * "누수 없음"과 "검사 무력화"가 구분되지 않기 때문이다. 이 앱에서는 그 구분이
 * 특히 중요하다: `check-bundle`은 원래 `/_next/static/chunks/`를 경로에 박아
 * 두어 **SvelteKit 산출물에서는 청크를 하나도 못 찾았다.** 일반화한 지금도
 * 산출물 모양이 또 바뀌면 같은 자리에서 조용해질 수 있다.
 */
export const BUNDLE_GUARDS = [
  {
    // llms 산문은 AI 크롤러용 텍스트에만 있어야 한다. 화면은 쓰지 않는데,
    // 값 모듈에서 그룹 객체를 잘못 들여오면 클라이언트 번들에 실린다 —
    // React 판에서 실제로 홈 히어로 소개문이 그렇게 샜다.
    label: '서버 전용 값(llms 산문)',
    marker: 'Deep-dive technical experiments in bundler architecture',
    forbiddenIn: [{ kind: 'chunks' }, { kind: 'pages' }],
    requiredIn: [{ kind: 'artifact', path: 'llms.txt' }],
  },
  {
    // mermaid는 d3·dagre까지 끌고 와 gzip 360KB짜리다. 원고 70편 중 쓰는 곳은
    // 10곳뿐이라, 글 밖 페이지가 이걸 받으면 안 된다. Mermaid.svelte가
    // `await import()`로 늦추는데, 그 늦춤이 실제로 유지되는지는 코드를 읽어서는
    // 알 수 없다 — 청크 폐포를 봐야 안다. React 판이 같은 규칙을 갖고 있다.
    label: '글 전용 다이어그램(Mermaid)',
    // 마커가 `mermaid`이면 **자기 셀렉터에 걸린다** — Mermaid.svelte가
    // `code.language-mermaid`를 찾는 문자열이 글 페이지 청크에 그대로 남아
    // 첫 로드에서 발화한다(실제로 그랬다). 라이브러리 본체에만 있는 문법
    // 키워드를 쓴다.
    marker: 'sequenceDiagram',
    // **`chunks`가 아니라 `initial`이다.** SvelteKit의 클라이언트 라우터는 모든
    // 라우트 청크 이름을 매니페스트로 싣기 때문에, 어느 페이지에서 출발하든
    // 도달 폐포가 앱 전체가 된다(측정: 115/115. Next.js는 홈에서 13/116).
    // "도달하는가"를 물으면 언제나 참이라 규칙이 성립하지 않는다.
    //
    // 규칙이 실제로 묻고 싶은 것은 **첫 로드에 오는가**이고, 그 답은 문서가
    // 직접 가리킨 JS에 있다. 그래서 React 판보다 규칙이 세다 — 글 페이지에서도
    // mermaid는 첫 로드에 오지 않아야 한다(마운트 후 `await import()`).
    forbiddenIn: [{ kind: 'initial' }],
    requiredIn: [{ kind: 'chunks', of: { under: '/posts/' } }],
  },
  {
    // 구문 강조는 **빌드 타임**이다. 파서(refractor)가 클라이언트 청크에
    // 실리면 이 마커가 거기서도 보인다 — React 판이 같은 규칙을 갖고 있고,
    // 그쪽은 PrismLight로 언어를 골라 담기 전 gzip 350KB짜리 청크였던 적이
    // 있다. 양성 대조는 글 페이지다(코드 펜스가 500개라 반드시 있다).
    label: '빌드 타임 구문 강조',
    marker: 'class="token',
    forbiddenIn: [{ kind: 'chunks' }],
    requiredIn: [{ kind: 'pages', of: { under: '/posts/' } }],
  },
  {
    // 댓글은 **글에만** 붙는다. Comments.svelte를 레이아웃으로 올리면 홈·목록·
    // 소개까지 giscus 로더를 첫 로드에 받는데, 화면에는 아무 변화가 없어
    // 눈으로는 알 수 없다. React 판은 글 페이지에서만 `GiscusComments`를
    // 렌더하므로 같은 계약이다.
    //
    // `pages`도 막는 이유는 방향이 다르다: giscus는 마운트 후 스크립트를
    // 붙이는 것이라 **HTML에는 흔적이 없어야** 한다. 프리렌더가 iframe이나
    // 로더 태그를 산출물에 구워 버리면 정적 HTML에 서드파티 스크립트가
    // 박히는 셈이다.
    label: '글 전용 댓글(Giscus)',
    marker: 'giscus.app',
    forbiddenIn: [
      { kind: 'initial', of: { notUnder: '/posts/' } },
      { kind: 'pages' },
    ],
    requiredIn: [{ kind: 'initial', of: { under: '/posts/' } }],
  },
  {
    // 검색은 **산출물 fetch**로 남아 있어야 한다.
    //
    // 양성 쪽이 이 규칙의 값이다 — 인덱스 경로 문자열이 첫 로드 JS에 있다는
    // 것이 곧 "열 때 받는다"의 증거다. 인덱스를 서버 로드로 옮겨 페이지에
    // 굽는 순간(44편 × 본문 미리보기) 이 문자열이 사라져 규칙이 걸린다.
    // 음성 쪽(HTML에 경로가 없어야 한다)은 그보다 약하지만, 짝이 없으면
    // 규칙이 성립하지 않는다.
    label: '검색 인덱스는 열 때 받는다',
    marker: 'search-index.json',
    forbiddenIn: [{ kind: 'pages' }],
    requiredIn: [{ kind: 'initial' }],
  },
  {
    // **이 규칙의 값은 양성 쪽에 있다.** 청크 스캔이 이 산출물 모양에서
    // 실제로 돌고 있는지를 묻는다 — 하나도 못 찾으면 다른 모든 규칙이
    // "누수 없음"으로 조용히 통과한다. 음성 쪽(정적 텍스트 파일에 클라이언트
    // 부트스트랩이 없어야 한다)은 자명하지만, 짝이 있어야 규칙이 성립한다.
    label: '청크 스캔이 살아 있는가',
    marker: '__sveltekit',
    forbiddenIn: [{ kind: 'artifact', path: 'llms.txt' }],
    requiredIn: [{ kind: 'chunks' }],
  },
] as const satisfies BundleGuardsConfig;
