---
published: true
title: '하루 만에 끝날 줄 알았던 디자인 시스템 배포가 3주 걸린 이유'
date: '2025-11-30'
description: '별거 아니겠지라고 생각했던 NPM 패키지 배포가 어떻게 3주간의 삽질로 이어졌는지, 그리고 그 과정에서 배운 타협의 기술'
category: 'design-system-lib-deploy'
tags: ['NPM', '디자인 시스템', '배포', 'Panda CSS', 'tsup', '빌드']
slug: 'npm-deploy-series-0-prologue'
---

# 하루 만에 끝날 줄 알았던 NPM 배포가 3주 걸린 이유

## 프롤로그: "별거 아니겠지"의 착각

> 타팀 기획자님이 내 자리로 다가왔다.
>
> "개발자님, 저희 팀에서도 그 디자인 시스템 쓸 수 있을까요? 버튼이랑 인풋 컴포넌트가 정말 예쁘던데..."
>
> 당시 디자인 시스템은 완성해둔 참이었다.
> 모노레포 안에서는 잘 돌아가고 있었다.
> Button, Input, Card... 약 60개 정도?
>
> "아, 그거요? 별거 아니에요."
>
> 나는 자신만만하게 대답했다.
>
> "NPM에 올리기만 하면 되니까 하루면 될 것 같은데요?"
>
> 기획자님의 환한 미소가 아직도 기억난다.
> "정말요? 그럼 이번 주 안에 가능할까요?"
>
> "네, 금방이에요!"

---

그리고 3주가 지났다.

하루라고 했던 작업은 21일이 걸렸다.
그 사이에 나는:

- 빌드 도구와 10일을 싸웠고
- 20MB 괴물 패키지를 만들어냈고
- CSS 충돌로 머리를 쥐어뜯었고
- 무한 재귀 배포를 중단시켰다

지금 돌아보면 **그날의 나에게 말해주고 싶다.**

**"별거 아닌 일은 없어. 특히 배포는."**

## 그땐 좋아 보였는데...

### 완벽한 계획 (예상 기간: 1일)

머릿속으로 그린 계획은 완벽했다.

- 트리셰이킹
- CSS 번들
- Type 지원
- 배포 문서
- 자동 배포 시스템

**"배포 말고는 이미 잘 되어 있는거니 별 문제 없겠지?"**

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

### 일단 빌드 부터 해보자!

**빌드 도구 선택: tsup**

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

"자, 이제 빌드만 하면 끝이다."

tsup 설정도 했고, entry point도 지정했고.
터미널에 `pnpm build`를 입력했다.

엔터.

그리고 **1초 만에.**

```
[ERROR] Could not resolve '@styles/patterns'
```

"...뭐?"

빌드가 실패했다. 첫 시도부터 바로 실패.

에러 메시지를 다시 읽어봤다. '@styles/patterns'를 찾을 수 없다고?
분명 개발 환경에서는 잘 동작하고 있었는데...

"아, 빌드 환경에서는 경로가 다른가?"

구글링을 시작했다. `tsup styled-system error`, `panda css build`...

**30분간의 검색 끝에 알게 된 것:**

1. Panda CSS의 `styled-system`은 인스톨 시점에 생성되는 폴더다
2. tsup이 빌드를 실행할 때는 아직 존재하지 않는다
3. `@styles` alias도 tsup이 모른다

**해결책:**

1. 빌드 전에 `panda prepare`를 먼저 실행 → styled-system 폴더 생성
2. esbuildOptions에 alias 경로 직접 지정

첫 번째 벽은 넘었다. 그런데 이게 끝이 아니었다.

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

### SVG 지옥으로의 입장

Panda 문제를 해결하고 다시 빌드를 돌렸다.

이번엔 다른 에러가 떴다.

```
RollupError: "default" is not exported by "src/assets/svgs/common/AddPerson.svg"
```

"이번엔 SVG?"

우리는 SVGR을 사용해서 SVG를 리액트 컴포넌트로 변환하고 있었다.
개발 환경에서는 Vite가 알아서 처리해줬는데, tsup은 몰랐던 것이다.

