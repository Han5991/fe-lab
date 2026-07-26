# 3주간의 패키지 배포 삽질기: SVG와 npm scope가 만든 지옥

## 프롤로그: "별거 아니겠지"의 착각

> 타팀 기획자가 다가왔다.
>
> "개발자님, 저희 팀에서도 그 디자인 시스템 쓸 수 있을까요? 버튼이랑 인풋 컴포넌트가 정말 예쁘던데..."
>
> 내 대답은 자신만만했다. "별거 아니에요. NPM에 올리기만 하면 되니까 하루면 될 것 같은데요?"
>
> 그날의 나에게 말해주고 싶다. **별거 아닌 일은 없다고.**
>
> 3주 후, 나는 20MB짜리 괴물 패키지와 마주하고 있었다. GitHub Actions는 무한 재귀로 돌아가고, CSS는 적용되지 않고, SVGR은 빌드를 거부했다.
>
> 하지만 결국 해냈다. 완벽하지는 않지만, 팀 상황에 맞는 현실적인 해결책으로.

## 0부: 상황 설명 - "잘 구성했다고 생각했는데?"

### 모노레포를 선택한 이유

신규 프로젝트와 디자인 시스템을 동시에 구현하기로 논의가 나왔다. "어차피 언젠간 내보낼 거야"라는 생각으로 모노레포로 구성했고, 추가 프로젝트도 들어오기로 한 상황이라 더욱 확신했다.

당시엔 완벽한 판단이라고 생각했다.

### 기술 스택 선택의 배경

**Mantine + Panda CSS**라는 조합을 선택했다.

- 리소스 부족 상황
- Tailwind 문법에 대한 팀원들의 극혐 😅
- 모두가 동의한 현실적 선택

그리고 name을 당당하게 원하는 대로 설정했다. (나중에 scope 문제로 발목을 잡힐 줄 모르고...)

### 현재 모노레포 구조

```
monorepo/
├── design-system/          # 메인 디자인 시스템 패키지
└── packages/
    ├── @package/core       # HTTP 클라이언트, 상태 코드
    ├── @package/constants
    ├── @package/entities
    └── @package/service
```

**여기서 첫 번째 함정**: 디자인 시스템이 내부 패키지 4개에 의존하고 있었다.

왜? GNB 때문에... 거기에 모든 공통 로직을 몽땅 때려넣고 있었던 것이다.

### 의존성 구성의 딜레마

이 4개 패키지를 `peerDependency`로 설정했다.

- 이유: 종합 패키지로 넣는 방법도 있었지만, 다른 패키지들의 재활용성을 고려

### 요구사항과 첫 번째 좌절

**요구사항**:

1. NPM 패키지로 배포
2. 모노레포 외부의 다른 서비스에서 설치 가능
3. **Remix + Tailwind 환경**에서 **Mantine + Panda CSS** 잘 돌아가게 하기

**첫 번째 좌절 포인트**:

- 모노레포 안에 있는 패키지라 밖으로 내보내야만 가능
- 내부 패키지 4개를 어떻게 처리할 것인가? (gnb 때문)
- 서로 다른 CSS 프레임워크 조합이 과연 가능할까?

"미리 잘 구성했다"고 생각했지만, 현실은 그렇지 않았다.

## 1부: 빌드 지옥편 - "tsup, 너 이럴 거야?"

### 빌드 도구 선정: tsup을 선택한 이유

당시 빠른 빌드와 TypeScript 타입을 동시에 지원하는 도구를 찾고 있었다. **tsup**이 최신이고 좋다는 평이 많았다.

"이거면 되겠다!"

### SVG와의 첫 번째 조우

우리는 SVGR을 사용해서 SVG를 컴포넌트로 변환하고 있었다. 빌드를 돌려보니...

```bash
Error: default export를 처리할 수 없습니다
```

**tsup이 SVGR의 default export 구문을 처리하지 못했다.**

#### 시도했던 해결책들

1. **tsup 설정 조정**: 별 소용없음
2. **esbuild 플러그인 추가**: 복잡성만 증가
3. **결국 포기**: TypeScript 컴파일은 따로 `tsc`로 처리

```json
{
  "scripts": {
    "build": "tsup && tsc --emitDeclarationOnly"
  }
}
```

SVG 때문에 빌드 시스템이 이원화되어 버렸다.

### 20MB 괴물의 탄생

빌드 결과물을 확인해보니... **20MB**

"뭐지 이거?"

모든 의존성을 다 포함시켜버린 괴물이 탄생했다. 목표는 300KB였는데...

### Panda CSS 스타일시트 생성의 악몽

Panda CSS 공식 예제를 따라해봤지만 당연히 안 됐다.

#### 시도한 것들

1. **buildInfo 사용**: 동작 자체를 안 함
   - 원인: 클라이언트 측에 info 설정을 안 해둔 게 문제
2. **빌드 시 CSS 스타일시트 생성**: config에 넣은 게 아니라 필요한 class를 전부 생성하지 못함

```typescript
// 이런 식으로 했지만...
import { css } from '@styled-system/css';

// 빌드 시에는 실제로 사용된 클래스만 생성되지 않았다
```

