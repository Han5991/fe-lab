/**
 * Auth domain의 공개 API — admin 화면(가드·로그인·로그아웃)이 쓴다.
 *
 * 실제 supabase 클라이언트 바인딩은 여기(배럴)서 한다 — repository.ts는
 * 런타임 import가 없는 순수 팩토리라 node 테스트가 가짜 클라이언트로 열어
 * 볼 수 있고, `lib/platform/client`의 모듈 최상위 createClient(env 없으면
 * throw)는 실제 소비자(admin 화면)가 이 배럴을 여는 순간에만 평가된다.
 *
 * analytics처럼 배럴을 index/admin으로 나누지 않는 이유: auth는 소비자가
 * admin 화면뿐이라 공개 페이지 번들로 새어 들어갈 경로가 없다(AdminGuard는
 * dynamic(ssr:false) 뒤에 있다). 공개 페이지가 이 배럴을 import하기 시작하면
 * 인증 세션용 supabase-js가 딸려가므로, 그때는 analytics의 배럴 분리 관례를
 * 따를 것.
 */
import { client } from '../../lib/platform/client';
import { createAuthRepository } from './repository';

const repository = createAuthRepository(client.auth);

export const {
  getAdminSession,
  signOutAdmin,
  signInAdminWithGoogle,
  subscribeAdminSession,
} = repository;

export * from './adminAccess';
export type { AdminSession } from './repository';
