import { createClient } from '@supabase/supabase-js';
import type { Database } from '@blog/analytics';
import {
  PUBLIC_SUPABASE_ANON_KEY,
  PUBLIC_SUPABASE_URL,
} from '$env/static/public';

/**
 * Admin 전용 — 세션(Google OAuth)과 `functions.invoke`가 필요한 자리.
 *
 * 이 모듈은 **admin 그래프에서만 열려야 한다.** 최상위 `createClient()`가
 * 번들러에 부수효과라, 공개 페이지가 닿기만 해도 supabase-js 전체가 남는다.
 * `check-bundle`의 규칙이 산출물에서 그걸 본다.
 */
export const client = createClient<Database>(
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
);