### @styles 절대경로 매핑의 배신

`styled-system`을 `@styles`라는 절대경로로 매핑했는데, 이게 터지기 시작했다.

```typescript
// 이런 import가
import { css } from '@styles/css';

// 빌드에서는 찾을 수 없다고 나옴
```

### 의존성 라이브러리 빌드 처리

내부 패키지들을 어떻게 빌드에 포함시킬 것인가? 결국 빌드 시 예외 처리로 해결했다.

```json
{
  "external": [
    "@package/core",
    "@package/constants",
    "@package/entities",
    "@package/service"
  ]
}
```

### Panda codegen 라이프사이클 문제

Panda는 `prepare` 스크립트에서 `panda codegen`을 수행하고 있었는데, 이 부분을 빌드 전에 넣어줘야 했다.

```json
{
  "scripts": {
    "prebuild": "panda codegen",
    "build": "tsup && tsc --emitDeclarationOnly"
  }
}
```

### tsup의 onSuccess 라이프사이클 이슈

`tsup`의 `onSuccess`를 사용해서 빌드 후에 `tsc`를 적용하려고 했지만, 라이프사이클이 달라서 결국 수동으로 처리하게 됐다.

지금 생각해보면 **esbuild**로도 충분했을 것 같다.

### 모듈 시스템 공부의 시작

이 과정에서 JavaScript 모듈 시스템에 대해 제대로 공부하게 됐다:

- CJS vs ESM
- `.mjs`, `.mts`, `.cts`
- `*.d.ts` 파일 생성
- sourcemap 처리

### 모노레포 빌드 시스템 붕괴

현재 모노레포에서도 breaking change가 많으면 안 됐다. 하지만...

**실제로 깨졌다. (지금도 고생 중)**

이 과정에서 모노레포의 빌드 시스템과 오케스트레이션에 대해 공부하게 됐고, `package.json` 스펙도 많이 알게 됐다:

- `name`, `publishConfig`, `exports`, `files`
- `peerDependencies` vs `dependencies`

## 2부: 배포 시스템 구축 - "npm scope의 저주"

### Changeset 공부의 시작

배포 자동화를 위해 **changeset**에 대해 전부 공부해야 했다.

- 시맨틱 버저닝 (직접 고려해본 건 처음)
- 커밋 메시지 기반 자동 버저닝
- 개발자가 손대지 않는 자동 버전 관리

### npm scope 문제 - 대참사의 시작

GitHub npm에 배포하려고 했는데...

```bash
Error: Package name must start with @organization/
```

**우리 패키지 이름이 scope 규칙에 맞지 않았다.**

#### 해결 방법들

1. **GitHub 조직 새로 만들기**: 너무 복잡함
2. **모노레포 서비스의 import 전부 교체**: 🔥 **이걸 선택**

```typescript
// Before
import { Button } from 'design-system';

// After
import { Button } from '@our-org/design-system';
```

**모든 파일의 import를 바꿔야 했다.** 수십 개 파일에 걸친 대대적인 refactoring이었다.

### GitHub Token 권한 이슈

배포를 위한 토큰이 필요했는데:

1. **내 개인 토큰**: 권한 부족
2. **GitHub 조직 토큰**: 받아서 넣음 (하지만 이것도 레거시가 되어버림)

### GitHub Actions 무한 재귀의 공포

브랜치에 필수 actions를 설정했는데...

```yaml
# 이런 워크플로우가
on:
  push:
    branches: [main]
# 커밋을 만들어내고
# 그 커밋이 또 워크플로우를 트리거하고
# 그게 또 커밋을 만들어내고...
```

**무한 재귀가 돌기 시작했다. 미치겠다.**

#### 해결책

```yaml
on:
  push:
    branches: [main]
    paths-ignore:
      - 'CHANGELOG.md'
      - 'package.json'
```

### 기존 워크플로우와의 충돌

기존에 잘 돌아가던 워크플로우도 고려해야 했지만... 역시 깨졌다.

```yaml
# 기존 워크플로우
- name: Build all packages
  run: pnpm build

# changeset 때문에 추가된 워크플로우
- name: Create Release PR
  run: pnpm changeset version
```

두 워크플로우가 서로 간섭하면서 예상치 못한 에러들이 속출했다.

## 3부: 적용과 현실 - "불가능한 조합의 현실"

### Remix + Tailwind + Mantine + Panda CSS

다른 팀에서 사용하는 환경은 **Remix + Tailwind**였다.
여기에 우리의 **Mantine + Panda CSS** 조합을 올려야 했다.

**"이게 과연 될까?"**

### Mantine의 Remix 지원 중단

Mantine 공식 홈페이지를 확인해보니...

> "Remix는 더 이상 지원하지 않습니다."

Remix 자체가 React Router로 흡수되면서 생긴 일이었다.

### Mantine + Tailwind 조합의 지옥

GitHub 이슈를 찾아보니 **mantine + tailwind 조합은 적용시키기 매우 어렵다**는 이슈가 많이 올라와 있었다.

