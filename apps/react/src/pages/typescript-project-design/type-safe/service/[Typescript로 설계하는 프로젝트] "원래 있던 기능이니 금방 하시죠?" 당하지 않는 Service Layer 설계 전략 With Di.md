## 들어가며

> 겨우 백엔드의 요청을 쳐내고 다시 피곤에 쩔은 모습으로 테스크를 마무리 하려는 순간 이번엔 제 슬랙이 울립니다.  
> [기획자]: "급하게 기획이 바뀌어서요 이거 프론에서 추가로 수정해주셔야 할 것 같아. 아직 마무리 다 안 하신거 맞죠?"  
> [나]: "네 아직 마무리 안 했어요 수정 사항이 뭔가요?'  
> [기획자]: "별거 없어요! 다른쪽에 있는 그대로 가져다가 똑같이 만들어 주시면 됩니다. 이미 구현되어 있는거라 금방 하시죠?"  
> [나]: "(그거 거기에만 쓴다며... 그래서 그쪽 로직하고 딱 붙여 놓은건대... ) 네 하지만 시간은 좀 걸릴 것 같아요 PM 하고 이야기는 하고 오신거죠?"

> **어떻게 하면 이런 로직을 재활용하기 쉽게 만들 수 없을까? 지난번 API도 구조적으로 설계 했는데 이것도 그렇게 할 수 있지 않을까?**

