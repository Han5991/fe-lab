# 모노레포 디자인 시스템 NPM 배포하기: 3주간의 우여곡절

> 모노레포에서 디자인 시스템을 NPM 패키지로 배포하는 실전 가이드. pnpm pack, SVGR 문제, CSS Layer 등 3주간의 삽질 경험을 체크리스트와 함께 공유합니다.

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

---

## 1단계: 사전 준비 - 삽질을 줄이는 현명한 시작

### 🎯 핵심 깨달음: 파이프라인보다 빠른 피드백이 우선이다

가장 먼저 한 일은 GitHub Actions 파이프라인 설계가 아니었다. **`pnpm pack`이었다.**

```bash
# 디자인 시스템 패키지에서
pnpm build
pnpm pack

# 테스트 프로젝트에서
npm install ../design-system/design-system-ui-1.0.0.tgz
```

**왜 이게 중요했나?**

- 🚀 **빠른 피드백**: 빌드 → 패킹 → 설치 → 테스트가 1분 내로 완료
- 🔍 **실제 환경 시뮬레이션**: npm 설치 과정에서 발생할 문제들을 미리 발견
- 💡 **삽질 방지**: 파이프라인 구축하고 나서 문제 발견하면 더 복잡해짐

### ✂️ 방해 요소 제거: "지금 하는 것만으로도 벅차다"

두 번째로 한 일은 **과감한 제거**였다.

```bash
# 기존 CSS 파일들 임시 삭제
rm -rf src/styles/legacy
# 복잡한 설정들 주석 처리
# 일단 돌아가는 것부터
```

**제거한 것들:**

- 기존 레거시 CSS (나중에 다시 추가하기로)
- 복잡한 Webpack 설정 (기본 설정으로 시작)
- 불필요한 최적화 옵션들

**교훈**: 완벽함을 추구하다가 3주를 날리지 말고, 일단 동작하게 만들자.

### 📋 1단계 체크리스트

**🔥 필수 준비사항**

```bash
# 1. 로컬 테스트 환경 구축
□ 빈 Next.js/React 프로젝트 생성 (테스트용)
□ pnpm pack 명령어 테스트
□ .tgz 파일 압축 해제해서 내용물 확인

# 명령어 예시
mkdir design-system-test && cd design-system-test
npx create-next-app@latest . --typescript --tailwind --app
```

**⚠️ 미리 확인해야 할 것들**

```bash
# 2. 현재 모노레포 구조 파악
□ workspace: 의존성들 목록 작성
□ 외부 라이브러리 vs 내부 패키지 구분
□ 정적 에셋 파일들 위치 확인

# 유용한 명령어들
find . -name "*.json" | xargs grep "workspace:"  # workspace 의존성 찾기
du -sh node_modules/*/                          # 패키지별 크기 확인
```

**🧹 방해 요소 제거 체크리스트**

```bash
□ 레거시 CSS 파일 임시 이동
□ 복잡한 빌드 설정 주석 처리
□ 불필요한 dev dependencies 확인
```

---

## 2단계: 빌드 시스템 구축 - 모듈 지옥과 20MB 괴물의 탄생

### 💀 첫 번째 함정: SVGR의 배신

```typescript
// 모노레포에서는 잘 되던 이것이...
import { IconArrow } from '@/assets/icons/arrow.svg'

// 빌드할 때는...
❌ Error: Cannot find module '@/assets/icons/arrow.svg' or its corresponding type declarations
```

**시도한 것들:**

1. **tsup과 SVGR 통합** → 설정 지옥에 빠짐
2. **Webpack 플러그인** → 모듈 시스템 충돌
3. **Vite 설정 차용** → 결국 실패

**결국 선택한 우회책:**

```bash
# SVG는 별도로 tsc로 컴파일
tsc --project tsconfig.svg.json
# 나머지는 tsup으로
tsup src/index.ts
```

**💸 현실적 타협의 대가:**

