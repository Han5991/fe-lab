-- =============================================================================
-- Migration: RPC / 테이블 권한 lockdown (Phase 1 — 권한만)
-- =============================================================================
--
-- 배경:
--   pg_dump --schema public 결과 production에서 모든 analytics RPC와
--   post_view_logs 테이블이 anon에 GRANT ALL 되어 있음.
--   Supabase default privilege 때문에 기존 마이그레이션의
--   REVOKE FROM PUBLIC 이 anon에는 효과가 없었음.
--
--   본 마이그레이션은 명시적 REVOKE / GRANT 만 적용한다 (Phase 1).
--   함수 본문에 admin email 가드를 추가하는 작업은 Phase 2 별도 PR로:
--     실제 production body가 daily_post_stats 테이블 / pre-computed 컬럼
--     (view_hour, view_day_of_week) 기반인데 본 초안의 추정 body는
--     post_view_logs + AT TIME ZONE 'Asia/Seoul' 으로 완전히 달라
--     적용 시 silent regression이 일어날 수 있음 → 본 PR에서는 제외.
--
-- ⚠️ 적용 시 즉시 발생하는 영향 (반드시 사전 처리 필수):
--   클라이언트 admin 페이지(/admin/analytics 등)는 현재 anon key로 admin RPC
--   (get_all_post_stats / get_all_posts_trends / get_post_hourly_distribution /
--    get_post_dow_distribution / get_daily_view_trend / get_hourly_traffic_pattern /
--    get_monthly_view_trend / get_popular_posts / get_weekly_traffic_pattern /
--    aggregate_daily_stats / increment_post_views)을 직접 호출함.
--   본 마이그레이션 적용 즉시 이 호출 경로는 모두 forbidden(42501)을 받게 됨.
--
--   → 다음 두 가지 follow-up PR 머지·배포 *후*에만 본 마이그레이션을 적용해야 함:
--     (i) admin 클라이언트를 Supabase Edge Function 경유 호출로 변경 (Edge가
--         사용자 JWT 검증 → service_role 키로 RPC 호출 → 결과 반환)
--     (ii) Phase 2 마이그레이션: 실제 dump body + admin email 가드 추가
--
--   배포 순서:
--     [Edge Function PR 머지·배포]
--   → [Phase 2 마이그레이션 PR 머지·db push (admin email 가드 + 본문 보존)]
--   → [본 PR 머지·db push (anon 권한 잠금)]
--
--   순서 위반 시 admin 페이지가 forbidden을 받아 즉시 사용 불가.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Admin/Analytics RPC 권한 잠금
--    anon, authenticated, PUBLIC → REVOKE
--    service_role → GRANT (Supabase client-side 호출 불가, 서버/cron만)
-- -----------------------------------------------------------------------------

-- get_all_post_stats()
REVOKE ALL ON FUNCTION public.get_all_post_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_post_stats() TO service_role;

-- get_all_posts_trends()
REVOKE ALL ON FUNCTION public.get_all_posts_trends() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_posts_trends() TO service_role;

