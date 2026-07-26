---
title: 'React 에러 구조 설계: throw만으로 선언적 에러 핸들링 하기'
date: '2025-10-14'
status: published
slug: 'react-error-deign'
thumbnail: '/og/react-error-deign.png'
---

## 0. 프롤로그

> `throw`를 보던중 문득 깨달았다.
>
> ```typescript
> try {
>   throw new Error('error');
> } catch (error) {
>   throw error; // 상위로 전파된다
> }
> ```
>
> 에러는 계층을 따라 전파된다.
> 그럼 에러 클래스도 계층 구조로 설계할 수 있지 않을까?
>
> ```
> 깊게: Error → ApiError → HttpError → NotFoundError → StatsNotFoundError
> 넓게: Error → ApiError → StatsError, ChartError, ActivityError
> ```
>
> ErrorBoundary에서 `instanceof`로 잡으려면 되지 않을까?

## 1. 에러를 어떻게 설계 할 것인가?

### 1.1. 문제: 모든 에러가 똑같이 보인다

```typescript
// 세 개의 API - 각각 다른 섹션 데이터
const getDashboardStats = async () => {
  /* ... */
};
const getChartData = async () => {
  /* ... */
};
const getActivities = async () => {
  /* ... */
};
```

에러가 발생하면?

```tsx
componentDidCatch(error: Error) {
  // 😰 이게 통계 에러야? 차트 에러야? 활동 에러야?
  // instanceof Error 하면 전부 true - 구분 불가능
}
```

**문제점**: ErrorBoundary에서 섹션별 처리 불가, 디버깅 어려움

### 1.2. 왜 클래스 설계인가?

프롤로그에서 본 계층 구조를 실제로 구현하려면 **클래스 상속**이 필요하다.

```
Error (JavaScript 내장)
  ↓
ApiError (Base)
  ↓
├─ StatsError
├─ ChartError
└─ ActivityError
```

**상속 구조의 장점**

1. **instanceof로 타입 체크**

   ```typescript
   if (error instanceof StatsError) {
     // StatsError만 처리
   }
   ```

2. **계층적 ErrorBoundary 설계**

   ```
   StatsErrorBoundary: StatsError만 캐치
   GlobalErrorBoundary: ApiError 전체 캐치
   ```

3. **공통 속성 관리**
   ```
   ApiError에 statusCode, code 정의
   하위 클래스들이 자동으로 상속
   ```

**클래스 상속이 있어야 얕고 넓은 구조를 만들 수 있다.**

```typescript
const getDashboardStats = async () => {
  try {
    const response = await instance.get('/api/dashboard/stats');
    return response.data;
  } catch (error: unknown) {
    if (isHttpError(error)) {
      throw new StatsError(
        error.response?.data?.message ||
          '통계 데이터를 불러오는데 실패했습니다',
        error.response?.data?.error,
      );
    }
    throw error;
  }
};
```

**개선점**: `instanceof StatsError`로 타입 구분 가능, ErrorBoundary 선택적 처리

**핵심**: try-catch로 Error을 잡아서, 커스텀 에러 클래스로 변환해서 throw

### 1.3. throw vs return?

에러를 변환하기로 했다. 그런데 질문이 하나 생긴다.

**"변환한 에러를 throw 해야 할까, return 해야 할까?"**

> **나는 throw를 선호한다.**  
> 코드 리뷰를 하다 보면, return error 방식에서 자잘한 버그를 너무 자주 봤다.  
> 에러를 return 값으로 넘겼는데 중간에 체크를 빠뜨리거나, 조건문 분기가 복잡해지는 경우가 많았다.
>
> throw는 명료하다. 에러가 발생하면 자동으로 전파되고, 중간 계층은 신경 쓸 필요가 없다.

**두 가지 선택지**

**방식 1: throw**