- ✅ 일단 빌드는 됨
- ❌ **SVG 타입 정의가 불완전** (지금도 해결 못함)
- ❌ 개발자가 import할 때 자동완성 부족
- ❌ 런타임에서만 에러 발견 가능

### 🐘 두 번째 충격: 20MB 괴물의 정체

`pnpm pack` 후 tgz 파일을 열어봤을 때의 충격.

```bash
$ tar -tf design-system-ui-1.0.0.tgz | head -20

package/dist/assets/fonts/Pretendard-Bold.woff2     # 2.1MB
package/dist/assets/fonts/Pretendard-Regular.woff2  # 1.8MB
package/dist/assets/fonts/Pretendard-Medium.woff2   # 1.9MB
package/dist/assets/icons/icon-arrow.svg           # 2KB
package/dist/assets/icons/icon-close.svg           # 1KB
package/dist/assets/icons/... (100개 더)
package/dist/assets/images/logo.png                # 500KB
package/dist/assets/images/background.jpg          # 3.2MB
```

**범인은 에셋 파일들이었다.**

**왜 이렇게 됐나?**

- 모노레포에서는 `public` 폴더에 있던 정적 파일들
- 빌드 도구가 "사용되는 모든 것"을 번들에 포함
- 폰트 파일까지 전부 패키지에 들어감

**임시 해결책:**

```json
// package.json
{
  "files": [
    "dist/**/*",
    "!dist/assets/fonts/**", // 폰트는 제외
    "!dist/assets/images/**" // 이미지도 제외
  ]
}
```

**💸 또 다른 현실적 타협:**

- ✅ 패키지 크기 20MB → 5MB로 감소
- ❌ **사용자가 폰트를 별도로 설치**해야 함 (CDN으로 해결 예정)
- ❌ 아이콘이 깨질 수 있음
- ❌ 완전한 디자인 시스템이 아님

### 📋 2단계 체크리스트

**📦 빌드 도구 설정**

```typescript
// tsup.config.ts 기본 설정
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  // 🚨 주의: external 설정 신중하게!
});
```

**🎯 빌드 확인 체크리스트**

```bash
□ pnpm build 성공 확인
□ dist/ 폴더 내용물 검토
□ .d.ts 파일 정상 생성 확인
□ package.json exports 필드 설정

# 빌드 결과 분석 명령어
ls -la dist/                    # 빌드 결과 파일들
wc -c dist/*.js                 # 번들 크기 확인
```

**🔍 SVGR 관련 우회책**

```bash
# TypeScript 별도 컴파일이 필요한 경우
□ tsconfig.json 분리 생성
□ tsc 명령어로 타입 파일 생성
□ 빌드 스크립트에 추가

# package.json scripts 예시
"build": "tsup && tsc --project tsconfig.types.json"
```

---

## 3단계: 배포 파이프라인 구축 - Changeset과 GitHub의 만남

### 🔥 첫 번째 위기: npm scope의 함정

빌드가 성공했으니 이제 배포만 하면 끝이라고 생각했다. **순진했다.**

```bash
$ pnpm changeset publish
❌ 403 Forbidden: You do not have permission to publish "@design-system/ui"
```

**문제의 원인:**

- 기존 패키지명: `@design-system/ui`
- GitHub npm registry에서는 **조직명이 scope와 일치**해야 함
- 내 개인 계정으로는 `@design-system` scope 사용 불가

**시도한 해결책들:**

1. **개인 토큰으로 시도** → 권한 부족
2. **GitHub 조직 생성** → 기존 코드베이스 전체 수정 필요
3. **scope 변경** → 모노레포 전체 import 수정 지옥

**결국 선택한 현실적 타협:**

```bash
# 전체 모노레포에서 import 경로 대수술
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/@design-system\/ui/@my-org\/design-system-ui/g'
```

**💸 타협의 대가:**

- ✅ 배포는 성공
- ❌ **모든 기존 import 변경** (100+ 파일)
- ❌ 기존 PR들과 충돌 발생
- ❌ 팀원들 혼란

