---
title: 'Step 1: 번들러의 시작, 개념 잡기 (ESM & Magic String)'
date: null
tags: ['bundler', 'javascript', 'study']
---

# Step 1: 번들러의 시작, 개념 잡기

번들러 구현에 앞서 가장 기초가 되는 두 가지 개념, **모듈 시스템(ESM vs CJS)**과 **문자열 조작(Magic String)**을 정리한다.

## 1. ESM vs CJS: "번들러는 통역사"

번들러의 주 임무는 서로 다른 모듈 시스템을 사용하는 파일들을 해석하고 묶어주는 것이다.

| 구분 | CJS (CommonJS) | ESM (ECMAScript Modules) |
| :--- | :--- | :--- |
| **키워드** | `require`, `module.exports` | `import`, `export` |
| **동작 방식** | **동기적(Synchronous)**. 런타임에 모듈을 불러온다. | **정적(Static)**. 코드를 실행하기 전에 구조를 파악한다. |
| **번들러 관점** | 실행해봐야 알 수 있어 **Tree Shaking**이 어렵다. | 코드 구조만 보고도 사용 여부를 알 수 있어 **최적화에 유리**하다. |

> **우리의 전략**: 최신 표준인 **ESM**을 기준으로 구현한다. `package.json`에 `"type": "module"`을 선언하여 Node.js 환경에서도 ESM을 기본으로 사용한다.

## 2. Magic String: "수술 자국을 기억하는 메스"

단순히 파일 내용을 `string + string`으로 합치는 것으로는 부족하다. 추후 **소스맵(SourceMap)** 구현을 위해 "코드의 어느 부분이 원본의 어디에서 왔는지"를 추적해야 한다.

### 일반 문자열 조작 vs Magic String

*   **일반 문자열**: 변환 후 원본 위치 정보(Line, Column) 소실. 디버깅 불가.
*   **Magic String**: 코드를 자르고 붙여도 **Sourcemap**을 생성할 수 있는 메타 데이터를 유지한다.

> **Rollup**, **Vite** 등 모던 번들러들도 내부적으로 `magic-string` 같은 라이브러리를 사용하여 문자열을 조작한다. 우리는 Step 1부터 이를 도입해 "원본 위치를 기억하며 코드를 바꾸는" 구조를 잡는다.
