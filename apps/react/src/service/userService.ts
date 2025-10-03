import type { UserReq, UserRes, UserServer } from '@/server';
import { userServer } from '@/server';
import type { UserStatus } from '@/shared';
import type { IDateUtils } from '@/shared/lib';
import { DateUtils } from '@/shared/lib';

interface IUserService {
  createUser(user: UserReq): Promise<UserRes>;

  getUserStatus(user: UserRes): UserStatus;

  isUserPremiumActive(user: UserRes): boolean;

  canAccessPremiumFeatures(user: UserRes): boolean;
}

export class UserService implements IUserService {
  constructor(
    protected user: UserServer,
    protected dateUtils: IDateUtils
  ) {}

  createUser(user: UserReq): Promise<UserRes> {
    return this.user.createUser(user);
  }

  getUserStatus(user: UserRes): UserStatus {
    if (user.isPremium && this.dateUtils.isWithinDays(user.lastLoginDate, 7)) {
      return 'premium-active';
    }

    if (user.subscriptionStatus === 'active') {
      return 'active';
    }

    if (this.dateUtils.isWithinDays(user.createdAt, 30)) {
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

export const userService = new UserService(userServer, new DateUtils());
