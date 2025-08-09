# Next.js 테스트 기준 및 작성 가이드라인

Next.js 코드베이스를 분석한 결과, 다음과 같은 테스트 기준과 작성 표준을 정리했습니다.

## 테스트 유형별 분류 기준

### 1. 단위 테스트 (Unit Tests) - `test/unit/`
**용도**: 특정 함수나 유틸리티의 로직을 빠르게 검증
**기준**:
- 브라우저나 Next.js 서버 없이 실행 가능한 테스트
- 단일 함수/모듈의 입력-출력 검증
- 실행 시간이 매우 빠름 (밀리초 단위)
- 외부 의존성 최소화

**예시**: 
- `next-image-get-img-props.test.ts`: Image 컴포넌트의 props 변환 로직
- `htmlescape.test.ts`: HTML 이스케이프 함수
- `page-route-sorter.test.ts`: 라우트 정렬 알고리즘

### 2. E2E 테스트 (End-to-End) - `test/e2e/`
**용도**: 실제 브라우저에서 사용자 시나리오 검증
**기준**:
- `next dev`, `next start`, Vercel 배포 환경에서 실행
- 브라우저 자동화 필요
- 완전한 Next.js 애플리케이션 테스트
- 실제 사용자 워크플로우 검증

**예시**:
- `next-script/index.test.ts`: Script 컴포넌트의 브라우저 동작
- `app-dir/app/index.test.ts`: App Router 기본 기능

### 3. 개발 환경 테스트 (Development) - `test/development/`
**용도**: `next dev` 환경의 개발 전용 기능 검증
**기준**:
- HMR (Hot Module Replacement) 테스트
- 개발 서버 에러 오버레이
- 파일 감시 및 자동 리로드
- TypeScript 컴파일 오류 처리

**예시**:
- `hmr/` 디렉토리: Hot Module Replacement 기능
- `error-overlay/`: 개발 환경 에러 표시

### 4. 프로덕션 테스트 (Production) - `test/production/`
**용도**: `next build` + `next start` 환경 검증
**기준**:
- 빌드 최적화 검증
- 프로덕션 성능 측정
- 캐싱 동작 확인
- SEO 및 메타데이터 검증

## 테스트 작성 표준

### 파일명 규칙
- **단위 테스트**: `*.test.ts` 또는 `*.test.tsx`
- **E2E 테스트**: `index.test.ts` (기능별 디렉토리 내)
- **TypeScript 우선**: 모든 새 테스트는 TypeScript로 작성

### 테스트 구조 패턴

```typescript
// E2E 테스트 표준 구조
import { nextTestSetup } from 'e2e-utils'

describe('기능명', () => {
  const { next } = nextTestSetup({
    files: __dirname,
    // 추가 설정...
  })

  it('특정 동작을 검증한다', async () => {
    // 테스트 로직
  })
})
```

### 테스트 격리 원칙
- **완전 격리**: E2E 테스트는 임시 디렉토리에서 실행
- **nextTestSetup**: 자동으로 Next.js 설치본을 생성
- **포트 할당**: 랜덤 포트로 충돌 방지
- **정리**: 테스트 완료 후 자동으로 파일 삭제

## 주요 테스트 유틸리티

### 1. nextTestSetup
**용도**: E2E 테스트를 위한 격리된 Next.js 환경 생성

```typescript
const { next } = nextTestSetup({
  files: __dirname,           // 테스트 파일들이 있는 디렉토리
  dependencies: {...},        // 추가 패키지 의존성
  env: {...},                // 환경 변수
})
```

### 2. 브라우저 테스트 메서드
```typescript
// HTML 파싱 (빠름)
const $ = await next.render$('/')
expect($('p').text()).toBe('hello world')

// 실제 브라우저 (상호작용 필요시)
const browser = await next.browser('/')
expect(await browser.elementByCss('p').text()).toBe('hello world')

// fetch API (네트워크 응답 검증)
const res = await next.fetch('/')
expect(res.status).toBe(200)
```

### 3. 개발 환경 전용 유틸리티
- **development-sandbox**: HMR 테스트를 위한 파일 수정 도구
- **waitForHydration**: 클라이언트 하이드레이션 대기
- **에러 오버레이 검증**: Redbox 에러 표시 확인

## 테스트 선택 기준

### 단위 테스트를 선택하는 경우:
- ✅ 순수 함수나 유틸리티 테스트
- ✅ 수학적 계산이나 문자열 처리
- ✅ 데이터 변환 로직
- ✅ 조건부 로직 검증

### E2E 테스트를 선택하는 경우:
- ✅ 사용자 인터랙션 검증
- ✅ 페이지 렌더링 확인
- ✅ 라우팅 동작 테스트
- ✅ 브라우저 API 사용 기능
- ✅ 통합된 워크플로우 테스트

### 개발/프로덕션 테스트 구분:
- **개발 전용**: HMR, 에러 오버레이, 파일 감시
- **프로덕션 전용**: 빌드 최적화, 캐싱, 성능

## 실제 사용 예시

### Script 컴포넌트 테스트 사례
```typescript
// beforeInteractive 전략이 서버사이드에서 올바르게 주입되는지 확인
it('Script is injected server-side', async () => {
  const html = await next.render('/')
  expect(html).toContain('lodash.min.js')
  expect(html).toContain('beforeInteractive')
})
```

### Image 컴포넌트 단위 테스트
```typescript
// props 변환 로직의 정확성 검증
it('should return props in correct order', async () => {
  const { props } = getImageProps({
    alt: 'a nice desc',
    src: '/test.png',
    width: 100,
    height: 200,
  })
  expect(props.alt).toBe('a nice desc')
  expect(props.srcSet).toContain('_next/image')
})
```

## 테스트 환경 변수

### 디버깅을 위한 환경 변수
```bash
# 테스트 후 임시 파일 유지 (디버깅용)
NEXT_TEST_SKIP_CLEANUP=1 pnpm test-dev test/path/

# 격리 없이 repo 내에서 실행 (빠른 디버깅)
NEXT_SKIP_ISOLATE=1 pnpm test-dev test/path/

# 오프라인 모드로 테스트
NEXT_TEST_PREFER_OFFLINE=1 pnpm test-dev test/path/
```

### 테스트 실행 명령어
```bash
# 개발 환경 테스트
pnpm test-dev test/e2e/app-dir/app/

# 프로덕션 환경 테스트
pnpm test-start test/e2e/app-dir/app/

# Turbopack으로 테스트
pnpm test-dev-turbo test/e2e/app-dir/app/

# 브라우저 창 표시하며 디버깅
pnpm testonly-dev test/e2e/app-dir/app/
```

## 베스트 프랙티스

### 테스트 작성 시 주의사항
1. **조건부 대기**: `check` 유틸리티나 `waitForElement` 사용
2. **실패 검증**: 수정 전에 테스트가 실패하는지 확인
3. **격리 보장**: 테스트 간 상태 공유 금지
4. **타임아웃 관리**: 비동기 작업의 적절한 타임아웃 설정

### 성능 고려사항
- **단위 테스트**: 가장 빠르고 자주 실행
- **E2E 테스트**: 무거우므로 핵심 시나리오만 선별
- **병렬 실행**: Jest의 병렬 처리 활용
- **캐싱**: 불필요한 재빌드 방지

이러한 기준을 따라 Next.js는 안정성과 성능을 보장하는 포괄적인 테스트 스위트를 유지하고 있습니다.