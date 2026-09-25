# @package/bundler (minibundler)

ESM 소스를 작은 CJS 런타임(`require`·`module`·`exports`) 하나로 묶는 학습용 라이브러리 번들러다.
`dist/index.js`(CJS, 브라우저 `<script>` 겸용)와 `dist/index.mjs`(ESM 래퍼)를 만든다. 원리 정리는
`LEARNING_SUMMARY.md`에, 과정은 블로그 연재 "누가 시키지도 않았는데 번들러 만들기"에 있다.

## 실행

- 빌드: `pnpm --filter @package/bundler build`
- 테스트: `pnpm --filter @package/bundler test` — 픽스처를 실제로 번들해 `vm`에서 실행하고 값을 비교한다
- 설정 `minibundler.config.js`: `entry`, `externals`(번들에 넣지 않을 패키지), `globals`(require가 없는
  브라우저에서 external을 찾을 전역 이름, 예: `{ react: 'React' }`)

## 알려진 한계: 가져오기는 스냅숏이다

`import { x } from './a.js'`는 `const { x } = require(1);`로 바뀐다. 가져오는 **순간의 값을 복사**하므로
ESM의 live binding과 다르게 동작하는 경우가 있다.

- 내보낸 쪽이 나중에 값을 바꿔도(`export let count` + `inc()`) 가져온 쪽은 옛 값을 본다.
- 순환 참조에서 먼저 불려 간 모듈은 아직 초기화되지 않은 `const`·`let`·`class` export를 `undefined`로
  받는다. `sample-lib`의 `src/lib/circular`는 번들로 실행하면 `…loop back to: undefined`, 네이티브 ESM으로
  실행하면 `…loop back to: Module A`를 찍는다(`bundler-playground`에서 `node src/circular-test.js`).
- 함수 선언 export는 예외다. 호이스팅되므로 export 대입을 모듈 맨 위로 올려, 순환 중에도 함수를 받는다.

Rollup·webpack은 가져온 이름을 쓰는 자리마다 `_a.x` 같은 멤버 접근으로 바꿔 이 차이를 없앤다.
minibundler는 변환 결과를 한눈에 읽히게 두려고 구조 분해를 유지한다.