"이것도 설정 문제겠지. 금방 해결되겠네."

---

**1일차: 타입 설정으로 해결하려 함**

`svg.d.ts` 파일을 만들고, 모듈 타입을 선언했다.

빌드 다시 실행.

같은 에러.

"타입만으로는 안 되나보네..."

---

**2일차: GitHub 이슈 탐색**

`tsup svg error`, `rollup svg not exported`...

관련 이슈들을 10개쯤 읽었다.

- "이거 써보세요" → 우리 상황이랑 다름
- "플러그인 쓰세요" → 버전이 안 맞음
- "그냥 파일로 처리하세요" → 그럼 컴포넌트는?

"나만 이런 문제 겪는 건가...?"

---

**3일차: esbuild 플러그인 직접 작성**

esbuild-plugin-svgr도 써보고,
직접 플러그인도 만들어봤다.

```typescript
// 이것도 해보고, 저것도 해보고...
```

결과: 복잡성만 증가하고 새로운 에러만 발생.

"이거... 완벽하게는 안 되는 거 아닌가?"

3일이 지났다. SVG 타입 하나 때문에.

### 타협 #1: 완벽을 포기하는 순간

3일이 지났다.

SVG 타입 문제는 해결되지 않았다.
더 이상 방법이 떠오르지 않았다.

슬랙 메시지가 왔다.
"진행 어떻게 되고 있어요?"

"아... 이거 언제까지 붙잡고 있을 건가?"

---

**선택의 순간**

완벽한 타입 지원 vs 일단 돌아가는 빌드

머릿속으로 따져봤다:

- 현재 우리 모노레포에서는 타입이 이미 잘 동작하고 있다
- 외부 팀도 IDE에서 타입 추론은 될 것이다
- SVG 타입 몇 개 누락되는 게 치명적인가?

"일단... 돌아가게 만들자."

**결정: 이중 빌드 시스템**

- tsup: 번들링만 담당 (dts: false)
- tsc: 타입 정의 파일만 별도 생성

```typescript
// tsup.config.ts
onSuccess: 'npx tsc --project tsconfig.build.json';
```

빌드를 다시 실행했다.

```
✓ Build success
✓ Type declaration files created
```

"...된다!"

**결과 확인:**

- ✅ 빌드 성공
- ⚠️ SVG 관련 타입 일부 누락
- ⚠️ 몇몇 컴포넌트 타입 미지원
- ✅ 하지만 일단 돌아간다

완벽하진 않았다.
하지만 완벽을 기다리다간 영영 배포 못 할 것 같았다.

"첫 번째 타협이었다."

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

### 타협 #2: "일단 돌아가게"

Panda CSS 스타일이 적용되지 않는 문제.
3가지 방법을 시도했지만 모두 실패했다.

더 이상 방법이 떠오르지 않았다.

"빌드 파이프라인을 처음부터 다시 공부해야 하나...?"

시간과 리소스. 둘 다 부족했다.

**결정: 소스코드를 통째로 넣자**

```json
{
  "files": ["src"]
}
```

styled-system도, 소스코드도, 전부.
최적화는 포기하고 일단 돌아가게.

빌드 성공. 스타일도 적용됨.

"무겁지만... 작동한다."

💡 **"일단 돌아가게 만들자"**

두 번째 타협이었다.

### 20MB 괴물의 탄생

빌드도 됐고, 타입도 생성됐다.

"이제 진짜 거의 다 왔다."

`pnpm pack`으로 최종 패키지를 만들었다.

```
✓ Tarball created: design-system-0.0.2.tgz
```

"자, 사이즈나 한번 볼까?"

터미널에 `ls -lh`를 쳤다.

```
20M design-system-0.0.2.tgz
```

"...20MB?"

눈을 의심했다.

다시 확인했다. 20MB가 맞았다.

"이게... 정상인가?"

---

**비교해보기**

급하게 다른 UI 라이브러리들을 확인했다.

- Mantine (약 120개 컴포넌트): 12MB
- MUI: 5.6MB
- 우리 디자인 시스템 (60개 컴포넌트): **20MB**

"...두 배네."