CSS 우선순위가 겹치고, 클래스명이 충돌하고...

### 기존 CSS와의 전쟁

설상가상으로 **기존 서비스의 전역 CSS에 온갖 하드코딩 CSS가 박혀있었다.**

```css
/* 이런 식으로... */
.button {
  background: red !important;
  padding: 10px !important;
}

div {
  box-sizing: border-box !important;
}
```

### 첫 번째 시도: PostCSS로 해결?

PostCSS 설정을 직접 만들어서 해결해보려 했지만... **실패**

```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('@pandacss/dev/postcss'),
    require('tailwindcss'),
    // 충돌 해결이 안 됨
  ],
};
```

### 최후의 수단: 소스코드 통째로 넣기

뭔지 몰라서 **소스코드를 통째로 넣어서 내보내니** 일단 성공했다.

```typescript
// 이렇게 하지 말고
export { Button } from './dist/Button';

// 이렇게 했더니 됐다
export { Button } from './src/Button';
```

**성공 이유**: `styled-system`조차 통째로 들어있어서 Panda CSS의 함수를 찾아갈 수 있었던 것이다.

### CSS Layer로 우선순위 해결

기존 CSS와 합치니 박살났다. 그때 **CSS Layer**를 알게 됐다.

```css
@layer base, components, utilities;

@layer base {
  /* 기존 CSS */
}

@layer components {
  /* Mantine CSS */
}

@layer utilities {
  /* Panda CSS */
}
```

**이것이 유일하게 원하던 대로 된 해결책이었다.**

### 우여곡절 끝에 성공

일단 사용 가능한 형태로 시스템 구축 완성! 🎉

하지만 문제들이 산적해있었다:

- **20MB** 패키지 사이즈 (목표: 300KB)
- 트리쉐이킹 불가능한 구조
- TypeScript 타입 미완성
- 로티(Lottie) 파일 컴포넌트 동작 안 함

## 에필로그: 교훈과 체크리스트

### "별거 아니라고 하지 마세요!"

3주간의 삽질 끝에 얻은 가장 큰 교훈:
**패키지 배포는 절대 별거 아닌 일이 아니다.**

### 20MB → 300KB 최적화 로드맵

앞으로 해야 할 일들:

1. **빌드 사이즈 줄이기**: 20MB → 300KB 목표
2. **트리쉐이킹 가능한 구조로 변경**
3. **TypeScript 완벽 적용**
4. **SVG를 별도 패키지로 분리** (타입 문제 해결)
5. **buildInfo로 정적 스타일시트 생성**
6. **문서화 강화** (사람 의존도 줄이기)

### 업데이트 전파 방법

현재는 **"육성으로 한다"**와 **"슬랙 채널로 알린다"**.

가장 확실한 방법이긴 하다. 😅

### 다음에는 이렇게 하자 - 체크리스트

#### 🚨 **사전 계획 단계**

- [ ] **패키지 이름을 npm scope 규칙에 맞게 설정**
- [ ] **SVG 처리 방식 미리 결정** (SVGR vs 다른 방법)
- [ ] **CSS 프레임워크 조합 가능성 검증**
- [ ] **빌드 도구별 제약사항 사전 조사**

#### 🔧 **빌드 설정 단계**

- [ ] **pnpm pack으로 로컬 테스트 환경 구축**
- [ ] **External dependencies 명확히 정의**
- [ ] **절대경로 매핑 빌드 호환성 확인**
- [ ] **모듈 시스템 (CJS/ESM) 타겟 결정**

#### 🚀 **배포 설정 단계**

- [ ] **GitHub Token 권한 사전 확인**
- [ ] **Changeset 설정 후 무한 재귀 방지 설정**
- [ ] **기존 워크플로우와의 충돌 여부 확인**
- [ ] **브랜치 보호 규칙 설정**

#### 🎯 **적용 검증 단계**

- [ ] **CSS Layer 우선순위 설계**
- [ ] **PostCSS 설정 사전 테스트**
- [ ] **기존 CSS와의 충돌 지점 파악**
- [ ] **실제 환경과 유사한 테스트 환경 구축**

#### 💡 **최적화 단계**

- [ ] **번들 사이즈 분석 도구 설정**
- [ ] **트리쉐이킹 검증**
- [ ] **타입 정의 완성도 확인**
- [ ] **문서화 및 가이드 작성**

### 마지막으로

이 모든 과정에서 배운 것은 **"완벽한 해결책은 없다"**는 것이다.

중요한 건 **팀 상황에 맞는 실용적 선택**을 하고, **일단 돌아가게 만든 후 점진적으로 개선**해나가는 것이다.

3주간의 삽질도 결국 소중한 학습 과정이었다.

누군가는 이 글을 보고 **"덕분에 삽질 안 하고 성공했어요!"**라고 말해주길 바란다.

**그리고 무엇보다 - "별거 아니라고 하지 마세요!"** 🙏

---

_이 글이 도움이 되셨다면, 여러분의 패키지 배포 경험도 댓글로 공유해주세요. 함께 배워나가요!_
