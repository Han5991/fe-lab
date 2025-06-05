import type { UserReq, UserRes, UserServer } from '@/server';
import { userServer } from '@/server';
import type { UserStatus } from '@/shared';

interface IUserService {
  createUser(user: UserReq): Promise<UserRes>;

  getUserStatus(user: UserRes): UserStatus;

  isUserPremiumActive(user: UserRes): boolean;

  canAccessPremiumFeatures(user: UserRes): boolean;
}

export class UserService implements IUserService {
  constructor(protected user: UserServer) {}

  createUser(user: UserReq): Promise<UserRes> {
    return this.user.createUser(user);
  }

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

  isUserPremiumActive(user: UserRes): boolean {
    return this.getUserStatus(user) === 'premium-active';
  }

  canAccessPremiumFeatures(user: UserRes): boolean {
    const status = this.getUserStatus(user);
    return status === 'premium-active' || status === 'active';
  }
}

export const userService = new UserService(userServer);
