---
title: '번들러 마스터 클래스: 30문 30답 핵심 요약 및 오답노트'
date: 2026-01-31
tags: ['bundler', 'javascript', 'interview', 'study']
---

# 🎓 번들러 마스터 클래스: 30문 30답 핵심 요약

이 문서는 번들러의 기본 개념부터 아키텍처, 디버깅, 최신 트렌드까지 총 30개의 심층 질문을 통해 학습한 내용을 정리한 **오답노트 및 해설지**입니다.

---

## 🟢 Phase 1: Core Concepts (모듈 시스템의 본질)

### Q1. CJS vs ESM: Live Binding과 Tree Shaking
*   **질문**: CJS와 ESM의 결정적 차이(값 처리 방식)와 그것이 Tree Shaking에 미치는 영향은?
*   **핵심 개념**:
    *   **CJS (Snapshot)**: 값을 내보낼 때 **복사(Copy)**합니다. 원본이 바뀌어도 가져간 쪽은 모릅니다.
    *   **ESM (Reference)**: 값을 **참조(Link)**합니다. 메모리 주소를 공유하므로 원본 변경 시 실시간 반영됩니다(**Live Binding**).
*   **Tree Shaking**: ESM은 **정적 구조(Static Structure)**를 가지므로, 코드를 실행하지 않고도(Static Analysis) 사용되지 않는 코드를 완벽하게 제거할 수 있습니다.

---

## 🟢 Phase 2: Analysis & Resolve (분석과 탐색)

### Q2. Node.js Resolve 알고리즘 우선순위 (🚨 오답 노트)
*   **질문**: `import './utils'`를 만났을 때 파일 탐색 순서는?
*   **정답 순서**:
    1.  **`./utils.js` (파일)**: 확장자를 붙여 파일 존재 여부 확인 (최우선)
    2.  **`./utils/package.json` (폴더 설정)**: `main` 필드 확인
    3.  **`./utils/index.js` (폴더 기본값)**: 최후의 수단
*   **교훈**: Node.js는 항상 **파일이 폴더보다 먼저**입니다.

### Q3. AST vs Regex (정규식의 한계)
*   **질문**: 왜 `import` 문을 찾을 때 정규표현식을 쓰면 안 되는가?
*   **해설**: 정규식은 **문맥(Context)**을 모릅니다. 주석(`// import...`)이나 문자열(`"import..."`) 안에 있는 가짜 구문도 찾아내기 때문입니다. **AST**는 코드의 구조를 이해하므로 진짜 `ImportDeclaration`만 정확히 식별합니다.

### Q4. 순환 참조와 무한 루프 방지
*   **질문**: `A -> B -> A` 구조에서 번들러가 무한 루프에 빠지지 않게 하는 방법은?
*   **해설**: **Visited Map** (Memoization)을 사용합니다. 파일의 절대 경로를 Key로 저장해두고, 이미 방문한 파일은 다시 분석하지 않고 건너뜁니다.

---

## 🟢 Phase 3: Bundling & Scope (번들링과 스코프)

### Q5. 스코프 격리 (IIFE)
*   **질문**: 파일 간 변수 이름 충돌을 막기 위한 패턴은?
*   **정답**: **IIFE (즉시 실행 함수 표현식)**. 모듈 전체를 함수로 감싸서(`(function() { ... })()`) 외부와 격리된 스코프를 만듭니다.

### Q6. 런타임 심 (Runtime Shim) 인자
*   **질문**: 번들러가 모듈 함수에 주입하는 3가지 인자는?
*   **정답**: `require` (가져오기), `module` (메타데이터), `exports` (내보내기 객체).
    *   *Note: 정확한 시그니처는 `function(require, module, exports) { ... }` 입니다.*

### Q7. Default Export 변환 (🚨 오답 노트)
*   **질문**: ESM의 `export default data`는 CJS 런타임에서 어떻게 변환되는가?
*   **정답**: **`exports.default = data`**
*   **해설**: CJS에는 `default` 개념이 없지만, 호환성을 위해 `default`라는 이름의 속성을 강제로 만들어 할당합니다.

---

## 🟢 Phase 4: Advanced (고도화)

