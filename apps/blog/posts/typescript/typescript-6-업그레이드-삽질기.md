---
title: 'TypeScript 6 업그레이드인 줄 알았는데, 문제는 "설정"이었습니다'
date: '2026-07-02'
published: true
slug: 'typescript-6-migration-troubleshooting'
excerpt: 'TypeScript 6으로 올리자 baseUrl·rootDir·types 기본값이 차례로 빌드를 깨뜨렸다. 각 변경의 "왜"를 microsoft/TypeScript PR diff까지 추적해 보니, 이건 버전을 올리는 이야기가 아니라 "올바른 설정"에 도달하는 이야기였다 — baseUrl은 TS7로 가는 청소, types는 순수 성능 개선. 게다가 이 셋은 6을 안 올려도 5에서 오늘 당장 적용할 수 있다.'
thumbnail: 'typescript-6-migration-thumb.png'
tags: [ 'TypeScript', 'TypeScript 6', 'typescript-7', 'tsgo', 'baseUrl', 'rootDir', 'tsdown', 'tsup', 'monorepo', 'breaking-change' ]
---

TypeScript 6 릴리스 노트의 breaking change 목록을 여는데, 매일 tsconfig에 적던 이름들이 줄줄이 눈에 들어왔다 — `baseUrl`, `types`, `rootDir`. 멀쩡히 쓰던 옵션들을 6은 왜 굳이 건드리는 걸까?

그 `왜`가 궁금해서, 릴리스 노트만 훑고 넘기는 대신 마침 굴리던 개인 모노레포에 6을 먼저 올려 하나씩 따라 바꿔봤다.

따라가 보니 이건 단순한 '6의 새 규칙들'이 아니었다. 세 변경을 관통하는 줄기는 하나 — 비싸거나 모호한 기본 동작을 걷어내는 '청소'. 다만 그 청소가 향하는 곳은 셋이 제각각이었다.

그래서 '6 업그레이드 기록'으로 시작한 이 글은, 따라가다 보니 정체가 달라졌다. 손에 남은 건 버전 숫자가 아니라 _'그래서 무엇이 올바른 설정인가'_ 라는 질문이었다.

## 0. TL;DR

이 글은 Turborepo + pnpm 워크스페이스 모노레포에서 TypeScript `5.8.3 → 6.0.3`으로 올리며 만난 breaking change들을, **"왜 그렇게
바뀌었는지"를 릴리스 노트 → 이슈 → 실제 PR diff까지 따라가며** 정리한 기록이다. 아래 표가 그 전부다 — 그 변경의 이유, 해결책 한 줄씩. 바쁘면 표만
보고 가도 된다.

| #      | 에러                                | 왜 TS6가 이렇게 바꿨나                                                                                                                                                | 해결                                                       |
|:-------|:----------------------------------|:--------------------------------------------------------------------------------------------------------------------------------------------------------------|:---------------------------------------------------------|
| #1     | `TS5101: 'baseUrl' is deprecated` | baseUrl의 숨은 2번째 역할(bare specifier look-up root)이 런타임에 안 맞는 import를 통과시킴 → deprecate ([#62509](https://github.com/microsoft/TypeScript/pull/62509))            | 직접 쓴 곳(react 앱)의 `baseUrl` 제거 (paths는 4.1부터 baseUrl 불필요) |
| #2     | `TS5011: 'rootDir' must be set`   | 추론된 `rootDir`는 입력 파일 집합에 따라 흔들려 출력 레이아웃이 비결정적 → tsconfig 디렉터리로 고정 ([#62418](https://github.com/microsoft/TypeScript/pull/62418))                              | `"rootDir": "./src"` 한 줄                                 |
| #3     | "빌드는 되는데 타입이 빠진 것 같은데?"           | `types` 기본값이 "모든 `@types` 자동 포함" → `[]`. flattened `node_modules`에서 수백 개가 전이로 끌려와 빌드 20–50% 낭비 ([#63054](https://github.com/microsoft/TypeScript/pull/63054)) | 전역이 필요한 곳은 이미 `types` 명시돼 있었음                            |
| 보너스    | 빌드 때 **안 쓴** baseUrl로 또 `TS5101`  | tsup이 dts 빌드에 `baseUrl \|\| '.'`를 **주입**하는데, tsup은 이미 유지보수 중단                                                                                                 | **tsup → tsdown 전환**                                     |

먼저 한 가지 정정부터. 위 표의 `TS5101`은 baseUrl **전용 에러가 아니다.** TypeScript의 **범용 "deprecated option" 진단**이고,
6.0이 baseUrl을 그 경로에 태웠을 뿐이다. 이 디테일이 왜 중요한지는 #1에서 PR diff로 확인한다.

