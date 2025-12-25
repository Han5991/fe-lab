---
title: 'javascript로 우아하게 Error 핸들링하기'
date: '2025-02-27'
published: true
slug: 'javascript-error'
---

## 프롤로그

> 이번 글은 JavaScript에서 동기 및 비동기 상황 모두에 대해 에러를 어떻게 처리할 수 있는지에 대해 다룹니다. 에러 처리는 코드의 안정성과 유지보수성에 큰 영향을 미치므로, 명확하고 일관된 패턴을 적용하는 것이 중요합니다. 이 글에서는 기본적인 try-catch 패턴부터, async/await 환경에서의 에러 처리, 그리고 여러 비동기 작업이나 에러 래핑(Error Wrapper) 패턴, 그리고 커스텀 에러 클래스까지 다양한 예제를 통해 살펴보겠습니다. ![](https://velog.velcdn.com/images/rewq5991/post/64802bfb-a008-44ab-a0ee-3ab7450ca59b/image.png)

[예제 코드 및 테스트 코드 확인](https://github.com/Han5991/fe-lab/tree/main/apps/typescript)

---

## 1. 동기 에러 처리

### 1.1 기본 try-catch 사용

동기 코드에서는 try-catch 구문이 가장 기본적이면서도 효과적인 에러 처리 방법입니다. 코드가 순차적으로 실행되는 동기 환경에서 예외가 발생하면, 해당 예외를 잡아서 로깅하거나 재처리할 수 있습니다.

```javascript
// 에러를 던지는 함수
function testError() {
  throw new Error('에러 발생');
}

// try-catch를 사용해 에러를 잡는 함수
function NotThrowError() {
  try {
    // 일부 작업 수행
    throw new Error('에러 발생');
  } catch (e) {
    // 에러를 잡아 처리(예: 로깅 혹은 사용자에게 알림)
    console.error('에러를 처리했습니다:', e.message);
    return;
  }
}

// try-catch 없이 에러가 발생하는 경우
function NotThrowError2() {
  // try-catch가 없으므로, 에러가 발생하면 상위 호출자로 전파됩니다.
  throw new Error('에러 발생');
}
```

위의 예제에서 NotThrowError 함수는 내부에서 발생한 에러를 catch 구문으로 잡아 로그를 남기며 안전하게 종료되도록 처리합니다. 반면, NotThrowError2 함수는 에러를 잡지 않으므로 상위 호출 스택으로 에러가 전파되어 호출자에게 책임을 넘기게 됩니다. 이는 에러 발생 시 전체 프로그램 흐름을 어떻게 제어할 것인가에 대한 중요한 결정점이 됩니다.

테스트 코드에서는 NotThrowError는 에러를 잡아내어 테스트가 통과하는 반면, NotThrowError2는 잡히지 않아 에러를 던지도록 되어 있습니다.

```typescript
it('에러 던지는지 확인', () => {
  expect(testError).toThrow();
});

it('try catch 잡고 던지지 않음', () => {
  expect(NotThrowError).not.toThrow();
});

it('try catch 안 써서 못 잡음', () => {
  expect(NotThrowError2).toThrow();
});
```

## 2. 비동기 에러 처리

비동기 환경에서는 에러 처리가 조금 더 복잡해집니다. 특히 async/await 문법을 사용할 경우, 동기 코드와 유사한 try-catch 구문을 사용하여 에러를 처리할 수 있지만, 프로미스의 특성 때문에 호출하는 시점과 에러 처리 시점에 차이가 있을 수 있습니다.

### 2.1 async/await와 try-catch 사용

아래는 비동기 함수에서 에러를 던지고, try-catch로 이를 처리하는 예시입니다.

```typescript
// 비동기 함수에서 에러를 던지는 예시
async function asyncError() {
  throw new Error('비동기 에러 발생');
}

// async/await 내부에서 try-catch로 에러를 잡는 경우
async function asyncNotThrowError() {
  try {
    throw new Error('비동기 에러 발생');
  } catch (e) {
    console.error('비동기 에러를 잡았습니다:', e.message);
    return;
  }
}

// try-catch 없이 에러를 던지는 비동기 함수
async function asyncNotThrowError2() {
  throw new Error('비동기 에러 발생');
}
```

이 경우, asyncNotThrowError 함수는 에러를 내부적으로 처리하여 정상 흐름을 유지할 수 있습니다. 반면, asyncNotThrowError2 함수는 에러가 처리되지 않아 호출 측에서 .catch나 테스트에서 rejects.toThrow()로 검증해야 합니다.

테스트 코드도 아래와 같이 비동기 환경에 맞추어 작성할 수 있습니다.

```typescript
it('비동기 에러 처리', async () => {
  await expect(asyncError).rejects.toThrow();
});

it('비동기 인대 try catch 잡고 던지지 않음', async () => {
  await expect(asyncNotThrowError()).resolves.not.toThrow();
});

it('비동기 에러 처리', async () => {
  await expect(asyncNotThrowError2).rejects.toThrow();
});
```

이와 같이 비동기 함수에 대해서도 적절한 에러 처리 패턴을 선택하면, 코드의 안정성을 확보하고 예기치 않은 에러로부터 애플리케이션을 보호할 수 있습니다.

## 3. 에러 래핑(Error Wrapper) 패턴

비동기 작업을 진행할 때, 에러가 발생하면 호출자에게 에러가 전파되는 것을 막고 내부에서 처리하고자 할 경우가 있습니다. 이런 경우에 래퍼 함수를 통해 에러를 안전하게 캡처하여 정상적인 흐름으로 전환할 수 있습니다.

### 3.1 async/await와 try-catch 사용

아래 예제는 프로미스를 인자로 받아 내부에서 try-catch로 에러를 잡은 후, 에러를 전파하지 않고 처리하는 래퍼 함수를 구현한 사례입니다.

```typescript
async function asyncErrorWrapper(promise) {
  try {
    await promise;
    return;
  } catch (e) {
    console.error('래퍼에서 에러를 처리했습니다:', e.message);
    // 에러를 전파하지 않고 정상 흐름으로 처리
    return;
  }
}

// 사용 예: 래퍼 적용
async function exampleUsage() {
  await asyncErrorWrapper(
    new Promise((_, reject) => reject(new Error('error'))),
  );
}
```

이와 같이 래퍼 패턴을 적용하면, 비동기 작업에서 발생한 에러를 호출자에게 노출시키지 않고 내부에서 처리할 수 있어, 복잡한 비동기 로직에서 안정성을 높일 수 있습니다. 테스트 코드에서도 이를 검증할 수 있습니다.

```typescript
it('래퍼로 비동기 오류를 포착해야합니다', async () => {
  await expect(
    asyncErrorWrapper(new Promise((_, reject) => reject(new Error('error')))),
  ).resolves.not.toThrow();
});
```

## 4. 여러 비동기 에러 및 체이닝된 에러 처리

실제 애플리케이션에서는 여러 비동기 작업을 동시에 실행하거나, 에러 발생 후 추가 작업을 진행해야 하는 경우가 많습니다. 이러한 상황에 대비하여 적절한 에러 처리 방법을 선택하는 것이 중요합니다.

### 4.1 여러 비동기 작업의 에러 처리

아래 코드는 Promise.all을 사용해 여러 비동기 작업을 동시에 실행할 때, 하나라도 에러가 발생하면 전체를 catch 구문으로 잡는 방법을 보여줍니다.

```typescript
async function handleMultipleAsyncErrors() {
  try {
    // 여러 비동기 작업을 동시에 실행. 하나라도 에러가 발생하면 catch 구문으로 진입
    await Promise.all([asyncError(), asyncNotThrowError2()]);
  } catch (e) {
    console.error('여러 비동기 작업 중 하나에서 에러 발생:', e.message);
    return;
  }
}
```

테스트 코드에서는 여러 작업 중 하나라도 에러가 발생하는 경우를 검증합니다.

```typescript
it('비동기 여러개 에러 처리 안 함', async () => {
  await expect(handleMultipleAsyncErrors()).resolves.not.toThrow();
});
```

이 패턴은 여러 비동기 작업의 실행 결과를 한 번에 확인할 때 유용하며, 에러 발생 시 추가적인 로깅이나 보상 작업을 수행할 수 있습니다.

### 4.2 체이닝된 에러 처리

때때로 에러를 잡은 후 추가 작업을 진행하거나, 특정 에러를 다른 에러로 재던져서 호출자가 다르게 처리하도록 할 필요가 있습니다. 아래 코드는 첫 번째 에러를 잡은 후, 새로운 에러를 재던지는 패턴을 보여줍니다.

```typescript
async function chainedErrorHandler() {
  try {
    await asyncError();
  } catch (e) {
    console.error('첫 번째 에러 처리 후, 새로운 에러로 재던짐:', e.message);
    throw new Error('체이닝된 에러 처리');
  }
}
```

테스트 코드에서는 재던진 에러가 올바르게 전파되는지 확인합니다.

```typescript
it('비동기 에러 처리2', async () => {
  await expect(chainedErrorHandler).rejects.toThrow();
});
```

## 5. 커스텀 에러 핸들링

일반적인 에러 처리 외에도, 애플리케이션의 요구사항에 따라 커스텀 에러 클래스를 정의하여 에러 타입에 따른 세밀한 처리를 할 수 있습니다. 이는 에러를 구분하고, 상황에 맞게 다른 대응을 할 수 있도록 도와줍니다.

```typescript
// 커스텀 에러 클래스 정의
class CustomError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CustomError';
  }
}

function handleSpecificErrors() {
  try {
    // 상황에 따라 커스텀 에러를 던짐
    throw new CustomError('특정 에러 발생');
  } catch (e) {
    if (e instanceof CustomError) {
      console.log('CustomError를 처리합니다:', e.message);
      return; // 커스텀 에러는 내부적으로 처리
    }
    // 다른 에러는 재던짐
    throw e;
  }
}
```

이와 같이 커스텀 에러를 활용하면, 예외 상황에 대한 구체적인 처리가 가능해지며, 에러 로그 분석 및 디버깅에 큰 도움이 됩니다.

## 6. 에러 발생시 아래 코드가 실행 안됨

에러가 발생하면 그 이후의 코드는 실행되지 않는다는 기본 원칙을 보여주는 예시입니다.

```typescript
export const executeTest = () => {
  testError();
  console.log('test');
};
```

테스트 코드에서는 에러 발생 시 console.log가 호출되지 않는 것을 확인합니다.

```typescript
it('에러가 던져지면 콘솔로그가 실행되지 않음', () => {
  const consoleSpy = jest.spyOn(console, 'log');
  expect(executeTest).toThrow();
  expect(consoleSpy).not.toHaveBeenCalled();
  consoleSpy.mockRestore();
});
```

이 부분은 에러 처리 로직이 제대로 동작하고 있음을 검증하는 중요한 테스트 케이스로, 실제 애플리케이션에서도 에러 발생 시 이후 로직이 실행되지 않도록 보장하는 역할을 합니다.

---

## 결론

이번 글에서는 JavaScript에서 동기 및 비동기 에러 처리에 대한 다양한 패턴을 살펴보았습니다.

- 동기 에러 처리에서는 기본 try-catch 구문을 활용하여 예외를 안전하게 처리하는 방법을 확인했습니다.
- 비동기 에러 처리에서는 async/await와 try-catch를 사용하여 프로미스 기반의 작업에서 발생하는 에러를 효과적으로 관리하는 방법을 알아보았습니다.
- 또한, 에러 래핑과 체이닝된 에러 처리 패턴을 통해 보다 복잡한 비동기 작업에서의 에러 처리 전략을 적용하는 방법을 다루었으며,
- 커스텀 에러 핸들링을 통해 특정 상황에 맞게 에러를 구분하고 처리하는 방법도 살펴보았습니다.

에러 처리는 애플리케이션의 안정성과 사용자 경험에 큰 영향을 미치는 중요한 요소입니다. 각 상황에 맞게 적절한 패턴을 선택하고, 코드 내에서 일관성 있게 적용하는 것이 유지보수와 디버깅에 큰 도움이 됩니다. 다음 글에서는 리액트 환경에서 에러를 핸들링하고, 에러바운더리를 활용하는 방법에 대해 다루어 보겠습니다.
