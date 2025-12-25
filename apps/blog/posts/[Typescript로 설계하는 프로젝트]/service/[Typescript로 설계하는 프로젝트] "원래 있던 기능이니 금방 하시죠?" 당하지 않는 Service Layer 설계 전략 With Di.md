---
title: '[Typescript로 설계하는 프로젝트] "원래 있던 기능이니 금방 하시죠?" 당하지 않는 Service Layer 설계 전략 With Di'
date: '2025-06-08'
published: true
slug: 'typescript-project-service-di-design'
---

## 들어가며

> 겨우 백엔드의 요청을 쳐내고 다시 피곤함에전 모습으로 테스크를 마무리하려는 순간 이번엔 제 슬랙이 울립니다.
>
> [기획자]: "급하게 기획이 바뀌어서요. 이거 프론트에서 추가로 수정해 주셔야 할 것 같아요. 아직 마무리 다 안 하신 거 맞죠?"
>
> [나]: "네 아직 마무리 안 했어요. 수정 사항이 뭔가요?"
>
> [기획자]: "별거 없어요! 다른 쪽에 만든 기능이긴 한대 대신에 사용자의 데이터가 특정 조건에 따라 카드의 색깔이 바뀌어야 합니다. 원래 있던 기능이니 금방 하시죠?"
>
> [나]: (그거 거기에만 쓴다며... 그래서 그쪽 로직하고 딱 붙여 놓은건대... ) "네 하지만 시간은 좀 걸릴 것 같아요 PM 하고 이야기는 하고 오신 거죠?"

> **어떻게 하면 이런 로직을 재활용하기 쉽게 만들 수 없을까? 지난번 API도 구조적으로 설계했는데 이것도 그렇게 할 수 있지 않을까?**

