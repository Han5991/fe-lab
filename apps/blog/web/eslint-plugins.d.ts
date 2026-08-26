/**
 * 타입을 싣지 않는 ESLint 플러그인의 모듈 선언.
 *
 * `eslint.config.mts`가 `.mjs`에서 넘어오면서 tsconfig 프로그램 안으로 들어왔고
 * (include의 mts 글롭), 그러자 타입 없는 플러그인이 드러났다. 선언이 없으면
 * 두 게이트가 함께 운다 — `tsc`는 TS7016, ESLint는 그 값이 `any`가 되어
 * `no-unsafe-member-access`.
 *
 * **쓰는 만큼만 적는다.** 플러그인 전체를 흉내 내면 실제 API가 바뀌어도
 * 선언이 조용히 맞아 버린다. 여기 있는 모양이 곧 "설정이 이 플러그인에게
 * 기대하는 것"이고, 설정이 새 표면을 쓰기 시작하면 여기서 먼저 막힌다.
 */

declare module 'eslint-plugin-jsx-a11y' {
  import type { Linter } from 'eslint';

  /**
   * 런타임 export는 meta·rules·configs·flatConfigs 넷이지만, 설정이 여는 것은
   * flat config 프리셋(recommended·strict)뿐이다.
   */
  const plugin: {
    flatConfigs: {
      recommended: Linter.Config;
      strict: Linter.Config;
    };
  };

  export default plugin;
}
