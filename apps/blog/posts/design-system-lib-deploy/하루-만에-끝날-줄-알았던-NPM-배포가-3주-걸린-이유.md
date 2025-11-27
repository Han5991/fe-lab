---
title: '하루 만에 끝날 줄 알았던 NPM 배포가 3주 걸린 이유'
date: '2025-11-27'
description: '별거 아니겠지라고 생각했던 NPM 패키지 배포가 어떻게 3주간의 삽질로 이어졌는지, 그리고 그 과정에서 배운 타협의 기술'
category: 'design-system-lib-deploy'
tags: ['NPM', '디자인 시스템', '배포', 'Panda CSS', 'tsup', '빌드']
---

# 하루 만에 끝날 줄 알았던 NPM 배포가 3주 걸린 이유

## 프롤로그: "별거 아니겠지"의 착각

타팀 기획자가 다가왔다.

"개발자님, 저희 팀에서도 그 디자인 시스템 쓸 수 있을까요? 버튼이랑 인풋 컴포넌트가 정말 예쁘던데..."

내 대답은 자신만만했다.

**"별거 아니에요. NPM에 올리기만 하면 되니까 하루면 될 것 같은데요?"**

후... 내 입이 방정이지.

그날의 나에게 말해주고 싶다. **별거 아닌 일은 없다고.**

## 그땐 좋아 보였는데...

### 완벽한 계획 (예상 기간: 1일)

머릿속으로 그린 계획은 완벽했다:

- 트리셰이킹
- CSS 번들
- Type 지원
- 배포 문서
- 자동 배포 시스템

자, 이제 시작해볼까요? NPM 배포, 이렇게 하면 되겠지?

**과연 이 계획대로 될까?**

### 우리 프로젝트 상황

**모노레포 구성**

- 신규 프로젝트와 디자인 시스템을 동시에 구현
- 코드 공유와 의존성 관리의 효율성 고려
- 향후 다른 팀으로의 확장 가능성

**기술 스택 선택: Mantine + Panda CSS**

당시 팀 상황을 고려하면 현실적인 선택이었다:

- 개발/디자인 리소스 부족
- 디자인 시스템 구축 경험 부족
- Tailwind 문법에 대한 팀 내 선호도 문제

Mantine의 높은 완성도와 Panda CSS의 유연성이 우리 팀에 적합해 보였다.

**현재 프로젝트 구조**

```
monorepo/
├── design-system          # 메인 디자인 시스템
└── packages/
    ├── @package/core      # HTTP 클라이언트, 상태 코드
    ├── @package/constants
    ├── @package/entities
    └── @package/service
```

디자인 시스템 패키지와 4개의 공통 내부 패키지로 구성.

**배포 요구사항**

타팀에서 디자인 시스템을 사용하기 위해 충족해야 할 조건들:

1. **NPM 패키지 배포**: GitHub Packages, 버전 관리, 문서화
2. **외부 설치 가능**: 모노레포 외부 서비스에서 손쉬운 설치
3. **환경 호환성**:
   - 타팀 환경: Remix + Tailwind
   - 우리 환경: Mantine + Panda CSS
4. **내부 패키지 의존성 처리**: 4개 내부 패키지 의존성 관리

**"별거 아니겠지"라고 생각한 1일 예상 작업이 3주간의 여정으로 시작됐다.**

## 1주차: 빌드 지옥편 - "나는 라이브러리 번들을 몰랐다"

### 빌드 도구 선택: tsup

일단 빌드부터 해보자!

여러 빌드 도구를 검토한 끝에 **tsup**을 선택했다.

**tsup을 선택한 이유:**

- 본인이 라이브러리 배포에 대한 지식이 전무
- 간편한 config → 러닝 커브 낮음
- TypeScript 타입 자동 생성 지원 (.d.ts 파일 자동 생성)
- esbuild 기반 → go 기반 가볍고 빠름
- 후처리 파이프라인과 통합 용이 → onSuccess 훅으로 다양하고 편리한 통합 가능

첫 번째 config는 심플했다:

