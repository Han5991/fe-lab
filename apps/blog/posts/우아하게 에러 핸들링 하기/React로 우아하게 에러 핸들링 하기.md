---
title: 'React로 우아하게 Error 핸들링 하기'
date: '2025-03-02'
published: true
---

## 0. 프롤로그

> React 애플리케이션에서 예기치 않은 에러는 사용자 경험에 치명적인 영향을 미칠 수 있습니다.
> 이 글에서는 **ErrorBoundary**와 같은 에러 관리 기법을 바탕으로, 비동기 코드에서 발생하는 에러를 어떻게 처리하고, 의도적인 에러와 의도하지 않은 에러를 구분하여
> 다루는지 살펴봅니다.
> 에러를 명확히 구분하고, 이를 안전하게 캐치하는 전략은 더욱 견고한 애플리케이션 구축의 첫걸음이 될 것입니다.
> [예제 코드](https://github.com/Han5991/fe-lab/blob/main/apps/react/src/pages/error-test/index.tsx)

## 1. ErrorBoundary 란? [공식홈피](https://ko.react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)

> 하위 컴포넌트가 에러를 발생시키면 ErrorBoundary가 해당 에러를 **“포착”**하고 사용자가 제공한 에러 메시지와 함께 fallback UI를 표시합니다.

리액트의 렌더 주기에서 발생하는 에러(런타임 에러, 문법에러 등)를 잡아낼 수 있지만 다른 에러(사용자와의 인터렉션 에러, 비동기 에러 등)는 잡아낼 수 없습니다.

## 2. ErrorBoundary 못 잡는 에러 잡기

### 2-1. 사용자와의 인터렉션 에러

버튼 클릭 시 동작 하는 함수가 있다고 정의 해봅시다.

```tsx
const ButtonError = () => {
  // 버튼을 클릭 하면 에러가 발생합니다.
  const handleClick = () => {
    throw new Error('버튼 클릭 시 에러 발생');
  };

  return <button onClick={handleClick}>버튼</button>;
};
```

이 경우에는 클릭시 에러를 던져지지만 ErrorBoundary가 잡지 못합니다.

```tsx
// useState를 사용하여 에러를 잡아줄 수 있습니다.
const ButtonError = () => {
  const [error, setError] = useState<Error | null>(null);
  const handleClick = () => {
    try {
      throw new Error('버튼 클릭 시 에러 발생');
    } catch (e) {
      setError(e);
    }
  };

  // 에러가 발생 하면 리턴 하기 전에 에러를 에러바운더리까지 전달합니다.
  if (error instanceof Error) {
    throw error;
  }

  return <button onClick={handleClick}>버튼</button>;
};
```

### 2-2. 비동기 에러

#### 2-2-1. useState 사용하기

api 요청을 하는 함수가 있다고 정의 해봅시다. 이 역시 위의 방법과 비슷합니다. useState에 Error를 선언 후 에러를 잡아줍니다. 다른점이 있다면
throwOnError 옵션을 넣어 에러를 더 위로 올릴 것인지 여기서 처리할 건지 선택이 가능 합니다.

```typescript
const useSimpleQuery = <T>({
  queryFn,
  throwOnError = false,
}: QueryOptions<T>) => {
  const [state, setState] = useState<{
    data: T | null;
    error: Error | null;
    isLoading: boolean;
  }>({
    data: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await queryFn();
        setState({ data, error: null, isLoading: false });
      } catch (error) {
        if (error instanceof Error) {
          setState({ data: null, error, isLoading: false });
        }
      }
    };

    fetchData();
  }, []);

  if (state.error && throwOnError) {
    throw state.error;
  }

  return state;
};
```

패칭 후 에러가 발생하면 Error를 state에 담아주고, throwOnError가 true일 경우 에러를 던져줍니다. 이 방법은 tanstack-query와
비슷합니다. [tanstack-query](https://github.com/TanStack/query/blob/main/packages/react-query/src/useBaseQuery.ts#L128-L145)

#### 2-2-2. useTransition 사용하기

useTransition을 사용하여 비동기 에러를 잡아줄 수 있습니다. useTransition은 React 18에서 도입된 기능으로, UI 업데이트를 지연시켜 사용자 경험을
개선하는 데 도움을 줍니다.
이 기능을 활용하여 사용자의 인터렉션 관련 비동기 작업의 에러를 처리할 수 있습니다.

```tsx
const addComment = (comment: string | null) => {
  // For demonstration purposes to show Error Boundary
  if (comment === null) {
    throw new Error('Add Comment');
  }
};

const ErrorTest = () => {
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      {isPending && <span>로딩중...</span>}
      <button
        disabled={isPending}
        onClick={() => {
          startTransition(() => {
            addComment(null);
          });
        }}
      >
        Add Comment
      </button>
    </div>
  );
};
```

#### 2-2-3. use 사용하기

use는 React 19에서 도입된 기능으로, 페이지에서 직접 호출하는 비동기 함수의 에러를 처리할 수 있습니다. 앞서 소개한 두 hook과 달리 이 방식은 Suspense를
반드시 사용해야 하는 것이 특징입니다. 또한, 간결한 문법을 통해 비동기 에러 핸들링을 보다 쉽게 구현할 수
있습니다. [참고 링크](https://ko.react.dev/reference/react/use#dealing-with-rejected-promises)

```tsx
<Suspense fallback={<div>Loading...</div>}>
  <AsyncErrorPage />
</Suspense>;

const AsyncErrorPage = () => {
  const data = use(fetchData());
  return <div>{data}</div>;
};
```

## 3. 의도하지 않은 에러

> 런타임 중 발생하는 의도치 않은 에러는 보통 예상하지 못한 상황(네트워크 문제, 서버 오류, 버그 등)에서 발생합니다. 이러한 에러는 전역적으로 에러바운더리를 통해 캐치하여
> fallback UI를 보여줌으로써 애플리케이션이 완전히 중단되지 않도록 할 수 있습니다.
> 또한, 에러 로깅 시스템(예: Sentry, LogRocket 등)을 사용하여 서버에 에러 로그를 전송하거나, 개발자 콘솔에 자세한 정보를 기록하는 것이 좋습니다.

```tsx
// ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // 에러가 발생하면 상태를 업데이트하여 fallback UI를 렌더링합니다.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 에러 로깅 서비스나 개발자 디버깅용 콘솔에 에러 정보를 전송합니다.
    console.error(
      'Unexpected Error Caught by ErrorBoundary:',
      error,
      errorInfo,
    );
    // ex) Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // fallback UI 제공
      return <div>죄송합니다. 예상치 못한 오류가 발생했습니다.</div>;
    }

    return this.props.children;
  }
}
```

## 4. 의도한 에러

> 비즈니스 로직 내에서 발생하는 의도한 에러는 개발자가 예측할 수 있는 상황(사용자 입력 오류, 인증 실패, 데이터 유효성 검사 실패 등)입니다.
> 이 경우, 에러를 전파하기보다는 UI 요소(예: toast나 alert)를 통해 사용자에게 안내하는 것이 UX 측면에서 좋습니다.
> 또한, 에러가 발생한 시점에 추가적인 로깅이나 사용자 행동 기록을 남길 수 있습니다.

```tsx
// BusinessOperation.tsx
import React, { useState } from 'react';

const fakeApiCall = async (value: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (value.trim() === '') {
        reject(new Error('입력값이 비어 있습니다.'));
      } else {
        resolve(`성공: ${value}`);
      }
    }, 1000);
  });
};

export const BusinessOperation = () => {
  const [result, setResult] = useState<string>('');

  const handleAction = async () => {
    try {
      const response = await fakeApiCall('');
      setResult(response);
    } catch (error) {
      // 의도한 에러 처리: alert 또는 toast를 통해 사용자에게 안내
      if (error instanceof Error) {
        alert(`에러가 발생했습니다: ${error.message}`);
      }
      // 필요한 경우, 에러 로깅 코드 추가
      console.error('Business logic error:', error);
    }
  };

  return (
    <div>
      <button onClick={handleAction}>비즈니스 로직 실행</button>
      {result && <p>{result}</p>}
    </div>
  );
};
```

## 3. 결론

지금까지 리액트에서 에러 객체를 활용해 에러 바운더리까지 전달하는 방법에 대해 알아보았습니다.

useState를 활용한 방식은 직접 사용하기보다는, tanstack-query와 같이 이미 구현된 라이브러리를 활용하는 것이 더 효율적일 것으로 보입니다.

useTransition은 사용자와의 인터랙션 과정에서 발생하는 비동기 작업의 에러를 처리하는 데 유용하며, use는 페이지에서 직접 호출되는 비동기 함수의 에러를 간편하게 처리할
수 있습니다.

> 런타임중 **의도치 않은 에러**들은 에러바운더리에서 처리 할 수 있도록 하는 것이 맞지만
> **의도한 에러** 같은 경우에는 비즈니스 로직에서 에러를 던지지 않고 직접 잡아 toast 나 alert 같은 UI를 통해 상황에 맞게 처리하는 것이 바람직합니다.

이처럼 다양한 에러 처리 기법을 상황에 맞게 적절히 적용하여, 보다 견고하고 안정적인 애플리케이션을 구축해 보시길 바랍니다.

다음은 next.js 에서 에러 바운더리를 어떻게 활용하는 방법에 대해 다루어 보겠습니다.
[예제 코드 및 테스트 코드 확인](https://github.com/Han5991/fe-lab/blob/main/apps/react/src/pages/error-test/index.tsx)
