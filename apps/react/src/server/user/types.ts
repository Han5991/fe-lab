import type { User } from '@/shared';

export type UserReq = Pick<User, 'id'>;

export type UserRes = User;