[이전글](https://velog.io/@rewq5991/typescript-project-api-di-design)에서는 Type-Safe Http class을 설계하고 Type을 구조적으로 설계하는 것에 대해 이야기했습니다.  
해당 글에서는 서버 API Type을 설계하고 제네릭을 활용한 HTTP 클래스를 통해 타입 안전성을 확보하는 방법을 다루었습니다.  
특히 DI을 활용하여 HTTP 클라이언트를 추상화하고 테스트하기 쉬운 코드를 작성하는 방법을 설명했습니다.

**의존성 주입(DI)** 이란 무엇일까요? 간단히 말하면, 한 객체가 다른 객체를 직접 생성하거나 참조하는 대신, 외부에서 필요한 객체를 전달받는 디자인 패턴입니다.  
이는 코드의 결합도를 낮추고 재사용성과 테스트 용이성을 높여줍니다.  
예를 들어, HTTP 클라이언트가 필요한 서비스 클래스는 직접 HTTP 클라이언트를 생성하는 대신, 생성자나 메서드 인자로 전달받을 수 있습니다.

이번글에서는 프론트에서 쓰이는 비즈니스 로직을 분리하여 Service Layer를 구성하고, 의존성 주입을 통해 재사용 가능하고 테스트하기 쉬운 코드를 작성하는 방법에 대해 이야기해 볼까 합니다.

여러분이 여기까지 따라오셨다면 이미 http와 Api 호출부를 나누어 놓았을 것입니다.  
**🎉 축하합니다!** 레이어를 나누신거고 그럼 그 이후에 로직을 붙여 나가는건 별로 어렵지 않습니다.  
대신에 이번 레이어를 저는 Service Layer라고 부르고 이 Layer가 가지는 장점에 대해서 설명드리겠습니다.

## 🔨 기존 Api + Business logic의 문제점

보통 이렇게 바로 api 로직과 비즈니스 로직이 ui에 한 곳에 작성되어 있거나 커스텀 훅에 같이 작성되어 있습니다.

```tsx
// 📁 features/userProfile/UserProfileCard.tsx
// 🔴 여러 관심사가 뒤섞여 유지보수가 힘들어짐
export const UserProfileCard = ({ userId }: { userId: string }) => {
  const { data: user, isLoading } = useQuery<UserRes>({
    queryKey: ['user', userId],
    queryFn: () => getUserById(userId),
  });

  if (isLoading || !user) return <div>Loading...</div>;

  // css는 렌더링의 관심사가 아님
  let cardColor = 'bg-gray-200';
  let cardBorder = 'border-gray-300';

  // 비즈니스 로직이 컴포넌트에 직접 작성됨
  if (
    user.isPremium &&
    user.lastLoginDate > Date.now() - 7 * 24 * 60 * 60 * 1000
  ) {
    cardColor = 'bg-yellow-100';
    cardBorder = 'border-yellow-400';
  } else if (user.subscriptionStatus === 'active') {
    cardColor = 'bg-blue-100';
    cardBorder = 'border-blue-400';
  } else if (user.createdAt > Date.now() - 30 * 24 * 60 * 60 * 1000) {
    cardColor = 'bg-green-100';
    cardBorder = 'border-green-400';
  }

  return (
    <div className={`p-4 rounded-lg ${cardColor} ${cardBorder} border-2`}>
      <h2 className="text-xl font-bold">{user.name}</h2>
      <p className="text-gray-600">{user.email}</p>
      {user.isPremium && <span className="text-yellow-600">👑 Premium</span>}
    </div>
  );
};
```

#### 이러한 접근 방식은 다음과 같은 심각한 문제를 초래합니다!

1. **재사용이 어려워짐**: 비즈니스 로직이 컴포넌트에 직접 구현되면, 동일한 로직을 다른 컴포넌트에서 사용하려면 코드를 복사-붙여넣기 해야 합니다.
2. **테스트 작성이 어려움**: UI 컴포넌트와 비즈니스 로직이 결합되어 있으면, 비즈니스 로직만 독립적으로 테스트하기 어렵습니다.
3. **관심사 분리가 되지 않아 유지보수가 힘듦**: UI 표현과 비즈니스 로직은 서로 다른 관심사입니다. 이들이 혼합되면 코드의 가독성이 떨어집니다.

## 🛠️ 비즈니스 로직을 서비스 함수로 분리

> 이제 이런 문제들을 해결하기 위해 Service Layer를 설계 방법을 알아보겠습니다.

### 1. 관심사 분리/재사용성 증가

1. **비즈니스 로직** -> 비즈니스 로직에만 관심을 가집니다.

   ```typescript
   // 📝 service/userService.ts
   // 🟢 비즈니스 로직: 사용자 상태만 판단
   import type { UserReq, UserRes, UserServer } from '@/server';
   import { userServer } from '@/server';
   import type { UserStatus } from '@/shared';

   interface IUserService {
     createUser(user: UserReq): Promise<UserRes>;

     getUserStatus(user: UserRes): UserStatus;

     isUserPremiumActive(user: UserRes): boolean;

     canAccessPremiumFeatures(user: UserRes): boolean;
   }

   export class UserService {
     constructor(protected user: UserServer) {}

     getUserStatus(user: UserRes): UserStatus {
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
     }

     /**
      * 직접 getUserStatus를 가져다가 사용하지 않고 이렇게 필요한 부분만 만들어서 관리 가능
      * 추가적인 부분만 구현하면 되지 좀 더 세밀한 관심사 분리 가능
      */
     isUserPremiumActive(user: UserRes): boolean {
       return this.getUserStatus(user) === 'premium-active';
     }

     canAccessPremiumFeatures(user: UserRes): boolean {
       const status = this.getUserStatus(user);
       return status === 'premium-active' || status === 'active';
     }

     createUser(user: UserReq): Promise<UserRes> {
       return this.user.createUser(user);
     }
   }

   // 싱글턴 인스턴스로 내보내기
   // DI를 통한 구현
   export const userService = new UserService(userServer);
   ```

2. **CSS** -> 스타일링에만 관심을 가집니다.

   ```typescript
   // 📝 components/ui/UserCard/UserCard.styles.ts
   // 🟢 UserStatus 타입을 기반으로 한 타입 안전한 스타일 매핑

   import type { UserStatus } from '@/service/userService';

   type CardStyles = {
     cardColor: string;
     cardBorder: string;
     textColor: string;
   };

   // UserStatus의 모든 값에 대해 스타일이 정의되어야 함 (타입 안전성 보장)
   const styleMap: Record<UserStatus, CardStyles> = {
     'premium-active': {
       cardColor: 'bg-yellow-100',
       cardBorder: 'border-yellow-400',
       textColor: 'text-yellow-800',
     },
     active: {
       cardColor: 'bg-blue-100',
       cardBorder: 'border-blue-400',
       textColor: 'text-blue-800',
     },
     new: {
       cardColor: 'bg-green-100',
       cardBorder: 'border-green-400',
       textColor: 'text-green-800',
     },
     inactive: {
       cardColor: 'bg-gray-200',
       cardBorder: 'border-gray-300',
       textColor: 'text-gray-600',
     },
   } as const;

   export const getUserCardStyles = (status: UserStatus): CardStyles => {
     return styleMap[status];
   };

   // 뱃지 스타일도 마찬가지로 타입 안전하게
   const badgeStyleMap: Record<UserStatus, string> = {
     'premium-active': 'bg-yellow-500 text-white',
     active: 'bg-blue-500 text-white',
     new: 'bg-green-500 text-white',
     inactive: 'bg-gray-400 text-white',
   } as const;

   export const getUserStatusBadgeStyles = (status: UserStatus): string => {
     return badgeStyleMap[status];
   };
   ```

3. **UI** -> 렌더링에만 관심을 가집니다.

   ```tsx
   // 📝 features/userProfile/UserProfileCard.tsx
   // 🟢 컴포넌트: 비즈니스 로직과 UI 로직이 분리됨

   import { userService } from '@/service/userService';
   import { userCardStyleService } from '@/components/ui/UserCard/UserCard.styles';

   export const UserProfileCard = ({ userId }: { userId: string }) => {
     const { data: user, isLoading } = useQuery<UserRes>({
       queryKey: ['user', userId],
       queryFn: () => getUserById(userId),
     });

     if (isLoading || !user) return <div>Loading...</div>;

     // 비즈니스 로직: 사용자 상태 판단 (서비스 클래스 사용)
     const userStatus = userService.getUserStatus(user);

     // UI 로직: 상태에 따른 스타일 결정
     const styles = getUserCardStyles(userStatus);

     return (
       <div
         className={`p-4 rounded-lg ${styles.cardColor} ${styles.cardBorder} border-2`}
       >
         <h2 className="text-xl font-bold">{user.name}</h2>
         <p className="text-gray-600">{user.email}</p>
         {user.isPremium && <span className="text-yellow-600">👑 Premium</span>}
       </div>
     );
   };
   ```

### 2. 재사용성 확인: 다른 컴포넌트에서의 활용

이제 기획자가 **"다른 곳에서도 같은 로직을 써주세요"** 라고 했을 때, 정말 간단하게 해결할 수 있는지 확인해 보겠습니다.

```tsx
// 📝 features/dashboard/DashboardUserList.tsx
// 🟢 동일한 비즈니스 로직을 다른 UI로 재사용

import { userService } from '@/service/userService';
import type { UserStatus } from '@/service/userService';
import type { GetUsersRes } from '@/server';

export const DashboardUserList = () => {
  const { data, isLoading } = useQuery<GetUsersRes>({
    queryKey: ['users', 'dashboard'],
    queryFn: () => getUsers({ limit: 10 }),
  });

  if (isLoading || !data) return <div>Loading...</div>;

  return (
    <div className="space-y-2">
      {data.users.map(user => {
        // 서비스 클래스의 인스턴스를 직접 사용
        const userStatus = userService.getUserStatus(user);

        // 하지만 다른 UI 표현 방식 사용
        // 여기도 새로 만들어서 하는게 좀 더 깔끔하게 보이겠지만 이해를 위해서 바로 구현
        const getDotColor = (status: UserStatus) => {
          switch (status) {
            case 'premium-active':
              return 'bg-yellow-400';
            case 'active':
              return 'bg-blue-400';
            case 'new':
              return 'bg-green-400';
            case 'inactive':
              return 'bg-gray-400';
          }
        };

        return (
          <div
            key={user.id}
            className="flex items-center p-3 bg-white rounded shadow"
          >
            <div
              className={`w-3 h-3 rounded-full ${getDotColor(userStatus)} mr-3`}
            ></div>
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-gray-500">Status: {userStatus}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

코드 복사 없이 `userService` 서비스 클래스만 import해서 즉시 사용 가능! 정말 **"별거 없게"** 되었습니다.

### 3. 테스트 코드 작성 용이성

비즈니스 로직이 분리되어 간단한 mock 객체 하나만으로도 독립적인 테스트 코드 작성이 가능합니다.

```typescript
// 📝 service/userService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { userService } from './userService';
import { userServer } from '@/server';
import type { UserReq, UserRes } from '@/server';

// userServer 모킹
vi.mock('@/server', () => ({
  userServer: {
    createUser: vi.fn(),
  },
}));

describe('UserService', () => {
  // 각 테스트 전에 모킹된 함수 초기화
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    it('should call userServer.createUser with the provided user data', async () => {
      // Arrange
      const mockUserReq: UserReq = {
        id: '123',
      };
      const mockUserRes: UserRes = {
        id: '123',
        name: '테스트 사용자',
        email: 'test@example.com',
        isPremium: false,
        subscriptionStatus: 'inactive',
        lastLoginDate: new Date(),
        createdAt: new Date(),
      };

      (userServer.createUser as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockUserRes,
      );

      // Act
      const result = await userService.createUser(mockUserReq);

      // Assert
      expect(userServer.createUser).toHaveBeenCalledWith(mockUserReq);
      expect(result).toEqual(mockUserRes);
    });
  });

  describe('getUserStatus', () => {
    it('should return "premium-active" for premium users who logged in within the last 7 days', () => {
      // Arrange
      const now = Date.now();
      const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
      const user: UserRes = {
        id: '123',
        name: '프리미엄 사용자',
        email: 'premium@example.com',
        isPremium: true,
        subscriptionStatus: 'active',
        lastLoginDate: threeDaysAgo,
        createdAt: new Date(now - 60 * 24 * 60 * 60 * 1000),
      };

      // Act
      const status = userService.getUserStatus(user);

      // Assert
      expect(status).toBe('premium-active');
    });

    it('should return "active" for users with active subscription status', () => {
      // Arrange
      const now = Date.now();
      const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000);
      const user: UserRes = {
        id: '123',
        name: '활성 사용자',
        email: 'active@example.com',
        isPremium: false, // 프리미엄이 아님
        subscriptionStatus: 'active',
        lastLoginDate: tenDaysAgo, // 7일 이내 로그인하지 않음
        createdAt: new Date(now - 60 * 24 * 60 * 60 * 1000),
      };

      // Act
      const status = userService.getUserStatus(user);

      // Assert
      expect(status).toBe('active');
    });
  });

  describe('isUserPremiumActive', () => {
    it('should return true for premium-active users', () => {
      // Arrange
      const now = Date.now();
      const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
      const user: UserRes = {
        id: '123',
        name: '프리미엄 활성 사용자',
        email: 'premium@example.com',
        isPremium: true,
        subscriptionStatus: 'active',
        lastLoginDate: threeDaysAgo,
        createdAt: new Date(now - 60 * 24 * 60 * 60 * 1000),
      };

      // Act
      const isPremiumActive = userService.isUserPremiumActive(user);

      // Assert
      expect(isPremiumActive).toBe(true);
    });
  });

  describe('canAccessPremiumFeatures', () => {
    it('should return true for premium-active users', () => {
      // Arrange
      const now = Date.now();
      const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
      const user: UserRes = {
        id: '123',
        name: '프리미엄 활성 사용자',
        email: 'premium@example.com',
        isPremium: true,
        subscriptionStatus: 'active',
        lastLoginDate: threeDaysAgo,
        createdAt: new Date(now - 60 * 24 * 60 * 60 * 1000),
      };

      // Act
      const canAccess = userService.canAccessPremiumFeatures(user);

      // Assert
      expect(canAccess).toBe(true);
    });
  });
});
```

## 🚀 한 단계 더: 복잡한 비즈니스 요구사항 해결하기

앞에서 `UserService` 하나로 기본적인 문제를 해결했습니다. 하지만 실제 서비스에서는 더 복잡한 상황들이 생깁니다.

> 💬 **또 다른 현실적인 상황**  
> [기획자]: "대시보드 페이지에서 사용자 상태도 보여주고, 최근 프로젝트 목록도 보여주고, 안 읽은 알림도 표시해 주세요. 아, 그리고 각각 다른 API에서 가져와야 해요."
>
> [개발자]: "음... 그럼 여러 API를 호출해야 하고, 각각의 로직도 다르고..."
>
> [기획자]: "근데 로딩도 빨라야 하고, 하나가 실패해도 다른 건 보여줘야 해요!"

이런 상황에서 Service Layer는 어떻게 도움이 될까요?

### 4. Service Layer로 복잡한 요구사항 해결하기

**지금까지 배운 것:** 하나의 도메인 로직을 Service로 분리  
**이제 배울 것:** 여러 Service를 조합해서 복잡한 요구사항 해결

> Service Layer의 가장 큰 강점 중 하나는 **여러 서비스의 로직을 조합해서 새로운 도메인 기능을 만들어낼 수 있다**는 점입니다.  
> 더 나아가 **여러 API 호출을 조합**해서 프론트엔드에 최적화된 데이터를 제공할 수도 있습니다.

이런 패턴을 **BFF(Backend For Frontend) 패턴**이라고 부르는데, 보통은 별도의 서버를 구축해야 합니다. 하지만 Service Layer를 활용하면 **코드 레벨에서 BFF와 유사한 효과**를 낼 수 있습니다.

#### BFF 패턴이란?

[BFF란?](https://tech.kakaoent.com/front-end/2022/220310-kakaopage-bff/)

> **기존 방식**: 프론트엔드가 여러 API를 직접 호출 → 복잡함  
> **BFF 패턴**: 프론트엔드 전용 서버가 여러 API를 조합해서 최적화된 데이터 제공 → 단순함

하지만 BFF 서버를 별도로 구축하는 것은 비용이 많이 듭니다. Service Layer로 이를 해결해봅시다!

#### 4-1. 도메인 로직의 조합

```typescript
// 📝 service/notificationService.ts
export interface INotificationService {
  shouldSendWelcomeEmail(user: UserRes): boolean;
}

