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

번들러는 수십 개의 파일을 하나로 합칩니다. 이 과정에서 줄 바꿈이 일어나고, 코드가 함수로 감싸지면서 원본 코드의 행(Line)과 열(Column) 정보가 완전히 뒤섞입니다.

소스맵이 없다면 브라우저 디버거는 `bundle.js:450` 라인에서 에러가 났다고 알려주겠지만, 정작 우리는 원본의 `utils.js:12` 라인을 보고 싶어 합니다.

### 🗺️ 소스맵의 핵심 원리

소스맵은 간단히 말해 **좌표 변환 테이블**입니다.
`"번들 파일의 5행 10열은 -> 원본 A.js의 2행 3열이다"`라는 정보를 JSON 형태로 기록한 것이죠.

여기서 복잡한 점은 코드를 수정(Transform)할 때마다 이 좌표가 변한다는 것인데, 다행히 우리가 Step 1부터 사용해온 **`magic-string`**이 이 고통을 대신 짊어져 줍니다.

### 🛠️ magic-string으로 소스맵 생성하기

`magic-string`은 문자열을 자르고 붙이는 과정에서 발생한 모든 위치 변화를 내부적으로 추적합니다. 우리는 그저 마지막에 "지도 좀 그려줘"라고 부탁하기만 하면 됩니다.

```ts
// Module.ts에서
const map = this.magicString.generateMap({
  source: this.filePath,
  file: `${path.basename(this.filePath)}.map`,
  includeContent: true,
});

// 이 map 정보를 번들 전체의 맵으로 합치는 과정이 필요합니다.
```

실제 구현 시에는 각 모듈의 소스맵을 합쳐야 하는데, 이 과정이 꽤 복잡하므로 실습에서는 `magic-string`의 `Bundle` 클래스를 사용하거나, 각 모듈의 코드를 합칠 때 `magic-string` 객체 자체를 이어 붙이는 방식을 선호합니다.

---

## 2. 외부 의존성(Externals): "남의 집 살림까지 챙기지 마세요"

우리가 라이브러리를 만든다고 가정해 봅시다. 우리 라이브러리가 `react`를 사용한다면, 번들 결과물에 React 전체 코드를 포함해야 할까요?

**정답은 "아니오"입니다.**

### 🚫 왜 포함하면 안 되나요? (The Problem of Duplicate)

1.  **용량 폭발**: 모든 라이브러리가 React를 내장하면, 최종 앱에는 수십 개의 React 복사본이 들어갑니다.
2.  **인스턴스 충돌**: React Context나 Hook은 하나의 런타임에 하나의 React 인스턴스가 있을 때만 정상 작동합니다. 두 개가 로드되면 에러가 발생합니다.

이때 사용하는 개념이 **Peer Dependencies**와 **Externals**입니다. "내 번들에는 구멍을 뚫어놓을 테니, 이 라이브러리를 쓰는 사람이 React를 채워줘!"라고 선언하는 것이죠.

### 🛠️ Externals 구현 가이드

번들러의 `Graph` 생성 단계에서 특정 모듈을 만났을 때, 이를 분석하거나 번들에 포함하지 않고 **"외부에 있다고 치자"**며 건너뛰도록 수정해야 합니다.

```ts
// Graph.ts 수정 예시
const EXTERNALS = new Set(['react', 'lodash', 'path']);

resolve(importPath: string, importer: string): string | null {
  // 외부 라이브러리인 경우 null을 반환하여 그래프 탐색 중단
  if (EXTERNALS.has(importPath)) {
    return null;
  }
  // ... 기존 로직
}

createModule(filePath: string) {
  if (filePath === null) return null; // External 모듈은 인스턴스 생성을 건너뜀
  // ...
}
```

이렇게 하면 번들러 런타임(`require`)은 실행 중에 해당 ID를 찾지 못할 텐데, 이때 브라우저의 전역 변수(`window.React`)나 Node.js의 실제 `require`를 호출하도록 브릿지를 놓아주면 해결됩니다.

---

## 🏁 마치며: 우리가 배운 것들

우리는 총 4단계에 걸쳐 번들러의 심장을 직접 만들어 보았습니다.

1.  **Step 1**: 파일을 읽고 쓰는 기본적인 파이프라인 구축
2.  **Step 2**: 코드를 데이터로 이해하는 **AST**와 모듈 간의 연결고리 **Resolve**
3.  **Step 3**: 스코프 충돌을 막는 **IIFE 래핑**과 실행 순서를 보장하는 **런타임 로더**
4.  **Step 4**: 개발자를 위한 **소스맵**과 효율적인 배포를 위한 **Externals** 전략

번들러는 더 이상 "검은 상자"가 아닙니다. 우리가 작성한 코드가 어떻게 해석되고, 어떻게 하나로 묶여 브라우저에 전달되는지 그 과정을 이해하게 되었습니다.

이제 에필로그에서 이 여정을 마무리하며, 남은 과제들을 살펴보겠습니다.