**패키지 내용 확인:**

압축을 풀어서 들여다봤다.

```
node_modules/
├── src/ (전체 소스코드)
├── styled-system/ (Panda CSS 전체)
├── assets/ (폰트, SVG 전부)
└── ...
```

"아... 소스코드를 통째로 넣어서 그런 거구나."

---

**다시 선택의 순간**

최적화를 다시 시도할까?
아니면 일단 이대로 진행할까?

시계를 봤다. 벌써 2주가 지났다.
슬랙 메시지도 계속 오고 있었다.

"일단... 돌아가는 게 먼저다."

20MB.
무겁지만, 작동은 한다.

"최적화는... 나중에."

두 번째 타협이었다.

## 3주차-1: 실제 서비스 적용 - "CSS 충돌은 예상했지만 이 정도일 줄은..."

### 이제 기존 CSS 통합해보자!

### 불가능한 조합의 현실

"이제 진짜 거의 다 왔다."

로컬 테스트도 성공했다.
이제 실제 서비스에 적용만 하면 된다.

타팀 환경:

- Remix
- Tailwind CSS
- 레거시 전역 CSS

"환경이 좀 다르긴 한데... 뭐 CSS니까 괜찮겠지?"

---

**기존 CSS 파일을 열어본 순간**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .button {
    background: red !important;
    padding: 10px !important;
  }
}

