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

/**
 * 실패 모양 — supabase `AuthError`(Error 상속)의 구조적 부분형.
 *
 * 소비자가 실제로 쓰는 건 message 하나다. code·status까지 옮겨 적으면
 * supabase의 에러 코드 열거를 이 레이어가 따라다녀야 한다.
 */
export interface AuthFailure {
  message: string;
}

/**
 * OAuth 로그인 시작의 결과 — supabase `OAuthResponse`의 구조적 부분형.
 *
 * `url`이 nullable인 건 원본이 성공(`url: string`)/실패(`url: null`) 두
 * 브랜치의 유니온이기 때문이다. 다만 브라우저에서 이 값을 읽을 일은 거의
 * 없다 — auth-js가 반환 직전에 `window.location.assign(url)`로 페이지를
 * 떠나므로, `skipBrowserRedirect`로 이동을 막았을 때만 의미가 있다.
 */
export interface AuthOAuthResult {
  data: { provider: string; url: string | null };
  error: AuthFailure | null;
}

/**
 * auth 저장소의 계약. **소비자는 클래스가 아니라 이 인터페이스에 의존한다.**
 *
 * 구현이 하나뿐이라 클래스 타입을 그대로 써도 컴파일은 되지만, 그러면 소비자가
 * 가짜로 대체할 수 없다 — 클래스에 `#auth` 프라이빗 필드가 있어 타입이 사실상
 * nominal이 되고, 같은 모양의 평범한 객체는 절대 대입되지 않는다
 * (lib/platform/adminApi.ts의 AdminApi와 같은 관례).
 */
export interface AuthApi {
  getAdminSession(): Promise<AdminSession | null>;
  signOutAdmin(options?: { scope: 'local' }): Promise<void>;
  signInAdminWithGoogle(redirectTo: string): Promise<AuthOAuthResult>;
  subscribeAdminSession(
    onChange: (session: AdminSession | null, event: string) => void,
  ): () => void;
}

export interface AuthClientLike {
  getSession(): Promise<{
    data: { session: AdminSession | null };
    error: AuthFailure | null;
  }>;
  signOut(options?: { scope: 'local' }): Promise<{ error: AuthFailure | null }>;
  signInWithOAuth(options: {
    provider: 'google';
    options: { redirectTo: string };
  }): Promise<AuthOAuthResult>;
  onAuthStateChange(
    callback: (event: string, session: AdminSession | null) => void,
  ): { data: { subscription: { unsubscribe: () => void } } };
}

/**
 * Auth 저장소 — 클라이언트를 생성자로 주입받는다. 프로덕션 바인딩은
 * 배럴(index.ts)이 실제 `client.auth`로, 테스트는 가짜 클라이언트로 만든다.
 *
 * 소비자는 배럴이 미리 만들어 둔 싱글톤(`authRepository`) 하나를 쓴다 —
 * 이 클래스를 직접 `new` 하는 곳은 그 배럴과 테스트뿐이다.
 *
 * 생성자 파라미터 프로퍼티(`constructor(private auth: …)`)를 쓰지 않은 건
 * 취향이 아니라 규칙이다 — tsconfig의 `erasableSyntaxOnly`가 막는다(타입만
 * 지워서는 JS가 되지 않는 문법). 필드를 따로 선언하고 생성자에서 대입한다.
 */
export class AuthRepository implements AuthApi {
  readonly #auth: AuthClientLike;

  constructor(auth: AuthClientLike) {
    this.#auth = auth;
  }

  /**
   * 현재 세션. 조회 실패는 "세션 없음"으로 수렴한다 — 가드가 에러와
   * 비로그인을 구분해서 할 수 있는 일이 없고, 둘 다 로그인 화면행이다.
   */
  async getAdminSession(): Promise<AdminSession | null> {
    const {
      data: { session },
      error,
    } = await this.#auth.getSession();
    if (error) {
      console.error('Auth guard error:', error);
      return null;
    }
    return session;
  }

  /**
   * 로그아웃. `scope: 'local'`은 이 탭만(다른 기기 세션 유지) —
   * 명시적 로그아웃 버튼이 쓴다. 옵션 없이 부르면 전역 로그아웃으로,
   * 허용되지 않은 계정을 쫓아낼 때 쓴다.
   */
  async signOutAdmin(options?: { scope: 'local' }): Promise<void> {
    await this.#auth.signOut(options);
  }

  /** Google OAuth 로그인 시작 — 성공 시 브라우저가 redirectTo로 떠난다. */
  signInAdminWithGoogle(redirectTo: string): Promise<AuthOAuthResult> {
    return this.#auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
  }

  /**
   * 세션 변화 구독(다른 탭 로그아웃 등). 해제 함수를 반환한다 —
   * supabase의 subscription 객체를 소비자에게 노출하지 않는다.
   */
  subscribeAdminSession(
    onChange: (session: AdminSession | null, event: string) => void,
  ): () => void {
    const {
      data: { subscription },
    } = this.#auth.onAuthStateChange((event, session) => {
      onChange(session, event);
    });
    return () => {
      subscription.unsubscribe();
    };
  }
}
