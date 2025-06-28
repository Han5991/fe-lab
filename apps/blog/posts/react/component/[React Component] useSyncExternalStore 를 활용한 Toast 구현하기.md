## 들어가며

> 안녕하세요, 여러분! 프론트엔드 개발자라면 누구나 한 번쯤 만들어보는 토스트 UI.  
> 간단해 보이지만, 막상 구현하다 보면 "이걸 어떻게 앱 어디서든 쉽게 호출하지?", "종류별로 다른 스타일은 어떻게 관리하지?" 같은 고민에 빠지게 됩니다.
>
> 최근 한 프로젝트에서 아주 잘 설계된 토스트 컴포넌트를 분석할 기회가 있었습니다.  
> 이 코드는 단순히 기능을 구현하는 것을 넘어, 유지보수성, 재사용성, 확장성까지 모두 잡는 훌륭한 아키텍처를 보여주었습니다.
>
> 우리의 리액트 컴포넌트를 한 단계 업그레이드할 수 있는 인사이트를 공유하고자 합니다.

**대부분의 React 개발자들이 Toast 컴포넌트를 만들 때 다음과 같은 코드를 작성합니다.**

```tsx
const MyComponent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState('success');

  const showToast = (msg: string, toastType: string) => {
    setMessage(msg);
    setType(toastType);
    setIsOpen(true);
  };

  return (
    <>
      <button onClick={() => showToast('성공!', 'success')}>성공 토스트</button>
      <Toast
        isOpen={isOpen}
        message={message}
        type={type}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};
```

**하지만 이런 방식에는 몇 가지 문제가 있습니다.**

- 컴포넌트마다 반복되는 상태 관리 코드
- Props drilling으로 인한 복잡성
- 여러 곳에서 Toast를 띄우려면 Context나 상태 끌어올리기 필요
- 비즈니스 로직(타이머, 큐 관리)과 UI 로직의 혼재

> 오늘은 이 모든 문제를 해결하는 혁신적인 Toast 시스템 설계를 소개하겠습니다.

## 목표 코드

```tsx
// 어느 컴포넌트에서든, 어느 로직에서든, 어느 깊이에서든
const handleSuccess = async () => {
  try {
    await api.submit();
    toasts.show({ message: '저장 완료!', type: 'success' });
  } catch (error) {
    toasts.show({ message: '저장 실패', type: 'error' });
  }
};
```

- **Zero State**: 컴포넌트에서 상태 관리 코드 없음
- **Global Access**: 앱 어디서든 동일한 API
- **Type Safe**: 컴파일 타임 오류 방지
- **Auto Management**: 타이머, 큐, 애니메이션 자동 처리

## 핵심 아이디어

### useSyncExternalStore의 힘

React 18에서 도입된 `useSyncExternalStore`는 React 외부의 상태를 안전하게 구독할 수 있게 해줍니다. 이를 활용하면:

```typescript
// React 밖에서 상태 관리
const store = createExternalStore(initialState);

// React 컴포넌트에서 구독
const state = useSyncExternalStore(
  store.subscribe, // 구독 함수
  store.getState, // 현재 상태 조회
  store.getState, // 서버 사이드용 (동일)
);
```

### 왜 이 방식이 혁신적인가?

1. **동시성 안전성**: React 18의 Concurrent Features와 완벽 호환
2. **독립적 상태**: React 컴포넌트 생명주기와 무관하게 동작
3. **전역 접근성**: 컴포넌트 트리 어디서든 접근 가능
4. **최적화**: 필요한 컴포넌트만 리렌더링

### 3-Layer 아키텍처

```
┌─────────────────┐
│   UI Layer      │ ← 어떻게 보여줄 것인가
├─────────────────┤
│  Business Layer │ ← 무엇을 언제 보여줄 것인가
├─────────────────┤
│   Store Layer   │ ← 상태를 어떻게 관리할 것인가
└─────────────────┘
```

**각 레이어는 명확한 책임을 가지며, 서로 독립적으로 테스트하고 수정할 수 있습니다.**

## 단계별 구현

### 1단계: Store 엔진 구현

#### 범용 상태 관리 시스템 구축

