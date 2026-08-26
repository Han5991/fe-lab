/**
 * Auth 저장소 — supabase 세션 API(client.auth)를 만지는 유일한 곳.
 *
 * 예전에는 `src`의 세 파일(AdminGuard·useAdminLogout·로그인 페이지)이
 * `lib/platform/client`를 직접 import해 `.auth.*`를 불렀다 — 레이어 규칙
 * ("src는 저장소를 직접 찌르지 않는다")의 유일한 예외였고, lint 가드는
 * `.from()`/`.rpc()`만 봐서 잡지 못했다. 이 모듈이 생기면서 app 레이어의
 * platform 접근 허용 자체가 boundaries에서 빠졌다(eslint.config.mjs) —
 * 이름 우회가 아니라 import 경로 단위로 막힌다.
 *
 * supabase-js의 타입은 여기서 끝낸다: 소비자에게는 판정에 필요한 최소
 * 모양(AdminSession)만 노출하고, 클라이언트는 구조적 부분형(AuthClientLike)
 * 으로 받아 테스트가 가짜 클라이언트를 주입할 수 있게 한다
 * (lib/platform/adminApi.ts의 FunctionsInvoker와 같은 관례).
 *
 * 이 파일은 **런타임 import가 없다** — `lib/platform/client`는 import 시점에
 * env 부재로 throw하므로(모듈 최상위 createClient), 여기서 끌면 node 테스트가
 * 팩토리를 열어 보지도 못한다. 실제 클라이언트 바인딩은 배럴(index.ts)이 한다.
 */

/** 세션에서 판정에 쓰는 최소 모양 — supabase Session의 구조적 부분형. */
export interface AdminSession {
  user: { email?: string | undefined };
}

export interface AuthClientLike {
  getSession(): Promise<{
    data: { session: AdminSession | null };
    error: { message: string } | null;
  }>;
  signOut(options?: { scope: 'local' }): Promise<{ error: unknown }>;
  signInWithOAuth(options: {
    provider: 'google';
    options: { redirectTo: string };
  }): Promise<unknown>;
  onAuthStateChange(
    callback: (event: string, session: AdminSession | null) => void,
  ): { data: { subscription: { unsubscribe: () => void } } };
}

/**
 * 저장소 팩토리 — 프로덕션 바인딩은 배럴(index.ts), 테스트는 가짜 클라이언트를
 * 직접 주입한다. 반환 프로퍼티가 메서드가 아니라 화살표 함수인 이유: 배럴이
 * 구조 분해로 export하므로 `this`에 기대면 안 된다(unbound-method).
 */
export function createAuthRepository(auth: AuthClientLike) {
  return {
    /**
     * 현재 세션. 조회 실패는 "세션 없음"으로 수렴한다 — 가드가 에러와
     * 비로그인을 구분해서 할 수 있는 일이 없고, 둘 다 로그인 화면행이다.
     */
    getAdminSession: async (): Promise<AdminSession | null> => {
      const {
        data: { session },
        error,
      } = await auth.getSession();
      if (error) {
        console.error('Auth guard error:', error);
        return null;
      }
      return session;
    },

    /**
     * 로그아웃. `scope: 'local'`은 이 탭만(다른 기기 세션 유지) —
     * 명시적 로그아웃 버튼이 쓴다. 옵션 없이 부르면 전역 로그아웃으로,
     * 허용되지 않은 계정을 쫓아낼 때 쓴다.
     */
    signOutAdmin: async (options?: { scope: 'local' }): Promise<void> => {
      await auth.signOut(options);
    },

    /** Google OAuth 로그인 시작 — 성공 시 브라우저가 redirectTo로 떠난다. */
    signInAdminWithGoogle: (redirectTo: string): Promise<unknown> =>
      auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      }),

    /**
     * 세션 변화 구독(다른 탭 로그아웃 등). 해제 함수를 반환한다 —
     * supabase의 subscription 객체를 소비자에게 노출하지 않는다.
     */
    subscribeAdminSession: (
      onChange: (session: AdminSession | null, event: string) => void,
    ): (() => void) => {
      const {
        data: { subscription },
      } = auth.onAuthStateChange((event, session) => {
        onChange(session, event);
      });
      return () => {
        subscription.unsubscribe();
      };
    },
  };
}