---

## 1. baseUrl은 왜 deprecated 되었나 (TS5101)

### 마주침: 이미 알던 손님

`baseUrl`이 deprecated된다는 건 이미 알고 있었다. 내 코드에서 `baseUrl`을 실제로 쓰는 곳은 React 앱 하나뿐이었고, `paths`의 접두사 용도였다.

```json
// apps/react/tsconfig.app.json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    // "baseUrl": ".",   ← 삭제
    "paths": {
      "@/*": ["./src/*"],
      "@pages/*": ["./src/pages/*"]
      // ...
    }
  }
}
```

그냥 지웠다. `paths`는 [TypeScript 4.1부터`baseUrl` 없이 동작](https://www.typescriptlang.org/tsconfig/baseUrl.html)한다.

> "As of TypeScript 4.1, `baseUrl` is no longer required to be set when using `paths`."

### 왜 deprecated 됐나: 아무도 모르던 baseUrl의 두 번째 역할

해결은 쉬웠지만, **왜** 멀쩡히 동작하던 옵션을 6.0이 하드 에러로 막는지가 궁금했다. [릴리스 노트](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)와 도입 이슈 [#62207](https://github.com/microsoft/TypeScript/issues/62207)을 보면 이유가 명확하다. baseUrl은 두 가지 역할을 한다.

> "Today, `baseUrl` performs two functions:
> - it acts as a prefix for all entries in `paths`
> - it acts as a potential resolution point for all bare paths
>
> But almost nobody realizes that last
> part." — [issue #62207](https://github.com/microsoft/TypeScript/issues/62207)

문제는 두 번째, 인용문이 말한 _"bare paths"_다. baseUrl이 켜져 있으면 `./`로 시작하지 않는 import까지 — 예컨대 `import { Button } from
"components/Button"`처럼 **패키지인지 내 파일인지 모호한 경로**까지 — baseUrl 폴더 안에서 찾아준다. 그 바람에 **번들러/런타임에선 절대 동작하지
않을 import를 타입체커만 "괜찮다"고 통과**시킨다.

> "...it often meant that many import paths that would never have worked at runtime are considered
> \"just fine\" by TypeScript." — 릴리스 노트

즉 첫 번째 역할(paths 접두사)은 4.1 이후 `paths`가 직접 대체할 수 있으니, 위험한 두 번째 역할을 없애기 위해 baseUrl 자체를 걷어내는 것이다. 7.0에서는
아예 제거된다.

> "In TypeScript 7.0, we are not reimplementing `baseUrl`. ... In TypeScript 6.0, we will be
> deprecating this behavior. Using `baseUrl` will lead to an error which can only be resolved by
> applying one of the above fixes, or using
`--ignoreDeprecations`." — [issue #62207](https://github.com/microsoft/TypeScript/issues/62207)

### 사실 이 분리는 6년 전에 시작됐다

그런데 "두 역할을 떼어낸다"는 발상은 6.0이 처음이 아니다. 이미 2019년, 한 사용자가 이슈 [#31869](https://github.com/microsoft/TypeScript/issues/31869)에서 똑같은 불편을 제기했다 — `paths`는 타입체킹용 별칭으로만 쓰고 싶은데, baseUrl이 딸려 보내는 _두 번째 역할(bare 이름의 암묵적 해석)_ 까지 떠안긴 싫다는 것이었다.

이 요청은 PR [#40101](https://github.com/microsoft/TypeScript/pull/40101)로 구현돼 **4.1(2020년)** 에 출시됐고, 그때부터 baseUrl 없이도 `paths`가 동작한다.

그러니 6.0의 deprecation은 갑자기 튀어나온 breaking change가 아니다. **2019년 문제 제기(#31869) → 2020년 4.1 구현(#40101) → 2026년 6.0 정리(#62207·#62509)** — baseUrl의 두 역할을 떼어내는 일은 6년에 걸친 청소의 마지막 단계인 셈이다.

### 구현 레벨: TS5101은 baseUrl 전용이 아니다

여기서 PR [#62509 "Deprecate baseUrl"](https://github.com/microsoft/TypeScript/pull/62509)의 실제 diff를 보면
재미있는 사실이 드러난다. baseUrl을 위한 **새 에러 코드는 만들어지지 않았다.** 기존 범용 deprecation 진단(우리가 보는 `TS5101`)을 재사용하고, 거기에
마이그레이션 안내용 신규 메시지(코드 `5111`)만 체이닝한다.

먼저 타입 선언에 `@deprecated`를 단다.

```diff
// src/compiler/types.ts
   alwaysStrict?: boolean;
+  /** @deprecated */
   baseUrl?: string;
```

그리고 핵심은 `program.ts`의 `checkDeprecations("6.0", "7.0", ...)` 블록이다. 여기에 baseUrl 분기가 추가됐다.

```diff
// src/compiler/program.ts
 checkDeprecations("6.0", "7.0", createDiagnostic, createDeprecatedDiagnostic => {
     if (options.moduleResolution === ModuleResolutionKind.Node10) {
-        createDeprecatedDiagnostic("moduleResolution", "node10");
+        createDeprecatedDiagnostic("moduleResolution", "node10", /*useInstead*/ undefined,
+            Diagnostics.Visit_https_aka_ms_ts6_for_migration_information);
+    }
+    if (options.baseUrl !== undefined) {
+        createDeprecatedDiagnostic("baseUrl", /*value*/ undefined, /*useInstead*/ undefined,
+            Diagnostics.Visit_https_aka_ms_ts6_for_migration_information);
     }
 });
```

`checkDeprecations("6.0", "7.0", ...)` — 6.0에서 deprecate, 7.0에서 제거라는 의미가 함수 인자에 그대로 박혀 있다. 그래서 우리가
보는 에러는 이렇게 생겼다.

```text
error TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0.
  Specify compilerOption '"ignoreDeprecations": "6.0"' to silence this error.
  Visit https://aka.ms/ts6 for migration information.
```

`TS5101`은 "Option '{0}' is deprecated..."라는 **범용 메시지**의 코드고, `{0}`에 `baseUrl`이, 안내 링크(
`Visit https://aka.ms/ts6 ...`)에 신규 코드 `5111`이 related로 붙은 것이다. 그러니 `ignoreDeprecations: "6.0"`으로
한시적으로 끌 수는 있지만, 그건 그저 문제를 7.0으로 미루는 일이다.

참고로 에러가 가리키는 <code>https://aka.ms/ts6</code>은 마이그레이션 가이드
이슈(<a href="https://github.com/microsoft/TypeScript/issues/62508">#62508</a>)로 리다이렉트되는데, 이 글을 쓰는 시점엔
본문이 아직 <code>Placeholder</code>만 들어 있는 빈 페이지다. 에러는 친절하게 안내하지만 정작 안내처는 공사 중인 셈.

### `paths`도 끝이 아니다: 진짜 대안은 package.json `imports`

`baseUrl`을 지우고 `paths`로 갈아탔지만, `paths`도 완전한 답은 아니다. **`paths`는 타입체커 전용**이라 `tsc`가 내보내는 JS엔 반영되지 않아,
`baseUrl`이 6.0에서 막힌 그 이유(런타임에 안 맞는 import를 타입체커만 통과)와 정도만 다를 뿐 같은 괴리를 안는다. 그 괴리가 구조적으로 없는 대안이 *
*Node가 런타임에 직접 읽는 package.json `imports`** (`#` subpath)다 — 타입과 런타임이 같은 매핑을 보니 어긋날 수 없고, TS 핸드북도
이를 _"a standard replacement for convenience `paths` aliases"_ 로 부른다.

<details>
<summary>옮길 때 알아둘 것 — 설정·버전·번들러 (펼치기)</summary>

```json
// package.json — tsconfig paths 대신 여기에
{
  "imports": {
	"#/*": "./src/*"
  }
}
```

```ts
import { foo } from '#/utils/foo'; // 타입도, Node 런타임도 같은 매핑으로 해석
```

- **TypeScript는 4.7부터** `imports`를 해석하고, `moduleResolution`이 `node16`·`nodenext`·`bundler`일 때 동작한다(
  레거시 `node`는 안 된다).
- **`#`는 강제다.** `@/` 같은 임의 별칭은 못 쓴다. 다만 **`#/` prefix는 TS 6.0 + Node 20부터** 허용돼 `@/`에 가까운 컨벤션을 쓸 수
  있다 — 단 `#/` 패턴은 `nodenext`·`bundler`에서만이고 `node16`은 제외다.
- **번들러 지원은 제각각.** Vite 4.2+, esbuild 0.13.9+는 지원하고, Jest는 네이티브로 안 돼 `moduleNameMapper`가 필요하다.
- 참고로 `baseUrl` deprecation 이슈(#62207·#62508) 자체는 `imports`가 아니라 "prefix를 `paths`에 직접 박기"를 권한다.
  `imports`를 표준 대체재로 부르는 건 핸드북·릴리스 노트 쪽 라인이다.

>
출처: [TS 핸드북 Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html) · [TS 4.7](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html) · [TS 6.0 릴리스 노트](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)

</details>

---

## 2. rootDir를 명시하라 (TS5011)

### 마주침: 빌드의 dts emit 단계

`@package/sample-lib`의 빌드는 `minibundler && tsc --emitDeclarationOnly` 두 단계다. 앞 단계(번들)는 통과했는데 `tsc`가
깨졌다.

```text
tsconfig.json:10:5 - error TS5011: The common source directory of 'tsconfig.json'
  is './src'. The 'rootDir' setting must be explicitly set to this or another path
  to adjust your output's file layout.
  Visit https://aka.ms/ts6 for migration information.
```

해결은 한 줄.

```json
// packages/@package/sample-lib/tsconfig.json
{
  "compilerOptions": {
    "emitDeclarationOnly": true,
    "outDir": "./dist",
    "rootDir": "./src", // ← 추가
  }
}
```

그런데 방금 추가한 `rootDir: "./src"` 한 줄은 정확히 뭘 할까? `rootDir`은 **출력 폴더(`dist`)의 모양을 어디서부터 베낄지** 정하는 '깃발'이라
보면 된다. tsc는 깃발 **아래**의 폴더 구조를 그대로 `dist`에 복제한다.

```
my-lib/
├── tsconfig.json
└── src/
    ├── index.ts
    └── utils.ts
```

깃발을 `src/`에 꽂으면 → `dist/index.js`, `dist/utils.js`. 한 칸 위(`my-lib/`)에 꽂으면 → `dist/src/index.js`로 `src/`가 딸려
들어온다. **위치 한 끗이 산출물 모양을 가른다.**

### 왜 추론하던 걸 이제 명시하라고 하나

[릴리스 노트](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)와
이슈 [#62194](https://github.com/microsoft/TypeScript/issues/62194)의 논거는 두 가지다.

> "Previously, if you did not specify a `rootDir`, it was inferred based on the common directory of
> all non-declaration input files. But this often meant that it was impossible to know if a file
> belonged to a project without trying to load and parse that project. It also meant that TypeScript
> had to spend more time inferring that common source directory by analyzing every file path in the
> program." — 릴리스 노트

요점은 **결정성**이다. 옛 TS는 깃발을 "내 파일을 전부 담는 가장 깊은 공통 폴더"에 **자동으로** 꽂았다. 위 예제는 파일이 다 `src/`에 있으니
깃발은 `src/`. 그런데 루트에 파일 하나(`my-lib/build.ts`)만 더하면 공통 폴더가 `my-lib/`로 **점프**하고, `dist/index.js`였던 출력이
통째로 `dist/src/index.js`로 밀린다. **파일 하나 더했을 뿐인데 산출물 구조가 바뀐다** — 이 들쭉날쭉함이 비결정성이다.

비용은 하나 더 있다. "이 파일이 어느 `tsconfig` 소속인가"를 알려면 그 공통 폴더부터 계산하느라 프로젝트를 통째로 로드·파싱해야 했다. 깃발을
`tsconfig.json` 폴더(configDir)에 못 박으면 이걸 **경로만 보고 즉답**한다 — 제안 이슈의 표현 그대로 _"trivially determine whether
a file could belong to another `tsconfig.json`"_
([#62194](https://github.com/microsoft/TypeScript/issues/62194)). 1장 baseUrl이 7.0에서 _아예 사라지는_ 동작이었던 것과
달리, rootDir은 동작은 남고 그 **계산만 입력 파일 목록에서 떼어낸** 것이다. 그래도 향하는 곳은 같다 — Go로 다시 쓴 7.0(`tsgo`)의 빠른 언어
서비스다.

그럼 왜 기본값만 슬쩍 바꾸지 않고 굳이 **에러**를 던질까? 기본 위치를 말없이 옮기면 빌드는 성공하는데 산출물이 `dist/file.js`에서
`dist/src/file.js`로 소리 없이 밀리고, 그걸 `import`하던 패키지가 영문도 모르고 깨진다. 조용한 사고보다 시끄러운 멈춤이 낫다 — 그래서 옛 추론값과
configDir이 어긋나면 **멈추고 명시를 요구한다**(그 비교 로직이 다음 절의 `TS5011`이다).

충격은 모노레포에서 더 컸다. 구현 PR의 생태계 테스트에서 mui-docs는 에러가 **0 → 11,385개**로 튀었고, TS 팀의 jakebailey도 _"Ouch,
looking bad for pyright and mui-docs"_ 라 적었다. 원인은 rootDir을 추론에 맡긴 채 프로젝트 참조 대신 _"every project emit each
other's files into their own dist"_ 하던 구조였다([#62418](https://github.com/microsoft/TypeScript/pull/62418)).

여기서 증상이 갈린다. **같은 변경(기본 rootDir = `configDir`)인데, 깃발이 어디로 가느냐에 따라 두 얼굴**로 나타난다.

|         | 내 경우 (작은 라이브러리)              | 모노레포 (mui 같은)                     |
|:--------|:-----------------------------|:----------------------------------|
| 소스 위치   | 전부 `src/` **안**              | 다른 패키지(루트 **밖**) 파일을 끌어다 씀        |
| 깃발을 옮기면 | 출력 위치만 밀림                    | 파일이 새 깃발 **바깥**에 놓임               |
| 터지는 에러  | **`TS5011`** ("rootDir 명시해") | **`TS6059`** ("이 파일 rootDir 밖이야") |

뿌리는 하나 — 깃발을 자동 추측에서 `tsconfig` 폴더로 못 박은 것이다. 내 프로젝트는 '출력이 밀리는' 얼굴로, 큰 모노레포는 '파일이 루트 밖으로 튕겨나가는'
얼굴로 나타났을 뿐이다.

### 구현 레벨: 한 줄짜리 조건 완화 + 신·구 비교

PR [#62418 "Assume rootDir is the current configuration directory"](https://github.com/microsoft/TypeScript/pull/62418)
은 81개 파일을 건드린 큰 PR이지만, 핵심 로직은 **동일한 한 줄이 세 군데에서 완화된 것**이다.

```diff
// src/compiler/emitter.ts — getCommonSourceDirectory()
-    else if (options.composite && options.configFilePath) {
+    else if (options.configFilePath) {
         // Project compilations never infer their root from the input source paths
         commonSourceDirectory = getDirectoryPath(normalizeSlashes(options.configFilePath));
```

예전엔 `composite` 프로젝트만 "configDir를 공통 소스 디렉터리로" 썼는데, 이제 `configFilePath`만 있으면(=tsconfig 기반 빌드면) 항상
그렇게 한다. 같은 패턴이 `utilities.ts`, `moduleNameResolver.ts`에도 동일하게 적용됐다.

그럼 TS5011은 언제 던지나? `program.ts`에 새로 추가된 블록이 **옛 방식과 새 방식의 공통 디렉터리를 비교**해서, 출력 레이아웃이 달라질 때만 에러를 낸다(
아래는 핵심만 발췌·정리).

```diff
// src/compiler/program.ts
+if (!options.noEmit && !options.composite && !options.rootDir && options.configFilePath &&
+    (options.outDir || (getEmitDeclarations(options) && options.declarationDir) || options.outFile)) {
+    const dir   = getCommonSourceDirectory();            // 새 방식: configDir 기준
+    const files = mapDefined(/* 실제 emit될 입력 파일들 */);
+    const dir59 = getComputedCommonSourceDirectory(files, /* ... */);  // 옛 방식: 입력 파일 기준
+    if (dir59 !== "" && getCanonicalFileName(dir) !== getCanonicalFileName(dir59)) {
+        // 레이아웃이 바뀐다 → TS5011
+        createDiagnosticForOption(/* ... */
+            Diagnostics.The_common_source_directory_of_0_is_1_The_rootDir_setting_must_be_explicitly_set_...);
+    }
+}
```

여기서 에러 메시지의 친절함이 설명된다. 메시지의 `'{1}'`(=`'./src'`)은 바로 `dir59` — **옛 방식으로 계산한 공통 디렉터리**다. 우리
sample-lib는 소스가 `./src`에 있어 옛 추론값이 `./src`였는데, 새 기본값은 tsconfig 위치(`.`)라 둘이 어긋난다. 그래서 6.0은 "전엔
`./src`로 잡혔으니, 그 값을 `rootDir`에 명시하라"고 **정답을 알려주며** 멈춘 것이다. `rootDir: "./src"`는 그 안내를 그대로 따른 것뿐이다.

---

## 3. types 기본값이 []가 된 이유 (그리고 왜 우리 빌드는 멀쩡했나)

### 의심: 타입이 다 빠졌어야 하는 거 아닌가?

baseUrl도 rootDir도 빨간 에러로 멈춰 세웠는데, types는 이상하리만치 조용했다. 그래서 오히려 의문이 들었다. "TS6에선 `types: []`가 기본이라던데, 그럼 전역 타입이 다 빠졌을 텐데 왜 빌드가 다 되지?" 이건 에러가 아니라 **에러가 안 난 게 더
수상한** 경우였다.

### 무엇이, 왜 바뀌었나

먼저 결을 분명히 하자. 1장(`baseUrl`)·2장(`rootDir`)이 7.0(`tsgo`)을 앞둔 정리였다면, **이 `types` 변경의 동기는 순수하게 빌드 성능**
이다 —
제안 이슈 [#62195](https://github.com/microsoft/TypeScript/issues/62195)도 이 변경을 네이티브 컴파일러(7.0)와 묶이지 않은,
6.0에
독립적으로 들어가는 성능 개선으로 다룬다. 그 이슈와
[릴리스 노트](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)를 보면 이유가
명확하다:
기존 `types`의 기본값은 사실상 "`node_modules/@types`를 전부 열거"였다.

> "for convenience, TypeScript would also include all packages in `node_modules/@types` by
> default... This can be _very_ expensive, as a normal repository setup these days might
> transitively
> pull in hundreds of `@types` packages, especially in multi-project workspaces with flattened
`node_modules`." — 릴리스 노트

flattened `node_modules`를 쓰는 모노레포에서는 이게 특히 치명적이다. 수백 개의 불필요한 `.d.ts`가 전이적으로 프로그램에 끌려와 파싱/체크 비용을
잡아먹는다. 그래서 기본값을 `[]`로 바꿨고, 효과는 수치로 제시돼 있다.

> "Many projects we've looked at have improved their build time anywhere from 20-50% just by setting
`types` appropriately." — 릴리스
> 노트 ([원 출처는 #54500](https://github.com/microsoft/TypeScript/issues/54500))

### 구현 레벨: "기본값 = []" 대입문은 없다

PR [#63054 "Set default `types` array to `[]`; support
`\"*\"` wildcard"](https://github.com/microsoft/TypeScript/pull/63054)을 까보면, 흥미롭게도
`options.types = []` 같은 **명시적 기본값 대입은 어디에도 없다.** 자동 열거를 담당하던 `getAutomaticTypeDirectiveNames`의
early-return 조건이 뒤집힌 게 전부다(아래 diff는 핵심만 발췌·정리).

```diff
// src/compiler/moduleNameResolver.ts
 export function getAutomaticTypeDirectiveNames(options, host): string[] {
-    // Use explicit type list from tsconfig.json
-    if (options.types) {
-        return options.types;
+    if (!usesWildcardTypes(options)) {
+        return options.types ?? [];
     }
     // ... 여기 아래(typeRoots 열거)는 이제 "*"가 있을 때만 실행된다
-    return result;
+    return deduplicate(flatten(options.types.map(t => t === "*" ? wildcardMatches : t)), equateValues);
 }
```

핵심은 `if (options.types)` → `if (!usesWildcardTypes(options))`로 바뀐 한 줄이다. 예전엔 "`types`를 명시 안 하면(
undefined) typeRoots를 뒤져 모든 `@types`를 자동 포함"했는데, 이제는 **`types` 배열에 `"*"`가 있을 때만** 열거하고, 그 외에는
`options.types ?? []`를 그대로 돌려준다. `[]` 기본값은 별도 코드가 아니라 이 early-return의 자연스러운 결과다.

판정 헬퍼도 새로 추가됐다.

```diff
// src/compiler/utilities.ts
+export function usesWildcardTypes(options: CompilerOptions): options is CompilerOptions & { types: string[] } {
+    return some(options.types, t => t === "*");
+}
```

옛 동작(모든 `@types` 자동 포함)으로 되돌리고 싶으면 `"types": ["*"]`를 쓰면 된다. 위 diff에서
`options.types.map(t => t === "*" ? wildcardMatches : t)` — `"*"`가 있던 **위치에** 열거 결과를 펼쳐 넣어 순서까지
보존한다.

### 핵심: 사라지는 건 import 안 한 '전역' 타입뿐

기본값이 `[]`로 바뀌었다니, 내 타입이 우수수 빠지는 건 아닐까? 다행히 **영향 범위는 훨씬 좁다.** 이 변경은 `node_modules/@types` **읽기를 멈추는
게 아니다.** 내가 직접 `import`해서 쓰는 타입은 전혀 영향이 없고, 오직 **import 없이 전역(global)으로 깔리던 `@types`** — 예컨대
`@types/node`의 `process`·`Buffer`, 테스트 프레임워크의 `describe`/`expect` 같은 것 — 만 끊긴다.

> "...this does not mean we will stop reading from `node_modules/@types`, just that the files won't
> be brought in unless imported, explicitly listed in your `tsconfig.json`'s `types` array...
> Typically this will only affect users relying on global values and module names, like those
> brought in from `@types/node` (e.g. the `"fs"` module is globally defined), or a testing
> framework." — [issue #62195](https://github.com/microsoft/TypeScript/issues/62195)

```ts
import { foo } from 'some-pkg';   // ← types 설정과 무관하게 타입 붙음
process.env.NODE_ENV;             // ← @types/node 전역. types에 'node' 없으면 에러
```

### 답: 빠질 게 없었다 — 이미 명시돼 있어서

답은 싱겁게도 "이미 잘 명시돼 있어서"였다. 전역이 필요한 패키지는 전부 `types`를 명시하고 있었다.

| 패키지                     | `types`                      | TS6 영향                        |
|:------------------------|:-----------------------------|:------------------------------|
| next.js                 | `["node", "vitest/globals"]` | 없음 (명시)                       |
| socket-server / bundler | `["node"]`                   | 없음 (명시)                       |
| react / typescript      | `["vitest/globals"]`         | 없음 (명시)                       |
| ui / 공유 base config     | 미지정                          | 이제 `[]` (그러나 ambient 전역을 안 씀) |

`types`를 명시 안 한 곳(ui, 공유 base)은 애초에 ambient 전역에 의존하지 않거나, Next.js처럼 `next-env.d.ts`의
`/// <reference>`로 충당돼서 통과했다. 즉 "에러가 안 난 것"은 운이 아니라, **TS6가 강제하기 전부터 옳게 적혀 있었던** 덕이다.

<code>ignoreDeprecations</code>는 <code>baseUrl</code> 같은 <strong>deprecated 옵션</strong>용이지, <code>
types</code> 기본값 변경을 되돌리는 옵션이 아니다. 옛 동작이 필요하면 <code>"types": ["*"]</code>를 쓰면 된다 — 이건 glob이 아니라 "전부
열거"를 뜻하는 special token이다.

---

## 4. 1차 검증: 여기까지 check-types는 통과

세 가지 규칙을 다 맞추고 나니 타입 체크는 깨끗했다.

- `pnpm check-types` → **5/5 통과**

자, TypeScript 자체가 바꾼 규칙들은 다 막아냈다. 그런데 전체 빌드(`pnpm build`)를 돌리자, **정작 내가 손대지도 않은 곳**에서 다시 터졌다. 그것도 방금
작별했다고 생각한 그 이름, `baseUrl`로.

---

## 5. 보너스: 다시 튀어나온 baseUrl — 이번엔 내 코드가 아니었다

`pnpm build`가 디자인 시스템 패키지의 dts 빌드에 다다르자 **또 `TS5101`**이 떴다. 그런데 `@design-system/ui`의 tsconfig엔
`baseUrl`이 **없다.** #1에서 봤듯 TS5101은 범용 진단이니, 누군가 내 빌드에 baseUrl을 **주입**하고 있다는 뜻이다.

범인은 dts 번들러로 쓰던 **tsup**이었다. [소스](https://github.com/egoist/tsup/blob/main/src/rollup.ts)의 dts 빌드 옵션
구성부에 이 한 줄이 있다.

```ts
baseUrl: compilerOptions.baseUrl || '.', // ← 내 tsconfig에 없어도 '.'를 강제 주입
```

TS 5.x에선 무해했지만 TS6에선 이 주입이 곧장 하드 에러다([tsup #1388](https://github.com/egoist/tsup/issues/1388), 재현 환경
tsup 8.5.1 + TS 6.0.2). 게다가 tsup은 **이미 유지보수 중단** — README 최상단에 박혀 있다.

> "This project is not actively maintained anymore. Please consider using tsdown
> instead." — [egoist/tsup README](https://github.com/egoist/tsup/blob/main/README.md)

baseUrl 주입은 내 코드가 아니라 도구의 문제이고, 그 도구가 더는 고쳐지지 않으니 답은 정해져 있었다 — 후속 도구 [tsdown](https://tsdown.dev)으로
갈아탔다. [Rolldown](https://rolldown.rs) 기반이라 **baseUrl을 주입하지 않고**, peer로
`typescript: "^5.0.0 || ^6.0.0"`을 선언해 **TS6를 공식 지원**한다. 마이그레이션 도구(`npx tsdown-migrate`)로 config도 거의
그대로 옮겨졌고, 전환 직후 `TS5101`은 사라졌다.

다만 공짜는 아니었다. 전환하며 밟은 함정 셋:

- **출력 확장자.** tsdown은 `platform: 'node'`에서 `.mjs`/`.cjs`/`.d.mts`/`.d.cts`로 낸다(tsup은 `.js`/`.d.ts`).
  `package.json`의 `exports`·`bin`·`main`·`types`를 산출물에 맞춰 전부 정정해야 했다.
- **`platform` ≠ `target`.** `platform: 'node'`는 의존성 외부화·출력 확장자 힌트일 뿐, ES 문법 타겟은 `target`이 따로 통제한다.
  Node 24 문법까지 내리려면 `target: 'node24'`를 함께 명시.
- **빌드 도구는 `devDependencies`에.** `tsdown`·`typescript`는 런타임 의존성이 아니다. `@design-system/ui`가 `tsup`을
  `dependencies`에 두고 있어 뒤늦게 옮겼다.

- `pnpm build` (전체) → **9/9 통과** (blog 정적 빌드 포함)

---

## 6. 정리: TypeScript 6 마이그레이션 체크리스트

이번 삽질을 한 줄짜리 체크리스트로 압축하면(1~4는 앞에서 다룬 것, 5는 버전을 일괄 갱신할 때 함께 챙기는 곁가지다):

1. **`baseUrl`을 쓰는가?** → 직접 쓰면 제거(`paths`는 4.1부터 baseUrl 불필요). 빌드 도구가 주입한다면 도구를 점검하라. `TS5101`은
   baseUrl 전용이 아니라 **범용 deprecated-option 진단**임을 기억할 것.
2. **`emitDeclarationOnly`/`outDir`로 emit하는데 소스가 tsconfig보다 깊은가?** → `rootDir`을 명시. 에러 메시지의 `'{1}'`이
   곧 넣어야 할 값이다.
3. **`@types/node` 같은 전역에 의존하는가?** → `types: ["node", ...]`로 명시. TS6 기본은 `[]`이고, 이는 **ambient 전역에만**
   영향을 준다(import 타입은 무관). 옛 동작은 `["*"]`.

---

## 7. 정작 가장 큰 수확: 6을 올리지 않아도 됐다

표의 #1~#3, 그리고 보너스까지 따라오며 깨달은 게 있다. 이 변화들의 공통점은 결국 '비싸거나 모호한 기본값을 걷어내는 청소'였다 — baseUrl·rootDir은 TS7(Go)을 향한 정리, types는 순수 성능 개선. 그리고 **그 청소는 6을 올려야만 할 수 있는 게 아니다.**
baseUrl·rootDir·types 셋 다 5에서도 오늘 당장 적용할 수 있는 모범 설정이다. 그러니 정작 올릴 첫 커밋은 "6 업그레이드"가 아니라 이 정리다.

**6을 안 올려도, 5에서 지금 할 일:**

- **`baseUrl` 제거** → `paths`만 남기거나, 런타임까지 일치하는 package.json `imports`로.
- **`rootDir` 고정** → 명시해 출력 레이아웃을 결정적으로 묶는다.
- **`types` 좁히기** → `types: ["node", ...]`로 명시해 자동 `@types` 열거 비용을 미리 던다.

세 줄 다 5.x tsconfig에서 오늘 커밋할 수 있다. 6은 이걸 '강제'했을 뿐 '발명'한 게 아니다.

> 시작은 "이걸 왜 굳이 바꾸지?"라는 호기심 한 줄이었다. 세 옵션의 '왜'를 PR diff까지 따라가 보니, 답은 늘 같은 곳을 가리켰다 — Go로 다시 쓰인 7.0.
`baseUrl`·`types`·`rootDir`도, 마지막에 튀어나온 `tsup`도, 전부 그 길목을 미리 쓸어두는 일이었다. 그리고 가장 김빠지면서도 든든한 깨달음은 따로
> 있었다. 이 길, 6을 올려야만 걸을 수 있는 게 아니다. 5에서 그대로, 그것도 빌드가 빨라지는 채로 갈 수 있다. 버전 숫자를 올리는 일과 더 나은 설정으로 가는 일은, 생각보다 자주 별개다.

---

## 참고 링크

- TypeScript 6.0 릴리스 노트 — <https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html>
- baseUrl deprecation: [issue #62207](https://github.com/microsoft/TypeScript/issues/62207) · [PR #62509](https://github.com/microsoft/TypeScript/pull/62509)
- `baseUrl`/`paths`의 런타임 안전 대안 package.json `imports`: [TS 핸드북 Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html) · [Node.js`imports` 필드](https://nodejs.org/api/packages.html) · [TS 4.7 릴리스 노트(imports 지원)](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-7.html)
- types 기본값 `[]`: [issue #62195](https://github.com/microsoft/TypeScript/issues/62195) · [PR #63054](https://github.com/microsoft/TypeScript/pull/63054) · [원 rationale #54500](https://github.com/microsoft/TypeScript/issues/54500)
- rootDir 기본값: [issue #62194](https://github.com/microsoft/TypeScript/issues/62194) · [PR #62418](https://github.com/microsoft/TypeScript/pull/62418)
- tsup: [README](https://github.com/egoist/tsup/blob/main/README.md) · [TS5101 이슈 #1388](https://github.com/egoist/tsup/issues/1388) · [TS6 지원 #1389](https://github.com/egoist/tsup/issues/1389)
- tsdown: [공식 문서](https://tsdown.dev) · [tsup → tsdown 마이그레이션](https://tsdown.dev/guide/migrate-from-tsup) · [rolldown-plugin-dts](https://github.com/sxzz/rolldown-plugin-dts)