export class NotificationService implements INotificationService {
  shouldSendWelcomeEmail(user: UserRes): boolean {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    return (
      user.createdAt.getTime() > threeDaysAgo && !user.hasReceivedWelcomeEmail
    );
  }
}

// 싱글턴 인스턴스 생성
export const notificationService = new NotificationService();

// 📝 service/subscriptionService.ts
export type SubscriptionTier = 'enterprise' | 'premium' | 'basic' | 'free';

export interface ISubscriptionService {
  getSubscriptionTier(user: UserRes): SubscriptionTier;
}

export class SubscriptionService implements ISubscriptionService {
  getSubscriptionTier(user: UserRes): SubscriptionTier {
    if (user.subscriptionType === 'enterprise') return 'enterprise';
    if (user.isPremium) return 'premium';
    if (user.subscriptionStatus === 'active') return 'basic';
    return 'free';
  }
}

// 싱글턴 인스턴스 생성
export const subscriptionService = new SubscriptionService();

// 📝 service/dashboardService.ts
// 🟢 여러 서비스를 조합해서 새로운 도메인 기능 생성
import { userService, type UserStatus } from './userService';
import {
  subscriptionService,
  type SubscriptionTier,
} from './subscriptionService';
import { notificationService } from './notificationService';
import type { UserRes } from '@/server';

