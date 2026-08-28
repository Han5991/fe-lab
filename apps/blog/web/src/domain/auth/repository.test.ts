import { describe, expect, test, vi } from 'vitest';
import {
  AuthRepository,
  type AdminSession,
  type AuthClientLike,
  type AuthOAuthResult,
} from './repository';

const SESSION: AdminSession = { user: { email: 'me@example.com' } };

/** 로그인 시작의 성공 브랜치 — 실제 auth-js가 돌려주는 모양 그대로. */
const OAUTH_RESULT: AuthOAuthResult = {
  data: { provider: 'google', url: 'https://auth.example/authorize?…' },
  error: null,
};

type SessionResult = Awaited<ReturnType<AuthClientLike['getSession']>>;
type AuthCallback = Parameters<AuthClientLike['onAuthStateChange']>[0];

/** 기본은 로그인 상태의 가짜 클라이언트 — 테스트별로 조각만 갈아 끼운다. */
function makeAuth(
  session: SessionResult = { data: { session: SESSION }, error: null },
) {
  const unsubscribe = vi.fn();
  const signOutCalls: ({ scope: 'local' } | undefined)[] = [];
  const signInCalls: { provider: 'google'; options: { redirectTo: string } }[] =
    [];
  let capturedCallback: AuthCallback | undefined;

  const auth: AuthClientLike = {
    getSession: () => Promise.resolve(session),
    signOut: options => {
      signOutCalls.push(options);
      return Promise.resolve({ error: null });
    },
    signInWithOAuth: options => {
      signInCalls.push(options);
      return Promise.resolve(OAUTH_RESULT);
    },
    onAuthStateChange: callback => {
      capturedCallback = callback;
      return { data: { subscription: { unsubscribe } } };
    },
  };

  return {
    auth,
    unsubscribe,
    signOutCalls,
    signInCalls,
    emit: (event: string, s: AdminSession | null) =>
      capturedCallback?.(event, s),
  };
}

describe('getAdminSession', () => {
  test('세션을 그대로 돌려준다', async () => {
    const repo = new AuthRepository(makeAuth().auth);

    await expect(repo.getAdminSession()).resolves.toBe(SESSION);
  });

  test('조회 실패는 "세션 없음"으로 수렴한다 — 둘 다 로그인 화면행', async () => {
    const repo = new AuthRepository(
      makeAuth({ data: { session: null }, error: { message: 'boom' } }).auth,
    );
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(repo.getAdminSession()).resolves.toBeNull();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('signOutAdmin', () => {
  test('scope 옵션을 그대로 전달한다 — local은 이 탭만, 없으면 전역', async () => {
    const fake = makeAuth();
    const repo = new AuthRepository(fake.auth);

    await repo.signOutAdmin({ scope: 'local' });
    await repo.signOutAdmin();

    expect(fake.signOutCalls).toEqual([{ scope: 'local' }, undefined]);
  });
});

describe('signInAdminWithGoogle', () => {
  test('google provider와 redirectTo를 배선하고 결과를 그대로 돌려준다', async () => {
    const fake = makeAuth();
    const repo = new AuthRepository(fake.auth);

    const result = await repo.signInAdminWithGoogle(
      'https://blog.example/admin',
    );

    expect(fake.signInCalls).toEqual([
      {
        provider: 'google',
        options: { redirectTo: 'https://blog.example/admin' },
      },
    ]);
    // 반환을 unknown으로 두면 소비자가 error를 볼 수 없다 — 통과를 고정한다.
    expect(result).toBe(OAUTH_RESULT);
  });
});

describe('subscribeAdminSession', () => {
  test('(session, event) 순서로 전달하고, 반환 함수가 구독을 해제한다', () => {
    const fake = makeAuth();
    const repo = new AuthRepository(fake.auth);
    const onChange = vi.fn();

    const cleanup = repo.subscribeAdminSession(onChange);
    fake.emit('SIGNED_OUT', null);
    expect(onChange).toHaveBeenCalledWith(null, 'SIGNED_OUT');

    cleanup();
    expect(fake.unsubscribe).toHaveBeenCalledOnce();
  });
});
