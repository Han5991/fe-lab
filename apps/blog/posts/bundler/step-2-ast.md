---
title: 'Step 2: 코드를 데이터로 보는 법 (AST & Resolve)'
date: 2026-01-11
tags: ['bundler', 'javascript', 'ast', 'acorn', 'graph']
---

# Step 2: 코드를 데이터로 보는 법 (AST & Resolve)

번들러의 핵심 가치는 단일 파일의 처리가 아닌, 프로젝트 전체의 의존 관계를 파악하고 이를 하나로 엮어내는 데 있습니다. 이를 위해 번들러는 코드를 단순한 텍스트가 아닌 **데이터(Data)**로 바라보아야 합니다. 이번 단계에서는 AST를 통해 의존성을 추출하고, 복잡한 파일 간의 관계를 그래프 자료구조로 구축하는 과정을 다룹니다.

## 1. AST (Abstract Syntax Tree): 정규표현식의 한계를 넘어서

코드를 분석할 때 가장 먼저 떠오르는 도구는 정규표현식(Regex)일 수 있습니다. 하지만 정규표현식은 번들러와 같은 정밀한 도구를 만들기에는 결정적인 한계가 있습니다.

### 왜 정규표현식이 아닌 AST인가?

정규표현식은 **문맥(Context)**을 파악하지 못합니다. 예를 들어, 주석 처리된 코드나 문자열 내부의 텍스트도 단순 패턴 매칭으로 모두 찾아내기 때문에 오작동의 위험이 큽니다.

```javascript
// 실제로는 사용되지 않는 코드지만 정규표현식은 이를 찾아냅니다.
// import { hidden } from './secret.js';

const message = "Please import './config.js' first.";
```

반면, **AST(추상 구문 트리)**는 프로그래밍 언어의 문법적 구조를 트리 형태로 표현한 데이터 구조입니다. `acorn`과 같은 파서를 사용해 코드를 AST로 변환하면, 해당 토큰이 주석인지, 문자열인지, 아니면 실제 실행되는 `ImportDeclaration`인지를 명확히 구분할 수 있습니다.

```javascript
// 입력 코드
import { name } from './name.js';

// AST 구조 (Acorn 기준 요약)
{
  "type": "ImportDeclaration",
  "specifiers": [
    {
      "type": "ImportSpecifier",
      "imported": { "name": "name" }
    }
  ],
  "source": {
    "type": "Literal",
    "value": "./name.js"
  }
}
```

AST를 활용하면 정적 분석(Static Analysis)을 통해 런타임 실행 없이도 안전하게 의존성 정보를 추출할 수 있습니다.

---

## 2. Resolve 알고리즘: 경로의 미학

AST를 통해 `./name.js`라는 경로를 찾아냈다면, 이제 이 경로가 실제 파일 시스템의 어디에 위치하는지 알아내야 합니다. 이를 **Resolve(해결)** 과정이라고 부릅니다.

Node.js 환경에서 작동하는 번들러는 보통 다음과 같은 **Node.js Resolve Algorithm**을 따릅니다:

1.  **확장자 추론**: 파일명이 `./utils`로 되어 있다면, `.js`, `.ts`, `.json` 등을 순차적으로 탐색합니다.
2.  **디렉토리 엔트리**: 경로가 디렉토리를 가리킨다면 해당 디렉토리의 `index.js`를 찾거나 `package.json`을 확인합니다.
3.  **package.json 해석**:
    - **`exports`**: 최신 표준으로, 조건부 내보내기(Conditional Exports)를 지원합니다.
    - **`main`**: 레거시 표준으로, 패키지의 기본 진입점을 지정합니다.
    - **`module`**: ESM 환경을 위해 관례적으로 사용되는 필드입니다.

번들러는 이러한 규칙들을 조합하여 상대 경로 혹은 `node_modules`의 복잡한 경로를 절대 경로로 변환합니다.

---

## 3. 의존성 그래프 (Dependency Graph) 구축

프로젝트는 수많은 파일이 얽혀 있는 거대한 망과 같습니다. 이 망을 관리하기 위해 **그래프(Graph)** 자료구조를 사용합니다.

### DFS(깊이 우선 탐색)와 Visited Map

엔트리 파일(index.js)부터 시작하여 발견되는 모든 의존성을 재귀적으로 탐색합니다. 이때 가장 중요한 기술적 과제는 **순환 참조(Circular Dependency)**와 **중복 탐색** 방지입니다.

만약 `A -> B -> A`와 같은 순환 구조가 있다면, 단순 재귀는 무한 루프에 빠지게 됩니다. 이를 해결하기 위해 **Visited Map**을 도입합니다.

```typescript
class DependencyGraph {
  // 이미 해석된 모듈을 경로(Key)별로 저장하는 캐시이자 방문 기록
  private modules = new Map<string, Module>();

  public build(entryPath: string) {
    const absolutePath = this.resolve(entryPath);

    // 1. 이미 방문한 적이 있다면 중단 (Circular Dependency 방지)
    if (this.modules.has(absolutePath)) {
      return this.modules.get(absolutePath);
    }

    // 2. 신규 모듈 생성 및 맵에 등록 (도장 쾅!)
    const module = new Module(absolutePath);
    this.modules.set(absolutePath, module);

    // 3. AST를 통해 추출한 의존성들을 재귀적으로 탐색 (DFS)
    for (const dep of module.dependencies) {
      this.build(dep);
    }
  }
}
```

이 방식을 통해 아무리 복잡하게 꼬여 있는 프로젝트라도 모든 파일을 정확히 한 번씩만 방문하여 전체 지도를 완성할 수 있습니다.

---

## 4. 마치며

이제 우리는 코드를 데이터(AST)로 읽어내고, 경로를 해석(Resolve)하며, 전체 구조를 지도(Graph)로 그려낼 수 있게 되었습니다.

모든 파일의 내용과 그들 사이의 연결 고리를 확보했으므로, 다음 단계에서는 이 파편화된 파일들을 하나의 실행 가능한 자바스크립트 파일로 합치는 **번들링(Bundling)**과 **스코프 격리**에 대해 알아보겠습니다.
