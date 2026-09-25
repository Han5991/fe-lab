import { describe, expect, test } from 'vitest';
import {
  AdminApiError,
  adminFailureKind,
  isRetryableAdminError,
} from './adminErrors';

const failure = (status: number | null) =>
  new AdminApiError({
    action: 'all_post_stats',
    status,
    serverMessage: null,
    fallbackMessage: 'x',
  });

describe('adminFailureKind', () => {
  test('401은 로그인, 403은 권한, 나머지는 일반 실패로 가른다', () => {
    expect(adminFailureKind(failure(401))).toBe('unauthenticated');
    expect(adminFailureKind(failure(403))).toBe('forbidden');
    expect(adminFailureKind(failure(500))).toBe('other');
    expect(adminFailureKind(failure(null))).toBe('other');
    // 모양만 비슷한 값은 믿지 않는다 — status는 AdminApiError만 싣는다.
    expect(adminFailureKind({ status: 401 })).toBe('other');
    expect(adminFailureKind(new Error('boom'))).toBe('other');
  });
});

describe('isRetryableAdminError', () => {
  test('4xx는 다시 보내도 같은 답이라 재시도하지 않는다', () => {
    expect(isRetryableAdminError(failure(400))).toBe(false);
    expect(isRetryableAdminError(failure(401))).toBe(false);
    expect(isRetryableAdminError(failure(403))).toBe(false);
  });

  test('서버·네트워크 실패와 알 수 없는 실패는 재시도할 수 있다', () => {
    expect(isRetryableAdminError(failure(500))).toBe(true);
    expect(isRetryableAdminError(failure(null))).toBe(true);
    expect(isRetryableAdminError(new Error('admin-posts-index.json'))).toBe(
      true,
    );
  });
});
