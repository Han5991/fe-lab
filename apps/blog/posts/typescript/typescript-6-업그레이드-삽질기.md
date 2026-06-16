---
title: 'TypeScript 6로 올리면서 겪은 모든 것: catalog 통합부터 tsup→tsdown까지'
date: '2026-06-16'
status: 'draft'
slug: 'typescript-6-migration-troubleshooting'
excerpt: 'monorepo의 TypeScript를 5.8.3에서 6.0.3으로 올리는 과정에서 만난 pnpm catalog 통합, asdf 환경 문제, 그리고 TS6의 breaking change(baseUrl deprecation·types 기본값 변경·rootDir 요구) 3종 세트와 tsup→tsdown 전환까지 — 실제 에러 로그와 함께 정리한 트러블슈팅 기록.'
tags: ['TypeScript', 'pnpm', 'tsdown', 'monorepo', 'troubleshooting']
---

<callout type="warning">
이 글은 작업 중 남긴 <strong>임시(draft) 기록</strong>입니다. 다듬어서 정식 발행 예정이며, 일부 내용은 환경(2026-06 기준 TS 6.0.3 / pnpm 11.6.0 / tsdown 0.22.2)에 따라 달라질 수 있습니다.
</callout>

## 0. TL;DR

> "catalog에 박힌 TypeScript 5.8.3을 6 최신으로 올려줘" — 한 줄로 시작했지만, TypeScript 6는 메이저 버전답게 곳곳에서 빌드를 무너뜨렸다.

이 글은 Turborepo + pnpm 워크스페이스 모노레포에서 TypeScript `5.8.3 → 6.0.3` 업그레이드를 하면서 만난 문제들을 시간 순서대로 정리한 기록이다. 핵심만 먼저 표로 정리하면 다음과 같다.

| 단계 | 문제 | 원인 | 해결 |
| :--- | :--- | :--- | :--- |
| 환경 | `No version is set for command pnpm` | asdf-pnpm 플러그인이 pnpm 11 설치 불가 | 런처(10.33.0) + `packageManager` self-switch |
| TS6 #1 | `error TS5101: 'baseUrl' is deprecated` | tsup이 dts 빌드에 `baseUrl`을 주입 | **tsup → tsdown 전환** |
| TS6 #2 | 빌드는 되는데 타입이 빠진 것 같다? | `types` 기본값이 `[]`로 바뀜 | 필요한 곳은 이미 명시돼 있었음 |
| TS6 #3 | `error TS5011: 'rootDir' must be set` | TS6가 `emitDeclarationOnly`에서 `rootDir` 요구 | `"rootDir": "./src"` 추가 |
| 마무리 | 매번 손으로 지우기 귀찮음 | clean 스크립트 부재 | `clean` / `clean:dist` / `clean:modules` 추가 |

---

## 1. 시작: named catalog를 기본 catalog로 통합

pnpm의 **catalog**는 모노레포 전체에서 의존성 버전을 한곳에서 관리하는 기능이다. `pnpm-workspace.yaml`에 두 종류가 있다.

- **기본(default) catalog**: `catalog:` 키 아래. 패키지에서 `"react": "catalog:"`로 참조.
- **named catalog**: `catalogs:`(복수형) 키 아래에 이름을 붙여 정의. 패키지에서 `"react": "catalog:react19"`처럼 참조.

기존에는 TypeScript가 `typescript5`라는 named catalog로 묶여 있었다.

```yaml
# pnpm-workspace.yaml (변경 전)
catalog:
  '@pandacss/dev': 1.11.1
  'next': 16.2.6

catalogs:
  react19:
    react: ^19.3.0-canary-...
  typescript5:
    typescript: 5.8.3   # ← 이걸 6으로 올리고 기본 catalog로 승격
```

목표는 "`typescript5`를 없애고, 기본 `catalog:`에 `typescript: 6.0.3`을 두는 것". 즉 named catalog를 버전 올리면서 기본 catalog로 통합하는 작업이다.

```yaml
# pnpm-workspace.yaml (변경 후)
catalog:
  '@pandacss/dev': 1.11.1
  'next': 16.2.6
  typescript: 6.0.3   # ← 기본 catalog로 승격

catalogs:
  react19:
    react: ^19.3.0-canary-...
  # typescript5 제거
```

그리고 이를 참조하던 패키지들의 `package.json`을 `catalog:typescript5` → `catalog:`(기본 catalog 참조)로 바꿨다. 하드코딩된 `5.8.3` 한 곳까지 포함해 총 7곳.

