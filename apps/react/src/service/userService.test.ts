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

    it('should return "new" for users created within the last 30 days', () => {
      // Arrange
      const now = Date.now();
      const fifteenDaysAgo = new Date(now - 15 * 24 * 60 * 60 * 1000);
      const user: UserRes = {
        id: '123',
        name: '신규 사용자',
        email: 'new@example.com',
        isPremium: false,
        subscriptionStatus: 'inactive',
        lastLoginDate: fifteenDaysAgo,
        createdAt: fifteenDaysAgo, // 15일 전에 생성됨
      };

      // Act
      const status = userService.getUserStatus(user);

      // Assert
      expect(status).toBe('new');
    });

    it('should return "inactive" for users who are not premium, have inactive subscription, and created more than 30 days ago', () => {
      // Arrange
      const now = Date.now();
      const fortyDaysAgo = new Date(now - 40 * 24 * 60 * 60 * 1000);
      const user: UserRes = {
        id: '123',
        name: '비활성 사용자',
        email: 'inactive@example.com',
        isPremium: false,
        subscriptionStatus: 'inactive',
        lastLoginDate: fortyDaysAgo,
        createdAt: fortyDaysAgo, // 40일 전에 생성됨
      };

      // Act
      const status = userService.getUserStatus(user);

      // Assert
      expect(status).toBe('inactive');
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

    it('should return false for non-premium-active users', () => {
      // Arrange
      const now = Date.now();
      const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000);
      const user: UserRes = {
        id: '123',
        name: '일반 사용자',
        email: 'regular@example.com',
        isPremium: false,
        subscriptionStatus: 'active',
        lastLoginDate: tenDaysAgo,
        createdAt: new Date(now - 60 * 24 * 60 * 60 * 1000),
      };

      // Act
      const isPremiumActive = userService.isUserPremiumActive(user);

      // Assert
      expect(isPremiumActive).toBe(false);
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

    it('should return true for active users', () => {
      // Arrange
      const now = Date.now();
      const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000);
      const user: UserRes = {
        id: '123',
        name: '활성 사용자',
        email: 'active@example.com',
        isPremium: false,
        subscriptionStatus: 'active',
        lastLoginDate: tenDaysAgo,
        createdAt: new Date(now - 60 * 24 * 60 * 60 * 1000),
      };

      // Act
      const canAccess = userService.canAccessPremiumFeatures(user);

      // Assert
      expect(canAccess).toBe(true);
    });

    it('should return false for new or inactive users', () => {
      // Arrange
      const now = Date.now();
      const fortyDaysAgo = new Date(now - 40 * 24 * 60 * 60 * 1000);
      const user: UserRes = {
        id: '123',
        name: '비활성 사용자',
        email: 'inactive@example.com',
        isPremium: false,
        subscriptionStatus: 'inactive',
        lastLoginDate: fortyDaysAgo,
        createdAt: fortyDaysAgo,
      };

      // Act
      const canAccess = userService.canAccessPremiumFeatures(user);

      // Assert
      expect(canAccess).toBe(false);
    });
  });
});
