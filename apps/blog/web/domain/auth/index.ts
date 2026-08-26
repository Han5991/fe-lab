/**
 * Auth domain의 공개 API — admin 화면(가드·로그인·로그아웃)이 쓴다.
 *
 * 실제 supabase 클라이언트 바인딩은 여기(배럴)서 한다 — repository.ts는
 * 런타임 import가 없는 순수 클래스라 node 테스트가 가짜 클라이언트를 주입해
 * 열어 볼 수 있고, `lib/platform/client`의 모듈 최상위 createClient(env 없으면
 * throw)는 실제 소비자(admin 화면)가 이 배럴을 여는 순간에만 평가된다.
 *
 * **이 배럴은 세션이 필요한 소비자 전용이다.** 위 바인딩이 모듈 스코프
 * 부수효과라, 여기서 뭘 가져가든(순수 판정 하나라도) 인증 세션용 supabase-js
 * 전체가 번들에 딸려온다 — 번들러는 부수효과 있는 모듈을 못 털어낸다
 * (analytics가 index/admin 두 배럴로 갈라진 것과 같은 이유). 경로 상수나
 * `isAdminLoginPath` 같은 **판정만** 필요한 소비자는 `@/domain/auth/adminAccess`
 * 를 직접 import할 것 — 그 모듈은 import가 없는 순수 리터럴/함수다.
 */
import { client } from '../../lib/platform/client';
import { AuthRepository, type AuthApi } from './repository';

/**
 * 이 앱의 auth 저장소 — 모듈이 처음 열릴 때 만들어 두는 싱글톤이다.
 *
 * 세션을 실제로 들고 있는 건 supabase 클라이언트(`client.auth`)이고 그쪽이
 * 이미 싱글톤이라, 저장소를 여럿 만들어 봐야 같은 세션을 가리키는 껍데기가
 * 늘 뿐이다. 하나로 고정해 두면 `subscribeAdminSession`의 구독/해제 짝도
 * 한 인스턴스 안에서 닫힌다.
 *
 * 타입을 `AuthRepository`(클래스)가 아니라 `AuthApi`(계약)로 못 박는다 —
 * 화면이 의존하는 건 네 개의 메서드이지 그 구현이 아니다.
 */
export const authRepository: AuthApi = new AuthRepository(client.auth);

export * from './adminAccess';
export type {
  AdminSession,
  AuthApi,
  AuthFailure,
  AuthOAuthResult,
} from './repository';