### Q8. Externals (외부 의존성 처리)
*   **질문**: 라이브러리 번들링 시 `react`를 포함하지 않아야(Externals) 하는 이유는?
*   **해설**:
    1.  **용량 폭발**: 사용자 앱에 React가 두 벌(앱용 + 라이브러리용) 포함됨.
    2.  **Singleton 위반**: React Hooks나 Context는 앱 전체에서 단 하나의 React 인스턴스만 있어야 정상 동작함.

### Q9. MagicString의 필요성
*   **질문**: 단순 문자열 치환(`replace`) 대신 `magic-string`을 쓰는 이유는?
*   **해설**: **소스맵(SourceMap)** 생성을 위해서입니다. 코드 위치가 바뀌거나 삭제되어도, 원본 위치(인덱스) 정보를 보존했다가 매핑 파일을 만들어줍니다.

### Q10. Sourcemap 인코딩 (VLQ)
*   **질문**: 소스맵 파일 내부의 암호 같은 문자열(`AAAA,CAAC...`)의 인코딩 방식은?
*   **정답**: **Base64 VLQ (Variable Length Quantity)**. 용량을 줄이기 위해 숫자를 가변 길이 문자로 압축한 것입니다.

---

## 🔵 Phase 5: Scenario (실제 시나리오)

### Q11. Module Cache (데이터 무결성)
*   **질문**: `require` 구현 시 캐싱을 안 하면 어떤 문제가 생기는가?
*   **해설**: 모듈이 호출될 때마다 새로 실행되어 **상태(State)가 초기화**됩니다. `count` 같은 변수를 여러 파일이 공유할 수 없게 되어 데이터 무결성이 깨집니다.

### Q12. Dynamic Import 처리
*   **질문**: 동기식 번들러에서 `import('./file.js')`를 어떻게 처리하는가?
*   **해설**: `Promise.resolve().then(() => require(ID))` 형태로 변환합니다. 비동기 문법(Promise 반환)을 지키면서 내부적으로는 동기 로딩을 수행합니다.

### Q13. CJS 순환 참조의 한계
*   **질문**: CJS에서 순환 참조 발생 시 `exports` 객체의 상태는?
*   **정답**: **부분적으로 완성된(Partial) 객체**. 코드가 실행 중인 상태에서 반환되므로, 뒤에 정의된 함수는 아직 없는 상태(`TypeError`)일 수 있습니다.

---

## 🔵 Phase 6: Implementation (구현 디테일)

### Q14. Hashbang (Shebang) 처리
*   **질문**: `#!/usr/bin/env node` 라인을 어떻게 처리해야 하는가?
*   **해설**: **주석 처리**하거나 **공백으로 치환**합니다. 아예 삭제하면 줄 번호가 밀려 소스맵이 꼬이기 때문입니다.

### Q15. JSON 파일 로딩
*   **질문**: JSON 파일을 JS 모듈로 변환하는 코드는?
*   **정답**: `export default { "key": "value" };` (JSON 내용을 JS 객체 리터럴로 감싸서 내보냄)

---

## 🟣 Phase 7: Optimization (최적화)

### Q16. Scope Hoisting
*   **질문**: 모듈을 감싸는 함수(IIFE)를 제거하고 하나로 합치는 기법의 장점은?
*   **해설**:
    1.  **파일 크기 감소**: 함수 선언 코드 제거.
    2.  **실행 속도 향상**: 함수 호출 오버헤드 제거.

### Q17. Renaming & Scope Analysis
*   **질문**: 변수 이름을 안전하게 바꾸기 위해 필요한 정보는?
*   **정답**: **스코프 트리(Scope Tree)**. 어떤 변수가 어느 블록(`{}`) 안에서 유효한지 알아야 겹치지 않게 이름을 바꿀 수 있습니다.

### Q18. Pure Annotation
*   **질문**: `/* #__PURE__ */` 주석의 역할은?
*   **해설**: "이 함수 호출은 부수 효과(Side Effect)가 없다"는 보증수표. 번들러가 결과값을 안 쓰면 해당 코드를 안심하고 **Tree Shaking** 할 수 있게 해줍니다.

---

## 🟣 Phase 8: Practical Config (설정)

### Q19. package.json: sideEffects
*   **질문**: `"sideEffects": false` 설정의 의미는?
*   **해설**: "우리 패키지는 `import`만으로 실행되는 로직이 없다." 번들러가 사용되지 않는 파일은 **아예 로딩조차 건너뛰는(Skip)** 강력한 최적화를 수행합니다. (CSS import가 씹히는 원인이기도 함)