export interface UserDashboardData {
  userStatus: UserStatus;
  subscriptionTier: SubscriptionTier;
  shouldShowWelcome: boolean;
  // ... 기타 필요한 데이터
}

export interface IDashboardService {
  getUserDashboardData(user: UserRes): UserDashboardData;
}

export class DashboardService implements IDashboardService {
  constructor(
    private readonly userService: typeof userService,
    private readonly subscriptionService: typeof subscriptionService,
    private readonly notificationService: typeof notificationService,
  ) {}

  getUserDashboardData(user: UserRes): UserDashboardData {
    // 기존 서비스들을 레고 블록처럼 조합
    const userStatus = this.userService.getUserStatus(user);
    const subscriptionTier = this.subscriptionService.getSubscriptionTier(user);
    const shouldShowWelcome =
      this.notificationService.shouldSendWelcomeEmail(user);

    return {
      userStatus,
      subscriptionTier,
      shouldShowWelcome,
      // ... 기타 조합된 로직들
    };
  }
}

// 싱글턴 인스턴스 생성 - 다른 서비스 디펜던시 주입
export const dashboardService = new DashboardService(
  userService,
  subscriptionService,
  notificationService,
);
```

#### 4-2. 여러 API 조합: BFF 패턴의 코드 레벨 구현

```typescript
// 📝 service/aggregatedDataService.ts
// 🟢 여러 API를 조합해서 프론트엔드 최적화된 데이터 제공 (BFF와 유사)
import { dashboardService } from './dashboardService';
import type { UserDashboardData } from './dashboardService';
import type {
  UserServer,
  UserRes,
  UserProjectsRes,
  UserNotificationRes,
  UserAnalyticsRes,
} from '@/server';