```typescript
// types
type StoreSubscriber<Value> = (state: Value) => void;

interface Store<Value> {
  getState: () => Value;
  setState: (value: Value | ((prev: Value) => Value)) => void;
  subscribe: (callback: StoreSubscriber<Value>) => () => void;
}

// 순수한 JavaScript 상태 관리 엔진
export function createStore<Value extends Record<string, any>>(
  initialState: Value,
): Store<Value> {
  let state = initialState;
  const listeners = new Set<StoreSubscriber<Value>>();

  return {
    getState: () => state,
    setState: value => {
      state = typeof value === 'function' ? value(state) : value;
      listeners.forEach(listener => listener(state));
    },
    subscribe: callback => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  };
}

// React와의 브릿지
export function useStore<TStore extends Store<any>>(store: TStore) {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getState(),
    () => store.getState(),
  );
}
```

#### 핵심 특징

- **타입 안전성**: 제네릭으로 완벽한 타입 추론
- **메모리 효율성**: WeakMap이 아닌 Set 사용으로 명시적 구독 해제
- **동시성 지원**: useSyncExternalStore로 React 18 Concurrent Features 호환

### 2단계: Toast 비즈니스 로직

#### 타입 시스템 설계

```typescript
export type ToastPosition =
  | 'top-left'
  | 'top-right'
  | 'top-center'
  | 'bottom-left'
  | 'bottom-right'
  | 'bottom-center';

// 스타일과 비즈니스 로직 타입 결합
export type ToastData = {
  id?: string;
  position?: ToastPosition;
  message: ReactNode;
  duration?: number;
} & ToastRecipeProps; // 스타일 props 자동 상속

// Toast Store 상태
export type ToastsState = {
  toasts: ToastData[];
  defaultPosition: ToastPosition;
  limit: number;
};
```

#### 비즈니스 로직 구현

```typescript
// Toast 스토어 생성
export const createToastStore = () =>
  createStore<ToastsState>({
    toasts: [],
    defaultPosition: 'top-center',
    limit: 1,
  });

export const toastsStore = createToastStore();

// 큐 관리 로직 - 위치별 개수 제한
function getDistributedToasts(
  data: ToastData[],
  defaultPosition: ToastPosition,
  limit: number,
) {
  const queue: ToastData[] = [];
  const Toasts: ToastData[] = [];
  const count: Record<string, number> = {};

  data.forEach(item => {
    const position = item.position || defaultPosition;
    count[position] = count[position] || 0;
    count[position] += 1;

    if (count[position] <= limit) {
      Toasts.push(item);
    } else {
      queue.push(item);
    }
  });

  return { Toasts, queue };
}

// 상태 업데이트 헬퍼
export function updateToastsState(
  store: ToastStore,
  update: (toasts: ToastData[]) => ToastData[],
) {
  const state = store.getState();
  const toasts = update([...state.toasts]);
  const updated = getDistributedToasts(
    toasts,
    state.defaultPosition,
    state.limit,
  );

  store.setState({
    toasts: updated.Toasts,
    limit: state.limit,
    defaultPosition: state.defaultPosition,
  });
}

// 통합 API
export const toasts = {
  show: showToast,
  hide: hideToast,
  update: updateToast,
  clean: cleanToasts,
  cleanQueue: cleanToastsQueue,
} as const;
```

#### 핵심 함수들 구현

```typescript
export function showToast(toast: ToastData, store: ToastStore = toastsStore) {
  const id = toast.id || randomId();

  updateToastsState(store, toasts => {
    if (toast.id && toasts.some(n => n.id === toast.id)) {
      return toasts; // 중복 방지
    }
    return [...toasts, { ...toast, id }];
  });

  return id;
}

export function hideToast(id: string, store: ToastStore = toastsStore) {
  updateToastsState(store, toasts => toasts.filter((_, i) => i !== 0));
  return id;
}

export function updateToast(toast: ToastData, store: ToastStore = toastsStore) {
  updateToastsState(store, toasts =>
    toasts.map(item => {
      if (item.id === toast.id) {
        return { ...item, ...toast };
      }
      return item;
    }),
  );
  return toast.id;
}

export function cleanToastsQueue(store: ToastStore = toastsStore) {
  updateToastsState(store, Toasts => Toasts.slice(0, store.getState().limit));
}
```

### 3단계: UI 컴포넌트 연결

#### 커스텀 훅으로 상태 구독

```typescript
export const useToasts = (store: ToastStore = toastsStore) => useStore(store);

// 분산된 토스트 조회
function useDistributedToasts() {
  const state = useToasts();
  const { Toasts, queue } = getDistributedToasts(
    state.toasts,
    state.defaultPosition,
    state.limit,
  );

  return { toasts: Toasts, queue, ...state };
}
```

#### 순수한 프레젠테이션 컴포넌트