-- get_post_hourly_distribution(text)
REVOKE ALL ON FUNCTION public.get_post_hourly_distribution(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_hourly_distribution(text) TO service_role;

-- get_post_dow_distribution(text)
REVOKE ALL ON FUNCTION public.get_post_dow_distribution(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_post_dow_distribution(text) TO service_role;

-- get_daily_view_trend(int, text) — production에 존재하나 마이그레이션 파일 없음
-- (Supabase 대시보드에서 직접 생성된 것으로 추정)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_daily_view_trend'
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.get_daily_view_trend(int, text) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_daily_view_trend(int, text) TO service_role';
  END IF;
END;
$$;

-- get_hourly_traffic_pattern(int)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_hourly_traffic_pattern'
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.get_hourly_traffic_pattern(int) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_hourly_traffic_pattern(int) TO service_role';
  END IF;
END;
$$;

-- get_monthly_view_trend(int, text)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_monthly_view_trend'
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.get_monthly_view_trend(int, text) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_monthly_view_trend(int, text) TO service_role';
  END IF;
END;
$$;

-- get_popular_posts(int, int)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_popular_posts'
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.get_popular_posts(int, int) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_popular_posts(int, int) TO service_role';
  END IF;
END;
$$;

-- get_weekly_traffic_pattern(int)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_weekly_traffic_pattern'
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.get_weekly_traffic_pattern(int) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_weekly_traffic_pattern(int) TO service_role';
  END IF;
END;
$$;

-- aggregate_daily_stats(date)
-- service_role + supabase_cron (pg_cron이 쓰는 role) 만 허용
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'aggregate_daily_stats'
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.aggregate_daily_stats(date) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.aggregate_daily_stats(date) TO service_role';
    -- supabase_cron role이 있으면 추가 grant (없으면 무시)
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_cron') THEN
      EXECUTE 'GRANT EXECUTE ON FUNCTION public.aggregate_daily_stats(date) TO supabase_cron';
    END IF;
  END IF;
END;
$$;

-- increment_post_views — 두 시그니처 존재 (production dump 기준)
-- 현재 코드에서 사용되지 않는 것으로 보이나 권한만 잠금.
-- 함수 자체 DROP은 사용 여부 확인 후 별도 PR에서 처리 권장.
-- TODO(#후속PR): increment_post_views 두 시그니처 중 불필요한 것 DROP 검토
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'increment_post_views'
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION public.increment_post_views(%s) FROM PUBLIC, anon, authenticated',
      r.args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.increment_post_views(%s) TO service_role',
      r.args
    );
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. increment_view_count — 본문은 그대로, 권한만 정리
--
-- 본 PR 초안에는 "slug 단위 1분 중복 차단" 블록이 있었으나 코드 리뷰에서
-- "특정 slug의 첫 사용자 호출이 이후 1분간 B/C/D 사용자 호출까지 차단해
-- 인기 포스트의 조회수가 분당 1회만 집계되는 데이터 유실 결함" 으로 지적됨.
-- → slug 단위 가드는 클라이언트 쿠키와 무관하게 합법 트래픽을 잘라 먹기 때문에
--   제거. 1차 중복 방지는 클라이언트 쿠키(6시간)에 유지하고, 서버측은 IP/세션
--   단위 가드가 필요한데, 이는 SQL 함수에서 직접 식별이 어려움(pooler 환경에서
--   inet_client_addr 부정확). 다음 follow-up에서 처리:
-- TODO(#supabase-edge-rate-limit):
--   1) Supabase Edge Function 경유 호출 → JWT/IP 단위 토큰 버킷
--   2) 또는 클라이언트가 session_id를 RPC 인자로 보내 (slug, session_id) 단위 차단
-- 본 PR은 권한 잠금/admin 가드/post_view_logs 접근 정리에 집중.
-- -----------------------------------------------------------------------------
-- 함수 본문 자체는 production dump와 동일하므로 CREATE OR REPLACE 하지 않음.
-- (재정의가 필요 없는 함수까지 다시 쓰면 비즈니스 로직 silent 변경 리스크 증가)

-- increment_view_count는 anon 정상 호출 path이므로 권한 유지
REVOKE ALL ON FUNCTION public.increment_view_count(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_view_count(text) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. 테이블 직접 권한 정리
-- -----------------------------------------------------------------------------

-- 4-1. post_view_logs: anon GRANT ALL → REVOKE ALL
--   SECURITY DEFINER RPC 경로만 허용. 직접 테이블 접근 불가.
REVOKE ALL ON TABLE public.post_view_logs FROM anon, authenticated, PUBLIC;
-- service_role은 SECURITY DEFINER 함수 실행 컨텍스트에서 사용
GRANT ALL ON TABLE public.post_view_logs TO service_role;

-- 4-2. post_view_logs_id_seq: 시퀀스도 동일하게 정리
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.sequences
    WHERE sequence_schema = 'public'
      AND sequence_name = 'post_view_logs_id_seq'
  ) THEN
    EXECUTE 'REVOKE ALL ON SEQUENCE public.post_view_logs_id_seq FROM anon, authenticated, PUBLIC';
    EXECUTE 'GRANT ALL ON SEQUENCE public.post_view_logs_id_seq TO service_role';
  END IF;
END;
$$;

-- 4-3. post_views: anon에 SELECT만 남기고 INSERT/UPDATE/DELETE REVOKE
--   "Allow public read access" RLS 정책과 일관성 유지
REVOKE INSERT, UPDATE, DELETE ON TABLE public.post_views FROM anon, authenticated, PUBLIC;
GRANT SELECT ON TABLE public.post_views TO anon, authenticated;
GRANT ALL ON TABLE public.post_views TO service_role;

-- -----------------------------------------------------------------------------
-- 5. increment_post_views 이중 정의 안내 (코멘트)
-- -----------------------------------------------------------------------------
-- production pg_dump 에서 increment_post_views 가 두 시그니처로 존재함.
-- 현재 코드(domain/analytics/repository.ts)에서는 increment_view_count 만 호출.
-- increment_post_views 는 사용되지 않는 것으로 보이나 DROP은 영향도 확인 후 수행 권장.
-- 본 PR에서는 권한만 service_role로 잠금 (섹션 1의 DO $$ 블록에서 처리).
-- TODO(#후속PR): increment_post_views 두 시그니처 사용 여부 확인 후 DROP 또는 통합

-- -----------------------------------------------------------------------------
-- 후속 작업 필요 사항 (별도 PR)
-- -----------------------------------------------------------------------------
-- 1. ⚠️ Admin 페이지 클라이언트 → Edge Function 경유 (반드시 본 PR 적용 전 처리):
--    domain/analytics/repository.ts 의 admin 함수들이 anon key(브라우저)로
--    Supabase RPC를 직접 호출 중. 본 마이그레이션 적용 즉시 forbidden(42501).
--    apps/blog/web 은 SSG(output: 'export')라 Next.js API Route 사용 불가.
--    → Supabase Edge Function 으로 admin RPC 호출 경로를 옮겨야 함.
--      흐름: 브라우저(사용자 JWT) → Edge Function (JWT 검증 + admin email 확인)
--           → service_role key로 RPC 호출 → 결과 반환.
--
-- 2. Phase 2 마이그레이션 — 함수 본문 admin email 가드:
--    실제 dump body를 그대로 사용 + BEGIN 직후 IF auth.jwt()->>'email' IS DISTINCT
--    FROM current_setting('app.admin_email', true) THEN RAISE forbidden END IF;
--    추가. (현재 본 PR은 추정 본문 위험으로 제외)
--    app.admin_email GUC 사전 설정 필요:
--      ALTER DATABASE postgres SET "app.admin_email" = 'rewq5991@gmail.com';
--
-- 3. increment_post_views 두 시그니처 정리 (위 섹션 5 참조)
--
-- 4. IP/세션 기반 rate limit 도입 (위 섹션 3 참조)
--    Supabase Edge Function에서 JWT 또는 IP 단위 토큰 버킷 권장.
--    SQL 함수에서 inet_client_addr 사용은 pooler 환경에서 부정확.