```jsonc
// 변경 전 → 변경 후
"typescript": "catalog:typescript5"  →  "typescript": "catalog:"
"typescript": "5.8.3"                →  "typescript": "catalog:"
```

<callout type="tip">
기본 catalog는 <code>catalog:</code> (이름 없이), named catalog는 <code>catalog:&lt;이름&gt;</code>으로 참조한다. <code>catalog:default</code>라고 명시할 수도 있다.
</callout>

여기까지는 평화로웠다. 문제는 `pnpm install`을 돌리는 순간부터 시작됐다.

---

## 2. 첫 번째 벽: pnpm을 asdf가 못 찾는다

```bash
$ pnpm install
No version is set for command pnpm
Consider adding one of the following versions in your config file ...
  pnpm 10.33.0
  pnpm 10.28.0
  ...
```

`.tool-versions`에는 `pnpm 11.6.0`이 적혀 있는데, asdf가 그 버전을 못 찾는다. 설치된 목록을 보면 10.x까지만 있다.

### 왜 asdf엔 pnpm 11이 없을까

이게 핵심인데, **asdf-pnpm 플러그인이 pnpm 11을 설치할 수 없다.** 직접 확인한 원인:

- pnpm 11부터 GitHub 릴리스 자산 형식이 바뀌었다. 예전엔 `pnpm-macos-arm64`(단일 실행 바이너리)였는데, 지금은 `pnpm-darwin-arm64.tar.gz`(tarball)다.
- 그런데 `technikhil314/asdf-pnpm` 플러그인은 여전히 옛 이름(`pnpm-macos-arm64`)으로 다운로드를 시도한다. → **404 → 설치 실패.**

실제 릴리스 API로 확인한 자산 목록:

```bash
$ curl -s https://api.github.com/repos/pnpm/pnpm/releases/tags/v11.6.0 | grep '"name"'
"name": "pnpm-darwin-arm64.tar.gz"   # ← tarball (신규)
"name": "pnpm-linux-arm64.tar.gz"
...
# pnpm-macos-arm64 (구) 는 더 이상 없음
```

### 그럼 어떻게 동작하는가 — 런처 + self-management

이 레포가 설계된 정상 동작 방식은 이렇다.

1. `.tool-versions`에 **pnpm 10.33.0**을 둬서 asdf가 이걸 **런처**로 실행한다.
2. 루트 `package.json`의 `"packageManager": "pnpm@11.6.0"` 필드를 읽고, pnpm의 self-management가 11.6.0을 **자동 다운로드·실행**한다.

```jsonc
// package.json
{ "packageManager": "pnpm@11.6.0" }   // ← 런처가 이걸 보고 11.6.0으로 self-switch
```

<callout type="info">
10.10.0 런처는 v11의 도구 패키지 구조를 몰라 self-switch에 실패한다. <strong>10.33.0 이상</strong>의 런처가 필요하다.
</callout>

작업 중엔 `.tool-versions`가 `pnpm 11.6.0`으로 바뀌어 있어 런처를 못 찾는 상태였다. 그래서 install 한정으로 런처 버전을 환경변수로 강제 지정해 우회했다.

```bash
ASDF_PNPM_VERSION=10.33.0 pnpm install
# → 런처 10.33.0이 packageManager를 읽고 11.6.0으로 self-switch → 정상 동작
```

<callout type="warning">
나중에 pnpm 11.6.0을 asdf에 직접 설치하자, 이 <code>ASDF_PNPM_VERSION=10.33.0</code> 오버라이드가 오히려 (이젠 없는) 10.33.0을 찾게 만들어 실패했다. 환경이 바뀌면 우회책도 같이 걷어내야 한다.
</callout>

### 보너스: pnpm 11의 no-op install은 prepare를 건너뛴다

작업 내내 발목을 잡은 또 하나의 특성. pnpm 10은 install이 "Already up to date"인 no-op이어도 워크스페이스 패키지의 `prepare`를 매번 실행했다. 하지만 **pnpm 11은 no-op install이면 `prepare`를 건너뛴다.** 그래서 `package.json`의 `bin` 같은 필드만 바꾸고 install을 다시 돌려도 빌드/재링크가 안 일어나는 함정이 있었다(뒤의 minibundler 사건 참고).

---

## 3. TS6 Breaking Change #1: `baseUrl` deprecation (TS5101)

install이 의존성 해석을 마치고 `prepare` 훅(빌드)을 돌리는 순간, 디자인 시스템 패키지 빌드가 터졌다.