```typescript
const getDashboardStats = async () => {
  try {
    const response = await instance.get('/api/dashboard/stats');
    return response.data;
  } catch (error) {
    throw new StatsError(/*...*/); // 👈 throw
  }
};
```

**방식 2: return error**

```typescript
const getDashboardStats = async () => {
  try {
    const response = await instance.get('/api/dashboard/stats');
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: new StatsError(/*...*/) }; // 👈 return
  }
};
```

두 방식 모두 가능하다. 선언적으로 Error을 핸들링하기 위해선 **throw가 더 적합**하다. 왜 그럴까?

### 1. 흐름 제어가 간단하다

**return error 방식의 문제:**

```typescript
const useStats = async () => {
  const result = await getDashboardStats();
  if (result.error) return result; // 매번 체크

  const processed = processData(result.data);
  if (processed.error) return processed; // 또 체크

  return processed;
};
```

함수 체인의 모든 단계에서 에러를 체크해야 한다. 코드가 길어지고, 실수하기 쉽다.

**throw 방식의 장점:**

```typescript
const useStats = async () => {
  const result = await getDashboardStats(); // 에러나면 자동으로 throw
  return processData(result); // 깔끔!
};
```

에러가 발생하면 자동으로 상위로 전파된다. 일일이 `if (error)` 체크할 필요 없다.

### 2. 계층 간 유연한 통합

React 애플리케이션의 계층 구조를 보자:

```
Component (ErrorDesignPage)
    ↓
Hook (useDashboardStats)
    ↓
API (getDashboardStats)
    ↓
SectionErrorBoundary
    ↓
ErrorBoundary
```

**throw를 사용하면:**

- Component는 에러를 몰라도 된다 (선언적으로 사용)
- Hook도 에러 처리 코드가 필요 없다
- API 레이어에서만 에러를 변환
- ErrorBoundary가 자동으로 캐치

**핵심**: 중간 계층들이 에러를 props나 return으로 전달할 필요 없이, throw만 하면 ErrorBoundary까지 자동으로 전파된다.

### 3. React ErrorBoundary와의 시너지

React Query + Suspense + ErrorBoundary 조합을 보자:

```tsx
// API → Hook → Component → ErrorBoundary 자동 전파
export const useDashboardStats = () =>
  useSuspenseQuery({ queryFn: getDashboardStats });

<StatsErrorBoundary>
  <Suspense fallback={<Loading />}>
    <StatsSection />
  </Suspense>
</StatsErrorBoundary>;
```

## 2. 계층 구조 설계하기

커스텀 에러 클래스를 만들기로 했다. 그럼 어떻게 설계해야 할까?

### 2.1. Base 클래스: 왜 ApiError인가?

먼저 base 클래스가 필요하다.

```typescript
export class ApiError extends Error {
  code?: string;
  status?: number;

  constructor(
    message: string,
    opts?: { code?: string; status?: number; cause?: unknown },
  ) {
    super(message, { cause: opts?.cause });
    this.name = new.target.name; // 정확한 클래스명
    this.code = opts?.code;
    this.status = opts?.status;
    if (Error.captureStackTrace) Error.captureStackTrace(this, new.target);
  }
}
```

**왜 `Error`를 직접 상속하지 않고 `ApiError`를 만들었을까?**

JavaScript의 기본 `Error` 클래스는 `message`만 있다.
하지만 API 에러는 더 많은 정보가 필요하다:

- **statusCode**: HTTP 상태 코드 (500, 404, 401 등)
- **code**: 비즈니스 에러 코드 ('STATS_ERROR', 'AUTH_ERROR' 등)

이 정보들이 있어야:

- 에러별로 다른 처리를 할 수 있고
- 디버깅할 때 원인을 빠르게 파악할 수 있다

### 2.2 상속 구조와 ErrorBoundary 전략

이제 핵심이다. 앞서 그렸던 계층을 **책임 관점**으로 정리하면 다음과 같다.

