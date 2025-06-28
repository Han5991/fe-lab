최종

## 들어가며

> 안녕하세요, 여러분! 프론트엔드 개발자라면 누구나 한 번쯤 만들어보는 토스트 UI.  
> 간단해 보이지만, 막상 구현하다 보면 "이걸 어떻게 앱 어디서든 쉽게 호출하지?", "종류별로 다른 스타일은 어떻게 관리하지?" 같은 고민에 빠지게 됩니다.
>
> 최근 한 프로젝트에서 아주 잘 설계된 토스트 컴포넌트를 분석할 기회가 있었습니다.  
> 이 코드는 단순히 기능을 구현하는 것을 넘어, 유지보수성, 재사용성, 확장성까지 모두 잡는 훌륭한 아키텍처를 보여주었습니다.
>
> 우리의 리액트 컴포넌트를 한 단계 업그레이드할 수 있는 인사이트를 공유하고자 합니다.

대부분의 React 개발자들이 Toast 컴포넌트를 만들 때 다음과 같은 코드를 작성합니다.

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

하지만 이런 방식에는 몇 가지 문제가 있습니다.

- 컴포넌트마다 반복되는 상태 관리 코드
- Props drilling으로 인한 복잡성
- 여러 곳에서 Toast를 띄우려면 Context나 상태 끌어올리기 필요
- 비즈니스 로직(타이머, 큐 관리)과 UI 로직의 혼재

> 오늘은 이 모든 문제를 해결하는 혁신적인 Toast 시스템 설계를 소개하겠습니다.

### 목표 코드

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

- Zero State: 컴포넌트에서 상태 관리 코드 없음
- Global Access: 앱 어디서든 동일한 API
- Type Safe: 컴파일 타임 오류 방지
- Auto Management: 타이머, 큐, 애니메이션 자동 처리

### 아키텍처 설계

1. 폴더 구조: 관심사 완벽 분리

   Notifications/  
   ├── Toast/  
   │ ├── index.tsx # UI 컴포넌트 (프레젠테이션)  
   │ └── toast.recipe.ts # 스타일 정의 (디자인 시스템)  
   ├── store/  
   │ ├── index.ts # 공용 스토어 엔진  
   │ └── toast.store.ts # Toast 비즈니스 로직  
   └── index.ts # 외부 API

   #### 각 레이어가 명확한 책임을 가집니다.

   - UI Layer: 어떻게 보여줄 것인가
   - Store Layer: 무엇을 보여줄 것인가
   - Business Layer: 언제, 어떤 조건으로 보여줄 것인가

2. 타입 시스템: 확장 가능한 설계

   ```typescript
   // 스타일과 비즈니스 로직의 타입 결합
   export type ToastData = {
     id?: string;
     position?: ToastPosition;
     message: ReactNode;
     duration?: number;
   } & ToastRecipeProps; // 스타일 props 자동 상속

   // 컴파일 타임에 모든 가능한 조합 검증
   toasts.show({
     message: '성공!',
     type: 'success', // 'error' | 'success' | 'info' | 'neutral'
     size: 'large', // 'small' | 'large'
     duration: 3000,
   });
   ```

3. 상태 관리: React 외부의 독립적 시스템

   #### 핵심은 React와 독립적인 상태 관리 시스템을 만드는 것입니다.

   ```typescript
   // 순수한 JavaScript 상태 관리
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

   // React와의 연결은 useSyncExternalStore로
   export function useStore<TStore extends Store<any>>(store: TStore) {
     return useSyncExternalStore(
       store.subscribe,
       () => store.getState(),
       () => store.getState(),
     );
   }
   ```

   #### 왜 이 방식이 혁신적인가?

   - React 18의 useSyncExternalStore로 동시성 안전성 보장
   - React 외부에서도 상태 조작 가능 (서버 컴포넌트, 웹 워커 등)
   - 불필요한 리렌더링 방지