```text
@design-system/ui prepare: DTS Build start
@design-system/ui prepare: error TS5101: Option 'baseUrl' is deprecated and will
  stop functioning in TypeScript 7.0. Specify compilerOption '"ignoreDeprecations":
  "6.0"' to silence this error.
  Visit https://aka.ms/ts6 for migration information.
@design-system/ui prepare: DTS Build error
```

TypeScript 6는 `baseUrl`을 deprecated로 보고 **하드 에러**로 막는다(TS7에서 제거 예정). 그런데 이상한 점: `@design-system/ui/tsconfig.json`에는 `baseUrl`이 **없다.**

### 진단: 누가 baseUrl을 주입하는가

범인은 **tsup**이었다. 설치된 tsup 8.4.0의 dts 빌더 소스를 직접 까보니:

```js
// node_modules/.pnpm/tsup@8.4.0_...typescript@6.0.3/node_modules/tsup/dist/rollup.js:6794
            baseUrl: compilerOptions.baseUrl || ".",
```

즉 내 tsconfig에 `baseUrl`이 없어도 **tsup이 `"."`로 채워 넣는다.** TS 5.x에선 무해했지만 TS6에선 이게 곧장 TS5101 하드 에러가 된다.

### "baseUrl 제거" 전략이 통하는 곳과 안 통하는 곳

핵심 구분이다.

- **진짜 tsconfig에 `baseUrl`이 있는 경우** (예: React 앱) → 그냥 지우면 된다. `moduleResolution: "bundler"`에서는 `paths`가 `baseUrl` 없이도 동작한다.

```jsonc
// apps/react/tsconfig.app.json
{
  "compilerOptions": {
    // "baseUrl": ".",   ← 삭제
    "paths": { "@/*": ["./src/*"] }   // baseUrl 없이도 OK
  }
}
```

- **tsup이 주입하는 경우** (라이브러리 패키지) → 내 tsconfig에서 지울 게 없다. 선택지는 (a) `"ignoreDeprecations": "6.0"`로 경고를 끄거나, (b) 빌드 도구 자체를 바꾸는 것.

### tsup 업그레이드로는 안 된다

혹시나 해서 최신 tsup(8.5.1)의 changelog를 확인했지만, TS6·`baseUrl`·`ignoreDeprecations` 관련 수정이 **전혀 없었다.** 주입 코드가 그대로라 올려도 동일하게 깨진다.

→ 그래서 빌드 도구를 **tsdown**으로 바꾸기로 했다.

---

## 4. 해결: tsup → tsdown 전환

