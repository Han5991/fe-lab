## 들어가며

> **오후 4시, 또 다시 울리는 슬랙 알림...**
>
> **[기획자]**: "저번에 만든 사용자 상태 로직 잘 쓰고 있어요! 그런데 이번엔 사용자가 특정 액션을 할 수 있는지 검증하는 로직도 추가해 주세요."
>
> **[나]**: "네, 어떤 검증 로직인가요?"
>
> **[기획자]**: "사용자가 글을 작성할 수 있는지, 댓글을 달 수 있는지, 파일을 업로드할 수 있는지... 뭐 이런 권한들이요. 그리고 각각 다른 조건들이 있어요!"
>
> **[나]**: (음... 이것도 Service에서 함수로 만들면 되겠지만, 사용자와 관련된 로직들이 점점 많아지고 있네. 그리고 검증 로직이라면 사용자 자체가 판단할 수 있는 로직 같은데...)
>
> **[동료]**: "사용자 관련 로직이 Service에 너무 많아지는 것 같은데, 사용자 자체가 가져야 할 책임과 Service가 가져야 할 책임을 나눠보는 게 어떨까요?"

**이런 상황, 어떻게 해결하시겠어요?**

[지난 글](https://velog.io/@rewq5991/typescript-project-service-di-design)에서는 Service Layer를 통해 비즈니스 로직을 분리하고 재사용 가능한 구조를 만드는 방법을 다뤘습니다.  
하지만 프로젝트가 복잡해질수록 Service에 모든 로직을 넣는 것만으로는 한계가 있습니다.

이번글에선 **Type으로 시작해서 점진적으로 Domain으로 발전시키는 방법**과, **함수형 접근 방식과 객체지향 접근 방식의 선택 기준**에 대해 알아보겠습니다.

---

## 현재 상황: 타입 기반 설계의 한계

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

**1. Service 비대화**
사용자와 관련된 모든 로직이 Service에 집중되어 파일이 거대해집니다.

**2. 응집도 부족**
사용자의 속성과 그 속성을 다루는 로직이 분리되어 있어 관련성을 파악하기 어렵습니다.

**3. 확장성 제한**
새로운 사용자 관련 기능이 추가될 때마다 Service 파일을 수정해야 합니다.

**4. 도메인 지식 분산**
"사용자가 할 수 있는 것"에 대한 지식이 여러 곳에 흩어져 있습니다.

---

## 해결책: 점진적 도메인 모델 도입

### 1단계: 타입에서 시작 (현재 상태)

```typescript
// 📁 shared/domain/user.ts
// ✅ 1단계: 순수 타입으로 시작 (지금까지 우리가 한 방식)
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

export type UserStatus = 'premium-active' | 'active' | 'new' | 'inactive';

// 📁 services/userService.ts
import type { User, UserStatus } from '@/shared/domain/user';

export const getUserStatus = (user: User): UserStatus => {
  // 기존 로직...
};
```

### 💡 **왜 shared/domain에 타입을 중앙 집중화해야 할까요?**

> **타입 중복과 불일치 문제의 심각성**

실제 프로젝트에서 가장 흔히 발생하는 문제는 동일한 데이터에 대해 여러 개발자가 서로 다른 타입을 정의하면서 생기는 혼란입니다. 한 컴포넌트에서는 `User` 타입으로, API 레이어에서는 `UserData` 타입으로, 서비스에서는 또 다른 이름으로 동일한 사용자 데이터를 다르게 정의하면서 런타임 오류와 개발 생산성 저하를 초래하게 됩니다. 더 심각한 것은 API가 변경될 때 모든 타입 정의를 찾아서 일일이 수정해야 한다는 점입니다.

> **shared/domain을 통한 도메인 모델 중앙 집중화**

이런 문제를 해결하기 위해 `shared/domain` 디렉토리에 핵심 엔티티들을 중앙 집중화하여 정의합니다. 이를 통해 모든 레이어에서 동일한 타입을 사용하게 되어 일관성을 보장할 수 있습니다.  
[Service Layer 글](https://velog.io/@rewq5991/frontend-service-layer-design)에서 보았듯이, Service 레이어에서 비즈니스 로직을 처리할 때도 중앙 집중화된 타입을 활용하여 로직의 재사용성과 테스트 용이성을 확보할 수 있습니다.

> **여러 레이어에서의 타입 활용 패턴**

HTTP 레이어에서는 제네릭을 활용한 타입 안전한 API 클라이언트를 구성하여 컴파일 타임에 타입 오류를 방지하고, Service 레이어에서는 비즈니스 로직과 데이터 변환 과정에서 중앙 집중화된 타입을 활용하여 안전한 데이터 조작을 보장합니다.  
그리고 이번 글에서 다루는 Domain 레이어에서는 이런 타입들을 기반으로 점진적으로 도메인 클래스로 발전시키면서 복잡한 비즈니스 규칙을 캡슐화할 수 있습니다.

> **Type-Driven Development의 실현**

중앙 집중화된 타입 시스템은 Type-Driven Development를 가능하게 합니다.  
백엔드 개발자가 "User 스키마에서 name 필드가 제거될 예정"이라고 알려주면, 중앙의 `User` 타입만 수정하면 TypeScript 컴파일러가 관련된 모든 코드에서 타입 오류를 표시해주어 `누락 없이 모든 변경점을 찾아낼 수 있습니다.`  
이는 "별거 없는" 변경 요청을 정말로 "별거 없게" 만들어주는 핵심 메커니즘입니다.

> **BFF 패턴에서의 타입 조합**

복잡한 프론트엔드 요구사항을 해결하기 위해 여러 API를 조합하는 BFF 패턴에서도 중앙 집중화된 타입이 중요한 역할을 합니다.  
Service Layer에서 여러 도메인의 타입을 조합하여 프론트엔드 최적화된 데이터 구조를 만들 때, 각 도메인이 명확한 타입을 가지고 있어야 안전한 조합이 가능합니다.

결론적으로, `shared/domain`을 통한 타입 중앙 집중화는 단순히 코드 중복을 줄이는 것을 넘어서 **전체 애플리케이션의 타입 안정성, 유지보수성, 확장성을 보장하는 핵심 아키텍처 전략**입니다.  
이를 통해 개발자는 "원래 있던 기능이니 금방 하시죠?"라는 요청에 대해 정말로 빠르고 안전하게 대응할 수 있는 코드 구조를 구축할 수 있습니다.

### 2단계: 책임 분리하기

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

  // 🎯 여러 API 조합이 필요한 로직 (Service)
  async sendWelcomeEmailIfNeeded(user: User): Promise<void> {
    // 1. 도메인 모델의 상태 확인
    const status = user.getStatus();

    // 2. 외부 서비스와의 협력
    if (status === 'new' && !user.hasReceivedWelcomeEmail) {
      await this.notificationService.sendWelcomeEmail(user.getEmail());
    }
  }
}
```

### 3단계: 함수형 vs 객체지향 선택하기

**상황에 따른 선택 기준을 제시하겠습니다.**

#### 🔧 함수형 접근 방식 (현재 방식 유지)

```typescript
// 📁 domains/user/userDomain.ts
// ✅ 함수형: 순수 함수로 도메인 로직 구성

export interface UserData {
  id: string;
  name: string;
  email: string;
  isPremium: boolean;
  subscriptionStatus: 'active' | 'inactive';
  lastLoginDate: Date;
  createdAt: Date;
  hasReceivedWelcomeEmail: boolean;
}

// 도메인 로직을 순수 함수로 분리
export const getUserStatus = (user: UserData): UserStatus => {
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

export const canUserWritePost = (user: UserData): boolean => {
  const status = getUserStatus(user);
  return status !== 'inactive';
};

export const canUserUploadFile = (user: UserData): boolean => {
  const status = getUserStatus(user);
  return status === 'premium-active' || status === 'active';
};

// 📁 services/userService.ts
// Service에서 도메인 함수들을 조합
import * as UserDomain from '@/domains/user/userDomain';

export const createUserService = (
  userRepository: UserRepository,
  notificationService: NotificationService,
) => ({
  async canUserCreatePremiumContent(
    user: UserDomain.UserData,
  ): Promise<boolean> {
    // 도메인 로직 사용
    if (!UserDomain.canUserWritePost(user)) {
      return false;
    }

    // 외부 의존성 처리
    const hasValidSubscription = await userRepository.checkSubscription(
      user.id,
    );
    return hasValidSubscription;
  },

  async sendWelcomeEmailIfNeeded(user: UserDomain.UserData): Promise<void> {
    const status = UserDomain.getUserStatus(user);

    if (status === 'new' && !user.hasReceivedWelcomeEmail) {
      await notificationService.sendWelcomeEmail(user.email);
    }
  },
});
```

#### 🏗️ 객체지향 접근 방식 (DI 활용)

```typescript
// 📁 domains/user/User.ts
// ✅ 객체지향: 클래스로 상태와 행동을 캡슐화

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

  getStatus(): UserStatus {
    // 구현 동일
  }

  canWritePost(): boolean {
    const status = this.getStatus();
    return status !== 'inactive';
  }

  canUploadFile(): boolean {
    const status = this.getStatus();
    return status === 'premium-active' || status === 'active';
  }
}

// 📁 services/userService.ts
// Service는 DI를 통해 의존성 주입
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async canUserCreatePremiumContent(user: User): Promise<boolean> {
    if (!user.canWritePost()) {
      return false;
    }

    const hasValidSubscription = await this.userRepository.checkSubscription(
      user.getId(),
    );
    return hasValidSubscription;
  }

  async sendWelcomeEmailIfNeeded(user: User): Promise<void> {
    const status = user.getStatus();

    if (status === 'new' && !user.hasReceivedWelcomeEmail) {
      await this.notificationService.sendWelcomeEmail(user.email);
    }
  }
}
```

---

## 언제 어떤 방식을 선택해야 할까?

### ⚖️ 함수형 vs 객체지향 선택 기준

#### 🔧 함수형 접근이 적합한 경우

**장점:**

- **학습 비용 낮음**: 기존 팀이 함수형에 익숙함
- **테스트 용이**: 순수 함수라 입력-출력만 테스트
- **불변성 보장**: 데이터 변경 없이 안전한 계산
- **함수 조합 용이**: 함수들을 레고처럼 조합 가능

**적합한 상황:**

```typescript
// ✅ 함수형이 좋은 경우들
// 1. 단순한 계산/변환 로직
export const calculateDiscount = (user: UserData, order: OrderData): number => {
  const userTier = getUserTier(user);
  const orderAmount = getOrderTotal(order);
  return applyTierDiscount(userTier, orderAmount);
};

