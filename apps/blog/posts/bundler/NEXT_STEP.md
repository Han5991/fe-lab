---
title: '🚀 Next Step: 소스맵과 디버깅 (Step 4)'
status: 'To Do'
previous_step: 'Step 3 (Bundling & Scope)'
---

# 🚀 Next Step: 소스맵과 디버깅 (Step 4)

> **오늘의 성과**: 라이브러리 모드까지 지원하는 완벽한 번들 파일(`bundle.cjs`)을 만들고 테스트에 성공했습니다.
> **다음 목표**: 번들링된 코드는 원본과 모양이 다릅니다. 에러가 났을 때 원본의 위치를 정확히 가리켜주는 **SourceMap**을 추가해 봅시다.

## 🎯 핵심 학습 주제

### 1. SourceMap과 VLQ
*   변환된 코드의 [행, 열]을 원본의 [행, 열]로 매핑하는 원리.
*   `.map` 파일 내부의 `mappings` 필드가 왜 외계어(?)처럼 생겼는지 이해하기.
*   `sourcesContent`를 포함하면 원본 파일이 없어도 DevTools에서 바로 열립니다.
*   인라인 소스맵과 외부 `.map` 파일은 배포 편의성과 번들 크기에서 트레이드오프가 있습니다.

```js
const map = magicString.generateMap({ hires: true, includeContent: true });
fs.writeFileSync('dist/bundle.cjs.map', map.toString());
bundle += '\n//# sourceMappingURL=bundle.cjs.map';
```

### 2. DX(Developer Experience) 개선
*   브라우저 개발자 도구의 'Sources' 탭에서 우리가 작성한 원본 `a.js`, `b.js`가 그대로 보이게 만들기.
*   `magic-string`의 `generateMap()` 기능을 활용한 자동 생성.

## 🛠️ 구현할 기능 (To-Do)

1.  **`bundle.cjs.map` 생성**: 매핑 정보를 담은 JSON 파일 출력.
2.  **주석 연결**: `bundle.cjs` 하단에 `//# sourceMappingURL=...` 추가.
3.  **검증**: 고의 에러 발생 후 원본 파일 위치가 잡히는지 확인.

---

고생하셨습니다! 다음 세션에서 소스맵의 마법을 경험해 보세요. 👋