### Q20. Polyfill vs Syntax Transform
*   **질문**: `Array.prototype.includes` 지원을 위한 방식은?
*   **정답**: **Polyfill**. 문법 변환이 아니라, 없는 기능(메서드)을 구현해서 주입해 주는 방식입니다.

---

## ⚫ Phase 9: Architecture (아키텍처)

### Q21. Plugin System Pattern
*   **질문**: 플러그인 시스템 구현에 적합한 디자인 패턴은?
*   **정답**: **Pub/Sub (Observer)** 패턴. 특정 시점(Hooks)을 구독하고 있다가 이벤트가 발생하면 실행됩니다.

### Q22. File Watcher
*   **질문**: 파일 변경 감지를 위한 Node.js API와 라이브러리는?
*   **정답**: `fs.watch` (API), **`chokidar`** (라이브러리). OS별 차이를 보정해주는 `chokidar`가 사실상 표준입니다.

### Q23. Incremental Build (증분 빌드)
*   **질문**: 변경된 파일만 다시 빌드하기 위해 캐싱해야 할 것은?
*   **정답**: **AST (파싱된 결과)**. 파싱 비용이 가장 비싸므로, 안 바뀐 파일은 기존 AST를 재사용합니다.

### Q24. HMR 통신 프로토콜
*   **질문**: 개발 서버와 브라우저가 변경 사항을 주고받는 방식은?
*   **정답**: **WebSocket**. 양방향 통신을 통해 파일 변경 시 즉시 새 코드를 전송합니다.

### Q25. Code Splitting (Vendor Chunk)
*   **질문**: `node_modules` 라이브러리들을 별도로 분리한 청크 이름은?
*   **정답**: **Vendor Chunk**. 변경 빈도가 낮아 브라우저 캐싱 효율을 높이기 위해 분리합니다.

---

## ⚪ Phase 10: Debugging Scenario (디버깅)

### Q26. Missing Module Error (🚨 오답 노트)
*   **질문**: 경로는 맞는데 `Cannot find module` 에러가 나는 이유? (번들링 내부)
*   **해설**: **Transform 단계의 누락**. 소스 코드의 문자열 경로(`require('./utils')`)를 번들러가 부여한 **숫자 ID(`require(1)`)로 치환(Rewrite)**하지 않았기 때문입니다.

### Q27. Variable Collision (Global Pollution) (🚨 오답 노트)
*   **질문**: `const/let/var` 키워드 없이 `id = 1`로 선언하면?
*   **해설**: IIFE를 뚫고 **전역 객체(Global Property)**가 되어버려 다른 파일과 충돌합니다. (Default가 `var`가 아님에 주의!)

### Q28. CSS Loader Implementation (🚨 오답 노트)
*   **질문**: JS 번들러가 CSS를 처리하는 방식(코드)은?
*   **해설**: **Runtime Injection**. JS 문자열로 변환한 뒤, 브라우저에서 `document.createElement('style')`로 태그를 만들어 `<head>`에 꽂아 넣는 코드를 생성합니다.

### Q29. Phantom Dependency (유령 의존성)
*   **질문**: 설치 안 한 `lodash`가 import 되는 문제와 pnpm의 해결책은?
*   **해설**: `node_modules` 호이스팅으로 인한 문제. pnpm은 **심볼릭 링크(Symbolic Link)**를 사용하여 `package.json`에 명시된 패키지만 정확히 노출시킵니다.

### Q30. No-Bundling (Vite)
*   **질문**: 최신 개발 서버들이 번들링을 안 하는 이유는?
*   **해설**:
    1.  **성능**: 번들링 과정 자체를 생략하여 시동 속도가 빠름.
    2.  **Native ESM**: 브라우저가 이제 `import`를 직접 이해할 수 있게 발전했기 때문.

---
**총평**: 기초 원리부터 심화 아키텍처까지, 번들러를 직접 만들지 않고서는 알기 힘든 내용들을 깊이 있게 학습했습니다. 이 30가지 질문에 답할 수 있다면, 실무에서 겪는 대부분의 빌드 에러는 원인을 즉시 파악할 수 있을 것입니다. 🚀