| 계층     | 예시 타입                                   | 담당 Boundary                       | 주 역할                 |
| -------- | ------------------------------------------- | ----------------------------------- | ----------------------- |
| 최상위   | `Error`                                     | 최상위 `ErrorBoundary`              | 예상 밖 에러 안전망     |
| 공통 API | `ApiError`                                  | `GlobalErrorBoundary` (필요시 사용) | ApiError 공통 처리      |
| 도메인   | `StatsError`, `ChartError`, `ActivityError` | 각 섹션 Boundary                    | 섹션별 복구 UI, UX 유지 |

**이 구조 덕분에 ErrorBoundary를 설계할 수 있다:**

#### 패턴 1: 전역 ErrorBoundary (모든 API 에러 캐치)

```typescript
if (error instanceof ApiError) {
  // 모든 API 에러를 여기서 처리
  // 공통 로깅, 공통 fallback UI
}
```

#### 패턴 2: 섹션별 ErrorBoundary (특정 에러만 캐치)

```typescript
// StatsErrorBoundary
if (error instanceof StatsError) {
  // 통계 섹션만 fallback
  // 다른 섹션은 정상 동작
} else {
  throw error; // 다른 에러는 상위로 전파
}
```

#### 패턴 3: 계층적 ErrorBoundary

```
AppErrorBoundary (Error 캐치)
  └─ GlobalErrorBoundary (ApiError 캐치, 선택)
        └─ StatsErrorBoundary (StatsError만 캐치)
             └─ Component
```

**핵심**: 상속 구조 = ErrorBoundary 전략. `instanceof`로 에러 레벨 구분, 특정 에러만 잡고 나머지는 상위로 전파. 통계 섹션이 터져도 다른 섹션은 정상 동작한다.

## 3. 도메인별 에러 클래스 구현

설계는 끝났다. 이제 구현해보자.

### 3.1. 간단한 구현

`ApiError`를 상속받기만 하면 된다.

```typescript
// 통계 데이터 에러
export class StatsError extends ApiError {
  constructor(message: string, code?: string) {
    super(message, { code, status: 500 });
    this.name = 'StatsError';
  }
}

// 차트 데이터 에러
export class ChartError extends ApiError {
  constructor(message: string, code?: string) {
    super(message, { code, status: 500 });
    this.name = 'ChartError';
  }
}

// 활동 데이터 에러
export class ActivityError extends ApiError {
  constructor(message: string, code?: string) {
    super(message, { code, status: 500 });
    this.name = 'ActivityError';
  }
}
```

**포인트**:

- `ApiError` 상속으로 계층 구조 구축
- `super(message, { code, status })` 형태로 옵션 객체 전달
- `name` 속성으로 에러 타입 구분

### 3.2. 실제 사용

앞서 본 `getDashboardStats` 예제에서 **catch 블록**이 담당하는 역할만 발췌하면 다음과 같다.

```typescript
catch (error: unknown) {
  if (isHttpError(error)) { // ⭐ HTTP 에러만 StatsError로 변환
    throw new StatsError(
      error.response?.data?.message ||
        '통계 데이터를 불러오는데 실패했습니다',
      error.response?.data?.error,
    );
  }
  throw error; // 예상치 못한 에러는 그대로 던짐
}
```

**흐름**: HTTP 에러 발생 → `isHttpError` 타입 체크 → 커스텀 에러로 변환 → throw

이제 ErrorBoundary에서 `instanceof StatsError`로 정확히 구분 가능

### 전체 코드

전체 구현은 GitHub에서 확인할 수 있다:

