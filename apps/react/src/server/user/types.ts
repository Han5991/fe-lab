import type { User } from '@/shared';

export type UserReq = Pick<User, 'id'>;

/**
 * 서버가 보내는 JSON 모양. JSON에는 Date가 없어 날짜는 ISO 8601 문자열로 온다 —
 * 도메인 `User`(Date)로는 `toUser`가 경계에서 바꾼다.
 */
export interface UserDto extends Omit<User, 'createdAt' | 'lastLoginDate'> {
  createdAt: string;
  lastLoginDate: string;
}

export type UserRes = User;