// 2. 상태가 없는 검증 로직
export const isValidEmailFormat = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// 3. 데이터 변환 파이프라인
export const transformUserForDisplay = (user: UserData): DisplayUser => {
  return pipe(user, addUserStatus, addPermissions, formatForUI);
};
```

#### 🏗️ 객체지향 접근이 적합한 경우

**장점:**

- **관련 로직 응집**: 데이터와 행동이 함께 위치
- **캡슐화**: 내부 구현을 숨기고 인터페이스만 노출
- **확장성**: 상속/다형성을 통한 기능 확장
- **직관적 모델링**: 실제 도메인을 자연스럽게 표현

**적합한 상황:**

```typescript
// ✅ 객체지향이 좋은 경우들
// 1. 복잡한 상태를 가진 엔티티
export class ShoppingCart {
  private items: CartItem[] = [];

  addItem(product: Product, quantity: number): void {
    // 복잡한 장바구니 로직
  }

  removeItem(productId: string): void {
    // 아이템 제거 로직
  }

  calculateTotal(): Money {
    // 총액 계산 로직
  }
}

// 2. 여러 행동을 가진 도메인 객체
export class User {
  upgrade(): void {
    /* 등급 업그레이드 */
  }
  subscribe(plan: Plan): void {
    /* 구독 */
  }
  sendNotification(message: string): void {
    /* 알림 */
  }
}