4. 비즈니스 로직: 도메인 캡슐화

   #### Toast의 모든 비즈니스 룰을 한 곳에 집중합니다.

   ```typescript
   // 복잡한 큐 관리 로직
   function getDistributedToasts(
     data: ToastData[],
     defaultPosition: ToastPosition,
     limit: number,
   ) {
     const queue: ToastData[] = [];
     const toasts: ToastData[] = [];
     const count: Record<string, number> = {};

     data.forEach(item => {
       const position = item.position || defaultPosition;
       count[position] = count[position] || 0;
       count[position] += 1;

       if (count[position] <= limit) {
         toasts.push(item);
       } else {
         queue.push(item); // 초과분은 큐에 대기
       }
     });

     return { toasts, queue };
   }

   // 통합된 API
   export const toasts = {
     show: showToast,
     hide: hideToast,
     update: updateToast,
     clean: cleanToasts,
     cleanQueue: cleanToastsQueue,
   } as const;
   ```

   #### 캡슐화의 이점

   - 중복 토스트 방지 로직
   - 위치별 개수 제한 관리
   - 우선순위 큐 시스템
   - 모든 규칙이 한 곳에서 관리

5. UI 컴포넌트: 순수한 프레젠테이션

   #### 컴포넌트는 오직 렌더링만 담당합니다

   ```tsx
   const Toast = () => {
     const store = useToasts(); // 상태만 구독
     const { start, clear } = useTimeout(
       toasts.hide,
       store.toasts[0]?.duration || 3000,
     );

     // 생명주기 관리도 자동화
     useEffect(() => {
       if (store.toasts.length > 0) start();
       return () => clear();
     }, [store.toasts, clear, start]);

     return (
       <Portal>
         <AnimatePresence>
           {store.toasts.map(notification => {
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

## 결과

### 개발자 경험의 변화

#### Before: 기존 방식의 번거로움

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

#### After: 새로운 방식의 간결함

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

#### 개선 사항

- 상태 관리 코드 완전 제거
- 타이머 관리 자동화
- 코드 양 70% 감소
- 타입 안정성 향상

#### 고급 활용: 비동기 작업과의 통합

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

### 성능 최적화

1. 메모리 최적화

   ```typescript
   // 자동 큐 정리로 메모리 누수 방지
   export function cleanToastsQueue(store: ToastStore = toastsStore) {
     updateToastsState(store, toasts =>
       toasts.slice(0, store.getState().limit),
     );
   }
   ```

2. 스타일 시스템: Panda CSS와의 완벽한 통합

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
       },
       size: {
         small: { container: { minH: 48, maxW: 406 } },
         large: { container: { minH: 52, maxW: 500 } },
       },
     },
   });
   ```

#### 장점

- 타입 안전한 스타일 props
- 반응형 디자인 자동 적용
- CSS-in-JS의 런타임 오버헤드 없음

### 확장 가능성

1. 새로운 알림 타입 추가

   ```typescript
   // 단순히 타입과 스타일만 추가
   type: {
     warning: { container: { '& svg': { fill: 'statusWarning' } } },
     loading: { container: { '& svg': { animation: 'spin 1s linear infinite' } } },
   }
   ```

## 마무리

주요 인사이트 포인트

1. Zero State Management: 컴포넌트에서 상태 관리 코드 완전 제거
2. Actor Model: Toast 시스템이 하나의 독립적인 Actor로 동작
3. Type-Driven Development: 타입 시스템이 API 설계를 주도
4. Performance by Design: React 18의 동시성 기능 활용

이런 패턴을 통해 React 애플리케이션의 상태 관리를 한 단계 끌어올릴 수 있습니다.  
단순히 라이브러리를 사용하는 것을 넘어서, 도메인을 완전히 추상화한 시스템을 만드는 것이 현대 프론트엔드 개발의 핵심이라고 생각합니다.