```typescript
export default defineConfig({
  entry: ['src/index.ts', 'preset.ts'],
  splitting: true,
  sourcemap: true,
  clean: true,
  dts: true,
  format: ['esm'],
  outDir: 'dist',
  minify: true,
});
```

### 첫 번째 벽: Panda styled-system

빌드를 실행하자마자 에러가 발생했다.

```
[ERROR] Could not resolve '@styles/patterns'
```

**문제:**

1. `styled-system`이 경로에 없음
2. `@styles` alias 설정을 모름

**해결:**

1. 빌드 전에 `panda prepare` 실행
2. esbuildOptions에 직접 경로 설정

### 예상하지 못한 SVG 문제

우리는 SVGR을 사용해서 SVG를 리액트 컴포넌트로 변환하고 있었다.

```typescript
// common
export { default as AddPerson } from '../common/AddPerson.svg';
```

tsup이 JS 모듈을 기대했지만 svg가 들어있어서 에러 발생.

```
RollupError: "default" is not exported by "src/assets/svgs/common/AddPerson.svg"
```

### SVG 문제 해결을 위한 다양한 접근법

**1. SVG 확장자 모듈 설정**

- svg 타입 설정 추가

**2. tsup / rollup github 뒤적**

- 관련 github 이슈 탐색
- 나에겐 안 맞는 이슈들

**3. esbuild 플러그인**

- esbuild-plugin-svgr 시도
- 직접 플러그인 작성 시도
- 복잡성만 증가하고 새로운 문제 발생

결국 완벽한 해결책을 찾지 못했다.

### 타협 #1: 이중 빌드 시스템

**현실:** SVG 타입 생성 불가능

**근거:** 사용하는 모노레포에서는 타입 지원이 이미 안정적. 타입 생성 오류보다는 빌드 우선 전략 채택. 디자인 시스템 레포에서는 타입 지원이 이미 안정적이었기 때문.

**결정:** tsc로 타입만 별도 생성

**타협안:**

- tsup: 번들링 담당 (dts: false)
- tsc: 타입 정의 파일 생성 (별도 실행)

```typescript
onSuccess: 'npx tsc --project tsconfig.build.json';
```

**결과:**

- ✅ 빌드는 성공
- ⚠️ SVG 관련 타입 일부 누락
- ⚠️ 일부 컴포넌트 타입 미지원
- ✅ 완벽하진 않지만 일단 돌아감

빌드 시스템이 이원화되어 복잡성이 증가했지만, 완벽보다 작동을 택했다.

## 2주차: 로컬 테스트와 실제 적용 - "20MB... 하지만 일단 돌아간다"

### 이젠! 설치 테스트를 해보자!

빌드는 성공했다. 이제 실제로 설치해서 테스트해봐야 했다.

**배포 사이클:**

```
로컬 테스트
    ↓
실 서비스 설치
    ↓
코드 수정 및 push
    ↓
GitHub Actions CI & CD
```

### pnpm pack으로 빠른 테스트 환경 구축

**배포 전에 로컬에서 테스트하고 싶었지만, npm publish는 번거롭고 시간이 오래 걸렸다. 빠른 피드백 루프가 필요했다.**

**pnpm pack을 선택한 이유:**

- 실제 배포와 동일한 형태의 .tgz 파일 생성
- 빠른 반복 테스트 가능

```bash
# 디자인 시스템 패키지에서
pnpm pack

# 다른 서비스에서
pnpm install ../design-system/design-system-0.0.2.tgz
```

**피드백 루프:**

1. 코드 수정
2. pnpm pack으로 패키지 생성
3. 테스트 환경에 재설치
4. 테스트 및 문제 발견
5. 반복

실제 배포 환경과 유사한 테스트 환경이 구축됐다.

### dist 폴더가 없네?!?!!? 왜지?!?!!?

패키지를 설치하고 확인했더니... dist 폴더가 보이지 않았다.

**package.json 스펙 공부 시작:**

- `exports`: 어떤 파일을 외부에 노출할지
- `types`: 타입 선언 경로
- `files`: npm publish 시 포함할 파일
- `publishConfig`: 배포 레지스트리·접근 설정

"dist가 안 보이는 이유는 files 설정 때문일 수도 있다."