```tsx
const Toast = () => {
  const { toasts } = useDistributedToasts();
  const { start, clear } = useTimeout(() => toasts.hide(), 3000);

  // 생명주기 자동 관리
  useEffect(() => {
    if (toasts.length > 0) start();
    return () => clear();
  }, [toasts, clear, start]);

  return (
    <Portal>
      <AnimatePresence>
        {toasts.map(notification => {
          const { container, content } = toastRecipe({
            type: notification.type,
            size: notification.size,
          });

          return (
            <motion.div
              key={notification.id}
              initial={{ x: '-50%', y: '-100%', opacity: 0 }}
              animate={{
                x: 'var(--x-animate)',
                y: 'var(--y-animate)',
                opacity: 'var(--opacity-animate)',
              }}
              exit={{ x: '-50%', y: '-100%', opacity: 0 }}
              className={container}
            >
              {notification.type && NotificationIcon[notification.type]}
              <div className={content}>{notification.message}</div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </Portal>
  );
};
```

#### Panda CSS 스타일 시스템 통합

```typescript
const toastRecipe = sva({
  slots: ['container', 'content'],
  base: {
    container: {
      position: 'fixed',
      top: 0,
      left: '50%',
      '--x-animate': '-50%',
      '--y-animate': '24px',
      '--opacity-animate': 1,

      desktopDown: {
        '--y-animate': '8px',
        w: 'calc(100vw - 32px)',
      },
    },
  },
  variants: {
    type: {
      error: { container: { '& svg': { fill: 'statusNegative' } } },
      success: { container: { '& svg': { fill: 'statusPositive' } } },
      info: { container: { '& svg': { fill: 'statusInfo' } } },
    },
    size: {
      small: { container: { minH: 48, maxW: 406 } },
      large: { container: { minH: 52, maxW: 500 } },
    },
  },
});
```

**스타일 시스템의 장점:**

- 타입 안전한 스타일 props
- 반응형 디자인 자동 적용
- CSS-in-JS 런타임 오버헤드 없음

## 실제 사용법

### Before: 기존 방식의 번거로움

```tsx
const UserProfile = () => {
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleSave = async () => {
    try {
      await saveProfile();
      setToastMessage('프로필이 저장되었습니다');
      setToastOpen(true);
      setTimeout(() => setToastOpen(false), 3000);
    } catch (error) {
      setToastMessage('저장에 실패했습니다');
      setToastOpen(true);
      setTimeout(() => setToastOpen(false), 3000);
    }
  };

  return (
    <>
      <button onClick={handleSave}>저장</button>
      <Toast
        isOpen={toastOpen}
        message={toastMessage}
        onClose={() => setToastOpen(false)}
      />
    </>
  );
};
```

### After: 새로운 방식의 간결함

```tsx
const UserProfile = () => {
  const handleSave = async () => {
    try {
      await saveProfile();
      toasts.show({
        message: '프로필이 저장되었습니다',
        type: 'success',
      });
    } catch (error) {
      toasts.show({
        message: '저장에 실패했습니다',
        type: 'error',
      });
    }
  };

  return <button onClick={handleSave}>저장</button>;
};
```

### 개선 사항

- **상태 관리 코드 완전 제거** (15줄 → 2줄)
- **타이머 관리 자동화**
- **코드 양 70% 감소**
- **타입 안정성 향상**

### 고급 활용: 비동기 작업과의 통합

```typescript
// 로딩 상태부터 완료까지 원스톱
const handleUpload = async (file: File) => {
  const toastId = toasts.show({
    message: '파일 업로드 중...',
    type: 'info',
    duration: 0, // 수동 관리
  });

  try {
    await uploadFile(file);
    toasts.update({
      id: toastId,
      message: '업로드 완료!',
      type: 'success',
      duration: 3000,
    });
  } catch (error) {
    toasts.update({
      id: toastId,
      message: '업로드 실패',
      type: 'error',
      duration: 5000,
    });
  }
};
```

## 마무리

### 주요 인사이트 포인트

1. **Zero State Management**: 컴포넌트에서 상태 관리 코드 완전 제거
2. **Actor Model**: Toast 시스템이 하나의 독립적인 Actor로 동작
3. **Type-Driven Development**: 타입 시스템이 API 설계를 주도
4. **Performance by Design**: React 18의 동시성 기능 활용

### 확장 가능성: Store Core의 진정한 힘

**우리가 Toast를 위해 만든 `createStore` 시스템의 진정한 가치는 확장성에 있습니다.**

#### 추상화된 Core의 장점