### 🔄 두 번째 악몽: GitHub Actions 무한 재귀

배포는 됐는데 이번엔 Actions가 미쳤다.

```yaml
# .github/workflows/release.yml
on:
  push:
    branches: [main]

jobs:
  release:
    steps:
      - run: pnpm changeset version # 이게 새 커밋을 만듦
      - run: pnpm changeset publish
      - run: git push # 이게 또 push 이벤트를 발생시킴
```

**결과:**

```
14:32 - Release v1.0.1 triggered
14:33 - Release v1.0.2 triggered
14:34 - Release v1.0.3 triggered
14:35 - Release v1.0.4 triggered
...
```

**해결책:**

```yaml
on:
  push:
    branches: [main]
    paths-ignore:
      - 'package.json'
      - 'CHANGELOG.md'
      - '.changeset/**'
```

**교훈**: Actions 설정할 때 **재귀 트리거**를 반드시 고려해야 한다.

### 📋 3단계 체크리스트

**🔑 권한 및 설정 준비**

```bash
# npm scope 확인
□ 조직 이름과 scope 일치 여부 확인
□ GitHub 토큰 생성 및 권한 설정
□ package.json name 필드 최종 확인

# scope 변경이 필요한 경우
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/@old-scope/@new-scope/g' {} +
```

**⚙️ GitHub Actions 설정**

```yaml
# 무한 재귀 방지 필수 설정
on:
  push:
    branches: [main]
    paths-ignore:
      - 'package.json'
      - 'CHANGELOG.md'
      - '.changeset/**'
```

**📝 Changeset 체크리스트**

```bash
□ changeset 초기화: npx @changesets/cli init
□ 첫 changeset 파일 생성
□ 버전 정책 결정 (major.minor.patch)
□ CHANGELOG.md 포맷 확인
```

---

## 4단계: 외부 서비스 적용 - 이론과 현실의 괴리

### 💥 타겟: Remix + Tailwind + Mantine의 삼중 지옥

배포까지 성공했으니 이제 실제 서비스에 적용만 하면 끝이라고 생각했다. **또 순진했다.**

**타겟 환경:**

- **Remix** (React 프레임워크)
- **Tailwind CSS** (기존 스타일링)
- **Mantine** (UI 라이브러리)
- **+ 우리의 Panda CSS** (디자인 시스템)

**첫 번째 시도:**

```bash
npm install @my-org/design-system-ui
```

```tsx
import { Button } from '@my-org/design-system-ui';

function App() {
  return <Button>클릭</Button>; // 🎨 스타일이 전혀 안 됨
}
```

### 😫 CSS 적용 안 되는 지옥

**시도한 해결책들:**

**1차: 스타일시트 import**

```tsx
import '@my-org/design-system-ui/dist/styles.css';
```

- 결과: 빈 CSS 파일 (Panda가 제대로 생성 안 함)

**2차: PostCSS 설정**

```javascript
// postcss.config.js에 Panda CSS 추가
module.exports = {
  plugins: {
    '@pandacss/dev/postcss': {},
    // 기존 tailwind 설정들...
  },
};
```

- 결과: 빌드 에러의 향연

**3차: 현실적 타협 - "소스코드 통째로"**

```javascript
// tsup.config.ts
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  external: [], // 모든 의존성 번들에 포함!
});
```

**💡 성공 이유:**

- styled-system까지 통째로 패키지에 포함됨
- Panda CSS의 런타임 함수들이 번들에 들어있어서 스타일 생성 가능
- **비효율적이지만 확실한 동작 보장** (지금도 제대로 해결 못함)

### ⚔️ CSS 우선순위 전쟁

스타일이 적용됐는데 이번엔 **기존 CSS와 충돌**.