// 3. 다형성이 필요한 경우
export abstract class PaymentMethod {
  abstract process(amount: Money): Promise<PaymentResult>;
}

export class CreditCardPayment extends PaymentMethod {
  process(amount: Money): Promise<PaymentResult> {
    // 신용카드 결제 로직
  }
}
```

### 🎯 단계별 선택 가이드

#### 1단계: 프로젝트 특성 파악

```typescript
// 질문해보세요:
// 1. 팀의 기술 스택과 선호도는?
// 2. 도메인의 복잡도는?
// 3. 상태 관리가 복잡한가?
// 4. 확장 계획은?
```

#### 2단계: 하이브리드 접근

```typescript
// 📁 domains/user/userDomain.ts
// ✅ 간단한 로직은 함수형으로
export const getUserStatus = (user: UserData): UserStatus => {
  // 순수 계산 로직
};

export const isEmailValid = (email: string): boolean => {
  // 단순 검증 로직
};

// 📁 domains/order/Order.ts
// ✅ 복잡한 상태는 클래스로
export class Order {
  private items: OrderItem[] = [];
  private status: OrderStatus = 'draft';

  addItem(item: OrderItem): void {
    // 복잡한 주문 로직
  }

  confirm(): void {
    // 상태 변경과 검증 로직
  }
}
```

#### 3단계: 점진적 마이그레이션

```typescript
// 📁 migration-example.ts
// ✅ 기존 함수형 코드를 점진적으로 클래스로 변환