Toast 구현 과정에서 우리는 단순히 알림 시스템을 만든 것이 아니라, **범용적인 상태 관리 엔진**을 구축했습니다. 이 Core 시스템은 다음과 같은 강력한 특성을 가집니다:

1. **도메인 독립성**

   - Store 엔진이 Toast에 종속되지 않음
   - 어떤 종류의 전역 상태든 동일한 패턴으로 관리
   - 비즈니스 로직과 상태 관리 로직의 완전한 분리

2. **일관된 개발 경험**

   - 새로운 전역 컴포넌트 추가 시 학습 비용 Zero
   - 팀 전체가 동일한 패턴으로 개발
   - 코드 리뷰와 유지보수 효율성 극대화

3. **타입 시스템의 힘**
   - 각 도메인별 완벽한 타입 추론
   - 컴파일 타임에 모든 오류 검출
   - IDE에서 완벽한 자동완성 지원

#### 실제 적용 가능한 컴포넌트들

동일한 Core 로직으로 구현 가능한 전역 UI 컴포넌트들:

**Modal & Dialog 시스템**

```typescript
// 단 3줄로 Modal 스토어 완성
const modalsStore = createStore({ modals: [], stackLimit: 3 });
const modals = { open, close, closeAll };
// 사용: modals.open({ title: '확인', type: 'confirm' })
```

**Loading & Progress 관리**

```typescript
// 복수 작업 동시 추적
const loading = { start, finish, isLoading };
// 사용: loading.start('upload'), loading.finish('upload')
```

**Notification Center**

```typescript
// 읽음/안읽음, 카테고리별 필터링
const notifications = { push, markAsRead, clear };
// 사용: notifications.push({ title: '새 메시지', category: 'email' })
```

**Form Validation 상태**

```typescript
// 전역 폼 검증 상태 관리
const validation = { setError, clearError, isValid };
// 사용: validation.setError('email', '올바른 이메일을 입력하세요')
```

#### 아키텍처 레벨의 이점

**1. 예측 가능한 상태 흐름**

- 모든 전역 상태가 동일한 패턴으로 동작
- 디버깅 시 일관된 접근 방식
- 상태 변화 추적과 로깅 용이

**2. 성능 최적화**

- 필요한 컴포넌트만 리렌더링
- React 18 Concurrent Features 완벽 호환
- 메모리 누수 방지 시스템 내장

**3. 테스트 친화적**

- 순수 함수로 구성된 비즈니스 로직
- React 없이도 독립적 테스트 가능
- Mock과 Stub 구성 간단

#### 팀 개발에서의 위력

**신입 개발자 온보딩**

```typescript
// 패턴 한 번 익히면 모든 컴포넌트 동일
const newFeatureStore = createStore(initialState);
const newFeature = { action1, action2, action3 };
```

**코드 리뷰 효율성**

- 동일한 패턴이므로 리뷰 포인트 명확
- 버그 발생 패턴 예측 가능
- 베스트 프랙티스 자동 적용

**레거시 마이그레이션**

- 기존 Context API나 Redux 코드를 점진적 교체
- 각 도메인별로 독립적 마이그레이션
- 사이드 이펙트 최소화

#### 실제 개발 시나리오

**복잡한 사용자 플로우**

```typescript
const handleComplexUserFlow = async () => {
  loading.start('user-flow');

  try {
    const result = await processUserData();
    toasts.show({ message: '처리 완료', type: 'success' });
    notifications.push({ title: '작업 완료', category: 'system' });
  } catch (error) {
    modals.open({ title: '오류', content: error.message, type: 'alert' });
  } finally {
    loading.finish('user-flow');
  }
};
```

**멀티 스텝 폼 처리**

```typescript
const handleFormStep = stepData => {
  validation.clearErrors();
  if (isLastStep) {
    loading.start('submit');
    // 최종 제출 로직
  } else {
    toasts.show({ message: '다음 단계로 이동합니다' });
  }
};
```

#### 핵심 인사이트

**"Toast 하나를 제대로 만들면, 전체 앱의 상태 관리 아키텍처가 완성된다"**

이것이 바로 **추상화의 힘**입니다.

- 하나의 도메인을 깊이 파면서 범용적 패턴 발견
- 작은 컴포넌트에서 시작해 전체 시스템으로 확장
- 구체적 문제 해결에서 추상적 해결책 도출

이런 접근 방식이 현대 프론트엔드 개발에서 **진짜 시니어 개발자**가 되는 길이라고 생각합니다.  
단순히 라이브러리를 가져다 쓰는 것이 아니라, 문제의 본질을 파악하고 범용적 해결책을 만드는 것 말입니다.