결국 package.json을 수정:

```json
{
  "name": "@kit-design/ui",
  "version": "1.0.0",
  "files": ["dist"],
  "exports": {
    ".": {
      "types": "./dist/src/index.d.ts",
      "import": "./dist/index.js"
    },
    "./preset": {
      "types": "./dist/preset.d.ts",
      "import": "./dist/preset.js"
    }
  },
  "publishConfig": {
    "exports": {
      ".": {
        "types": "./dist/src/index.d.ts",
        "import": "./dist/index.js"
      }
    }
  }
}
```

### 이젠! 실서비스 설치 테스트를 해보자!

### CSS 문제: 스타일 적용이 안 됨

디자인 시스템을 다른 서비스에 설치하고 첫 테스트를 진행했다. 모든 CSS를 지우고 시작했다.

**컴포넌트 렌더링 상태:**

- 컴포넌트는 정상적으로 렌더링됨
- 버튼, 카드 등 모든 컴포넌트가 Mantine 스타일로 렌더링됨
- 개발자 도구로 확인하니 class는 있지만 전역 CSS class가 없음

**문제 원인:**
Panda CSS의 스타일 시트가 빌드 과정에서 미포함. Panda CSS 함수를 찾을 수 없었다.

### Panda CSS 전달 문제 해결 시도

세 가지 방법을 시도했다:

**1. 스타일 시트 생성**

- 공식문서 따라함
- `panda codegen --outfile styles.css`
- 결과: 필요한 클래스가 전부 생성되지 않음

**2. buildInfo 활용**

- 공식문서 따라함
- Panda의 buildInfo
- 클라이언트 설정 필요
- 결과: 원인 불명으로 미동작

**3. Styled-system 참조**

- 미리 만든 styled-system을 클라이언트에 연결
- 결과: node_modules 참조 문제

모두 실패했다.

### 타협 #2: 소스코드 통째로 배포

**현실:** 빌드 최적화 시간 vs 배포 일정

**근거:** 초기 목표는 "작동하는 배포". Panda CSS의 빌드 메커니즘 이해는 현재 단계에서 핵심 과제가 아님. 더 이상 방법이 없었다. 빌드 파이프라인 전체를 디버깅하기엔 시간과 리소스가 모두 부족.

**결정:** 최적화는 나중에. 소스코드 통째로 넣기

💡 **"일단 돌아가게 만들자"**

**타협안: 소스코드 통째로 배포하기**

```json
{
  "files": ["src"]
}
```

**결과:**

- styled-system 포함
- Panda CSS 함수들을 런타임에 사용 가능
- 빌드는 성공
- ✅ 작동함!

### 20MB 괴물의 탄생

패키지 사이즈를 확인했다.

**20MB**

약 60개의 컴포넌트와 정적 자원을 포함한 결과였다.

**다른 UI 라이브러리 크기:**

- Mantine (약 120개 컴포넌트): 12MB
- MUI: 5.6MB

**패키지에 포함된 내용:**

- 소스코드 전체 (src/)
- styled-system 폴더 전체
- node_modules 일부
- 모든 정적 자산 (폰트, SVG 등)

최적화를 포기하고 소스코드를 통째로 넣은 대가는 컸다.

**하지만:**

- ✅ 로컬에서 동작함
- ✅ 컴포넌트 정상 렌더링
- ✅ CSS 스타일 적용됨

**목표와 현실:**

- 목표: 일반 UI 라이브러리 ~10MB
- 현실: 20MB
- 차이: 2배

**실용적 결정:**

- 최적화는 나중에
- 빠른 배포 시스템 완성이 우선

## 3주차-1: 실제 서비스 적용 - "CSS 충돌은 예상했지만 이 정도일 줄은..."

### 이제 기존 CSS 통합해보자!

### 불가능한 조합의 현실

이제 실제 서비스에 적용할 차례였다.

**다른 팀 환경:**

- Remix 사용 중
- Tailwind CSS 기반 스타일링
- 레거시 전역 CSS 파일

**우리 디자인 시스템:**

- Mantine
- Panda CSS

기존 전역 CSS를 열어보니:

```css
/* 기존 전역 CSS */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .button {
    background: red !important;
    padding: 10px !important;
  }
}

@layer base {
  div {
    box-sizing: border-box !important;
  }
}

/* layer 없이 직접 작성된 스타일들 */
.some-legacy-class {
  margin: 20px !important;
  color: blue !important;
}
```

온갖 하드코딩 CSS가 `!important`로 도배되어 있었고, Tailwind의 `@layer` 문법도 섞여 있었다. 우리 디자인 시스템 스타일이 전부 덮어씌워지고 있었다.

### @layer로 우선순위 제어

CSS `@layer` 문법을 알게 됐다.

```css
/* 레이어 우선순위 설정 - Mantine을 낮은 우선순위로 배치 */
@layer reset, base, tokens, recipes, utilities, tailwind, mantine,
       panda-reset, panda-base, panda-tokens, panda-recipes, panda-utilities;

/* Mantine CSS를 낮은 우선순위 layer에 배치 */
@import '@mantine/core/styles.css' layer(mantine);

/* Tailwind도 별도 layer로 관리 */
@layer tailwind {
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
}
```

이 방법이 유일하게 원하던 대로 된 해결책이었다.

**결과:**

- ✅ `!important` 없이도 스타일 제어 가능
- ✅ Mantine, Tailwind, Panda CSS 모두 공존 가능
- ✅ 우선순위 디버깅이 훨씬 쉬워짐

### 이러면 전부 다 잘 되나?

### 타협 #3: 완벽한 호환

**현실:** 다른 프레임워크 + 다른 CSS 라이브러리 + !important

**근거:** 서비스가 운영 중이어서 단번에 구조를 뒤엎는 것이 위험. 어쩔 수 없는 레거시는 점진적으로 수정하기로.

**결정:** 점진적 마이그레이션

디자인 시스템을 적용하면서 수동으로 수정해야 했다.

**타협안:**

- ⚠️ `!important` 문제가 남음
- ⚠️ 기존 스타일 일부 깨짐

**실용적 결정:**

- ✅ 실 서비스에 적용은 가능
- 어쩔 수 없는 레거시 청산으로 하나씩 수정하기로

"완벽하진 않지만, 돌아간다."

## 3주차-2: 배포 자동화 - "마지막까지 순탄하지 않았다"

### 이제 배포 파이프라인을 만들자!

로컬 테스트도 성공했다. 실 서비스 적용도 가능해졌다. 이제 자동 배포 시스템을 만들 차례였다.

**목표:**

1. GitHub Actions 워크플로우가 develop 브랜치 PR 이벤트에 각 패키지의 버전 체크
2. 변경할 버전이 있다면 version update 할 정보를 담아 json에 저장
3. 머지(push) 할 때 version update commit 생성

### npm scope 문제 - 대참사의 시작

GitHub npm에 배포를 시도했을 때 예상치 못한 문제가 발생했다.

```
403 error
```

권한 부족?

**원인:**
패키지 이름(name)이 npm scope 규칙에 맞지 않음. `@org/packagename` 형식이어야 했다.

당당하게 지었던 패키지 이름이 발목을 잡았다.

**해결 방법 고민:**

1. **GitHub 조직 새로 만들기** → 복잡하고 시간 소요
2. **사설 서버 설치** ex) Nexus, etc
3. **패키지 이름 변경** ✅ → 관련 파일의 import 구문 변경

결국 패키지 이름을 scope 규칙에 맞게 변경했다. 모든 import 문을 수정해야 했다.

### GitHub Actions 무한 재귀의 공포

배포 워크플로우를 만들고 push했다.

"미치겠다."

**무한 재귀 발생 원인:**

1. GitHub Actions 워크플로우가 develop 브랜치 push 이벤트에 반응
2. Actions가 package.json 버전을 수정하고 자동 커밋
3. 새 커밋이 다시 push 이벤트 발생
4. 무한 반복 배포 워크플로우 실행

**해결책:**

GitHub Actions 워크플로우 트리거 조건 수정:

- Auth가 `github[bot]` 이면 바로 종료
- 자동 커밋이 새 워크플로우를 트리거하지 않음