// Before: 함수형
export const getUserPermissions = (user: UserData): Permission[] => {
  // 기존 로직
};

// After: 클래스로 점진적 변환
export class User {
  // 새로운 기능은 클래스 메서드로
  getPermissions(): Permission[] {
    // 기존 함수 재활용 가능
    return getUserPermissions(this.toData());
  }

  private toData(): UserData {
    return {
      id: this.id,
      name: this.name,
      // ... 변환 로직
    };
  }
}

// 기존 함수도 유지하여 호환성 보장
export const getUserPermissionsLegacy = getUserPermissions;
```

---

## 실전 가이드: 프로젝트 규모별 권장사항

### 🏃‍♂️ 소규모 프로젝트 (1-3명, 3개월 이하)

**권장: 함수형 위주 + 필요시 클래스**

```typescript
// ✅ 대부분 함수형으로 빠르게 개발
// 📁 domains/user.ts
export const getUserStatus = (user: UserData) => {
  /* ... */
};
export const canUserAccess = (user: UserData, resource: string) => {
  /* ... */
};

// ✅ 복잡한 상태만 클래스로
// 📁 domains/ShoppingCart.ts
export class ShoppingCart {
  // 상태가 복잡한 경우에만
}
```

### 🚶‍♂️ 중규모 프로젝트 (3-8명, 6개월-1년)

**권장: 하이브리드 접근**

```typescript
// ✅ 도메인별로 적절한 방식 선택
// 📁 domains/user/ (함수형 중심)
export const userDomain = {
  getUserStatus,
  canUserAccess,
  calculateUserScore,
};

// 📁 domains/order/ (클래스 중심)
export class Order {
  // 복잡한 비즈니스 로직은 클래스로
}

// 📁 services/ (DI 활용)
export class UserService {
  constructor(private deps: Dependencies) {}
}
```

### 🏃‍♀️ 대규모 프로젝트 (8명 이상, 1년 이상)

**권장: 객체지향 중심 + DI 활용**

```typescript
// ✅ 체계적인 도메인 모델링
// 📁 domains/user/User.ts
export class User {
  // 풍부한 도메인 모델
}

