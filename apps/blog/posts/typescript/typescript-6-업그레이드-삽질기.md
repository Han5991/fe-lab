---
title: 'TypeScript 6 업그레이드: breaking change 3종을 PR diff까지 추적하며 격파한 기록'
date: '2026-06-16'
status: 'draft'
slug: 'typescript-6-migration-troubleshooting'
excerpt: '공부 삼아 모노레포의 TypeScript를 5.8.3에서 6.0.3으로 올렸더니, baseUrl deprecation·types 기본값 변경·rootDir 요구라는 breaking change 3종이 차례로 빌드를 무너뜨렸다. 각각이 "왜" 그렇게 바뀌었는지 공식 릴리스 노트와 이슈를 넘어 실제 microsoft/TypeScript PR diff까지 파고들어 하나씩 격파한 기록. 보너스로, 빌드에서 마주친 진짜 빌런 — 유지보수가 멈춘 tsup을 tsdown으로 갈아치운 이야기까지.'
tags: ['TypeScript', 'tsdown', 'monorepo', 'troubleshooting', 'breaking-change']
---

이 글은 작업 중 남긴 <strong>임시(draft) 기록</strong>을 다듬는 중입니다. 환경은 2026-06 기준 <strong>TypeScript 6.0.3 / pnpm 11.6.0 / tsdown 0.22.2 / tsup 8.5.1</strong>이며, 버전에 따라 동작이 달라질 수 있습니다. 인용한 이슈·PR 번호는 모두 microsoft/TypeScript 기준입니다.

## 0. TL;DR

> "catalog에 박힌 TypeScript 5.8.3을 6 최신으로 올려줘." — 공부 삼아 한 줄로 시작했지만, TypeScript 6는 메이저 버전답게 곳곳에서 빌드를 무너뜨렸다.

이 글은 Turborepo + pnpm 워크스페이스 모노레포에서 TypeScript `5.8.3 → 6.0.3` 업그레이드를 하며 만난 breaking change들을, **"왜 그렇게 바뀌었는지"를 릴리스 노트 → 이슈 → 실제 PR diff까지 추적하면서** 하나씩 격파한 기록이다. 단순 해결 로그가 아니라 "그 변경의 근거"를 파는 게 목적이다.

| #      | 증상                                | 왜 TS6가 이렇게 바꿨나 (근거)                                                                                                                                           | 해결                                                       |
|:-------|:----------------------------------|:--------------------------------------------------------------------------------------------------------------------------------------------------------------|:---------------------------------------------------------|
| #1     | `TS5101: 'baseUrl' is deprecated` | baseUrl의 숨은 2번째 역할(bare specifier look-up root)이 런타임에 안 맞는 import를 통과시킴 → deprecate ([#62509](https://github.com/microsoft/TypeScript/pull/62509))            | 직접 쓴 곳(react 앱)의 `baseUrl` 제거 (paths는 4.1부터 baseUrl 불필요) |
| #2     | "빌드는 되는데 타입이 빠진 것 같은데?"           | `types` 기본값이 "모든 `@types` 자동 포함" → `[]`. flattened `node_modules`에서 수백 개가 전이로 끌려와 빌드 20–50% 낭비 ([#63054](https://github.com/microsoft/TypeScript/pull/63054)) | 전역이 필요한 곳은 이미 `types` 명시돼 있었음                            |
| #3     | `TS5011: 'rootDir' must be set`   | 추론된 `rootDir`는 입력 파일 집합에 따라 흔들려 출력 레이아웃이 비결정적 → tsconfig 디렉터리로 고정 ([#62418](https://github.com/microsoft/TypeScript/pull/62418))                              | `"rootDir": "./src"` 한 줄                                 |
| 🎁 보너스 | 빌드 때 **안 쓴** baseUrl로 또 `TS5101`  | tsup이 dts 빌드에 `baseUrl \|\| '.'`를 **주입**하는데, tsup은 이미 유지보수 중단                                                                                                 | **tsup → tsdown 전환**                                     |