export interface UserDashboardAggregatedData {
  user: UserRes;
  recentProjects: UserProjectsRes[];
  unreadNotifications: UserNotificationRes[];
  dashboardConfig: UserDashboardData;
  hasUnreadNotifications: boolean;
}

export interface IAggregatedDataService {
  getUserDashboardAggregatedData(
    userId: string,
  ): Promise<UserDashboardAggregatedData>;
}

export class AggregatedDataService implements IAggregatedDataService {
  constructor(
    private readonly userServer: UserServer,
    private readonly dashboardService: typeof dashboardService,
  ) {}

  async getUserDashboardAggregatedData(
    userId: string,
  ): Promise<UserDashboardAggregatedData> {
    // 1. 여러 API를 병렬로 호출 (네트워크 최적화)
    const [user, projects, notifications, analytics] = await Promise.allSettled(
      [
        this.userServer.getUser(userId),
        this.userServer.getUserProjects(userId, { limit: 5 }),
        this.userServer.getUserNotifications(userId, { unreadOnly: true }),
        this.userServer.getUserAnalytics(userId, { period: '30d' }),
      ],
    );

    // 2. 실패한 API 호출 처리
    const userData = user.status === 'fulfilled' ? user.value : null;
    const projectsData =
      projects.status === 'fulfilled' ? projects.value.data : [];
    const notificationsData =
      notifications.status === 'fulfilled' ? notifications.value.data : [];

    if (!userData) throw new Error('Failed to load user data');

    // 3. 기존 도메인 로직 조합 - 이미 주입된 dashboardService 사용
    const dashboardConfig =
      this.dashboardService.getUserDashboardData(userData);

    // 4. 프론트엔드 최적화된 데이터 구조로 조합
    return {
      user: userData,
      recentProjects: projectsData,
      unreadNotifications: notificationsData,
      dashboardConfig,
      hasUnreadNotifications: notificationsData.length > 0,
    };
  }
}

