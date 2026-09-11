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