- [에러 클래스 정의](https://github.com/Han5991/fe-lab/blob/c1c3e26/apps/react/src/shared/lib/errors/index.ts)
- [API 레이어 적용](https://github.com/Han5991/fe-lab/blob/c1c3e26/apps/react/src/api/dashboard.ts)
- [Core 패키지 ApiError](https://github.com/Han5991/fe-lab/blob/c1c3e26/packages/@package/core/src/errors/index.ts)

## 4. ErrorBoundary와 연결하기

에러 클래스를 만들었다. 이제 ErrorBoundary와 연결해보자.

### 4.1. SectionErrorBoundary: 선택적 에러 캐치

핵심 아이디어는 `특정 에러만 캐치하고, 나머지는 상위로 전파` 하는 것이다.

```tsx
type ErrorCtor<T extends Error = Error> = new (...args: any[]) => T;

interface Props<T extends Error = Error> {
  children: ReactNode;
  sectionName: string;
  errorType: ErrorCtor<T>; // 제네릭 생성자 시그니처
}

export class SectionErrorBoundary<T extends Error = Error> extends Component<
  Props<T>,
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }; // 에러 저장만
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error(`[${this.props.sectionName}]`, error, _info); // 로깅만
  }

  private isHandled(error: Error | null): error is T {
    if (!error) return false;
    return error instanceof this.props.errorType;
  }

  render() {
    const { error } = this.state;

    if (error) {
      if (this.isHandled(error)) {
        return <ErrorFallbackUI />; // 담당 에러: 처리
      }
      // 👇 반드시 render에서 재-throw 해야 상위 Boundary로 전파
      throw error; // 담당 아님: 상위로 전파
    }

    return this.props.children;
  }
}
```

**핵심 로직**

```typescript
if (error) {
  if (this.isHandled(error)) {
    return <ErrorFallbackUI />; // 담당 에러만 처리
  }
  throw error; // 다른 에러는 상위로!
}
```

- `StatsErrorBoundary`는 `StatsError`만 캐치
- `ChartError`가 발생하면? → throw로 상위로 전파
- 담당하지 않는 에러는 관여하지 않는다
- **중요**: `render`에서 throw해야 상위로 전파됨 (`componentDidCatch`에서는 안됨)

### 4.2. 에러 전파 전략: 상속 구조 따라가기

> **⚠️ 중요: 에러 전파는 render()에서만 일어난다**
>
> `componentDidCatch`에서 `throw error`를 해도 부모 ErrorBoundary로 전파되지 않습니다.
> 에러를 상위로 전파하려면 **반드시 `render()` 메서드에서 `throw`** 해야 합니다.

**왜 다시 throw 하는가?**

에러 상속 구조를 따라가기 위해서다

```
GlobalErrorBoundary (ApiError 캐치)
  └─ StatsErrorBoundary (StatsError만 캐치)
       └─ Component
```

**시나리오 1: StatsError 발생**

```typescript
// Component에서 StatsError 발생
throw new StatsError('통계 실패');

// StatsErrorBoundary에서
if (!(error instanceof StatsError)) {
  // false
  throw error;
}
// 👉 여기서 캐치! fallback UI 표시
```

**시나리오 2: ChartError 발생**

```typescript
// Component에서 ChartError 발생
throw new ChartError('차트 실패');

// StatsErrorBoundary에서
if (!(error instanceof StatsError)) {
  // true!
  throw error; // 👈 상위로 전파
}

// GlobalErrorBoundary에서
if (error instanceof ApiError) {
  // true (ChartError는 ApiError 상속)
  // 👉 여기서 캐치!
}
```

**시나리오 3: 일반 Error 발생 (테스트용)**

```typescript
export const getActivities = async (): Promise<Activity[]> => {
  try {
    // 임시 에러 계층 테스트용 코드 - 이걸 풀면 더 상위 에러 바운더리로 전파됨
    throw new Error('test');

    const response = await instance.get('/api/dashboard/activities');
    return response.data;
  } catch (error: unknown) {
    if (isHttpError(error)) {
      throw new ActivityError(/*...*/);
    }
    throw error; // 👈 일반 Error는 그대로 throw
  }
};

// ActivityErrorBoundary에서
if (!(error instanceof ActivityError)) {
  // true! (일반 Error는 ActivityError가 아님)
  throw error; // 👈 상위로 전파
}

// GlobalErrorBoundary에서
if (error instanceof ApiError) {
  // false (일반 Error는 ApiError가 아님)
  throw error; // 👈 더 상위로 전파
}

// 최상위 ErrorBoundary에서
if (error instanceof Error) {
  // true
  // 👉 여기서 최종 캐치!
}
```

이렇게 **예상치 못한 에러**도 계층을 따라 올라가면서 적절한 곳에서 처리된다.

**핵심**:

- 담당 에러만 처리
- 나머지는 상속 구조를 따라 상위로
- 계층적 에러 처리 가능
- 예상치 못한 에러는 최상위 ErrorBoundary까지 전파

### 4.3. 실제 사용

각 섹션별 ErrorBoundary wrapper를 만든다:

```tsx
export const StatsErrorBoundary = ({ children }: { children: ReactNode }) => (
  <SectionErrorBoundary sectionName="통계" errorType={StatsError}>
    {children}
  </SectionErrorBoundary>
);

// ChartErrorBoundary, ActivityErrorBoundary도 동일한 패턴
```

**컴포넌트에서 사용:**

```tsx
<StatsErrorBoundary>
  <Suspense fallback={<Loading />}>
    <StatsSection />
  </Suspense>
</StatsErrorBoundary>
```

각 섹션이 독립적으로 에러를 처리한다. 한 섹션이 터져도 전체 앱이 죽지 않는다.

### 전체 코드

전체 구현은 GitHub에서 확인할 수 있다:

- [SectionErrorBoundary 구현](https://github.com/Han5991/fe-lab/blob/c1c3e26/apps/react/src/components/SectionErrorBoundary/index.tsx)
- [실제 사용 예시](https://github.com/Han5991/fe-lab/blob/c1c3e26/apps/react/src/pages/error-design/index.tsx)

## 5. 실전 활용

이제 모든 조각을 조합해보자.
React Query + Suspense + ErrorBoundary로 완성된 에러 처리 시스템을 만들어본다.

### 5.1. 계층별 역할 분리

전체 흐름을 보자:

```tsx
// 1. API 레이어: 앞서 정의한 getDashboardStats가 StatsError를 throw

// 2. Hook 레이어: React Query
export const useDashboardStats = () =>
  useSuspenseQuery({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStats, // StatsError를 throw
  });

// 3. Component 레이어: 선언적 사용
const StatsSection = () => {
  const { data: stats } = useDashboardStats();
  return <StatCard title="총 방문자" value={stats.visitors.total} />;
};

// 4. Suspense + ErrorBoundary
<StatsErrorBoundary>
  <Suspense fallback={<Loading />}>
    <StatsSection />
  </Suspense>
</StatsErrorBoundary>;
```

**각 계층의 역할**:

- **API**: 에러 변환 (generic Error → StatsError)
- **Hook**: 데이터 페칭
- **Component**: 데이터 렌더링 (에러 처리 코드 없음!)
- **Boundary**: 에러/로딩 처리 (선언적)

우리가 `StatsError`로 변환했기 때문에:

1. `getDashboardStats`에서 `StatsError` throw
2. React Query가 받아서 다시 throw
3. ErrorBoundary가 캐치
4. `instanceof StatsError`로 정확히 구분! ✅

### 5.2. 독립적인 섹션 에러 처리

대시보드 전체 구조:

```tsx
const ErrorDesignPage = () => (
  <Grid>
    {/* 헤더 */}
    <Header />

    {/* 통계 섹션 - 독립적 */}
    <StatsErrorBoundary>
      <Suspense fallback={<LoadingCard />}>
        <StatsSection />
      </Suspense>
    </StatsErrorBoundary>

    {/* 차트 섹션 - 독립적 */}
    <ChartErrorBoundary>
      <Suspense fallback={<LoadingChart />}>
        <ChartWidget />
      </Suspense>
    </ChartErrorBoundary>

    {/* 활동 섹션 - 독립적 */}
    <ActivityErrorBoundary>
      <Suspense fallback={<LoadingFeed />}>
        <ActivityFeed />
      </Suspense>
    </ActivityErrorBoundary>
  </Grid>
);
```

**결과**: 한 섹션이 실패해도 다른 섹션은 정상 동작. 완전히 독립적인 에러 처리.

### 5.3. 이것이 가능한 이유

앞서 정리한 책임 표 그대로 흐름이 흘러가기 때문이다.

- `StatsError` · `ChartError` · `ActivityError`는 각 섹션 Boundary에서 복구 UI를 보여 준다.
- `ApiError`는 전역 Boundary가 공통 로깅과 가드 처리를 맡는다.
- 예상 밖 `Error`는 최상위 Boundary까지 전파되어 전체 보호막이 된다.

설계 단계에서 경계가 명확해졌기에 런타임에서도 자연스럽게 분리된다.

### 전체 코드

전체 구현은 GitHub에서 확인할 수 있다.

- [대시보드 페이지](https://github.com/Han5991/fe-lab/blob/c1c3e26/apps/react/src/pages/error-design/index.tsx)
- [React Query 훅](https://github.com/Han5991/fe-lab/blob/c1c3e26/apps/react/src/hooks/useDashboard.ts)
- [테스트 코드](https://github.com/Han5991/fe-lab/blob/c1c3e26/apps/react/src/pages/error-design/index.test.tsx)

## 6. 결론

### 계층 구조의 핵심 가치

에러 클래스 계층 구조가 가져다준 것들

**1. 타입 안전성과 ErrorBoundary 전략**

- `instanceof`로 런타임 타입 체크
- 에러 상속 구조 = ErrorBoundary 계층 구조
- 선택적 캐치와 전파로 유연한 에러 격리

**2. 독립적 에러 처리와 디버깅**

- 섹션별 독립적 처리: 통계 섹션이 터져도 차트는 정상
- 로그만 봐도 어느 도메인 에러인지 즉시 파악
- 사용자 경험과 개발자 경험 모두 향상

### 확장 가능한 설계

새로운 섹션 추가는 간단하다.

```tsx
// 1. 에러 클래스 추가
export class NotificationError extends ApiError {
  constructor(message: string, code?: string) {
    super(message, { code, status: 500 });
    this.name = 'NotificationError';
  }
}

// 2. ErrorBoundary 추가
export const NotificationErrorBoundary = ({ children }) => (
  <SectionErrorBoundary sectionName="알림" errorType={NotificationError}>
    {children}
  </SectionErrorBoundary>
);

// 3. 사용
<NotificationErrorBoundary>
  <Suspense fallback={<Loading />}>
    <NotificationSection />
  </Suspense>
</NotificationErrorBoundary>;
```

일관된 패턴으로 확장 가능하다.

---

### 정리하면

프롤로그의 질문으로 돌아가보자. "에러는 계층을 따라 전파된다. 그렇다면 에러 클래스도 계층 구조로 설계할 수 있지 않을까?"

그 답은 명확하다. 에러의 구조화가 곧 처리 전략이다.

- Error → 최상위 ErrorBoundary
- ApiError → 전역 GlobalErrorBoundary
- StatsError → 섹션별 StatsErrorBoundary

각 에러는 자신이 어디까지 올라가야 하는지 알고, 각 Boundary는 자신의 책임을 안다. HTTP 에러는 도메인 에러로 변환되고, 도메인 에러는 섹션 Boundary가 받아 처리한다. 예외가 예상 범위를 벗어나면 더 높은 Boundary로 전파된다.

이 구조 덕분에 “이 에러는 누가 처리해야 하지?”라는 고민은 사라진다. 타입이 곧 처리 위치이기 때문이다. 한 섹션이 실패해도, 다른 섹션은 영향 없이
정상적으로 동작한다.