```css
/* 기존 Tailwind */
.button {
  background: blue;
  padding: 8px;
}

/* 우리 Panda CSS */
.css-button {
  background: green;
  padding: 12px;
}

/* 결과: Tailwind가 이김 😭 */
```

**최종 해결: CSS Layer**

```css
/* 패키지 CSS에 추가 */
@layer design-system {
  .css-button {
    background: green;
    padding: 12px;
  }
}

/* 기존 프로젝트 CSS */
@layer base, tailwind, design-system;
```

**🎉 유일한 완전 성공작!**

- CSS 우선순위 완벽 제어
- 기존 스타일과 공존 가능
- 예측 가능한 스타일 적용

### 📋 4단계 체크리스트

**🎨 CSS 충돌 해결**

```css
/* 1. CSS Layer 우선순위 설정 */
@layer base, components, utilities, design-system;

/* 2. 패키지 CSS에 layer 감싸기 */
@layer design-system {
  .your-component-styles { ... }
}
```

**📋 적용 전 확인사항**

```bash
□ 기존 프로젝트 CSS 프레임워크 확인
□ PostCSS 설정 충돌 여부 검토
□ Bundle analyzer로 중복 패키지 확인

# 유용한 디버깅 명령어
npm ls | grep -E "(styled|css|postcss)"  # CSS 관련 패키지 확인
```

**🔧 트러블슈팅 체크리스트**

```bash
□ 스타일 적용 안 됨 → 개발자 도구에서 CSS 로드 확인
□ JavaScript 에러 → 의존성 버전 호환성 점검
□ 빌드 에러 → 모듈 시스템 (CJS/ESM) 확인
```

---

## 5단계: 운영과 개선 - 20MB → 300KB 로드맵

### 📊 현재 상태 진단: 동작하지만 불완전한 시스템

**✅ 성공한 것들:**

- 타팀에서 디자인 시스템 사용 가능
- CSS Layer로 스타일 충돌 해결
- GitHub Actions 자동 배포 구축

**❌ 아직 해결 못한 것들:**

- **SVG 타입 지원 불완전** (런타임에서만 에러 발견)
- **번들 크기 여전히 비효율적** (styled-system 통째로 포함)
- **Tree shaking 전혀 안 됨**

### 🛣️ 개선 로드맵: 현실적 우선순위

**1순위: 번들 최적화 (20MB → 300KB 목표)**

```bash
# 현재 상태
- 전체 패키지: 5MB (폰트 제거 후)
- JavaScript 번들: 2.8MB
- styled-system 중복: 1.5MB

# 계획
- 외부 dependencies로 styled-system 분리
- Tree shaking 가능한 구조로 리팩토링
- CDN 폰트 연결로 추가 크기 절약
```

**2순위: SVG 타입 완성도**

```typescript
// 목표: 이런 경험 제공
import { IconArrow } from '@my-org/design-system-ui/icons';
//      ^^^^^^^^^ 자동완성 지원, 컴파일 타임 에러 검출
```

**3순위: 개발자 경험 개선**

- 설치 가이드 문서화
- Storybook 연동
- 업데이트 알림 시스템

### 📢 팀 전파 방법: "육성으로 한다"

**현재 업데이트 프로세스:**

1. 변경사항 슬랙 채널 공지
2. **"업데이트 해주세요!" 직접 멘션**
3. 문제 생기면 바로 핫픽스

**왜 이 방법을 선택했나?**

- 자동화된 알림 시스템 구축할 시간 부족
- **확실한 의사소통이 우선**
- 팀 규모가 작아서 가능한 방법

**💡 교훈: 완벽한 자동화보다 확실한 소통이 더 중요할 때도 있다.**

### 📋 5단계 체크리스트

**📊 성능 모니터링**

```bash
# 번들 크기 추적
□ Bundle Analyzer 설치 및 정기 체크
□ 각 릴리스별 크기 변화 기록
□ Tree shaking 효과 측정

# 분석 도구들
npx webpack-bundle-analyzer dist/
npm audit                              # 보안 취약점 체크
```