import { userServer } from '@/server';

// 싱글턴 인스턴스 생성 - 서버와 다른 서비스 디펜던시 주입
export const aggregatedDataService = new AggregatedDataService(
  userServer,
  dashboardService,
);
```

#### 4-3. 실제 사용: Hook과 컴포넌트

```typescript
// 📝 hooks/useAggregatedDashboard.ts
import { aggregatedDataService } from '@/service/aggregatedDataService';
import type { UserDashboardAggregatedData } from '@/service/aggregatedDataService';

export const useAggregatedDashboard = (userId: string) => {
  return useQuery<UserDashboardAggregatedData>({
    queryKey: ['dashboard-aggregated', userId],
    queryFn: () => aggregatedDataService.getUserDashboardAggregatedData(userId),
  });
};
```

```tsx
// 📝 features/dashboard/Dashboard.tsx
import { useAggregatedDashboard } from '@/hooks/useAggregatedDashboard';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { WelcomeMessage } from '@/components/ui/WelcomeMessage';
import { NotificationBanner } from '@/components/ui/NotificationBanner';
import { ProjectsWidget } from '@/components/ui/ProjectsWidget';
import type { User } from '@/shared';

export const Dashboard = ({ id }: Pick<User, 'id'>) => {
  // 한 번의 호출로 대시보드에 필요한 모든 데이터를 가져옴
  // aggregatedDataService가 주입받은 다른 서비스들을 통해 모든 데이터를 처리
  const { data, isLoading } = useAggregatedDashboard(id);

  if (isLoading || !data) return <DashboardSkeleton />;

  return (
    <div className="p-6 space-y-6">
      {data.dashboardConfig.shouldShowWelcome && <WelcomeMessage />}
      {data.hasUnreadNotifications && <NotificationBanner />}
      <ProjectsWidget projects={data.recentProjects} />
    </div>
  );
};
```

#### 4-4. BFF 패턴의 핵심 장점

- 네트워크 최적화: 여러 API를 병렬로 호출해서 총 로딩 시간 단축
- 프론트엔드 최적화: UI에 필요한 형태로 데이터를 미리 가공
- 에러 처리 중앙화: 각 API 실패에 대한 처리를 한 곳에서 관리

## 🔮 결론

`Service` 레이어를 도입함으로써 우리는 다음과 같은 이점들을 얻을 수 있었습니다.

✅ 해결된 문제들

- **재사용성 극대화**: `getUserStatus` 함수 하나로 모든 곳에서 일관된 사용자 상태 판단
- **관심사 분리**: 비즈니스 로직, 스타일링, UI 렌더링이 각각의 책임에만 집중
- **테스트 용이성**: 비즈니스 로직을 독립적으로 테스트할 수 있어 버그 발견과 수정이 쉬워짐
- **유지보수성 향상**: 로직 변경 시 Service 파일 하나만 수정하면 모든 곳에 적용
- **도메인 로직의 조합**: 여러 서비스를 레고 블록처럼 조합해서 복잡한 비즈니스 요구사항 해결
- **API 조합을 통한 BFF 구현**: 여러 API를 조합해서 프론트엔드 최적화된 데이터 제공

🏗️ Service Layer가 담당하는 것들

- **비즈니스 로직**: 도메인 규칙과 계산 로직
- **데이터 변환**: API 응답을 UI에서 사용하기 편한 형태로 가공
- **유효성 검증**: 데이터의 유효성을 확인하는 로직
- **상태 계산**: 복잡한 조건들을 조합해서 상태를 결정하는 로직
- **도메인 기능 조합**: 여러 서비스의 로직을 조합해서 새로운 도메인 기능 생성
- **API 조합 및 최적화**: 여러 API 호출을 조합하고 에러 처리, 캐싱 전략 구현

> 이제 기획자가 **"별거 없어요!"** 라고 말할 때, 정말로 별거 없게 만들 수 있는 코드 구조를 갖추었습니다.  
> 더 나아가 여러 도메인의 로직을 자유자재로 조합하고,  
> 여러 API를 조합해서 BFF 패턴을 코드 레벨에서 구현할 수 있게 되어 복잡한 비즈니스 요구사항도 깔끔하게 해결할 수 있게 되었습니다.

**특히 API 조합을 통해**

- **서버 개발 없이도** 여러 마이크로서비스의 데이터를 조합
- **프론트엔드 중심**의 데이터 구조 설계

이 모든 것이 `가능`해졌습니다!

> "원래 있던 기능이니 금방 하시죠?" → "네, 기존 로직들을 조합하고 필요한 API들을 묶어서 정말 금방 할 수 있습니다!" 🎉

**다음 글에서는 Domain 포함되는 요소들과 이를 통해 어떻게 활용할 수 있는지에 대해 알아보겠습니다.**
