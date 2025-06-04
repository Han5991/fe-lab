export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  isPremium: boolean;
  lastLoginDate: Date;
  subscriptionStatus: string;
};

export type UserStatus = 'premium-active' | 'active' | 'new' | 'inactive';
