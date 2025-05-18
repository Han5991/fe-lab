# [타입으로 설계하는 프로젝트] 당신의 Type, 어디까지 연결되어 있나요?

**"왜 타입스크립트로 개발했는데도 런타임 에러가 끊이지 않을까?"**

많은 시간을 들여 타입스크립트로 전환했지만, 여전히 `undefined is not a function` 에러에 시달리고 계신가요? 대규모 프로젝트에서 타입스크립트의 진정한 가치는 단순한 자동완성이 아닌, 견고한 타입 설계에서 비롯됩니다.

프로젝트를 처음 들어갔을 때, 가장 먼저 확인하는 것 중 하나는 **Type**입니다. 하지만 이런 광경을 자주 마주칩니다:

- 서버 API의 타입은 호출하는 곳에서 그때그때 만들거나 `as`로 무시
- 라이브러리의 제네릭은 무시하고 `any`로 대체
- 도메인 타입이 중복 선언되고 일관성이 없음
- 타입이 기능별로 흩어져 있고, 연결성이 없음

이런 상태에서는 **타입이 안정성을 주는 도구가 아닌, 추가적인 관리 부담**으로 작용합니다. 개발자들은 점차 타입스크립트의 본질적 가치를 포기하고 "자바스크립트 + 자동완성" 수준으로 타협하게 됩니다.

### 🚨 분리된 타입의 실제 문제점

- **기술 부채 증가**: 중복되고 불일치한 타입 정의가 코드베이스 전체에 퍼집니다
- **온보딩 어려움**: 신규 개발자들은 일관성 없는 타입 패턴에 적응하느라 시간을 낭비합니다
- **디버깅 지옥**: API 변경 시 타입 불일치로 인한 버그 추적이 기하급수적으로 어려워집니다
- **개발 속도 저하**: 코드를 변경할 때마다 예상치 못한 타입 에러와 싸워야 합니다

### 💪 타입 중심 설계의 장점

- **컴파일 타임 안정성**: API 변경 시 영향 범위를 즉시 파악할 수 있습니다
- **자동 문서화**: 타입 자체가 코드의 의도를 명확하게 전달합니다
- **개발 경험 향상**: 자동완성과 타입 추론이 실제로 믿을 수 있게 됩니다
- **리팩토링 자신감**: 광범위한 코드 변경도 타입 시스템의 보호 아래 안전하게 진행됩니다

---

## 🤔 왜 이런 문제가 생길까?

**대부분은 타입이 "설계의 일부"가 아니라 "후처리 대상"이기 때문입니다.**

기능 → 구현 → 마지막에 타입 보완  
이런 흐름은 결국 타입이 덧붙여지는 존재가 되고, 프로젝트가 커질수록 한계를 드러냅니다.

### 📝 일반적인 개발 프로세스의 문제

1. **기능 우선주의**: "일단 돌아가게 만들고, 나중에 타입을 붙이자"라는 접근법
2. **단기적 사고**: 당장의 기능 구현에만 집중하다 보니 타입의 일관성과 재사용성을 고려하지 않음
3. **타입 설계 경험 부족**: 많은 개발자들이 JavaScript에서 TypeScript로 전환 시 타입 설계 패턴에 익숙하지 않음
4. **리팩토링 부담**: 이미 작성된 코드에 타입을 추가하는 것은 생각보다 복잡하고 시간이 많이 소요됨

### 🧠 개발 마인드셋의 변화가 필요

> 타입을 코드 완성 후의 "검증 도구"가 아닌, 코드를 작성하기 전의 **설계 도구**로 접근해야 합니다.  
> 데이터베이스 스키마나 API 문서를 설계하듯, Type 시스템도 프로젝트의 핵심 아키텍처로 다루어야 합니다.  
> 이는 단순히 **더 엄격한 TypeScript 설정을 사용하자**가 아닌, **타입 주도 설계 방식으로의 전환**(Type-Driven Development)을 의미합니다.

#### 🔄 전형적인 타입 관련 안티패턴들

```typescript
// 안티패턴 1: API 응답에 임시 타입 만들기
function fetchUser() {
  return fetch('/api/user')
    .then(res => res.json())
    .then(data => data as { name: string; email: string }); // API 변경 시 여기도 수동으로 변경해야 함
}

// 안티패턴 2: 같은 도메인 객체에 대한 중복된 타입 정의
// UserProfile.tsx에서
type User = { id: string; name: string; email: string };

// UserSettings.tsx에서 (동일한 유저인데 타입이 다름)
type UserData = { id: string; name: string; emailAddress: string }; // email vs emailAddress

// 안티패턴 3: 타입 불일치를 해결하기 위한 타입 변환의 남용
const userData = fetchUser() as unknown as UserData; // 위험한 타입 캐스팅
```

---

## 🧭 타입도 설계의 시작점이 될 수 있다

이 시리즈에서는 다음과 같은 방향으로 **타입을 중심에 둔 설계**를 풀어갈 예정입니다:

### 1️⃣ type-safe의 필요성

단순히 "타입스크립트를 쓰니까 안전하다"가 아닌, 왜 진정한 타입 안전성이 중요한지 살펴봅니다.

```typescript
// 타입 안전성이 낮은 코드
function processUser(user: any) {
  return user.name.toUpperCase(); // 런타임 에러 가능성 높음
}

// 타입 안전성이 높은 코드
function processUser(user: { name: string }) {
  return user.name.toUpperCase(); // 컴파일 타임에 안전성 보장
}
```

### 2️⃣ 서버 API에서 시작되는 타입 정의

백엔드와 프론트엔드 사이의 계약인 API부터 타입 정의를 시작하는 방법을 알아봅니다. API 응답 타입을 효과적으로 관리하는 패턴을 소개합니다.

```typescript
// 📁 types/api.ts - 서버 API 타입 정의의 중심점
export type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

export type UserDTO = {
  id: string;
  userName: string;
  email: string;
  createdAt: string;
};
```

### 3️⃣ 도메인 타입 조합

비즈니스 로직에 맞는 도메인 모델을 타입으로 정의하고, API 응답에서 도메인 모델로 변환하는 패턴을 다룹니다. 타입 매핑, 유틸리티 타입, 타입 가드를 활용하여 도메인 중심 설계를 구현하는 방법을 배웁니다.

```typescript
// 📁 models/user.ts - 도메인 타입 정의
import { UserDTO } from '../types/api';

export type User = {
  id: string;
  name: string; // userName에서 변환
  email: string;
  createdAt: Date; // string에서 Date 객체로 변환
};

// 데이터 변환 함수 (DTO → 도메인 모델)
export function toUser(dto: UserDTO): User {
  return {
    id: dto.id,
    name: dto.userName,
    email: dto.email,
    createdAt: new Date(dto.createdAt),
  };
}
```

### 4️⃣ API 요청/응답 타입 연결

API 클라이언트 레이어에서 서버 타입과 도메인 타입을 어떻게 연결하는지 알아봅니다. 중복 없이 타입을 재사용하면서도 관심사를 분리하는 패턴을 제시합니다.

```typescript
// 📁 api/userApi.ts - API 클라이언트 레이어
import { ApiResponse, UserDTO } from '../types/api';
import { User, toUser } from '../models/user';

export async function getUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  const data: ApiResponse<UserDTO> = await response.json();

  if (data.status !== 200) {
    throw new Error(data.message);
  }

  // 서버 응답을 도메인 모델로 변환
  return toUser(data.data);
}
```

### 5️⃣ 컴포넌트 단위까지 타입 확장

UI 컴포넌트에서 props와 state 타입을 도메인 모델과 연결하는 방법을 다룹니다.

```tsx
// 📁 components/UserProfile.tsx - UI 컴포넌트
import React from 'react';
import { User } from '../models/user';
import { getUser } from '../api/userApi';

type UserProfileProps = {
  userId: string;
};

export const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadUser() {
      try {
        const userData = await getUser(userId);
        setUser(userData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <p>Member since: {user.createdAt.toLocaleDateString()}</p>
    </div>
  );
};
```

> 이 시리즈를 통해 단순한 타입 주석을 넘어서, 전체 애플리케이션 아키텍처를 타입 시스템을 중심으로 설계하는 방법을 배우게 됩니다.  
> 각 레이어에서 타입이 자연스럽게 흐르도록 구성하면, 코드의 안정성은 물론 개발 경험과 유지보수성도 크게 향상됩니다.

---

## 🔗 타입은 이렇게 연결되어야 합니다

다음은 앞으로 전개할 흐름을 간단한 **다이어그램**으로 표현한 것입니다:

```aiignore
📂 root
├── 📦 Server
│   └─ 📂 [feature]
│      ├── 📂 api
│      └── 📂 types            ← 서버 스펙을 타입으로 정의
├── 📦 Shared
│   ├─ 📂  domain              ← 도메인 타입, 유스케이스 중심 모델
│   │  └─ 📂 [feature]
│   └─ 📂 lib
│      └─ 📂 api.client
└── 📦 UI
    └─ 📄 Component.tsx        ← props, state에 타입을 자연스럽게 흐르게
```

> 위 구조는 예시이며, 핵심은 **"서버 → 도메인 → API → UI"로 타입이 흐르듯 연결되는 설계**입니다.

---

✍️ 정리하며

타입은 단순히 오류를 막는 보조 도구가 아닙니다.
설계의 일부분이자, 유지보수성과 확장성을 위한 핵심 수단입니다.

이 시리즈는 타입이 프로젝트 전체에서 자연스럽게 흐르도록 설계하는 방법을 다룹니다.

다음 글에서는 서버 API에서 타입을 어떻게 뽑아내고, 어떻게 재사용 구조로 만들 수 있는지 다뤄보겠습니다.

⸻

💬 다음 글: [타입으로 설계하는 프로젝트] 서버 API부터 타입으로 묶자