[tsdown](https://tsdown.dev)은 Rolldown(Rust 기반 번들러) 위에서 동작하는 tsup의 후속 격 도구다. dts를 `rolldown-plugin-dts`로 생성하는데, **tsup처럼 `baseUrl`을 주입하지 않는다.** peer로 `typescript ^5.0.0 || ^6.0.0`을 선언해 TS6도 공식 지원한다.

tsup을 쓰는 패키지는 두 곳(`@design-system/ui`, `@package/bundler`)뿐이라 둘 다 전환했다.

### 4-1. config는 거의 그대로

```ts
// tsdown.config.ts — import만 바꾸면 거의 동일
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

`package.json`의 의존성·스크립트도 `tsup` → `tsdown`으로 교체하고, 옛 `tsup.config.ts`는 삭제했다.

전환 직후, TS5101 에러는 **사라졌다.** 근본 원인(baseUrl 주입)이 없어졌기 때문이다.

### 4-2. 함정 ①: 출력 확장자가 다르다

tsdown은 기본적으로 `.mjs` / `.cjs` / `.d.mts` / `.d.cts` 확장자로 출력한다. tsup의 `.js` / `.cjs` / `.d.ts`와 다르다. 그래서 `package.json`의 `exports`·`bin`이 존재하지 않는 파일을 가리키게 됐다.

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

### 4-3. 함정 ②: dts에 의존성이 통째로 인라인됐다 (1.05MB!)

ui 빌드 로그에 경고가 떴다.

```text
Detected dependencies in bundle:
- @pandacss/dev, @pandacss/types, ts-morph, ts-evaluator, @pandacss/extractor ...
ℹ dist/index-*.d.mts  1.05 MB    ← 타입 파일이 1MB!
```

원인: **tsdown은 `dependencies`/`peerDependencies`만 external로 두고, 그 외(= `devDependencies` 포함)는 번들에 인라인한다.** `@pandacss/dev`는 ui에서 devDependency라, panda와 그 전이 의존성(ts-morph 등)의 타입 전문이 `.d.mts`에 복사돼 1.05MB가 됐다. (tsup은 dts 단계에서 node_modules를 external로 두는 게 기본이라 예전엔 4KB였다.)

해결은 panda 스코프를 "절대 번들하지 말 것"으로 지정:

```ts
// tsdown.config.ts
export default defineConfig({
  // ...
  deps: {
    neverBundle: [/^@pandacss\//],   // 옛 external 옵션의 후속 (external은 deprecated)
  },
});
```

결과: `index.d.mts`가 **1.05MB → 3.82KB**로 돌아왔다(tsup 시절 4KB와 동일).

<callout type="info">
더 정석적인 대안은 <code>@pandacss/dev</code>를 <code>devDependencies</code>에 둔 채 <code>peerDependencies</code>에 <strong>추가</strong>하는 것이다(옮기는 게 아니라 추가). 그러면 tsdown이 자동으로 external 처리해 <code>deps.neverBundle</code> 줄 자체가 필요 없어진다. preset의 의존성 성격상으로도 더 맞다.
</callout>

### 4-4. 함정 ③: pnpm이 bin 심링크를 다시 안 만든다

`@package/bundler`의 CLI 바이너리 `minibundler`를 의존하는 `@package/sample-lib`의 빌드가 깨졌다.

```text
[WARN] Failed to create bin at .../sample-lib/node_modules/.bin/minibundler.
ENOENT: ... @package/bundler/dist/cli.js
```

`bin` 필드를 `cli.mjs`로 바꿨는데도, pnpm이 만들어 둔 shim이 옛 `cli.js`를 가리킨 채였다. 더 황당한 건 `pnpm install`은 물론 `pnpm install --force`도 shim을 다시 안 만들었다(2장의 "no-op이면 prepare/relink 건너뜀" 특성과 맞물림). shim 내부를 보면:

```sh
# .bin/minibundler (stale)
exec node "$basedir/../../../bundler/dist/cli.js" "$@"   # ← 존재하지 않는 cli.js
# cmd-shim-target=.../bundler/dist/cli.js
```

결국 **해당 패키지의 `node_modules`를 통째로 지우고** 재설치해서야 pnpm이 fresh하게 다시 링크했다.

```bash
rm -rf packages/@package/sample-lib/node_modules
pnpm install   # → shim이 cli.mjs를 가리키도록 재생성
```

검증으로 `sample-lib` 빌드를 돌리니 tsdown으로 빌드된 `minibundler`가 정상 동작했다. 그런데 그 다음 단계에서 또 다른 TS6 에러가 기다리고 있었다(#3).

---

## 5. TS6 Breaking Change #2: `types` 기본값이 `[]`로 바뀜

작업 중간에 한 가지 의문이 들었다. "TS6에선 `types: []`가 기본이라던데, 그럼 타입이 다 빠졌을 텐데 왜 빌드가 다 되지?" 이걸 공식 문서로 검증했다.

### 무엇이 바뀌었나

[공식 릴리스 노트](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)와 [이슈 #62195](https://github.com/microsoft/TypeScript/issues/62195)에서 확정:

> "In a sense, the `types` value previously defaulted to 'enumerate everything in `node_modules/@types`'. ... In TypeScript 6.0, the default `types` value will be `[]` (an empty array)."

- **TS 5.x**: `types`를 생략하면 `node_modules/@types`의 **모든** 패키지를 암묵적으로 전역 포함.
- **TS 6.0**: 기본값이 `[]`. 아무것도 자동 포함하지 않음.

이유는 빌드 성능. flattened `node_modules`에서 수백 개 `@types`가 전이적으로 끌려오는 걸 막기 위함이고, 공식 문서는 "build time anywhere from 20-50%" 개선 사례를 언급한다.

### 핵심: `types`가 통제하는 범위는 좁다

이 변경은 **import 없이 전역(ambient)으로 들어오는 `@types`에만** 영향을 준다. `@types/node`의 `process`/`Buffer`, 테스트 러너 전역 `describe`/`it` 같은 것들. **`import`로 가져오는 타입(react 등)은 전혀 영향 없다.**

```ts
import { foo } from 'some-pkg';   // ← types 설정과 무관하게 타입 붙음
process.env.NODE_ENV;             // ← @types/node 전역. types에 'node' 없으면 에러
```

### 왜 우리 레포는 멀쩡히 빌드됐나

운 좋게도(혹은 잘 정돈돼서) 전역이 필요한 패키지는 이미 `types`를 명시하고 있었다.

| 패키지 | `types` | TS6 영향 |
| :--- | :--- | :--- |
| next.js | `["node", "vitest/globals"]` | 없음 (명시) |
| socket-server / bundler | `["node"]` | 없음 (명시) |
| react / typescript | `["vitest/globals"]` | 없음 (명시) |
| ui / 공유 base config | 미지정 | 이제 `[]` (그러나 ambient 전역 안 씀) |

`types`를 명시 안 한 곳(ui 등)은 ambient 전역에 의존하지 않거나, Next.js처럼 `next-env.d.ts`의 `/// <reference>`로 충당돼서 통과했다.

<callout type="tip">
옛 동작(모든 <code>@types</code> 자동 포함)으로 되돌리려면 <code>"types": ["*"]</code>를 쓰면 된다(TS6 신규 와일드카드). 단, <code>ignoreDeprecations</code>는 <code>baseUrl</code> 같은 deprecated 옵션용이지 <code>types</code> 변경을 되돌리는 옵션이 아니다 — 둘은 별개다.
</callout>

---

## 6. TS6 Breaking Change #3: `rootDir` 명시 요구 (TS5011)

`@package/sample-lib`의 빌드(`minibundler && tsc --emitDeclarationOnly`)에서 앞 단계는 통과했는데 `tsc`가 깨졌다.

```text
tsconfig.json:10:5 - error TS5011: The common source directory of 'tsconfig.json'
  is './src'. The 'rootDir' setting must be explicitly set to this or another path
  to adjust your output's file layout.
  Visit https://aka.ms/ts6 for migration information.
```

sample-lib도 TypeScript를 `catalog:`(6.0.3)로 올렸기 때문에 발생한 또 다른 TS6 규칙이다. `emitDeclarationOnly` + `outDir` 조합에서 출력 레이아웃이 모호하면 `rootDir`를 명시하라고 요구한다. 한 줄로 끝.

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

---

## 7. 마무리: 검증과 clean 스크립트

### 검증

- `pnpm check-types` → **5/5 통과**
- `pnpm build` (전체) → **9/9 통과** (blog 정적 빌드 포함)

### clean 스크립트 추가

작업 중 `node_modules`와 빌드 산출물을 수없이 지웠던 터라, 루트에 clean 스크립트 3종을 추가했다(외부 의존성 없이 macOS `find` 기반).

```jsonc
// package.json
{
  "scripts": {
    "clean": "pnpm clean:dist && pnpm clean:modules",
    "clean:dist": "find . -name node_modules -prune -o -type d '(' -name dist -o -name .next -o -name out -o -name .turbo ')' -prune -exec rm -rf {} +",
    "clean:modules": "find . -name node_modules -type d -prune -exec rm -rf {} +"
  }
}
```

- `clean:modules` — 모든 `node_modules` 삭제
- `clean:dist` — `dist`/`.next`/`out`/`.turbo` 삭제 (node_modules 내부는 제외)
- `clean` — 둘을 합친 것

<callout type="warning">
<code>find ... -name node_modules -prune</code>로 node_modules 내부를 가지치기하는 게 핵심이다. 안 그러면 의존성 안의 수많은 <code>dist</code>까지 매칭돼 느려지고 위험하다. <code>clean</code> 또는 <code>clean:modules</code> 실행 뒤엔 <code>pnpm install</code>이 필요하다.
</callout>

---

## 8. 정리: TypeScript 6 마이그레이션 체크리스트

이번 삽질을 한 줄짜리 체크리스트로 압축하면:

1. **`baseUrl`을 쓰는가?** → 직접 쓰면 제거(`moduleResolution: bundler`면 `paths`는 그대로 동작). 빌드 도구(tsup)가 주입하면 도구 교체(tsdown) 또는 `ignoreDeprecations: "6.0"`.
2. **`@types/node` 같은 전역에 의존하는가?** → `types: ["node", ...]`로 명시. TS6 기본은 `[]`다.
3. **`emitDeclarationOnly` + `outDir`을 쓰는가?** → `rootDir`을 명시.
4. **dts 번들러를 바꿨다면** → 출력 확장자(`.mjs`/`.d.mts`)에 맞춰 `exports`/`bin` 점검, devDependency 인라인 여부(`deps.neverBundle`) 확인.
5. **pnpm 11 + asdf 환경** → asdf는 런처(10.33.0)만, `packageManager`로 11.x self-switch. no-op install은 `prepare`/bin relink를 건너뛴다는 점 유의.

> 메이저 업그레이드는 버전 숫자 하나 바꾸는 일처럼 보여도, 그 숫자가 건드리는 기본값과 빌드 파이프라인의 가정들을 전부 다시 확인하게 만든다. 이번엔 그 가정이 `baseUrl`, `types`, `rootDir` 세 군데에 숨어 있었다.