[이전글](https://velog.io/@rewq5991/typescript-project-api-di-design)에서는 Type-Safe Http class을 설계하고 DI 패턴을 활용한 구조적 설계에 대해 이야기 했습니다.

이번글에서는 프론트에서 쓰이는 비즈니스로직을 DI 패턴으로 분리하는 부분에 대하여 이야기 해볼까 합니다.

여러분이 여기까지 따라오셨다면 이미 http와 api 호출부를 인터페이스와 구현체로 나누어 놓았을 것입니다.  
**🎉 축하합니다!** 레이어를 나누신거고 그럼 그 이후에 로직을 붙여 나가는건 별로 어렵지 않습니다.  
대신에 이번 레이어를 저는 service 레이어라고 부르고 이 레이어가 가지는 장점에 대해서 설명드리겠습니다.

## 🔨 기존 Api + Business logic의 문제점

보통 이렇게 바로 api 로직과 비즈니스 로직이 ui에 한 곳에 작성 되어 있거나 커스텀 훅에 같이 작성되어 있습니다.

```tsx
// 📁 features/userProfile/UserProfileCard.tsx
// 🔴 여러 관심사가 뒤섞여 유지보수가 힘들어짐
export const UserProfileCard = ({ userId }: { userId: string }) => {
  const { data: user, isLoading } = useQuery<UserRes>({
    queryKey: ['user', userId],
    queryFn: () => userServer.getUserById(userId),
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
3. **의존성 관리가 복잡**: 다양한 서비스나 유틸리티에 대한 의존성이 컴포넌트에 직접 결합되어 있어 관리가 어렵습니다.
4. **관심사 분리가 되지 않아 유지보수가 힘듦**: UI 표현과 비즈니스 로직은 서로 다른 관심사입니다. 이들이 혼합되면 코드의 가독성이 떨어집니다.

## 🛠️ 비즈니스 로직을 Service 클래스로 분리

> 이제 이런 문제들을 해결하기 위해 DI 패턴을 활용한 Service 레이어 설계 방법을 알아보겠습니다.

### 1. 인터페이스 기반 Service 설계

1. **Service 인터페이스 정의** -> 비즈니스 로직의 계약을 명시합니다.

   ```typescript
   // 📁 services/user/IUserService.ts
   // 🟢 사용자 관련 비즈니스 로직 인터페이스
   export type UserStatus = 'premium-active' | 'active' | 'new' | 'inactive';

   export interface IUserService {
     getUserStatus(user: UserRes): UserStatus;
     isUserPremiumActive(user: UserRes): boolean;
     canAccessPremiumFeatures(user: UserRes): boolean;
     getUserDisplayConfig(user: UserRes): UserDisplayConfig;
   }

   export type UserDisplayConfig = {
     status: UserStatus;
     showPremiumBadge: boolean;
     cardTheme: 'premium' | 'active' | 'new' | 'default';
   };
   ```

2. **Service 구현체** -> 인터페이스를 구현하여 실제 비즈니스 로직을 처리합니다.

   ```typescript
   // 📁 services/user/UserService.ts
   // 🟢 비즈니스 로직 구현: 사용자 상태 관리에만 집중

   import type {
     IUserService,
     UserStatus,
     UserDisplayConfig,
   } from './IUserService';
   import type { UserRes } from '@/server/user/types';

   export class UserService implements IUserService {
     getUserStatus(user: UserRes): UserStatus {
       const now = Date.now();
       const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
       const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

       if (user.isPremium && user.lastLoginDate > sevenDaysAgo) {
         return 'premium-active';
       }

       if (user.subscriptionStatus === 'active') {
         return 'active';
       }

       if (user.createdAt > thirtyDaysAgo) {
         return 'new';
       }

       return 'inactive';
     }

     isUserPremiumActive(user: UserRes): boolean {
       return this.getUserStatus(user) === 'premium-active';
     }

     canAccessPremiumFeatures(user: UserRes): boolean {
       const status = this.getUserStatus(user);
       return status === 'premium-active' || status === 'active';
     }

     getUserDisplayConfig(user: UserRes): UserDisplayConfig {
       const status = this.getUserStatus(user);
       return {
         status,
         showPremiumBadge: user.isPremium,
         cardTheme:
           status === 'premium-active'
             ? 'premium'
             : status === 'active'
               ? 'active'
               : status === 'new'
                 ? 'new'
                 : 'default',
       };
     }
   }
   ```

3. **스타일 서비스 분리** -> UI 관련 로직도 별도 서비스로 분리합니다.

   ```typescript
   // 📁 services/ui/IUIStyleService.ts
   export interface IUIStyleService {
     getUserCardStyles(theme: string): CardStyles;
     getUserStatusBadgeStyles(status: string): string;
   }

   export type CardStyles = {
     cardColor: string;
     cardBorder: string;
     textColor: string;
   };
   ```

   ```typescript
   // 📁 services/ui/UIStyleService.ts
   import type { IUIStyleService, CardStyles } from './IUIStyleService';
   import type { UserStatus } from '@/services/user/IUserService';

   export class UIStyleService implements IUIStyleService {
     private readonly styleMap: Record<string, CardStyles> = {
       premium: {
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
       default: {
         cardColor: 'bg-gray-200',
         cardBorder: 'border-gray-300',
         textColor: 'text-gray-600',
       },
     } as const;

     getUserCardStyles(theme: string): CardStyles {
       return this.styleMap[theme] || this.styleMap['default'];
     }

     getUserStatusBadgeStyles(status: string): string {
       const badgeMap: Record<string, string> = {
         'premium-active': 'bg-yellow-500 text-white',
         active: 'bg-blue-500 text-white',
         new: 'bg-green-500 text-white',
         inactive: 'bg-gray-400 text-white',
       };
       return badgeMap[status] || badgeMap['inactive'];
     }
   }
   ```

4. **Service Container 설정** -> 의존성 주입을 위한 컨테이너를 구성합니다.

   ```typescript
   // 📁 di/ServiceContainer.ts
   // 🟢 의존성 주입 컨테이너
   import { UserService } from '@/services/user/UserService';
   import { UIStyleService } from '@/services/ui/UIStyleService';
   import type { IUserService } from '@/services/user/IUserService';
   import type { IUIStyleService } from '@/services/ui/IUIStyleService';

   export class ServiceContainer {
     private static instance: ServiceContainer;
     private readonly services = new Map<string, any>();

     private constructor() {
       this.registerServices();
     }

     static getInstance(): ServiceContainer {
       if (!ServiceContainer.instance) {
         ServiceContainer.instance = new ServiceContainer();
       }
       return ServiceContainer.instance;
     }

     private registerServices(): void {
       // 서비스 등록
       this.services.set('UserService', new UserService());
       this.services.set('UIStyleService', new UIStyleService());
     }

     get<T>(serviceName: string): T {
       const service = this.services.get(serviceName);
       if (!service) {
         throw new Error(`Service ${serviceName} not found`);
       }
       return service as T;
     }

     // 타입 안전한 서비스 접근자들
     get userService(): IUserService {
       return this.get<IUserService>('UserService');
     }

     get uiStyleService(): IUIStyleService {
       return this.get<IUIStyleService>('UIStyleService');
     }
   }

   // 전역 컨테이너 인스턴스
   export const container = ServiceContainer.getInstance();
   ```

5. **리팩토링된 UI 컴포넌트** -> 의존성 주입을 통해 깔끔하게 분리됩니다.

   ```tsx
   // 📁 features/userProfile/UserProfileCard.tsx
   // 🟢 컴포넌트: 의존성 주입을 통해 비즈니스 로직과 UI 로직이 분리됨

   import { container } from '@/di/ServiceContainer';

   export const UserProfileCard = ({ userId }: { userId: string }) => {
     const { data: user, isLoading } = useQuery<UserRes>({
       queryKey: ['user', userId],
       queryFn: () => userServer.getUserById(userId),
     });

     if (isLoading || !user) return <div>Loading...</div>;

     // 의존성 주입을 통한 서비스 접근
     const userService = container.userService;
     const uiStyleService = container.uiStyleService;

     // 비즈니스 로직: 사용자 디스플레이 설정 계산
     const displayConfig = userService.getUserDisplayConfig(user);

     // UI 로직: 스타일 계산
     const styles = uiStyleService.getUserCardStyles(displayConfig.cardTheme);

     return (
       <div
         className={`p-4 rounded-lg ${styles.cardColor} ${styles.cardBorder} border-2`}
       >
         <h2 className="text-xl font-bold">{user.name}</h2>
         <p className="text-gray-600">{user.email}</p>
         {displayConfig.showPremiumBadge && (
           <span className="text-yellow-600">👑 Premium</span>
         )}
       </div>
     );
   };
   ```

### 2. 재사용성 확인: 다른 컴포넌트에서의 활용

이제 기획자가 **"다른 곳에서도 같은 로직을 써주세요"** 라고 했을 때, 의존성 주입을 통해 간단하게 해결할 수 있는지 확인해보겠습니다.

```tsx
// 📁 features/dashboard/DashboardUserList.tsx
// 🟢 동일한 서비스를 다른 UI로 재사용

import { container } from '@/di/ServiceContainer';

export const DashboardUserList = () => {
  const { data, isLoading } = useQuery<GetUsersRes>({
    queryKey: ['users', 'dashboard'],
    queryFn: () => getUsers({ limit: 10 }),
  });

  if (isLoading || !data) return <div>Loading...</div>;

  // 동일한 서비스 인스턴스 재사용
  const userService = container.userService;

  return (
    <div className="space-y-2">
      {data.users.map(user => {
        // 동일한 비즈니스 로직 재사용!
        const displayConfig = userService.getUserDisplayConfig(user);

        // 하지만 다른 UI 표현 방식 사용
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
              className={`w-3 h-3 rounded-full ${getDotColor(displayConfig.status)} mr-3`}
            ></div>
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-gray-500">
                Status: {displayConfig.status}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

코드 복사 없이 의존성 주입을 통해 동일한 서비스 인스턴스를 재사용! 정말 **"별거 없게"** 되었습니다.

### 3. 테스트 코드 작성의 혁신적 개선

의존성 주입 패턴을 사용하면 테스트 작성이 혁신적으로 개선됩니다.

```typescript
// 📁 services/user/UserService.test.ts
// 🟢 순수 비즈니스 로직 테스트 (완전히 격리된 테스트)

import { UserService } from './UserService';
import type { UserRes } from '@/server/user/types';

// 모킹이 필요 없는 순수한 단위 테스트
describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  const createMockUser = (overrides: Partial<UserRes> = {}): UserRes => ({
    id: '1',
    name: 'Test User',
    email: 'test@test.com',
    isPremium: false,
    subscriptionStatus: 'inactive',
    lastLoginDate: Date.now() - 10 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
    ...overrides,
  });

  describe('getUserStatus', () => {
    it('프리미엄이고 최근 로그인한 사용자는 premium-active 상태를 반환한다', () => {
      const user = createMockUser({
        isPremium: true,
        lastLoginDate: Date.now() - 3 * 24 * 60 * 60 * 1000,
      });

      expect(userService.getUserStatus(user)).toBe('premium-active');
    });

    it('신규 가입 사용자는 new 상태를 반환한다', () => {
      const user = createMockUser({
        createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
      });

      expect(userService.getUserStatus(user)).toBe('new');
    });
  });

  describe('getUserDisplayConfig', () => {
    it('프리미엄 활성 사용자의 디스플레이 설정을 올바르게 반환한다', () => {
      const user = createMockUser({
        isPremium: true,
        lastLoginDate: Date.now() - 3 * 24 * 60 * 60 * 1000,
      });

      const config = userService.getUserDisplayConfig(user);

      expect(config).toEqual({
        status: 'premium-active',
        showPremiumBadge: true,
        cardTheme: 'premium',
      });
    });
  });
});
```

```tsx
// 📁 components/UserProfileCard.test.tsx
// 🟢 컴포넌트 테스트: 의존성 모킹을 통한 격리된 테스트

import { render } from '@testing-library/react';
import { UserProfileCard } from './UserProfileCard';
import type { IUserService } from '@/services/user/IUserService';
import type { IUIStyleService } from '@/services/ui/IUIStyleService';

// 서비스 모킹
const mockUserService: IUserService = {
  getUserStatus: jest.fn(),
  isUserPremiumActive: jest.fn(),
  canAccessPremiumFeatures: jest.fn(),
  getUserDisplayConfig: jest.fn().mockReturnValue({
    status: 'premium-active',
    showPremiumBadge: true,
    cardTheme: 'premium',
  }),
};

const mockUIStyleService: IUIStyleService = {
  getUserCardStyles: jest.fn().mockReturnValue({
    cardColor: 'bg-yellow-100',
    cardBorder: 'border-yellow-400',
    textColor: 'text-yellow-800',
  }),
  getUserStatusBadgeStyles: jest.fn(),
};

// 컨테이너 모킹
jest.mock('@/di/ServiceContainer', () => ({
  container: {
    userService: mockUserService,
    uiStyleService: mockUIStyleService,
  },
}));

describe('UserProfileCard', () => {
  it('프리미엄 사용자의 카드를 올바르게 렌더링한다', () => {
    const { getByText } = render(<UserProfileCard userId="1" />);

    expect(getByText('👑 Premium')).toBeInTheDocument();
    expect(mockUserService.getUserDisplayConfig).toHaveBeenCalledTimes(1);
    expect(mockUIStyleService.getUserCardStyles).toHaveBeenCalledWith(
      'premium',
    );
  });
});
```

### 4. Service Layer의 진짜 강점: 의존성 조합과 확장성

> DI 패턴을 활용한 Service Layer의 가장 큰 강점은 **서비스 간 의존성을 명시적으로 관리하면서 복잡한 비즈니스 로직을 조합할 수 있다**는 점입니다.

#### 4-1. 서비스 간 의존성 주입

```typescript
// 📁 services/notification/INotificationService.ts
export interface INotificationService {
  shouldSendWelcomeEmail(user: UserRes): boolean;
  getNotificationPreferences(user: UserRes): NotificationPreferences;
}

// 📁 services/subscription/ISubscriptionService.ts
export interface ISubscriptionService {
  getSubscriptionTier(user: UserRes): SubscriptionTier;
  isSubscriptionExpiringSoon(user: UserRes): boolean;
}

// 📁 services/dashboard/IDashboardService.ts
export interface IDashboardService {
  getUserDashboardData(user: UserRes): UserDashboardData;
}

// 📁 services/dashboard/DashboardService.ts
// 🟢 여러 서비스를 의존성으로 주입받아 조합
export class DashboardService implements IDashboardService {
  constructor(
    private userService: IUserService,
    private notificationService: INotificationService,
    private subscriptionService: ISubscriptionService,
  ) {}

  getUserDashboardData(user: UserRes): UserDashboardData {
    // 여러 서비스의 결과를 조합
    const userStatus = this.userService.getUserStatus(user);
    const subscriptionTier = this.subscriptionService.getSubscriptionTier(user);
    const shouldShowWelcome =
      this.notificationService.shouldSendWelcomeEmail(user);
    const isExpiringSoon =
      this.subscriptionService.isSubscriptionExpiringSoon(user);

    return {
      userStatus,
      subscriptionTier,
      shouldShowWelcome,
      showExpiryWarning: isExpiringSoon,
      canAccessPremium: this.userService.canAccessPremiumFeatures(user),
    };
  }
}
```

#### 4-2. 고급 의존성 주입 컨테이너

```typescript
// 📁 di/ServiceContainer.ts
// 🟢 의존성 주입 컨테이너 - 생성자 주입 지원
export class ServiceContainer {
  private static instance: ServiceContainer;
  private readonly services = new Map<string, any>();

  private constructor() {
    this.registerServices();
  }

  private registerServices(): void {
    // 기본 서비스들 등록
    const userService = new UserService();
    const notificationService = new NotificationService();
    const subscriptionService = new SubscriptionService();

    // 의존성을 가진 서비스 등록
    const dashboardService = new DashboardService(
      userService,
      notificationService,
      subscriptionService,
    );

    this.services.set('UserService', userService);
    this.services.set('NotificationService', notificationService);
    this.services.set('SubscriptionService', subscriptionService);
    this.services.set('DashboardService', dashboardService);
    this.services.set('UIStyleService', new UIStyleService());
  }

  // 타입 안전한 서비스 접근자들
  get userService(): IUserService {
    return this.get<IUserService>('UserService');
  }

  get dashboardService(): IDashboardService {
    return this.get<IDashboardService>('DashboardService');
  }

  get uiStyleService(): IUIStyleService {
    return this.get<IUIStyleService>('UIStyleService');
  }
}
```

#### 4-3. 여러 API 조합: 고급 데이터 집계 서비스

```typescript
// 📁 services/aggregation/IAggregationService.ts
export interface IAggregationService {
  getUserDashboardAggregatedData(
    userId: string,
  ): Promise<UserDashboardAggregatedData>;
}

// 📁 services/aggregation/AggregationService.ts
// 🟢 API 호출과 비즈니스 로직을 모두 관리하는 고급 서비스
export class AggregationService implements IAggregationService {
  constructor(
    private userServer: IUserServer,
    private projectServer: IProjectServer,
    private notificationServer: INotificationServer,
    private analyticsServer: IAnalyticsServer,
    private dashboardService: IDashboardService,
  ) {}

  async getUserDashboardAggregatedData(
    userId: string,
  ): Promise<UserDashboardAggregatedData> {
    // 1. 여러 API를 병렬로 호출 (네트워크 최적화)
    const [user, projects, notifications, analytics] = await Promise.allSettled(
      [
        this.userServer.getUserById(userId),
        this.projectServer.getUserProjects(userId, { limit: 5 }),
        this.notificationServer.getUserNotifications(userId, {
          unreadOnly: true,
        }),
        this.analyticsServer.getUserAnalytics(userId, { period: '30d' }),
      ],
    );

    // 2. 실패한 API 호출 처리
    const userData = user.status === 'fulfilled' ? user.value : null;
    const projectsData =
      projects.status === 'fulfilled' ? projects.value.data : [];
    const notificationsData =
      notifications.status === 'fulfilled' ? notifications.value.data : [];

    if (!userData) throw new Error('Failed to load user data');

    // 3. 비즈니스 로직 서비스를 통한 데이터 가공
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
```

## 🔮 결론

DI 패턴을 활용한 `Service` 레이어를 도입함으로써 우리는 다음과 같은 이점들을 얻을 수 있었습니다.

✅ 해결된 문제들

1. **완벽한 관심사 분리**: 인터페이스를 통해 계약이 명확히 정의되고, 구현체가 분리됨
2. **테스트 용이성 극대화**: 의존성 주입을 통해 완전히 격리된 단위 테스트 작성 가능
3. **확장성과 유연성**: 새로운 구현체로 쉽게 교체 가능하며, 새로운 서비스 추가가 용이
4. **타입 안전성**: 인터페이스를 통한 강력한 타입 안전성 보장
5. **의존성 관리**: 복잡한 서비스 간 의존성을 명시적으로 관리
6. **재사용성**: 동일한 서비스 인스턴스를 여러 곳에서 안전하게 재사용

🏗️ DI Service Layer가 담당하는 것들

- **비즈니스 로직 캡슐화**: 도메인 규칙을 클래스로 캡슐화하여 응집도 향상
- **의존성 관리**: 서비스 간 의존성을 명시적으로 관리하고 주입
- **인터페이스 기반 설계**: 구현체 교체가 쉬운 유연한 아키텍처 제공
- **테스트 격리**: 각 서비스를 완전히 독립적으로 테스트할 수 있는 환경 제공
- **확장성**: 새로운 비즈니스 요구사항에 대한 확장이 용이한 구조

🚀 DI 패턴의 추가 장점

> DI 패턴을 통해 **"별거 없어요!"**가 정말로 별거 없게 만들 수 있는 견고한 아키텍처를 구축했습니다.

**특히 DI 패턴을 통해**

- **환경별 서비스 교체**: 개발/운영 환경에 따라 다른 구현체 주입 가능
- **A/B 테스트**: 다른 비즈니스 로직 구현체를 런타임에 교체
- **마이크로서비스 대응**: 서비스별로 다른 API 엔드포인트를 가진 구현체 제공

이 모든 것이 `타입 안전하게` 가능해졌습니다!

다음 글에서는 Domain Layer와 Value Object 패턴을 통해 더욱 견고한 비즈니스 로직 설계에 대해 알아보겠습니다.

> "원래 있던 기능이니 금방 하시죠?" → "네, 의존성 주입으로 구성된 서비스들을 조합해서 정말 금방 할 수 있습니다!" 🎉