먼저 한 가지 정정부터. 위 표의 `TS5101`은 baseUrl **전용 에러가 아니다.** TypeScript의 **범용 "deprecated option" 진단**이고, 6.0이 baseUrl을 그 경로에 태웠을 뿐이다. 이 디테일이 왜 중요한지는 #1에서 PR diff로 확인한다.

---

## 1. baseUrl은 왜 deprecated 되었나 (TS5101)

### 마주침: 이미 알던 손님

`baseUrl`이 deprecated된다는 건 이미 알고 있었다. 내 코드에서 `baseUrl`을 실제로 쓰는 곳은 React 앱 하나뿐이었고, `paths`의 접두사 용도였다.

```jsonc
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

그냥 지웠다. `paths`는 [TypeScript 4.1부터 `baseUrl` 없이 동작](https://www.typescriptlang.org/tsconfig/baseUrl.html)한다.

> "As of TypeScript 4.1, `baseUrl` is no longer required to be set when using `paths`."

여기서 한 가지 흔한 오해를 짚자. "`moduleResolution: bundler`라서 baseUrl이 필요 없어진 것"이 **아니다.** `paths`가 baseUrl을 요구하지 않게 된 건 moduleResolution 종류와 무관하게 4.1부터의 일이다. 그러니 어떤 resolution 모드든 `paths`만 쓴다면 baseUrl은 그냥 지우면 된다.

### 왜 deprecated 됐나: baseUrl의 "숨은 두 번째 일"

해결은 쉬웠지만, **왜** 멀쩡히 동작하던 옵션을 6.0이 하드 에러로 막는지가 궁금했다. [릴리스 노트](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)와 도입 이슈 [#62207](https://github.com/microsoft/TypeScript/issues/62207)을 보면 이유가 명확하다. baseUrl은 두 가지 일을 한다.

> "Today, `baseUrl` performs two functions:
> - it acts as a prefix for all entries in `paths`
> - it acts as a potential resolution point for all bare paths
>
> But almost nobody realizes that last part." — [issue #62207](https://github.com/microsoft/TypeScript/issues/62207)

문제는 두 번째다. baseUrl이 모든 bare specifier의 암묵적 해석 지점이 되면서, **번들러/런타임에선 절대 동작하지 않을 import를 타입체커만 "괜찮다"고 통과**시킨다.

> "...it often meant that many import paths that would never have worked at runtime are considered \"just fine\" by TypeScript." — 릴리스 노트

즉 첫 번째 일(paths 접두사)은 4.1 이후 `paths`가 직접 대체할 수 있으니, 위험한 두 번째 일을 없애기 위해 baseUrl 자체를 걷어내는 것이다. 7.0에서는 아예 제거된다.

> "In TypeScript 7.0, we are not reimplementing `baseUrl`. ... In TypeScript 6.0, we will be deprecating this behavior. Using `baseUrl` will lead to an error which can only be resolved by applying one of the above fixes, or using `--ignoreDeprecations`." — [issue #62207](https://github.com/microsoft/TypeScript/issues/62207)

### 구현 레벨: TS5101은 baseUrl 전용이 아니다

여기서 PR [#62509 "Deprecate baseUrl"](https://github.com/microsoft/TypeScript/pull/62509)의 실제 diff를 보면 재미있는 사실이 드러난다. baseUrl을 위한 **새 에러 코드는 만들어지지 않았다.** 기존 범용 deprecation 진단(우리가 보는 `TS5101`)을 재사용하고, 거기에 마이그레이션 안내용 신규 메시지(코드 `5111`)만 체이닝한다.

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

`checkDeprecations("6.0", "7.0", ...)` — 6.0에서 deprecate, 7.0에서 제거라는 의미가 함수 인자에 그대로 박혀 있다. 그래서 우리가 보는 에러는 이렇게 생겼다.

```text
error TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0.
  Specify compilerOption '"ignoreDeprecations": "6.0"' to silence this error.
  Visit https://aka.ms/ts6 for migration information.
```

`TS5101`은 "Option '{0}' is deprecated..."라는 **범용 메시지**의 코드고, `{0}`에 `baseUrl`이, 안내 링크(`Visit https://aka.ms/ts6 ...`)에 신규 코드 `5111`이 related로 붙은 것이다. 그러니 `ignoreDeprecations: "6.0"`으로 한시적으로 끌 수는 있지만, 그건 그저 문제를 7.0으로 미루는 일이다.

