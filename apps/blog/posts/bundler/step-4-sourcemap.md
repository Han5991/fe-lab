---
title: 'Step 4: 소스맵(SourceMap)과 외부 의존성(Externals)'
date: 2026-01-11
tags:
  [
    'bundler',
    'javascript',
    'sourcemap',
    'externals',
    'magic-string',
    'debugging',
  ]
---

# Step 4: 소스맵(SourceMap)과 외부 의존성(Externals)

번들러가 코드를 성공적으로 합치고 실행까지 시켰다면, 이제는 **사용성(DX, Developer Experience)**과 **효율성**을 챙길 차례입니다. 우리가 만든 번들러를 실제 프로젝트에 쓰려면 넘어야 할 두 가지 큰 산이 있습니다.

1.  **디버깅**: 에러가 났을 때 번들된 파일이 아니라 원본 파일의 위치를 알려줘야 합니다. (**소스맵**)
2.  **의존성 격리**: `react`나 `lodash` 같은 거대 라이브러리까지 내 번들에 포함할 것인가? (**Externals**)

---

## 1. 소스맵(SourceMap): 번들 파일에서 원본의 흔적 찾기

번들러는 수십 개의 파일을 하나로 합칩니다. 이 과정에서 줄 바꿈이 일어나고, 코드가 함수로 감싸지면서 원본 코드의 행(Line)과 열(Column) 정보가 완전히 뒤섞입니다. 소스맵이 없다면 디버깅은 불가능에 가깝습니다.

### 🗺️ 소스맵의 핵심 원리: VLQ와 매핑

소스맵 파일(`.map`)을 열어보면 `mappings: "AAAA,IAAMA..."` 같은 암호문을 볼 수 있습니다. 이것이 바로 원본 위치와 번들 위치를 연결하는 핵심 데이터입니다.

1.  **좌표 변환**: `"번들 파일의 5행 10열은 -> 원본 A.js의 2행 3열이다"`라는 정보를 담습니다.
2.  **VLQ (Variable Length Quantity)**: 파일 크기를 줄이기 위해 숫자를 압축하는 기술입니다.
    - **상대 좌표**: 절대적인 위치(100번째 줄) 대신, 이전 위치로부터의 거리(+1줄)를 저장해 용량을 아낍니다.
    - **가변 길이**: 작은 숫자는 1글자, 큰 숫자는 여러 글자로 표현합니다.

이 복잡한 비트 연산을 직접 구현하는 것은 매우 어렵습니다. 그래서 우리는 도구의 힘을 빌립니다.

### 🛠️ 구현: Magic String의 마법

우리가 Step 1부터 사용해온 `magic-string`은 단순한 문자열 치환 도구가 아닙니다. **"소스맵 생성을 위한 메타데이터 저장소"**입니다.

- **AST**: "어디를 고쳐야 할지" **위치**만 알려줍니다.
- **MagicString**: "어디가 어떻게 바뀌었는지" **이력(History)**을 기록합니다.

```typescript
// Module.ts: 각 파일의 변경 사항 기록
this.magicString.overwrite(start, end, 'require(1)');
// -> "0~10번지 코드가 require로 바뀌었다"는 기록이 남음
```

```typescript
// Graph.ts: 조각난 기록들을 하나로 통합
const bundle = new Bundle({ separator: '\n' });

this.modules.forEach(module => {
  bundle.addSource({
    filename: path.relative(process.cwd(), module.filePath), // ⭐️ 보안 핵심: 상대 경로 사용!
    content: module.magicString // 변경 기록이 담긴 객체를 통째로 전달
  });
});

// 최종적으로 VLQ 인코딩된 .map 파일 생성
const map = bundle.generateMap({ ... });
```

> **🔒 보안 팁: 절대 경로 노출 금지**
>
> 소스맵의 `sources` 배열에 로컬 컴퓨터의 절대 경로(`/Users/han/...`)가 들어가면 보안상 위험할 수 있습니다. 반드시 `path.relative`를 사용하여 프로젝트 루트 기준의 **상대 경로**로 변환해야 합니다.

---

## 2. 외부 의존성(Externals): "남의 집 살림까지 챙기지 마세요"

우리가 라이브러리를 만든다고 가정해 봅시다. 우리 라이브러리가 `react`를 사용한다면, 번들 결과물에 React 전체 코드를 포함해야 할까요?

**정답은 "아니오"입니다.** (Peer Dependencies 개념)

### 🚫 왜 포함하면 안 되나요?

1.  **용량 폭발**: 모든 라이브러리가 React를 내장하면 앱이 엄청나게 커집니다.
2.  **인스턴스 충돌**: React Context나 Hook은 하나의 React 인스턴스에서만 작동합니다.

### 🛠️ 구현: 빌드 타임 vs 런타임

Externals 구현의 핵심은 **"빌드 때는 무시하고, 실행 때는 빌려 쓰는 것"**입니다.

1.  **빌드 타임 (Graph.ts)**:
    - `import React from 'react'`를 만나면 그래프 탐색을 **멈춥니다(Stop)**.
    - 모듈 ID(숫자)를 부여하지 않고, 문자열 `'react'`를 그대로 남겨둡니다.

2.  **변환 결과 (Module.ts)**:
    - 내부 모듈: `require(1)` (숫자)
    - 외부 모듈: `require('react')` (문자열)

3.  **런타임 (Graph.ts)**:
    - 우리가 만든 `require` 함수는 숫자가 들어오면 내부에서 찾고, 문자열이 들어오면 **외부 환경(Node.js 등)의 진짜 require**에게 요청을 토스합니다.

---

## 3. 난관 돌파: 우리가 겪은 버그들

구현 과정에서 겪은 실제 트러블슈팅 경험입니다.

### 🐛 1. 무한 재귀 호출 (Stack Overflow)

런타임 함수 이름을 `require`로 지었더니, 호이스팅(Hoisting) 때문에 외부의 진짜 `require`를 가려버리는(Shadowing) 문제가 발생했습니다.
-> **해결**: 외부 `require`를 IIFE의 인자로 명시적으로 전달받아 해결했습니다.

### 🐛 2. CJS/ESM Interop (상호운용성)

`import React from 'react'`는 `React`를 Default Import로 취급하지만, Node.js의 CJS `react` 모듈에는 `default` 속성이 없습니다.
-> **해결**: 헬퍼 코드를 주입하여 `.default`가 없으면 객체 자체를 반환하도록 수정했습니다.

```javascript
// Interop Helper
const React = _mod && _mod.default ? _mod.default : _mod;
```

---

## 🏁 마치며: 우리가 배운 것들

우리는 총 4단계에 걸쳐 번들러의 심장을 직접 만들어 보았습니다.

1.  **Step 1**: 파일을 읽고 쓰는 기본적인 파이프라인 구축
2.  **Step 2**: 코드를 데이터로 이해하는 **AST**와 모듈 간의 연결고리 **Resolve**
3.  **Step 3**: 스코프 충돌을 막는 **IIFE 래핑**과 실행 순서를 보장하는 **런타임 로더**
4.  **Step 4**: 개발자를 위한 **소스맵**과 효율적인 배포를 위한 **Externals** 전략

번들러는 더 이상 "검은 상자"가 아닙니다. 우리가 작성한 코드가 어떻게 해석되고, 어떻게 하나로 묶여 브라우저에 전달되는지 그 과정을 이해하게 되었습니다.

이제 에필로그에서 이 여정을 마무리하며, 남은 과제들을 살펴보겠습니다.
