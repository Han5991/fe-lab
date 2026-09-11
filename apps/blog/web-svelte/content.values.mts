/**
 * 이 앱의 값 모듈 — **사이트 정체성은 `@blog/site-values`가 소유한다.**
 *
 * 뼈대 단계에서는 React 판 값 모듈의 부분 사본을 들고 있었다. 같은 사이트를 두
 * 곳에서 선언하면 한쪽만 고쳤을 때 두 산출물이 조용히 갈라지므로(sitemap·RSS·
 * OG 카드는 그대로 생성되고 빌드도 성공한다) 값을 패키지로 빼고 여기는 그대로
 * 다시 내보낸다. `apps/blog/web/content.values.mts`와 같은 모양이다.
 *
 * **번들 규칙(`BUNDLE_GUARDS`)은 아직 없다.** 마커가 프레임워크의 어휘라
 * 공유할 수 없고(React 판의 `recharts`·`GoTrueClient`는 여기 없다), 이 앱이
 * 무엇을 어느 청크에 싣는지는 화면이 선 뒤에 정해진다. `check-bundle`은
 * 선언이 없으면 검사를 건너뛴다 — 그 전에 `collectChunkRefs`의 `/_next/`
 * 하드코딩부터 일반화해야 한다(#392 PR 4).
 */
export * from '@blog/site-values';