참고로 에러가 가리키는 <code>https://aka.ms/ts6</code>은 마이그레이션 가이드 이슈(<a href="https://github.com/microsoft/TypeScript/issues/62508">#62508</a>)로 리다이렉트되는데, 이 글을 쓰는 시점엔 본문이 아직 <code>Placeholder</code>만 들어 있는 빈 페이지다. 에러는 친절하게 안내하지만 정작 안내처는 공사 중인 셈.

---

## 2. types 기본값이 []가 된 이유 (그리고 왜 우리 빌드는 멀쩡했나)

### 의심: 타입이 다 빠졌어야 하는 거 아닌가?

작업 중간에 의문이 들었다. "TS6에선 `types: []`가 기본이라던데, 그럼 전역 타입이 다 빠졌을 텐데 왜 빌드가 다 되지?" 이건 에러가 아니라 **에러가 안 난 게 더 수상한** 경우였다.

### 무엇이, 왜 바뀌었나

[릴리스 노트](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)와 제안 이슈 [#62195](https://github.com/microsoft/TypeScript/issues/62195)이 명확하다. 기존 `types`의 기본값은 사실상 "`node_modules/@types`를 전부 열거"였다.

> "for convenience, TypeScript would also include all packages in `node_modules/@types` by default... This can be _very_ expensive, as a normal repository setup these days might transitively pull in hundreds of `@types` packages, especially in multi-project workspaces with flattened `node_modules`." — 릴리스 노트

flattened `node_modules`를 쓰는 모노레포에서는 이게 특히 치명적이다. 수백 개의 불필요한 `.d.ts`가 전이적으로 프로그램에 끌려와 파싱/체크 비용을 잡아먹는다. 그래서 기본값을 `[]`로 바꿨고, 효과는 수치로 제시돼 있다.

> "Many projects we've looked at have improved their build time anywhere from 20-50% just by setting `types` appropriately." — 릴리스 노트 ([원 출처는 #54500](https://github.com/microsoft/TypeScript/issues/54500))

### 구현 레벨: "기본값 = []" 대입문은 없다

PR [#63054 "Set default `types` array to `[]`; support `\"*\"` wildcard"](https://github.com/microsoft/TypeScript/pull/63054)을 까보면, 흥미롭게도 `options.types = []` 같은 **명시적 기본값 대입은 어디에도 없다.** 자동 열거를 담당하던 `getAutomaticTypeDirectiveNames`의 early-return 조건이 뒤집힌 게 전부다.

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

핵심은 `if (options.types)` → `if (!usesWildcardTypes(options))`로 바뀐 한 줄이다. 예전엔 "`types`를 명시 안 하면(undefined) typeRoots를 뒤져 모든 `@types`를 자동 포함"했는데, 이제는 **`types` 배열에 `"*"`가 있을 때만** 열거하고, 그 외에는 `options.types ?? []`를 그대로 돌려준다. `[]` 기본값은 별도 코드가 아니라 이 early-return의 자연스러운 결과다.

판정 헬퍼도 새로 추가됐다.

```diff
// src/compiler/utilities.ts
+export function usesWildcardTypes(options: CompilerOptions): options is CompilerOptions & { types: string[] } {
+    return some(options.types, t => t === "*");
+}
```

옛 동작(모든 `@types` 자동 포함)으로 되돌리고 싶으면 `"types": ["*"]`를 쓰면 된다. 위 diff에서 `options.types.map(t => t === "*" ? wildcardMatches : t)` — `"*"`가 있던 **위치에** 열거 결과를 펼쳐 넣어 순서까지 보존한다.

### 핵심: types가 통제하는 범위는 좁다

가장 중요한 포인트. 이 변경은 **`node_modules/@types` 읽기를 중단하는 게 아니다.** import해서 쓰는 타입은 전혀 영향이 없고, 오직 **import 없이 전역(ambient)으로 들어오던 `@types`**만 영향을 받는다.

> "...this does not mean we will stop reading from `node_modules/@types`, just that the files won't be brought in unless imported, explicitly listed in your `tsconfig.json`'s `types` array... Typically this will only affect users relying on global values and module names, like those brought in from `@types/node` (e.g. the `"fs"` module is globally defined), or a testing framework." — [issue #62195](https://github.com/microsoft/TypeScript/issues/62195)

```ts
import { foo } from 'some-pkg';   // ← types 설정과 무관하게 타입 붙음
process.env.NODE_ENV;             // ← @types/node 전역. types에 'node' 없으면 에러
```

### 왜 우리 레포는 멀쩡히 빌드됐나

답은 싱겁게도 "이미 잘 명시돼 있어서"였다. 전역(ambient)이 필요한 패키지는 전부 `types`를 명시하고 있었다.

| 패키지                     | `types`                      | TS6 영향                        |
|:------------------------|:-----------------------------|:------------------------------|
| next.js                 | `["node", "vitest/globals"]` | 없음 (명시)                       |
| socket-server / bundler | `["node"]`                   | 없음 (명시)                       |
| react / typescript      | `["vitest/globals"]`         | 없음 (명시)                       |
| ui / 공유 base config     | 미지정                          | 이제 `[]` (그러나 ambient 전역을 안 씀) |

`types`를 명시 안 한 곳(ui, 공유 base)은 애초에 ambient 전역에 의존하지 않거나, Next.js처럼 `next-env.d.ts`의 `/// <reference>`로 충당돼서 통과했다. 즉 "에러가 안 난 것"은 운이 아니라, **TS6가 강제하기 전부터 옳게 적혀 있었던** 덕이다.

<code>ignoreDeprecations</code>는 <code>baseUrl</code> 같은 <strong>deprecated 옵션</strong>용이지, <code>types</code> 기본값 변경을 되돌리는 옵션이 아니다. 옛 동작이 필요하면 <code>"types": ["*"]</code>를 쓰면 된다 — 이건 glob이 아니라 "전부 열거"를 뜻하는 special token이다.

---

## 3. rootDir를 명시하라 (TS5011)

### 마주침: 빌드의 dts emit 단계

`@package/sample-lib`의 빌드는 `minibundler && tsc --emitDeclarationOnly` 두 단계다. 앞 단계(번들)는 통과했는데 `tsc`가 깨졌다.

```text
tsconfig.json:10:5 - error TS5011: The common source directory of 'tsconfig.json'
  is './src'. The 'rootDir' setting must be explicitly set to this or another path
  to adjust your output's file layout.
  Visit https://aka.ms/ts6 for migration information.
```

해결은 한 줄.

```jsonc
// packages/@package/sample-lib/tsconfig.json
{
  "compilerOptions": {
    "emitDeclarationOnly": true,
    "outDir": "./dist",
    "rootDir": "./src",   // ← 추가
    "allowJs": true
  }
}
```

### 왜 추론하던 걸 이제 명시하라고 하나

[릴리스 노트](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)와 이슈 [#62194](https://github.com/microsoft/TypeScript/issues/62194)의 논거는 두 가지다.

> "Previously, if you did not specify a `rootDir`, it was inferred based on the common directory of all non-declaration input files. But this often meant that it was impossible to know if a file belonged to a project without trying to load and parse that project. It also meant that TypeScript had to spend more time inferring that common source directory by analyzing every file path in the program." — 릴리스 노트

요점은 **결정성(determinism)**이다. 추론된 rootDir는 입력 파일 집합에 따라 움직인다 — 파일 하나를 추가/제거하면 공통 디렉터리가 이동하고, 그러면 `outDir` 안의 출력 경로 레이아웃이 통째로 달라진다. 게다가 "이 파일이 어느 프로젝트 소속인가"를 알려면 프로젝트를 로드·파싱해봐야만 했다(언어 서비스 성능에도 불리). 그래서 6.0은 기본 rootDir를 **tsconfig.json이 있는 디렉터리로 고정**한다.

### 구현 레벨: 한 줄짜리 조건 완화 + 신·구 비교

PR [#62418 "Assume rootDir is the current configuration directory"](https://github.com/microsoft/TypeScript/pull/62418)은 81개 파일을 건드린 큰 PR이지만, 핵심 로직은 **동일한 한 줄이 세 군데에서 완화된 것**이다.

```diff
// src/compiler/emitter.ts — getCommonSourceDirectory()
-    else if (options.composite && options.configFilePath) {
+    else if (options.configFilePath) {
         // Project compilations never infer their root from the input source paths
         commonSourceDirectory = getDirectoryPath(normalizeSlashes(options.configFilePath));
```

예전엔 `composite` 프로젝트만 "configDir를 공통 소스 디렉터리로" 썼는데, 이제 `configFilePath`만 있으면(=tsconfig 기반 빌드면) 항상 그렇게 한다. 같은 패턴이 `utilities.ts`, `moduleNameResolver.ts`에도 동일하게 적용됐다.

그럼 TS5011은 언제 던지나? `program.ts`에 새로 추가된 블록이 **옛 방식과 새 방식의 공통 디렉터리를 비교**해서, 출력 레이아웃이 달라질 때만 에러를 낸다(아래는 핵심만 발췌·정리).

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

여기서 에러 메시지의 친절함이 설명된다. 메시지의 `'{1}'`(=`'./src'`)은 바로 `dir59` — **옛 방식으로 계산한 공통 디렉터리**다. 우리 sample-lib는 소스가 `./src`에 있어 옛 추론값이 `./src`였는데, 새 기본값은 tsconfig 위치(`.`)라 둘이 어긋난다. 그래서 6.0은 "전엔 `./src`로 잡혔으니, 그 값을 `rootDir`에 명시하라"고 **정답을 알려주며** 멈춘 것이다. `rootDir: "./src"`는 그 안내를 그대로 따른 것뿐이다.

---

## 4. 1차 검증: 여기까지 check-types는 통과

세 가지 규칙을 다 맞추고 나니 타입 체크는 깨끗했다.

- `pnpm check-types` → **5/5 통과**

자, TypeScript 자체가 바꾼 규칙들은 다 막아냈다. 그런데 전체 빌드(`pnpm build`)를 돌리자, **정작 내가 손대지도 않은 곳**에서 다시 터졌다. 그것도 방금 작별했다고 생각한 그 이름, `baseUrl`로.

---

## 5. 🎁 보너스: 빌드에서 튀어나온 진짜 빌런 — tsup

### 안 쓴 baseUrl이 왜 또?

`pnpm build`가 디자인 시스템 패키지의 dts 빌드에 다다른 순간이었다.

```text
@design-system/ui build: DTS Build start
@design-system/ui build: error TS5101: Option 'baseUrl' is deprecated and will
  stop functioning in TypeScript 7.0. Specify compilerOption '"ignoreDeprecations":
  "6.0"' to silence this error.
@design-system/ui build: DTS Build error
```

또 `TS5101`. 그런데 `@design-system/ui/tsconfig.json`에는 `baseUrl`이 **없다.** #1에서 정리했듯 TS5101은 범용 deprecation 진단이니, 누군가가 내 빌드에 baseUrl을 **주입**하고 있다는 뜻이다.

### 진단: 범인은 tsup

범인은 dts 번들러로 쓰던 **tsup**이었다. tsup의 소스 [`src/rollup.ts`](https://github.com/egoist/tsup/blob/main/src/rollup.ts)를 직접 까보면:

```ts
// tsup/src/rollup.ts — dts 빌드 컴파일러 옵션 구성부
compilerOptions: {
  ...compilerOptions,
  baseUrl: compilerOptions.baseUrl || '.',   // ← 내 tsconfig에 없어도 '.'를 강제 주입
  declaration: true,
  // ...
}
```

즉 내 tsconfig에 `baseUrl`이 없어도 tsup이 `'.'`로 채워 넣는다. TS 5.x에선 무해했지만, TS6에선 이 주입된 한 줄이 곧장 `TS5101` 하드 에러가 된다. 똑같은 증상이 tsup 이슈 트래커에도 올라와 있다([#1388 "DTS Build error TS5101"](https://github.com/egoist/tsup/issues/1388), 재현 환경 tsup 8.5.1 + TypeScript 6.0.2).

### 그런데 tsup이… 유지보수 중단?

"최신 tsup으로 올리면 고쳐졌으려나" 하고 저장소에 갔다가, README 최상단에서 답을 봤다.

> "This project is not actively maintained anymore. Please consider using tsdown instead." — [egoist/tsup README](https://github.com/egoist/tsup/blob/main/README.md)

저자(egoist) 본인이 박아둔 문구였다. 실제로 "TypeScript 6 지원" 요청 이슈([#1389](https://github.com/egoist/tsup/issues/1389))는 여전히 열려 있고, 마지막 릴리스 `8.5.1`은 2025-11-12로 한참 전이다. 흥미로운 건 **npm에는 아직 `deprecate` 플래그가 안 걸려 있어서**(그걸 요청하는 이슈가 [#1391](https://github.com/egoist/tsup/issues/1391)) — `pnpm install` 단계에선 아무 경고도 못 보고, 빌드가 깨지고 나서야 README를 보고 알게 됐다는 점이다.

선택지는 둘이었다. (a) `ignoreDeprecations: "6.0"`으로 경고를 한시적으로 끄거나, (b) 권고대로 도구를 갈아치우거나. baseUrl 주입은 내 코드가 아니라 도구의 문제고, 그 도구가 더는 고쳐지지 않는다면 답은 정해져 있었다.

### tsdown으로

[tsdown](https://tsdown.dev)은 [Rolldown](https://rolldown.rs)(Rust 기반 번들러) 위에서 도는 tsup의 후속 격 도구다. 공식 문서가 관계를 이렇게 정리한다.

> "tsdown is the spiritual successor to tsup, powered by Rolldown instead of esbuild." — [tsdown FAQ](https://tsdown.dev/guide/faq)

결정적으로, dts를 [`rolldown-plugin-dts`](https://github.com/sxzz/rolldown-plugin-dts)로 생성하기 때문에 **tsup처럼 baseUrl을 주입하지 않는다.** 그리고 peer dependency로 `typescript: "^5.0.0 || ^6.0.0"`을 선언해 **TS6를 공식 지원**한다(tsup은 아직 open 이슈). tsup을 쓰던 패키지는 둘(`@design-system/ui`, `@package/bundler`)뿐이라 둘 다 전환했다. 공식 마이그레이션 도구도 있다.

```bash
npx tsdown-migrate            # 단일 디렉터리
npx tsdown-migrate packages/* # 모노레포 glob
npx tsdown-migrate --dry-run  # 변경 미리보기 (-d)
```

config는 `import`만 바꾸면 거의 그대로다.

```ts
// packages/@package/bundler/tsdown.config.ts
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm', 'cjs'],
  platform: 'node',   // tsup의 target: 'node' 대응
  dts: true,
  clean: true,
  sourcemap: true,
});
```

전환 직후, `TS5101`은 **사라졌다.** 근본 원인(baseUrl 주입)이 없어졌기 때문이다.

### 함정: 출력 확장자가 다르다

다만 공짜는 아니었다. tsdown은 `platform: 'node'`에서 기본적으로 **`.mjs` / `.cjs` / `.d.mts` / `.d.cts`** 확장자로 출력한다(`fixedExtension`). tsup의 `.js` / `.d.ts`와 달라서, `package.json`의 `exports`·`bin`·`main`·`types`가 존재하지 않는 파일을 가리키게 됐다. 실제 산출물에 맞춰 전부 정정해야 했다.

```jsonc
// @package/bundler/package.json — 실제 산출물에 맞게 수정
{
  "exports": {
    ".": {
      "import":  { "types": "./dist/index.d.mts", "default": "./dist/index.mjs" },
      "require": { "types": "./dist/index.d.cts", "default": "./dist/index.cjs" }
    }
  },
  "bin": { "minibundler": "./dist/cli.mjs" }   // ← cli.js 가 아니라 cli.mjs
}
```

`@design-system/ui`도 마찬가지로 `main`/`types`를 `./dist/index.mjs`·`./dist/index.d.mts`로 맞췄다(이 정정은 별도 커밋으로 떨어졌다 — 산출물 확장자가 바뀌면 이런 메타데이터가 줄줄이 따라온다는 걸 잊지 말 것).

- `pnpm build` (전체) → **9/9 통과** (blog 정적 빌드 포함)

---

## 6. 정리: TypeScript 6 마이그레이션 체크리스트

이번 삽질을 한 줄짜리 체크리스트로 압축하면:

1. **`baseUrl`을 쓰는가?** → 직접 쓰면 제거(`paths`는 4.1부터 baseUrl 불필요). 빌드 도구가 주입한다면 도구를 점검하라. `TS5101`은 baseUrl 전용이 아니라 **범용 deprecated-option 진단**임을 기억할 것.
2. **`@types/node` 같은 전역에 의존하는가?** → `types: ["node", ...]`로 명시. TS6 기본은 `[]`이고, 이는 **ambient 전역에만** 영향을 준다(import 타입은 무관). 옛 동작은 `["*"]`.
3. **`emitDeclarationOnly`/`outDir`로 emit하는데 소스가 tsconfig보다 깊은가?** → `rootDir`을 명시. 에러 메시지의 `'{1}'`이 곧 넣어야 할 값이다.
4. **dts 번들러가 tsup인가?** → tsup은 유지보수가 멈췄고 dts에 baseUrl을 주입한다. tsdown으로 전환하고(`npx tsdown-migrate`), 출력 확장자(`.mjs`/`.d.mts`)에 맞춰 `exports`/`bin`/`main`/`types`를 점검하라.

곁가지 — 작업 중 <code>node_modules</code>와 빌드 산출물을 수없이 지웠던 터라, 외부 의존성 없이 macOS <code>find</code>로 도는 clean 스크립트를 루트에 넣어뒀다. 핵심은 <code>-name node_modules -prune</code>으로 <strong>node_modules 내부를 가지치기</strong>하는 것 — 안 그러면 의존성 안의 수많은 <code>dist</code>까지 매칭돼 느리고 위험하다.

```jsonc
"clean:dist":    "find . -name node_modules -prune -o -type d '(' -name dist -o -name .next -o -name out -o -name .turbo ')' -prune -exec rm -rf {} +",
"clean:modules": "find . -name node_modules -type d -prune -exec rm -rf {} +"
```

> 메이저 업그레이드는 버전 숫자 하나 바꾸는 일처럼 보여도, 그 숫자가 건드리는 **기본값과 빌드 파이프라인의 가정들**을 전부 다시 확인하게 만든다. 이번엔 그 가정이 `baseUrl`, `types`, `rootDir` 세 군데에 숨어 있었고, 마지막 하나는 TypeScript가 아니라 **유지보수가 멈춘 내 빌드 도구** 안에 있었다.

---

## 참고 링크

- TypeScript 6.0 릴리스 노트 — <https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html>
- baseUrl deprecation: [issue #62207](https://github.com/microsoft/TypeScript/issues/62207) · [PR #62509](https://github.com/microsoft/TypeScript/pull/62509)
- types 기본값 `[]`: [issue #62195](https://github.com/microsoft/TypeScript/issues/62195) · [PR #63054](https://github.com/microsoft/TypeScript/pull/63054) · [원 rationale #54500](https://github.com/microsoft/TypeScript/issues/54500)
- rootDir 기본값: [issue #62194](https://github.com/microsoft/TypeScript/issues/62194) · [PR #62418](https://github.com/microsoft/TypeScript/pull/62418)
- tsup: [README](https://github.com/egoist/tsup/blob/main/README.md) · [TS5101 이슈 #1388](https://github.com/egoist/tsup/issues/1388) · [TS6 지원 #1389](https://github.com/egoist/tsup/issues/1389)
- tsdown: [공식 문서](https://tsdown.dev) · [tsup → tsdown 마이그레이션](https://tsdown.dev/guide/migrate-from-tsup) · [rolldown-plugin-dts](https://github.com/sxzz/rolldown-plugin-dts)