### 드디어 성공한 배포 자동화 시스템!

우여곡절 끝에 배포 시스템이 완성됐다:

**버전 관리 자동화**

- PR 머지 시 Changeset이 버전 업데이트

**배포 파이프라인**

- develop 브랜치 push 시 자동 npm 배포

**문서 자동화**

- CHANGELOG 자동 생성
- PR 링크 자동 추가

## 에필로그: 3주간의 타협이 가르쳐 준 것

### 드디어 완성!

우여곡절 끝에 성공했다.

**별거 아니에요 => 별거 였습니다 => 그래도 해냈습니다**

### 타협한 것들 vs 그래도 성공한 것

| 타협한 것들                                                                                     | 그래도 성공한 것                                                     |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **타입 지원**<br/>- tsup + tsc 이중빌드<br/>- SVG 타입타입 누락<br/>- 일부 컴포넌트 타입 미지원 | **실제 사용가능**<br/>- remix + tailwind 환경 지원                   |
| **CSS 번들**<br/>- 수동으로 하나 하나 수정 중                                                   | **자동 배포 시스템**<br/>- changeset + github actions<br/>- npm 배포 |
| **가벼운 번들 크기**<br/>- 20MB 짜리 괴물 생성                                                  |                                                                      |

### 여기까지 배운 기술

**빌드**

- tsup의 config는 간편하지만 Rollup 관련 설정이 있다
- 정적 자원은 꼭 패키지를 따로 빼서 관리를 하자

**테스트**

- pnpm pack → 최종 배포전 tarball 형태로 만들어 테스트 가능
- package.json spec 공부 (exports, types, files, publishConfig)

**CSS (실적용)**

- panda-css의 빌드 결과물 적용 하기 위해서는 styles.css, buildInfo, styled-system 중 하나를 필요로 한다
- @layer라는 CSS 문법은 CSS의 우선순위를 설정할 수 있다
- !important 금지

**배포**

- 조직명을 확인하고 패키지 명을 만들자
- 혹시나 재귀 조건이 있을 수 있으니 빠져나올 구멍을 잘 살피자

### 다음 삽질 TODO LIST

**타입 지원**

- SVGR 타입 빌드 방법 강구

**최적화**

- ~5MB 목표로 다이어트
- 트리셰이킹 적용
- Styled-system 없이 배포

**수동 CSS 고치기**

- 점진적 마이그레이션

### 3주간의 타협이 가르쳐 준 것

**타협 #1 타입 지원 빌드**

- **현실:** SVG 타입 생성 불가능
- **근거:** 사용하는 모노레포에서는 타입 지원
- **결정:** tsc로 타입만 별도 생성

**타협 #2 가벼운 번들**

- **현실:** 빌드 최적화 시간 vs 배포 일정
- **근거:** 초기 목표는 "작동하는 배포"
- **결정:** 최적화는 나중에

**타협 #3 완벽한 호환**

- **현실:** 다른 프레임워크 + 다른 CSS 라이브러리 + !important
- **근거:** 서비스가 운영 중이어서 단번에 구조를 뒤엎는 것이 위험
- **결정:** 점진적 마이그레이션

**3주 동안 총 3번의 타협을 했습니다.**
**그리고 이 세 번의 타협 덕분에 디자인 시스템 배포는 완성될 수 있었습니다.**

### 마지막으로

의사결정에서 중요한 건 **'정답'**이 아니라 **'왜 그렇게 결정했는가'** 라는 근거입니다.

"별거 아니에요"라고 말했던 그날로부터 3주.

완벽하지는 않다. 20MB짜리 패키지, 누락된 타입, 수동으로 고쳐야 할 CSS들.

하지만 **작동한다.** 다른 팀이 사용할 수 있고, 자동으로 배포되고, 점진적으로 개선할 수 있다.

이 과정에서 배운 가장 중요한 것:

**"별거 아닌 일은 없다. 하지만 완벽하지 않아도 배포할 수 있다."**

누군가는 이 글을 보고 같은 삽질을 하지 않기를, 그리고 혹시 삽질 중이라면 "나만 이런 게 아니구나"라고 위로받기를 바란다.
