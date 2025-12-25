---
title: '[Typescript로 설계하는 프로젝트] Type 설계의 시작: 견고한 서버 API Type 설계하기'
date: '2025-06-01'
published: true
slug: 'typescript-project-api-design'
---

## 들어가며

> 피곤에 쩔은 모습으로 하나의 테스크를 마무리 하는 순간 백엔드 개발자가 다가옵니다.  
> **"죄송하지만 이번에 만든 api 중에 하나의 리스폰스가 변동 될 것 같습니다."**  
> **"User로 정의한 스키마 중에 name이 빠질 것 같아요."**  
> 순간 머릿속에서 여기저기 대강 흩어져 있는 User 비스무리한 것들이 떠오릅니다.  
> "API 호출 부터 확인해서 하나 하나 찾아야 하나... 내가 안 빼먹고 깔끔하게 다 찾아서 수정할 수 있을까? 얼마나 오래 걸릴까?"  
> 이런 생각들이 머릿속을 스쳐가면서 백엔드 개발자에게 이야기 합니다. **"Pm이랑 이야기 되신거죠?(일정 늘어나는거 이야기 하고 온거죠?)"**

> **Type을 구조적으로 설계하면 이런 상황을 좀 더 쉽게 풀 수 있지 않을까?**

[이전 글](https://velog.io/@rewq5991/typescript-project-design)에서는 Type-Driven-Development를 소개하면서 타입을
설계 도구로 활용하는 방법에 대해 이야기했습니다.  
이번 글에서는 Type 설계의 첫 단계로, 서버 API Type을 설계하는 방법을 다루고자 합니다.

프론트엔드는 서버로부터 전달받은 데이터를 기반으로 사용자 인터페이스를 구성합니다.  
현대적인 웹 애플리케이션은 대부분 클라이언트-서버 아키텍처로 구성되어 있어, 프론트엔드 개발자는 백엔드 API가 정의한 스키마를 그대로 수용해야 하는 경우가 많습니다.  
`(만약 풀스택으로 혼자 개발한다면, 백엔드의 엔티티나 DTO를 프론트엔드 타입으로 바로 활용할 수도 있습니다.)`

이러한 구조에서 서버 API 스키마를 명확히 정의하는 것은 프론트엔드의 타입 시스템을 설계하는 것과 같습니다.  
백엔드에서 정의한 API 응답의 구조, 데이터 타입, 필드 제약 조건 등이 프론트엔드의 타입 정의로 직접 연결되기 때문입니다.  
서버의 API 스키마는 프론트엔드 타입 시스템의 기반이 되어, 클라이언트와 서버 간의 데이터 일관성과 타입 안정성을 보장합니다.

프론트엔드에서는 이렇게 정의된 서버 API 스키마를 바탕으로 타입을 정의하고, 추상화된 HTTP 클라이언트 클래스를 활용합니다.  
이를 통해 API 호출 시 타입 안정성을 확보할 수 있을 뿐만 아니라, 컴파일 타임에 오류를 사전에 방지할 수 있습니다.

## 🔨 기존 HTTP 클라이언트의 문제점

많은 프로젝트에서 서버 통신을 위한 HTTP 클라이언트를 다음과 같이 사용합니다.

```typescript
// 문제점 1: 타입 안전성 부재
const response = await fetch('/api/users');
const users = await response.json(); // any 타입으로 추론되어 타입 안전성이 없음

// 문제점 2: 타입 단언 남용
const response = await fetch('/api/users');
const users = (await response.json()) as User[]; // 타입 단언 - 실제 데이터가 다르면 런타임 오류 발생

// 문제점 3: 타입 중복 정의
interface User {
  id: string;
  name: string;
}

// 파일 A에서
const getUsers = async () => {
  const response = await fetch('/api/users');
  return (await response.json()) as User[]; // User 타입으로 단언
};

// 파일 B에서 - 서로 다른 타입 정의
interface UserData {
  // User와 다름
  id: string;
  name: string;
  role: string; // 추가 필드 - User와 불일치 발생
}

const getUserData = async () => {
  const response = await fetch('/api/users');
  return (await response.json()) as UserData[]; // 동일한 API를 다른 타입으로 단언
};
```

#### 이러한 접근 방식은 다음과 같은 심각한 문제를 초래합니다!

1. **타입 안전성 부재**: 응답 데이터에 대한 타입 검증이 없어 런타임 오류 위험이 높습니다.
2. **타입 중복과 불일치**: 동일한 API에 대해 여러 개발자가 서로 다른 타입을 정의하여 혼란을 가중시킵니다.
3. **유지보수 비용 증가**: API 변경 시 모든 호출 지점을 찾아 수정해야 하며, 누락된 곳이 있으면 런타임 오류로 이어집니다.
4. **테스트 어려움**: 타입이 명확하지 않아 테스트 작성이 어렵고, mock 데이터 생성도 복잡해집니다.

## 💡 Type-Safe HTTP 클래스 설계 원칙

> 이제 이런 문제들을 해결하는 Type-Safe한 HTTP 클래스 설계 방법을 알아보겠습니다.

### 1. 제네릭을 활용한 요청/응답 타입 명시

HTTP 메서드에 제네릭을 적용하여 요청 본문과 응답 데이터의 타입을 명확히 정의합니다.

```typescript
// 📁 packages/@package/core/src/http/Http.ts
post<T = any, D = any>(
  url
:
string,
  data ? : D, // 요청 데이터의 타입을 D로 명시
  config ? : RequestConfig,
):
Promise < HttpResponse < T >> { // 응답 데이터의 타입을 T로 명시
  return this.request<T, D>('POST', url, { ...config, data });
}
```

#### 이 설계의 장점

- **명시적 타입 정의**: API 호출 시 요청과 응답 타입을 명확히 지정할 수 있습니다.
- **타입 추론 활용**: 타입스크립트의 추론 기능이 작동하여 자동완성과 타입 체크가 가능합니다.
- **재사용성**: 동일한 HTTP 클래스를 다양한 API 엔드포인트에 타입 안전하게 사용할 수 있습니다.

### 2. 응답 형식의 표준화

HTTP 응답을 표준화된 형식으로 정의하여 일관성을 유지합니다.

```typescript
// 📁 packages/@package/core/src/http/Http.ts
interface HttpResponse<T = any> {
  data: T; // 응답 데이터는 제네릭 타입 T로 정의
  status: HttpStatusCode; // 상태 코드는 열거형으로 타입 안전성 확보
  headers: Headers; // 응답 헤더 정보
}
```

#### 이 설계의 장점

- **일관된 응답 처리**: 모든 API 응답이 동일한 구조를 가지므로 처리 로직이 단순해집니다.
- **타입 안전성**: 응답 데이터(`data`)의 타입이 제네릭으로 명시되어 타입 안전성이 보장됩니다.
- **확장성**: 필요에 따라 응답 형식을 확장할 수 있습니다(예: 메타데이터, 페이지네이션 정보 등).

### 🔍 실제 구현 사례 분석

이제 실제 코드를 통해 타입 안전한 HTTP 클래스가 어떻게 구현되는지 살펴보겠습니다.

### HTTP 클래스 구현

<details>
<summary>예시 Http Class 전체 보기</summary>
<div>

```typescript
// 📁 packages/@package/core/src/http/Http.ts
import { HttpStatusCode } from './HttpStatusCode';

// 요청 설정을 위한 인터페이스
interface RequestConfig<T = any> {
  headers?: Record<string, string>; // 요청 헤더
  params?: Record<string, string>; // 쿼리 파라미터
  data?: T; // 요청 본문 데이터
}

// 응답 형식을 표준화한 인터페이스
interface HttpResponse<T = any> {
  data: T; // 응답 데이터
  status: HttpStatusCode; // HTTP 상태 코드
  headers: Headers; // 응답 헤더
}

export class Http {
  private readonly baseURL: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(baseURL: string, defaultHeaders: Record<string, string> = {}) {
    this.baseURL = baseURL;
    this.defaultHeaders = defaultHeaders;
  }

  // 모든 HTTP 요청의 기본 메서드
  private async request<T = any, D = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    config: RequestConfig<D> = {},
  ): Promise<HttpResponse<T>> {
    const fullUrl = new URL(url, this.baseURL);

    // 쿼리 파라미터 처리
    if (config.params) {
      Object.entries(config.params).forEach(([key, value]) =>
        fullUrl.searchParams.append(key, value),
      );
    }

    // fetch API 호출
    const response = await fetch(fullUrl.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json', // 기본 Content-Type 설정
        ...this.defaultHeaders, // 기본 헤더 적용
        ...config.headers, // 요청별 헤더 적용 (우선순위 높음)
      },
      body: config.data ? JSON.stringify(config.data) : undefined, // 요청 본문 직렬화
    });

    const data = await response.json();

    // 에러 처리
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    // 표준화된 응답 형식으로 반환
    return {
      data,
      status: response.status,
      headers: response.headers,
    };
  }

  // GET 메서드
  get<T = any>(url: string, config?: RequestConfig): Promise<HttpResponse<T>> {
    return this.request<T>('GET', url, config);
  }

  // POST 메서드
  post<T = any, D = any>(
    url: string,
    data?: D,
    config?: RequestConfig,
  ): Promise<HttpResponse<T>> {
    return this.request<T, D>('POST', url, { ...config, data });
  }

  // PUT 메서드
  put<T = any, D = any>(
    url: string,
    data?: D,
    config?: RequestConfig,
  ): Promise<HttpResponse<T>> {
    return this.request<T, D>('PUT', url, { ...config, data });
  }

  // DELETE 메서드
  delete<T = any>(
    url: string,
    config?: RequestConfig,
  ): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', url, config);
  }
}
```

</div>
</details>

#### 이 HTTP 클래스의 핵심 특징.

1. **제네릭 타입 파라미터**:

   - `T`: 응답 데이터의 타입
   - `D`: 요청 본문의 타입

2. **타입 안전한 메서드 체인**:

   - 각 HTTP 메서드는 제네릭 타입을 활용하여 요청과 응답의 타입을 명확히 합니다.
   - 내부적으로 `request` 메서드를 호출하여 코드 중복을 방지합니다.

3. **에러 처리**:

   - 응답이 성공적이지 않을 경우 명시적으로 에러를 던집니다.
   - 타입 시스템을 통해 에러 처리 로직을 강제할 수 있습니다.

### HTTP 클라이언트 인스턴스 생성

```typescript
// 📁 apps/react/src/shared/http.ts
import { Http } from '@package/core';

// HTTP 클라이언트 인스턴스 생성
export const httpClient = new Http('http://localhost:3000');
```

### API 타입 정의

```typescript
// 📁 apps/react/src/server/user/types.ts
import type { User } from '@/shared';

// 요청 타입: User 타입에서 필요한 필드만 선택
export type CreateUserReq = Omit<User, 'id' | 'createdAt'>;

// 응답 타입: 전체 User 객체
export type UserRes = User;

// 사용자 목록 조회 요청 타입
export type GetUsersReq = {
  page?: number;
  limit?: number;
  search?: string;
};

// 사용자 목록 응답 타입
export type GetUsersRes = {
  users: User[];
  total: number;
  page: number;
  limit: number;
};
```

타입 정의의 특징:

1. **도메인 모델 재사용**:

   - 공유 도메인 모델(`User`)을 기반으로 API 요청/응답 타입을 정의합니다.
   - `Pick`, `Omit` 등의 유틸리티 타입을 활용하여 필요한 속성만 선택합니다.

2. **명확한 네이밍 컨벤션**:

   - `UserReq`: 요청 타입
   - `UserRes`: 응답 타입

```typescript
// 📁 apps/react/src/server/user/api.ts
import type { UserRes, CreateUserReq, GetUsersReq, GetUsersRes } from './types';
import { httpClient } from '@/shared/http';

// 사용자 생성 API
export const createUser = async (user: CreateUserReq): Promise<UserRes> => {
  const response = await httpClient.post<UserRes, CreateUserReq>(
    '/api/users',
    user,
  );
  return response.data;
};

// 사용자 목록 조회 API
export const getUsers = async (params?: GetUsersReq): Promise<GetUsersRes> => {
  const response = await httpClient.get<GetUsersRes>('/api/users', { params });
  return response.data;
};

// 특정 사용자 조회 API
export const getUserById = async (id: string): Promise<UserRes> => {
  const response = await httpClient.get<UserRes>(`/api/users/${id}`);
  return response.data;
};

// 사용자 정보 수정 API
export const updateUser = async (
  id: string,
  user: Partial<CreateUserReq>,
): Promise<UserRes> => {
  const response = await httpClient.put<UserRes, Partial<CreateUserReq>>(
    `/api/users/${id}`,
    user,
  );
  return response.data;
};

// 사용자 삭제 API
export const deleteUser = async (id: string): Promise<void> => {
  await httpClient.delete(`/api/users/${id}`);
};
```

#### API 함수들의 특징

1. **함수형 접근**

   - 각 API 엔드포인트를 개별 함수로 정의하여 사용하기 쉽습니다.

2. **타입 안전성**

   - 요청과 응답 타입이 명확히 정의되어 타입 안전성이 보장됩니다.
   - 함수 시그니처만 봐도 어떤 데이터가 필요하고 무엇을 반환하는지 알 수 있습니다.

3. **응답 데이터 추출**
   - `response.data`를 반환하여 호출자가 **_HTTP 응답 구조를 알 필요가 없게 합니다._**

### 🧪 테스트 용이성

타입 안전한 HTTP 클래스 설계의 또 다른 장점은 테스트 용이성입니다.

```typescript
// 📁 apps/react/src/server/user/user.api.test.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { CreateUserReq, UserRes } from './types';
import { createUser, getUsers } from './api';

// MSW 서버 설정 - API 요청을 가로채서 모의 응답 제공
const server = setupServer(
  // 사용자 생성 API 모킹
  http.post<never, CreateUserReq>(
    'http://localhost:3000/api/users',
    async ({ request }) => {
      const user = await request.json();

      // 모의 응답 생성 - 타입 안전하게 UserRes 형태로 반환
      const mockUser: UserRes = {
        id: '1',
        name: user.name,
        email: user.email,
        createdAt: new Date(),
      };

      return HttpResponse.json(mockUser);
    },
  ),

  // 사용자 목록 조회 API 모킹
  http.get('http://localhost:3000/api/users', () => {
    return HttpResponse.json({
      users: [
        {
          id: '1',
          name: 'User 1',
          email: 'user1@test.com',
          createdAt: new Date(),
        },
        {
          id: '2',
          name: 'User 2',
          email: 'user2@test.com',
          createdAt: new Date(),
        },
      ],
      total: 2,
      page: 1,
      limit: 10,
    });
  }),
);

// 테스트 환경 설정
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('User API', () => {
  it('사용자를 생성할 수 있다', async () => {
    // 테스트용 요청 데이터 생성
    const userReq: CreateUserReq = {
      name: 'Test User',
      email: 'test@test.com',
    };

    // API 호출
    const response = await createUser(userReq);

    // 응답 검증 - 타입 안전성 보장
    expect(response).toEqual({
      id: '1',
      name: userReq.name,
      email: userReq.email,
      createdAt: expect.any(Date),
    });
  });

  it('사용자 목록을 조회할 수 있다', async () => {
    // API 호출
    const response = await getUsers({ page: 1, limit: 10 });

    // 응답 검증
    expect(response.users).toHaveLength(2);
    expect(response.total).toBe(2);
    expect(response.users[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      email: expect.any(String),
    });
  });
});
```

#### 테스트의 특징

1. **MSW를 활용한 API 모킹**:

   - 실제 서버 없이도 API 요청을 모킹할 수 있습니다.
   - 타입 안전성이 테스트 코드까지 확장됩니다.

2. **타입 일관성**:
   - 테스트 코드에서도 동일한 타입을 사용합니다.
   - 이를 통해 테스트 코드와 실제 코드 간의 일관성을 보장할 수 있습니다.

## 🔮 결론

> Type-Safe HTTP 클래스 및 서버 API 설계는 단순히 타입스크립트의 기능을 활용하는 것을 넘어, API 통신의 안정성과 유지보수성을 크게 향상시킵니다. 제네릭,
> 인터페이스, 타입 유틸리티 등 타입스크립트의 강력한 기능을 활용하면, 컴파일 타임에 많은 잠재적 버그를 잡아낼 수 있습니다.
>
> 이러한 설계 방식은 초기에 약간의 추가 작업이 필요하지만, 장기적으로는 개발 속도를 높이고 버그를 줄이는 데 큰 도움이 됩니다. 특히 팀 규모가 크거나 프로젝트가 복잡할수록 그
> 효과는 더욱 두드러집니다.
>
> 다음 글에서는 이러한 Type-Safe HTTP 클래스 및 서버 API 설계를 기반으로, 서버와 클라이언트 간의 타입 공유 전략에 대해 더 자세히 알아보겠습니다.
