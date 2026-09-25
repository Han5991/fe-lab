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
  // 4xx는 다시 보내도 같은 답이다. 서버·네트워크·알 수 없는 실패만 다시 시도한다.
  test.each([
    ['400', failure(400), false],
    ['401', failure(401), false],
    ['403', failure(403), false],
    ['500', failure(500), true],
    ['네트워크(status 없음)', failure(null), true],
    ['AdminApiError가 아닌 실패', new Error('admin-posts-index.json'), true],
  ])('%s → 재시도 %s', (_kind, error, retryable) => {
    expect(isRetryableAdminError(error)).toBe(retryable);
  });
});
