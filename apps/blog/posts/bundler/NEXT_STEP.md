---
title: '🚀 Next Step: 소스맵과 디버깅 (Step 4)'
status: 'To Do'
previous_step: 'Step 3 (Bundling & Scope)'
---

# 🚀 Next Step: 배포 가능한 라이브러리 만들기 (Step 4 - Externals & SourceMap)

> **오늘의 성과**: 라이브러리 모드까지 지원하는 완벽한 번들 파일(`bundle.cjs`)을 만들고 테스트에 성공했습니다.
> **다음 목표**: 이제 "진짜 배포 가능한" 수준으로 끌어올립니다. **외부 라이브러리(React)를 격리**하고, 에러 추적을 위한 **SourceMap**을 장착합니다.

## 🎯 핵심 학습 주제

### 1. Externals와 PeerDependencies (필수 코어)

- **"React는 묶지 마세요"**: 라이브러리 번들러가 앱 번들러와 결정적으로 다른 점입니다.
- **중복 로딩의 비극**: 만약 내 라이브러리에 `react` 코드가 포함되면, 사용자의 앱에는 `react`가 두 개(앱용 + 내 라이브러리용) 생겨버립니다.
- **해결책**: 번들링 하지 않고 `require('react')` 문장을 그대로 남겨두는 **Externals** 전략을 배웁니다.

### 2. SourceMap과 VLQ (개발자 경험)

- 변환된 코드의 [행, 열]을 원본의 [행, 열]로 매핑하는 원리.
- `.map` 파일 내부의 `mappings` 필드가 왜 외계어(?)처럼 생겼는지 이해하기 (Base64 VLQ).
- `sourcesContent`를 포함하면 원본 파일이 없어도 DevTools에서 바로 열립니다.

```js
// 1. Externals: 번들링 제외
if (config.externals.includes(id)) {
  return `module.exports = require('${id}')`; // 코드를 가져오는 대신 require만 남김
}

// 2. SourceMap: 위치 추적
const map = magicString.generateMap({ hires: true, includeContent: true });
```

## 🛠️ 구현할 기능 (To-Do)

1.  **Externals 구현**: 설정된 모듈(`react` 등)을 만나면 탐색을 멈추고 `require` 문만 남기기.
2.  **`bundle.cjs.map` 생성**: 매핑 정보를 담은 JSON 파일 출력.
3.  **검증**:
    - 빌드된 파일 안에 `react` 코드가 없는지 확인.
    - 고의 에러 발생 후 원본 파일 위치가 잡히는지 확인.

---

고생하셨습니다! 다음 세션에서 "배포 가능한 번들러"의 마침표를 찍어봅시다. 👋