/* layer 없이 직접 작성된 스타일들 */
.some-legacy-class {
  margin: 20px !important;
  color: blue !important;
}
```

"...!important 지옥이네."

온갖 하드코딩 CSS가 `!important`로 도배되어 있었다.
우리 디자인 시스템 스타일이 전부 덮어씌워지고 있었다.

"이거... 어떻게 하지?"

Tailwind의 `@layer` 문법도 섞여있고,
레거시 스타일도 있고,
우리 Mantine + Panda CSS까지.

**세 개의 CSS 시스템이 충돌하고 있었다.**

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

자동 배포 시스템도 거의 다 만들었다.

Changeset으로 버전 관리도 하고,
GitHub Actions로 자동 배포도 설정했다.

"이제 진짜 끝이다!"

워크플로우 파일을 커밋하고 push했다.

---

**10초 후**

GitHub Actions 탭을 열어봤다.

```
✓ Deploy #1
⏳ Deploy #2
⏳ Deploy #3
⏳ Deploy #4
...
```

"...뭐지?"

배포가 계속 실행되고 있었다.
멈출 기미가 없었다.

**20초 후**

```
✓ Deploy #1
✓ Deploy #2
✓ Deploy #3
⏳ Deploy #4
⏳ Deploy #5
⏳ Deploy #6
⏳ Deploy #7
...
```

"미치겠다."

급하게 워크플로우를 수동으로 취소했다.

---

**원인 파악**

로그를 들여다봤다.

1. Actions가 develop 브랜치 push 이벤트에 반응
2. package.json 버전을 자동으로 수정
3. 수정된 파일을 자동 커밋
4. 새 커밋이 다시 push 이벤트 발생
5. 1번부터 다시 반복

**무한 재귀였다.**

"아... 자동 커밋이 다시 push 이벤트를 트리거하는구나."

**해결:**

워크플로우 트리거 조건에 추가:

- Auth가 `github[bot]`이면 바로 종료

다시 push했다.

이번엔 한 번만 실행됐다.

"...드디어."

### 드디어 성공한 배포 자동화 시스템!

무한 재귀를 막고 다시 push했다.

GitHub Actions 탭을 열었다.
이번엔 조심스럽게.

```
⏳ Deploy workflow running...
```

"제발..."

```
✓ Build success
✓ Type check passed
✓ Package published to npm
```

**"...드디어."**

3주 만이었다.

---

**완성된 시스템:**

✅ **버전 관리 자동화**

- PR 머지 시 Changeset이 버전 업데이트

✅ **배포 파이프라인**

- develop 브랜치 push 시 자동 npm 배포

✅ **문서 자동화**

- CHANGELOG 자동 생성
- PR 링크 자동 추가

타팀에 메시지를 보냈다.

"배포 완료했습니다. `npm install @org/design-system`으로 설치 가능합니다."

기획자님의 답장:
"오! 드디어! 고생하셨어요~"

"...하루 걸린다더니 3주 걸렸지만요."

그래도 작동한다.
완벽하진 않지만, 작동한다.

## 에필로그: 3주간의 타협이 가르쳐 준 것

### "별거 아니에요"에서 "해냈습니다"까지

3주 전, 나는 말했다.
"별거 아니에요. 하루면 될 것 같은데요?"

3주 후, 나는 완성했다.
완벽하지 않지만, 작동하는 배포 시스템을.

그 사이에 있었던 것:

- 3번의 타협
- 수십 번의 빌드 실패
- 20MB 괴물 패키지
- 무한 재귀 배포

**그리고 하나의 깨달음.**

---

### 타협한 것들 vs 그래도 성공한 것

| 타협한 것들                                                 | 그래도 성공한 것                                      |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| **타입 지원**<br/>- tsup + tsc 이중빌드<br/>- SVG 타입 누락 | **실제 사용가능**<br/>- remix + tailwind 환경 지원    |
| **CSS 번들**<br/>- 소스코드 통째로                          | **자동 배포 시스템**<br/>- changeset + github actions |
| **가벼운 번들 크기**<br/>- 20MB 괴물                        | **npm 배포 완료**                                     |

완벽하지 않다.
하지만 **작동한다.**

---

### 이 시리즈에서 다룰 이야기들

3주간의 여정에서 부딪힌 문제들을 하나씩 깊게 파헤칠 예정입니다:

**🔧 빌드 & 번들링**

- tsup으로 라이브러리 번들링하기
- SVG 타입 문제 해결기
- 이중 빌드 시스템 구축

**📦 패키지 & 배포**

- pnpm pack으로 로컬 테스트
- package.json exports 가이드
- 번들 사이즈 최적화

**🎨 스타일링 & CSS**

- Panda CSS 빌드 결과물 배포
- @layer로 CSS 우선순위 제어
- 세 개의 CSS 시스템 공존시키기

**🚀 자동화 & CI/CD**

- Changeset + GitHub Actions
- npm 배포 자동화
- 무한 재귀 워크플로우 해결

어떤 주제가 먼저 나올지는... 제 기분 따라 정하겠습니다. (아니면 댓글로 요청해주세요!)

---

### 3주간의 타협이 가르쳐 준 것

**타협 #1: 완벽한 타입 → 일단 작동하는 타입**

- 현실: SVG 타입 생성 불가능
- 근거: 모노레포에서는 이미 타입 지원됨
- 결정: tsc로 타입만 별도 생성

**타협 #2: 최적화된 번들 → 일단 작동하는 번들**

- 현실: 빌드 최적화 시간 vs 배포 일정
- 근거: 초기 목표는 "작동하는 배포"
- 결정: 최적화는 나중에

**타협 #3: 완벽한 호환 → 점진적 마이그레이션**

- 현실: 다른 프레임워크 + CSS 라이브러리 + !important
- 근거: 운영 중인 서비스, 한번에 뒤엎기엔 위험
- 결정: 천천히 하나씩 수정

**세 번의 타협 덕분에 배포는 완성될 수 있었습니다.**

---

### 마지막으로

의사결정에서 중요한 건 **'정답'** 이 아니라 **'왜 그렇게 결정했는가'** 라는 근거입니다.

"별거 아니에요"라고 말했던 그날로부터 3주.

완벽하지는 않다. 20MB짜리 패키지, 누락된 타입, 수동으로 고쳐야 할 CSS들.

하지만 **작동한다.** 다른 팀이 사용할 수 있고, 자동으로 배포되고, 점진적으로 개선할 수 있다.

이 과정에서 배운 가장 중요한 것:

**"별거 아닌 일은 없다. 하지만 완벽하지 않아도 배포할 수 있다."**

---

누군가는 이 글을 보고 같은 삽질을 하지 않기를,
그리고 혹시 삽질 중이라면 "나만 이런 게 아니구나"라고 위로받기를 바랍니다.
