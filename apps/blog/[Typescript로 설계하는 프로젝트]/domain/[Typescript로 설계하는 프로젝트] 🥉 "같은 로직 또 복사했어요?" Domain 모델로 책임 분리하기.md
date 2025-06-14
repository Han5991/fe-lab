## 들어가며

> **오후 4시, 또 다시 울리는 슬랙 알림...**
>
> **[기획자]**: "저번에 만든 사용자 상태 로직 잘 쓰고 있어요! 그런데 이번엔 사용자가 특정 액션을 할 수 있는지 검증하는 로직도 추가해 주세요."
>
> **[나]**: "네, 어떤 검증 로직인가요?"
>
> **[기획자]**: "사용자가 글을 작성할 수 있는지, 댓글을 달 수 있는지, 파일을 업로드할 수 있는지... 뭐 이런 권한들이요. 그리고 각각 다른 조건들이 있어요!"
>
> **[나]**: (음... 이것도 Service에서 함수로 만들면 되겠지만, 사용자와 관련된 로직들이 점점 많아지고 있네. 그리고 검증 로직이라면 사용자 자체가 판단할 수 있는
> 로직 같은데...)
>
> **[동료]**: "사용자 관련 로직이 Service에 너무 많아지는 것 같은데, 사용자 자체가 가져야 할 책임과 Service가 가져야 할 책임을 나눠보는 게 어떨까요?"

**이런 상황, 어떻게 해결하시겠어요?**