// 📁 domains/user/UserRepository.ts
export interface UserRepository {
  // 명확한 인터페이스 정의
}

// 📁 services/
export class UserService {
  // 의존성 주입을 통한 느슨한 결합
}

// 📁 infrastructure/di/
export const container = {
  // 의존성 컨테이너 구성
};
```

---

## 마이그레이션 전략: 안전한 전환 방법

### 🔄 점진적 전환 프로세스

#### 1단계: 현재 상태 분석

```typescript
// 📁 current-analysis.ts
// 🔍 기존 코드 분석
const currentUserFunctions = [
  'getUserStatus',
  'canUserWritePost',
  'canUserComment',
  'canUserUploadFile',
  'isUserPremium',
  // ... 현재 함수들 나열
];

// 질문: 이 중에서 어떤 것들이 User 자체의 책임인가?
// 답변: User의 상태나 기본 권한 관련 로직들
```

#### 2단계: 후보 선정

```typescript
// 📁 migration-candidates.ts
// ✅ 도메인 모델로 옮길 후보들
const userDomainCandidates = [
  'getUserStatus', // ✅ User 자체의 상태
  'canUserWritePost', // ✅ User의 기본 권한
  'canUserComment', // ✅ User의 기본 권한
  'isEmailValid', // ✅ User 데이터 검증
];

// ❌ Service에 남겨둘 것들
const serviceCandidates = [
  'sendWelcomeEmail', // 외부 서비스 호출
  'checkSubscriptionValidity', // 외부 API 확인
  'getUserRecommendations', // 여러 도메인 조합
];
```

#### 3단계: 안전한 전환

```typescript
// 📁 safe-migration.ts
// ✅ 기존 함수를 유지하면서 클래스 도입

// 새로운 User 클래스
export class User {
  constructor(private data: UserData) {}

  getStatus(): UserStatus {
    return getUserStatus(this.data); // 기존 함수 재활용
  }
}

// 기존 함수는 deprecated로 표시하고 유지
/** @deprecated Use User.getStatus() instead */
export const getUserStatus = (user: UserData): UserStatus => {
  // 기존 구현 유지
};

// 점진적으로 교체
export const getUserStatusV2 = (user: User): UserStatus => {
  return user.getStatus();
};
```

---

## 트레이드오프 분석

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

#### 3. 팀과 프로젝트에 맞는 선택

- **함수형**: 간단한 프로젝트, 함수형에 익숙한 팀
- **객체지향**: 복잡한 도메인, 장기 프로젝트, 확장성 중요
- **하이브리드**: 대부분의 실제 프로젝트

### 🚀 다음 단계

이제 여러분은 다음과 같은 능력을 갖추었습니다:

1. **타입에서 시작해서 점진적으로 도메인 모델로 발전**시키기
2. **함수형과 객체지향 중에서 상황에 맞게 선택**하기
3. **안전한 마이그레이션 전략**으로 기존 코드를 개선하기

> **기획자**: "사용자 권한 로직 추가해 주세요!"
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
- [ ] 새로운 방식의 테스트 추가
- [ ] 성능상 문제가 없는가?
- [ ] 번들 크기 증가가 허용 범위인가?

---

### 🔗 관련 시리즈

1. [Type-Safe HTTP API 설계](https://velog.io/@rewq5991/typescript-project-api-design)
2. [Service Layer로 비즈니스 로직 분리](https://velog.io/@rewq5991/typescript-project-service-design)
3. **타입에서 클래스로: 도메인 모델의 점진적 진화** (현재 글)

---

이제 여러분의 프론트엔드 코드는 단순한 컴포넌트 모음이 아닌, **체계적인 도메인 지식을 담은 소프트웨어**로 발전했습니다.

**"별거 없어요!"**라는 기획 변경 요청이 정말로 **"별거 없게"** 되는 그날까지, 함께 발전해 나가겠습니다! 🚀
