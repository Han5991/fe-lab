# 📦 번들러 마스터를 위한 핵심 요약 노트

> **목표:** "도구가 대신 해주던 판단"을 직접 내려보며, 번들러의 내부 흐름(Flow)과 원리(Principle)를 완벽하게 장악한다.

---

## 1. 핵심 철학 (Philosophy)

### Q. 왜 정규표현식(Regex)을 쓰지 않는가?
*   **문제점:** 정규식은 코드를 단순한 '텍스트 덩어리'로 봅니다. 주석(`// import ...`)이나 문자열(`const msg = "import ..."`) 내부에 있는 가짜 import 구문을 구별하지 못합니다.
*   **해결책:** **AST(추상 구문 트리)**를 사용해 코드를 **"의미 단위의 데이터"**로 구조화해야 합니다. 그래야 "진짜 Import 선언문(`ImportDeclaration`)"만 정확히 골라낼 수 있습니다.

### Q. 번들러는 왜 '통역사'인가?
*   브라우저는 Node.js의 언어(`require`, `module.exports`)를 모릅니다.
*   번들러는 개발자가 작성한 최신 ESM(`import/export`) 코드를 브라우저나 구형 환경에서도 돌아가는 CJS(`require`)나 IIFE 형태로 **번역(Transpile)**하고, 실행 환경을 **흉내(Shim)** 내어 줍니다.

---

## 2. 3대 핵심 메커니즘 (Key Mechanisms)

### ① 의존성 그래프 (Graph) & 순환 참조 해결
*   **탐험가 로직:** Entry 파일에서 시작해 `import`를 만날 때마다 깊이 우선 탐색(DFS)으로 파고듭니다.
*   **Visited Map (방문 기록):** `A -> B -> A` 처럼 서로를 참조하는 **순환 참조(Circular Dependency)** 상황에서 무한 루프에 빠지지 않으려면, "이미 방문한 파일"을 기록해두고 다시 방문하지 않아야 합니다.

### ② 스코프 격리 (Scope Isolation)
*   **문제:** 여러 파일의 코드를 그냥 합치면 변수 이름(`const a`)이 충돌합니다.
*   **해결:** 파일마다 **함수(Function Scope)**로 감싸서(`IIFE`) 각자의 '독방'을 만들어줍니다.
    ```javascript
    // 1번 방
    function module_1() { const a = 1; } 
    // 2번 방
    function module_2() { const a = 2; } // 이름이 같아도 충돌 안 함
    ```

### ③ 런타임 쉼 (Runtime Shim)
*   **역할:** 브라우저에 없는 `require`, `module`, `exports`를 번들러가 직접 구현해서 주입합니다.
*   **작동 원리:**
    1.  `require(id)` 호출
    2.  `id`에 해당하는 함수(모듈) 실행
    3.  `module.exports`라는 빈 그릇에 결과 담기
    4.  그릇 반환

---

## 3. 코드 구현 분석 (Code Deep Dive)

### 📄 `src/Module.ts` (세포 단위: 파일 분석)
*   **역할:** 파일 하나를 읽어 AST로 분해하고, 내용을 변환합니다.
*   **핵심 메서드:**
    *   `init()`: `acorn` 파서를 돌려 `import/export` 구문을 찾아내고 **의존성 명단**을 만듭니다.
    *   `transform()`: `magic-string`을 사용해 AST 좌표(`start`, `end`)를 기준으로 ESM 문법을 `require()` 문법으로 정교하게 **수술(치환)**합니다.

### 📄 `src/Graph.ts` (지도 단위: 관계 연결)
*   **역할:** 여러 파일을 엮어 하나의 구조를 만듭니다.
*   **핵심 로직:**
    *   `createModule()`: **Visited Map**(`this.modules.has(path)`)을 체크하여 중복 분석을 막고 순환 참조를 해결합니다.
    *   `ID Mapping`: 긴 파일 경로 대신 숫자 ID(`1`, `2`...)를 부여해 관리합니다.
    *   `generate()`: 모든 모듈을 **IIFE 템플릿** 문자열 안에 순서대로 배치하여 최종 결과물을 만듭니다.

### 📄 `src/index.ts` (지휘자: 파이프라인)
*   **역할:** 전체 흐름을 관장합니다.
*   **Pipeline:** `Entry 설정` ➡️ `Graph 생성(Build)` ➡️ `파일 생성(Generate)`

---

## 4. 번들러 파이프라인 요약 (The Big Picture)

1.  **Input (입력)**: `index.js` (Entry Point)
2.  **Analysis (분석)**: AST Parsing ➡️ Dependency Collection ➡️ Graph Building
3.  **Transformation (변환)**: ESM ➡️ CJS ➡️ Wrap with Function (Scope Isolation)
4.  **Generation (생성)**: Inject Runtime Shim ➡️ Write to `dist/bundle.js`

---

## 5. 블로그 집필 전략 (Writing Strategy)

*   **Step 1 (MVP):** "일단 파일 하나라도 읽어서 변환해보자." (`magic-string` 맛보기)
*   **Step 2 (Data):** "파일이 100개라면? 코드를 데이터(AST)로 보고 지도를 그리자." (Graph & Resolve)
*   **Step 3 (Bundle):** "이제 합치자. 근데 변수 이름이 겹치네? 함수로 가두고 가짜 Node.js를 만들자." (Scope & Runtime)
*   **Step 4 (Polish):** "소스맵으로 원본 위치를 기억하고, 외부 라이브러리는 빼자." (Optimization)