**🔄 업데이트 프로세스**

```bash
□ 변경사항 문서화 템플릿 작성
□ 브레이킹 체인지 체크리스트 준비
□ 팀 공지 프로세스 정립
```

---

## 🎯 최종 성과와 다음 스텝

**3주간 달성한 것:**

- ✅ 모노레포 디자인 시스템 NPM 배포 성공
- ✅ 외부 서비스 적용 완료
- ✅ 자동 배포 파이프라인 구축
- ✅ **팀이 실제로 사용할 수 있는 시스템** 완성

**앞으로 해야 할 것:**

- 번들 최적화를 통한 성능 개선
- 개발자 경험 향상
- 더 많은 컴포넌트 추가

---

## 에필로그: 3주의 교훈과 당신을 위한 조언

### 💭 되돌아보며: "별거 아니겠지"에서 배운 것들

**가장 큰 깨달음:**

> **완벽한 해결책을 기다리지 말고, 팀 상황에 맞는 실용적 선택을 하라.**

3주 전의 나는 "하루면 되겠지"라고 생각했다. 지금의 나는 안다. 별거 아닌 일은 없다는 걸.

하지만 동시에 이것도 안다. **포기하지 않으면 결국 해낼 수 있다는 걸.**

### 🎯 당신이 같은 길을 걸을 때

**만약 당신도 모노레포 디자인 시스템을 NPM으로 배포해야 한다면:**

**✅ 꼭 해야 할 것들:**

- `pnpm pack`으로 로컬 테스트 환경부터 구축
- npm scope와 조직명 일치 여부 미리 확인
- CSS Layer로 스타일 우선순위 제어
- GitHub Actions 무한 재귀 방지 설정

**❌ 피해야 할 함정들:**

- 처음부터 완벽한 Tree shaking 추구하지 말기
- SVGR 설정에서 너무 많은 시간 소모하지 말기
- 배포 파이프라인부터 만들려고 하지 말기

**💡 현실적 타협을 두려워하지 마세요:**

- "소스코드 통째로" 방식도 때로는 정답
- "육성으로 알리기"도 확실한 방법
- 20MB → 5MB도 충분한 진전

### 🚀 지금 바로 시작할 수 있는 액션 아이템

**이 글을 읽는 지금, 당신이 할 수 있는 것:**

#### 🚀 지금 바로 해볼 수 있는 1분 테스트

```bash
cd your-design-system-package
pnpm build && pnpm pack
ls -la *.tgz  # 파일 크기 확인해보세요!
```

1. **10분 투자**: 현재 모노레포에서 `pnpm pack` 해보기
2. **30분 투자**: 빈 프로젝트 만들어서 로컬 설치 테스트
3. **1시간 투자**: package.json exports 필드와 scope 설정 검토

**더 깊이 들어가고 싶다면:**

- 이 글의 체크리스트를 프린트해서 단계별로 진행
- 문제 생기면 댓글로 질문하기 (함께 해결해봅시다!)
- 성공하면 경험담 공유하기

### 💬 마지막 당부

**기획자가 다가와서 "이거 다른 팀에서도 쓸 수 있게 해주세요"라고 말할 때,**

"별거 아니라고 하지 마세요!"라고 대답하세요. 😄

그리고 이 글을 기억하세요. 누군가는 이미 그 길을 걸어봤고, 당신이 같은 삽질을 하지 않도록 체크리스트를 준비해뒀다는 걸.

**함께 성장하는 개발 문화를 만들어가요.**

---

**📢 독자 액션 유도**

- **지금 바로**: 당신의 모노레포에서 `pnpm pack` 실행해보기
- **댓글로**: 비슷한 경험이나 다른 해결책 공유하기
- **공유하기**: 같은 고민하는 팀원들에게 이 글 전달하기

**다음 글 예고**: "20MB → 300KB 최적화 여정: Tree shaking과 SVG 타입 완성도"편에서 만나요! 🚀