[지난 글](https://velog.io/@rewq5991/typescript-project-service-di-design)에서는 Service Layer를 통해 비즈니스
로직을 분리하고 재사용 가능한 구조를 만드는 방법을 다뤘습니다.

하지만 실제 프로젝트에서는 이런 상황을 만나게 됩니다.

- Service 파일이 수백 줄로 비대해짐
- `사용자` 관련 함수들이 여기저기 흩어져 있음
- 새로운 `사용자` 기능 추가할 때마다 어디에 코드를 넣어야 할지 고민됨
- "`사용자`가 할 수 있는 것"에 대한 로직이 한 곳에 모여있지 않음

이번글에선 이런 문제를 해결하기 위해 **Type으로 시작해서 점진적으로 도메일 모델로 발전시키는 방법**과, **함수형 접근 방식과 객체지향 접근 방식의 선택 기준**에 대해
알아보겠습니다.

---

## 현재 상황: 타입 기반 설계의 한계

> **💡 핵심 요약**
>
> - **문제점**: Service에 모든 로직 집중 → 파일 비대화, 응집도 부족, 확장성 제한
> - **근본 원인**: 타입과 로직이 분리되어 도메인 로직이 분산됨
> - **해결 방향**: 점진적으로 도메인 모델을 도입하여 관련 로직을 응집

### 지금까지 우리가 사용한 방식

```typescript
// 📁 shared/domain/user.ts
// 🟡 현재: 순수 타입으로만 정의
export type UserStatus = 'premium-active' | 'active' | 'new' | 'inactive';

export type User = {
  id: string;
  name: string;
  email: string;
  isPremium: boolean;
  subscriptionStatus: 'active' | 'inactive';
  lastLoginDate: Date;
  createdAt: Date;
  hasReceivedWelcomeEmail: boolean;
};

// 📁 services/userService.ts
// 🟡 현재: Service에서 모든 로직 처리
export const getUserStatus = (user: User): UserStatus => {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  if (user.isPremium && user.lastLoginDate.getTime() > sevenDaysAgo) {
    return 'premium-active';
  }
  if (user.subscriptionStatus === 'active') {
    return 'active';
  }
  if (user.createdAt.getTime() > thirtyDaysAgo) {
    return 'new';
  }
  return 'inactive';
};

export const canUserWritePost = (user: User): boolean => {
  // 글 작성 권한 로직
};

export const canUserComment = (user: User): boolean => {
  // 댓글 권한 로직
};

export const canUserUploadFile = (user: User): boolean => {
  // 파일 업로드 권한 로직
};

// ... 점점 늘어나는 사용자 관련 함수들
```

### 이 방식의 문제점

**1. Service 비대화** - 사용자와 관련된 모든 로직이 Service에 집중되어 파일이 거대해집니다.

**2. 응집도 부족** - 사용자의 속성과 그 속성을 다루는 로직이 분리되어 있어 관련성을 파악하기 어렵습니다.

**3. 확장성 제한** - 새로운 사용자 관련 기능이 추가될 때마다 Service 파일을 수정해야 합니다.

**4. 도메인 지식 분산** - "사용자가 할 수 있는 것"에 대한 도메인 지식이 여러 곳에 흩어져 있습니다.

---

## 지금까지의 여정: 타입 중심 설계에서 도메인 모델로

> **[나]**: 잠깐, 도메인 모델 얘기하기 전에 한 가지 짚고 넘어가야 할 게 있어요.
>
> **[독자]**: 뭔가요?
>
> **[나]**: 지금까지 우리가 HTTP API 설계, Service Layer 설계를 하면서 계속 `@/shared`에서 타입을 import 해왔잖아요?
>
> **[독자]**: 맞아요! [HTTP 설계 글](https://velog.io/@rewq5991/typescript-project-api-design)에서 이런 코드 봤죠.
>
> ```typescript
> // 📁 apps/react/src/server/user/types.ts
> import type { User } from '@/shared';
> ```
>
> **[나]**: 정확히 그거예요! 그리고 그때 "**도메인 모델 재사용**"이라는 용어도 나왔고요.
>
> **[독자]**: 그런데 그게 왜 중요한건지 깊이 생각해본 적은 없었어요.
>
> **[나]**: 바로 그거예요! 이제 그 이유를 명확히 하고, 한 단계 더 발전시켜보려고 해요.

### 🎯 타입 중앙 집중화가 도메인 모델의 시작점인 이유

> **[나]**: 우리가 계속 `shared/domain`에 타입을 모아두는 게 단순히 코드 중복을 줄이려는 게 아니에요.
>
> **[독자]**: 그럼 뭔가요?
>
> **[나]**: 이게 사실 **도메인 지식을 중앙 집중화**하는 첫 번째 단계거든요.
>
> **[독자]**: 아! 그래서 누락 없이 모든 변경점을 찾아낼 수 있는 거네요.
>
> **[나]**: 맞아요! 이게 바로 **"별거 없는"** 변경 요청을 정말로 **"별거 없게"** 만들어주는 핵심 메커니즘이에요.
>
> **[독자]**: 이제 왜 타입 중앙화가 도메인 모델의 전제조건인지 이해가 되네요!

**이런 대화를 통해 핵심을 이해했다면, 이제 구체적으로 왜 이 접근법이 중요한지 체계적으로 살펴보겠습니다.**

> #### 타입 중복과 불일치 문제의 심각성

실제 프로젝트에서 가장 흔히 발생하는 문제는 동일한 데이터에 대해 여러 개발자가 서로 다른 타입을 정의하면서 생기는 혼란입니다.  
한 컴포넌트에서는 `User` 타입으로, API 레이어에서는 `UserData` 타입으로, 서비스에서는 또 다른 이름으로 동일한 사용자 데이터를 다르게 정의하면서 런타임 오류와
개발 생산성 저하를 초래하게 됩니다.  
더 심각한 것은 API가 변경될 때 모든 타입 정의를 찾아서 일일이 수정해야 한다는 점입니다.

> #### shared/domain을 통한 도메인 모델 중앙 집중화

이런 문제를 해결하기 위해 `shared/domain` 디렉토리에 핵심 엔티티들을 중앙 집중화하여 정의합니다.  
이를 통해 모든 레이어에서 동일한 타입을 사용하게 되어 일관성을 보장할 수 있습니다.  
[Service Layer 글](https://velog.io/@rewq5991/typescript-project-service-di-design)에서 보았듯이, Service
레이어에서 비즈니스 로직을 처리할 때도 중앙 집중화된 타입을 활용하여 로직의 재사용성과 테스트 용이성을 확보할 수 있습니다.

> #### 여러 레이어에서의 타입 활용 패턴

HTTP 레이어에서는 제네릭을 활용한 타입 안전한 API 클라이언트를 구성하여 컴파일 타임에 타입 오류를 방지하고, Service 레이어에서는 비즈니스 로직과 데이터 변환 과정에서
중앙 집중화된 타입을 활용하여 안전한 데이터 조작을 보장합니다.  
그리고 이번 글에서 다루는 도메인에서는 이런 타입들을 기반으로 점진적으로 도메인 모델로 발전시키면서 복잡한 비즈니스 규칙을 캡슐화할 수 있습니다.

> #### Type-Driven Development의 실현

중앙 집중화된 타입 시스템은 Type-Driven Development를 가능하게 합니다.  
백엔드 개발자가 "User 스키마에서 name 필드가 제거될 예정"이라고 알려주면,  
중앙의 `User` 타입만 수정하면 TypeScript 컴파일러가 관련된 모든 코드에서 타입 오류를 표시해주어 누락 없이 모든 변경점을 찾아낼 수 있습니다.  
이는 **"별거 없는"** 변경 요청을 정말로 "별거 없게" 만들어주는 핵심 메커니즘입니다.

> #### BFF 패턴에서의 타입 조합

복잡한 프론트엔드 요구사항을 해결하기 위해 여러 API를 조합하는 BFF 패턴에서도 중앙 집중화된 타입이 중요한 역할을 합니다.  
Service Layer에서 여러 도메인의 타입을 조합하여 프론트엔드 최적화된 데이터 구조를 만들 때, 각 도메인이 명확한 타입을 가지고 있어야 안전한 조합이 가능합니다.  
결론적으로, `shared/domain`을 통한 타입 중앙 집중화는 단순히 코드 중복을 줄이는 것을 넘어서 **전체 애플리케이션의 타입 안정성, 유지보수성, 확장성을 보장하는 핵심
아키텍처 전략**입니다.  
이를 통해 개발자는 **"원래 있던 기능이니 금방 하시죠?"** 라는 요청에 대해 정말로 빠르고 안전하게 대응할 수 있는 코드 구조를 구축할 수 있습니다.

---

## 해결책: 점진적 도메인 모델 도입

### 1단계: 타입에서 시작 (현재 상태)

```typescript
// 📁 shared/domain/user.ts
// ✅ 1단계: 순수 타입으로 시작 (지금까지 우리가 한 방식)

export type UserStatus = 'premium-active' | 'active' | 'new' | 'inactive';

export type User = {
  id: string;
  name: string;
  email: string;
  isPremium: boolean;
  subscriptionStatus: 'active' | 'inactive';
  lastLoginDate: Date;
  createdAt: Date;
  hasReceivedWelcomeEmail: boolean;
};

// 📁 services/userService.ts
import type { User, UserStatus } from '@/shared/domain/user';

export const getUserStatus = (user: User): UserStatus => {
  // 기존 로직...
};
```

### 2단계: 책임 분리하기

> **💡 핵심 요약**
>
> - **도메인 모델로 옮길 로직**: 엔티티 자체의 상태 판단, 기본 권한 검증
> - **Service에 남길 로직**: 외부 의존성 필요한 로직, 여러 도메인 협력 로직
> - **핵심 원칙**: 데이터와 그 데이터를 다루는 로직을 함께 배치

**어떤 로직을 도메인 모델로 옮겨야 할까요?**

```typescript
// 📁 domains/user/User.ts
// ✅ 2단계: 사용자 자체의 상태와 능력을 클래스로 캡슐화

export class User {
  constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly email: string,
    private readonly isPremium: boolean,
    private readonly subscriptionStatus: 'active' | 'inactive',
    private readonly lastLoginDate: Date,
    private readonly createdAt: Date,
    private readonly hasReceivedWelcomeEmail: boolean,
  ) {}

  // 🎯 사용자 자체의 상태 판단 (도메인 모델)
  getStatus(): UserStatus {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    if (this.isPremium && this.lastLoginDate.getTime() > sevenDaysAgo) {
      return 'premium-active';
    }
    if (this.subscriptionStatus === 'active') {
      return 'active';
    }
    if (this.createdAt.getTime() > thirtyDaysAgo) {
      return 'new';
    }
    return 'inactive';
  }

  // 🎯 사용자의 기본 권한 판단 (도메인 모델)
  canWritePost(): boolean {
    // 기본 조건: 활성 사용자여야 함
    const status = this.getStatus();
    return status !== 'inactive';
  }

  canComment(): boolean {
    // 댓글은 신규 사용자도 가능
    return true;
  }

  canUploadFile(): boolean {
    // 파일 업로드는 프리미엄 또는 활성 사용자만
    const status = this.getStatus();
    return status === 'premium-active' || status === 'active';
  }
}

// 📁 services/userService.ts
// ✅ 2단계: Service는 외부 의존성이 필요한 복잡한 로직만 처리
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
  ) {}

  // 🎯 여러 도메인이 협력하는 복잡한 로직 (Service)
  async canUserCreatePremiumContent(user: User): Promise<boolean> {
    // 1. 기본 권한 확인 (도메인 모델 사용)
    if (!user.canWritePost()) {
      return false;
    }

    // 2. 외부 시스템 확인이 필요한 로직 (Service)
    const hasValidSubscription = await this.checkSubscriptionValidity(user.id);
    const isNotBanned = await this.checkUserBanStatus(user.id);

    return hasValidSubscription && isNotBanned;
  }

  async sendWelcomeEmailIfNeeded(user: User): Promise<void> {
    // 1. 도메인 모델의 상태 확인
    const status = user.getStatus();

    // 2. 외부 서비스와의 협력
    if (status === 'new' && !user.hasReceivedWelcomeEmail) {
      await this.notificationService.sendWelcomeEmail(user.email);
    }
  }
}
```

> **💡 DTO 변환은 어떻게 하나요?**
>
> API 응답과 도메인 모델 구조가 다를 때는 Mapper 패턴을 고려해보세요.
>
> **Mapper의 장점:**
>
> - 명확한 관심사 분리 (도메인 ↔ DTO 변환 전담)
> - 의존성 방향 개선 (도메인이 외부 계층에 의존하지 않음)
>
> **Mapper의 단점:**
>
> - 코드량 증가 (매퍼 클래스 추가 작성 필요)
> - 유지보수 부담 (모델 변경 시 매퍼도 수정)
> - 비즈니스 로직 누출 위험 (단순 매핑을 넘어선 로직 추가 시)
>
> ```typescript
> // 📁 mappers/userMapper.ts
> export class UserMapper {
>   static toDto(user: User): UserRes {
>     return { id: user.id, name: user.name /* ... */ };
>   }
>
>   static toDomain(dto: UserRes): User {
>     // DTO -> 도메인 모델 변환
>   }
> }
> ```

### 3단계: 상황에 맞는 접근 방식 선택

> **💡 핵심 요약**
>
> - **함수형**: 단순한 계산/검증 로직, 팀이 함수형에 익숙한 경우
> - **객체지향**: 복잡한 상태 관리, 도메인 로직이 많은 경우, 확장성이 중요한 경우
> - **하이브리드**: 실제 대부분의 프로젝트에서 권장

**어떤 방식을 선택할지 판단하는 기준을 알아보겠습니다.**

#### 🔧 함수형 접근이 적합한 경우

**장점:** 학습 비용 낮음, 테스트 용이, 불변성 보장, 함수 조합 용이

**적합한 상황:**

- 단순한 계산/변환 로직
- 상태가 없는 검증 로직
- 팀이 함수형에 익숙한 경우

```typescript
// 📁 domains/user/userDomain.ts - 함수형 방식
export const getUserStatus = (user: User): UserStatus => {
  // 상태 계산 로직...
};

export const canUserWritePost = (user: User): boolean => {
  const status = getUserStatus(user);
  return status !== 'inactive';
};

// Service에서 함수들을 조합
export const createUserService = deps => ({
  async canUserCreatePremiumContent(user: User): Promise<boolean> {
    if (!canUserWritePost(user)) return false;
    return await deps.userRepository.checkSubscription(user.id);
  },
});
```

#### 🏗️ 객체지향 접근이 적합한 경우

**장점:** 관련 로직 응집, 캡슐화, 확장성, 직관적 모델링

**적합한 상황:**

- 복잡한 상태를 가진 엔티티
- 도메인 로직이 많고 확장 가능성이 높은 경우
- 다형성이 필요한 경우

```typescript
// 📁 domains/user/User.ts - 객체지향 방식
export class User {
  constructor(/* 속성들 */) {}

  getStatus(): UserStatus {
    // 상태 계산 로직을 내부에 캡슐화
  }

  canWritePost(): boolean {
    return this.getStatus() !== 'inactive';
  }

  // 다른 도메인 로직들...
}

// Service는 도메인 모델을 활용
export class UserService {
  async canUserCreatePremiumContent(user: User): Promise<boolean> {
    if (!user.canWritePost()) return false;
    return await this.userRepository.checkSubscription(user.id);
  }
}
```

---

## 트레이드오프 분석

> **💡 핵심 요약**
>
> - **함수형**: 학습 용이, 테스트 간편 vs 로직 분산, 상태 관리 어려움
> - **객체지향**: 로직 응집, 확장성 우수 vs 러닝 커브, 추상화 복잡도
> - **선택 기준**: 팀 역량, 프로젝트 복잡도, 장기 유지보수 계획 고려

### ⚖️ 함수형 접근 방식

#### ✅ 장점

- **학습 비용 낮음**: 기존 React/TypeScript 개발자들에게 친숙
- **테스트 용이성**: 순수 함수라 모킹 없이 테스트 가능
- **함수 조합**: 작은 함수들을 조합해서 복잡한 로직 구성
- **불변성**: 데이터 변경 없이 안전한 계산
- **트리 쉐이킹**: 사용하지 않는 함수는 번들에서 제외

#### ❌ 단점

- **관련 로직 분산**: 관련 있는 로직들이 여러 파일에 흩어짐
- **네임스페이스 오염**: 전역 함수가 많아질 수 있음
- **복잡한 상태 관리**: 상태가 복잡해지면 관리가 어려움
- **중복 코드**: 비슷한 패턴의 함수들이 반복될 수 있음

### ⚖️ 객체지향 접근 방식

#### ✅ 장점

- **관련 로직 응집**: 데이터와 행동이 함께 위치
- **캡슐화**: 내부 구현을 숨기고 명확한 인터페이스 제공
- **확장성**: 상속과 다형성을 통한 기능 확장
- **직관적 모델링**: 실제 도메인을 자연스럽게 표현
- **IDE 지원**: 자동완성과 리팩토링 도구 지원 우수

#### ❌ 단점

- **러닝 커브**: 객체지향 설계 원칙 학습 필요
- **과도한 추상화**: 간단한 로직도 복잡하게 만들 위험
- **의존성 관리**: DI 컨테이너 등 추가 설정 필요
- **번들 크기**: 클래스 구조로 인한 번들 크기 증가 가능

---

## 결론

### 🎯 핵심 가이드라인

#### 1. 시작은 간단하게

```typescript
// ✅ 타입과 함수로 시작
export interface User {
  /* */
}

export const getUserStatus = (user: User) => {
  /* */
};
```

#### 2. 필요에 따라 점진적 발전

```typescript
// ✅ 복잡해지면 도메인 모델 도입
export class User {
  getStatus() {
    /* */
  }

  canPerform(action: string) {
    /* */
  }
}
```

### 🚀 다음 단계

이제 여러분은 다음과 같은 능력을 갖추었습니다:

1. **타입에서 시작해서 점진적으로 도메인 모델로 발전**시키기
2. **함수형과 객체지향 중에서 상황에 맞게 선택**하기
3. **안전한 마이그레이션 전략**으로 기존 코드를 개선하기

> **[기획자]**: "사용자 권한 로직 추가해 주세요!"
>
> **[나]**: "네, 기존 User 도메인 모델에 권한 관련 메서드 추가하면 금방 할 수 있어요!"
>
> **[기획자]**: "정말요? 이번엔 정말 빠르네요!"
>
> **[나]**: "네, 이제 사용자와 관련된 로직은 User 자체가 알고 있어서 쉽게 확장할 수 있어요!" 🎉

---

## 부록: 실무 적용을 위한 체크리스트

### 📋 프로젝트 시작 전 체크리스트

#### 🤔 팀 상황 체크

- [ ] 팀원들의 함수형 vs 객체지향 선호도는?
- [ ] 기존 코드베이스의 패턴은?
- [ ] 프로젝트 예상 복잡도는?
- [ ] 장기 유지보수 계획은?

#### 📊 도메인 복잡도 체크

- [ ] 단순 CRUD 중심인가?
- [ ] 복잡한 비즈니스 규칙이 많은가?
- [ ] 상태 변화가 복잡한가?
- [ ] 다른 도메인과의 상호작용이 많은가?

### 🛠️ 구현 시 체크리스트

#### 🔧 함수형 선택 시

- [ ] 순수 함수로 구현했는가?
- [ ] 함수 이름이 명확한가?
- [ ] 테스트 작성이 용이한가?
- [ ] 함수 조합이 자연스러운가?

#### 🏗️ 객체지향 선택 시

- [ ] 단일 책임 원칙을 지켰는가?
- [ ] 캡슐화가 잘 되어 있는가?
- [ ] 인터페이스가 명확한가?
- [ ] 의존성 주입이 적절한가?

### 🔄 마이그레이션 시 체크리스트

#### 📈 점진적 전환

- [ ] 기존 함수를 유지하면서 새로운 방식 도입
- [ ] deprecated 표시로 점진적 전환 안내
- [ ] 호환성 레이어 제공
- [ ] 팀원들에게 새로운 패턴 교육

#### 🧪 검증

- [ ] 기존 테스트가 모두 통과하는가?
- [ ] 성능상 문제가 없는가?
- [ ] 번들 크기 증가가 허용 범위인가?

---

### 🔗 관련 시리즈

1. [Type-Safe HTTP API 설계](https://velog.io/@rewq5991/typescript-project-api-design)
2. [Service Layer로 비즈니스 로직 분리](https://velog.io/@rewq5991/typescript-project-service-di-design)
3. **타입에서 클래스로: 도메인 모델의 점진적 진화** (현재 글)

---

이제 여러분의 프론트엔드 코드는 단순한 컴포넌트 모음이 아닌, **체계적인 도메인 모델을 담은 프로젝트**로 발전했습니다.

**"별거 없어요!"** 라는 기획 변경 요청이 정말로 **"별거 없게"** 되는 그날까지, 함께 발전해 나가겠습니다! 🚀
