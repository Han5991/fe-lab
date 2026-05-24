-- =============================================================================
-- Migration: RPC / 테이블 권한 lockdown + admin email 가드
-- =============================================================================
--
-- 배경:
--   pg_dump --schema public 결과 production에서 모든 analytics RPC와
--   post_view_logs 테이블이 anon에 GRANT ALL 되어 있음.
--   Supabase default privilege 때문에 기존 마이그레이션의
--   REVOKE FROM PUBLIC 이 anon에는 효과가 없었음.
--   명시적 REVOKE + 함수 본문 가드로 이중 보호를 추가한다.
--
-- 적용 전 수동 작업 (Supabase 대시보드):
--   1) Settings → Database → Configuration → "Database settings" 에서
--      커스텀 GUC 추가:
--        app.admin_email = 'rewq5991@gmail.com'
--      (또는 supabase CLI: ALTER DATABASE postgres SET "app.admin_email" = '...')
--      이 GUC 없이 마이그레이션을 적용하면 admin RPC 전체가 접근 불가.
--
-- 머지 후 적용 순서:
--   1) Supabase 대시보드에서 app.admin_email GUC 설정
--   2) supabase db push 로 production 반영
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. GUC 설정 안내 (실제 적용은 Supabase 대시보드에서 수행 필요)
-- -----------------------------------------------------------------------------
-- 아래 구문을 production에서 직접 실행하거나 Supabase Dashboard의
-- SQL Editor에서 실행하여 GUC를 영구 설정하세요.
-- (supabase db push는 이 ALTER DATABASE를 지원하지 않을 수 있음)
--
--   ALTER DATABASE postgres SET "app.admin_email" = 'rewq5991@gmail.com';
--
-- 참고: current_setting('app.admin_email', true) 는 GUC가 없으면 NULL을 반환.
--   GUC 미설정 시 auth.jwt()->>'email' IS DISTINCT FROM NULL → 항상 TRUE
--   → 모든 admin RPC가 forbidden 을 throw함.

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
-- 2. Admin/Analytics RPC 본문에 admin email 가드 삽입
--    BEGIN 직후: auth.jwt()->>'email' = app.admin_email GUC 체크
--    sql language 함수를 plpgsql로 재정의.
-- -----------------------------------------------------------------------------

-- 2-1. get_all_post_stats()
CREATE OR REPLACE FUNCTION public.get_all_post_stats()
RETURNS TABLE (
  slug text,
  total_views bigint,
  today_views bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- admin email 가드: GUC app.admin_email과 JWT의 email이 일치해야 함
  IF auth.jwt() ->> 'email' IS DISTINCT FROM current_setting('app.admin_email', true) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    pv.slug,
    pv.view_count AS total_views,
    COALESCE(today_logs.today_views, 0)::bigint AS today_views
  FROM public.post_views pv
  LEFT JOIN (
    SELECT l.slug, COUNT(*) AS today_views
    FROM public.post_view_logs l
    WHERE l.viewed_at AT TIME ZONE 'Asia/Seoul'
          >= date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul')
    GROUP BY l.slug
  ) today_logs ON today_logs.slug = pv.slug;
END;
$$;

-- 2-2. get_all_posts_trends()
CREATE OR REPLACE FUNCTION public.get_all_posts_trends()
RETURNS TABLE (
  slug text,
  view_date date,
  view_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.jwt() ->> 'email' IS DISTINCT FROM current_setting('app.admin_email', true) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    pvl.slug,
    (pvl.viewed_at AT TIME ZONE 'Asia/Seoul')::date AS view_date,
    COUNT(*)::bigint AS view_count
  FROM public.post_view_logs pvl
  WHERE (pvl.viewed_at AT TIME ZONE 'Asia/Seoul')::date
        >= (NOW() AT TIME ZONE 'Asia/Seoul' - INTERVAL '365 days')::date
  GROUP BY pvl.slug, view_date
  ORDER BY pvl.slug, view_date ASC;
END;
$$;

-- 2-3. get_post_hourly_distribution(text)
CREATE OR REPLACE FUNCTION public.get_post_hourly_distribution(slug_input text)
RETURNS TABLE (
  hour int,
  view_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.jwt() ->> 'email' IS DISTINCT FROM current_setting('app.admin_email', true) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM viewed_at AT TIME ZONE 'Asia/Seoul')::int AS hour,
    COUNT(*)::bigint AS view_count
  FROM public.post_view_logs
  WHERE slug = slug_input
  GROUP BY hour
  ORDER BY hour ASC;
END;
$$;

-- 2-4. get_post_dow_distribution(text)
CREATE OR REPLACE FUNCTION public.get_post_dow_distribution(slug_input text)
RETURNS TABLE (
  dow int,
  view_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.jwt() ->> 'email' IS DISTINCT FROM current_setting('app.admin_email', true) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    EXTRACT(DOW FROM viewed_at AT TIME ZONE 'Asia/Seoul')::int AS dow,
    COUNT(*)::bigint AS view_count
  FROM public.post_view_logs
  WHERE slug = slug_input
  GROUP BY dow
  ORDER BY dow ASC;
END;
$$;

-- 2-5. get_daily_view_trend(int, text)
--   production에 존재하나 마이그레이션 파일 없음 — 함수 본문 추정 재정의.
--   실제 body가 다를 경우 사용자가 직접 조정 필요.
--   반드시 pg_dump 원본과 비교 후 적용 권장.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_daily_view_trend'
  ) THEN
    -- 기존 함수를 admin 가드가 포함된 plpgsql 버전으로 교체
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.get_daily_view_trend(days_input int, slug_input text DEFAULT NULL)
      RETURNS TABLE (
        view_date date,
        view_count bigint
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      BEGIN
        IF auth.jwt() ->> 'email' IS DISTINCT FROM current_setting('app.admin_email', true) THEN
          RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
        END IF;

        RETURN QUERY
        SELECT
          (pvl.viewed_at AT TIME ZONE 'Asia/Seoul')::date AS view_date,
          COUNT(*)::bigint AS view_count
        FROM public.post_view_logs pvl
        WHERE (pvl.viewed_at AT TIME ZONE 'Asia/Seoul')::date
              >= (NOW() AT TIME ZONE 'Asia/Seoul' - (days_input || ' days')::interval)::date
          AND (slug_input IS NULL OR pvl.slug = slug_input)
        GROUP BY view_date
        ORDER BY view_date ASC;
      END;
      $body$
    $func$;
  END IF;
END;
$$;

-- 2-6. get_hourly_traffic_pattern(int)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_hourly_traffic_pattern'
  ) THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.get_hourly_traffic_pattern(days_input int)
      RETURNS TABLE (
        hour int,
        view_count bigint
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      BEGIN
        IF auth.jwt() ->> 'email' IS DISTINCT FROM current_setting('app.admin_email', true) THEN
          RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
        END IF;

        RETURN QUERY
        SELECT
          EXTRACT(HOUR FROM viewed_at AT TIME ZONE 'Asia/Seoul')::int AS hour,
          COUNT(*)::bigint AS view_count
        FROM public.post_view_logs
        WHERE viewed_at >= NOW() - (days_input || ' days')::interval
        GROUP BY hour
        ORDER BY hour ASC;
      END;
      $body$
    $func$;
  END IF;
END;
$$;

-- 2-7. get_monthly_view_trend(int, text)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_monthly_view_trend'
  ) THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.get_monthly_view_trend(months_input int, slug_input text DEFAULT NULL)
      RETURNS TABLE (
        view_month date,
        view_count bigint
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      BEGIN
        IF auth.jwt() ->> 'email' IS DISTINCT FROM current_setting('app.admin_email', true) THEN
          RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
        END IF;

        RETURN QUERY
        SELECT
          date_trunc('month', viewed_at AT TIME ZONE 'Asia/Seoul')::date AS view_month,
          COUNT(*)::bigint AS view_count
        FROM public.post_view_logs
        WHERE viewed_at >= NOW() - (months_input || ' months')::interval
          AND (slug_input IS NULL OR slug = slug_input)
        GROUP BY view_month
        ORDER BY view_month ASC;
      END;
      $body$
    $func$;
  END IF;
END;
$$;

-- 2-8. get_popular_posts(int, int)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_popular_posts'
  ) THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.get_popular_posts(days_input int, limit_input int DEFAULT 10)
      RETURNS TABLE (
        slug text,
        view_count bigint
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      BEGIN
        IF auth.jwt() ->> 'email' IS DISTINCT FROM current_setting('app.admin_email', true) THEN
          RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
        END IF;

        RETURN QUERY
        SELECT
          pvl.slug,
          COUNT(*)::bigint AS view_count
        FROM public.post_view_logs pvl
        WHERE pvl.viewed_at >= NOW() - (days_input || ' days')::interval
        GROUP BY pvl.slug
        ORDER BY view_count DESC
        LIMIT limit_input;
      END;
      $body$
    $func$;
  END IF;
END;
$$;

-- 2-9. get_weekly_traffic_pattern(int)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_weekly_traffic_pattern'
  ) THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.get_weekly_traffic_pattern(days_input int)
      RETURNS TABLE (
        dow int,
        view_count bigint
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $body$
      BEGIN
        IF auth.jwt() ->> 'email' IS DISTINCT FROM current_setting('app.admin_email', true) THEN
          RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
        END IF;

        RETURN QUERY
        SELECT
          EXTRACT(DOW FROM viewed_at AT TIME ZONE 'Asia/Seoul')::int AS dow,
          COUNT(*)::bigint AS view_count
        FROM public.post_view_logs
        WHERE viewed_at >= NOW() - (days_input || ' days')::interval
        GROUP BY dow
        ORDER BY dow ASC;
      END;
      $body$
    $func$;
  END IF;
END;
$$;

-- 2-10. aggregate_daily_stats(date)
--   cron job이 호출하는 함수. admin email JWT 가드 없이 service_role/cron 전용.
--   (cron 호출 시 auth.jwt()가 없을 수 있으므로 email 가드 대신 권한 제어만 적용)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'aggregate_daily_stats'
  ) THEN
    -- aggregate_daily_stats는 cron/service_role 전용이므로 JWT email 가드는 넣지 않음.
    -- REVOKE는 섹션 1에서 이미 처리됨.
    NULL;
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. increment_view_count — slug 단위 1분 중복 호출 차단 (최소 rate limit)
--
-- 주의: 이 가드는 같은 slug에 대한 전체 호출 빈도를 체크하며,
--   세션/IP 단위 구분은 하지 않음. 더 정밀한 rate limit은 별도 PR 필요.
-- TODO(#후속PR): IP/세션 기반 rate limit 또는 Supabase Edge Function rate limit 도입 검토
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_view_count(slug_input text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- slug 단위 1분 이내 중복 호출 차단 (최소 rate limit)
  -- 동일 slug에 대해 1분 내에 이미 기록이 있으면 즉시 반환
  IF EXISTS (
    SELECT 1
    FROM public.post_view_logs
    WHERE slug = slug_input
      AND viewed_at > NOW() - INTERVAL '1 minute'
    LIMIT 1
  ) THEN
    RETURN;
  END IF;

  -- 1. Upsert into post_views (Stats aggregation)
  INSERT INTO public.post_views (slug, view_count, updated_at)
  VALUES (slug_input, 1, NOW())
  ON CONFLICT (slug)
  DO UPDATE SET
    view_count = post_views.view_count + 1,
    updated_at = NOW();

  -- 2. Log the individual view event (History tracking)
  INSERT INTO public.post_view_logs (slug, viewed_at)
  VALUES (slug_input, NOW());
END;
$$;

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
-- 1. Admin 페이지 클라이언트 코드:
--    현재 domain/analytics/repository.ts 의 getAllPostStats(), getAllPostsTrends(),
--    getPostHourlyDistribution(), getPostDowDistribution() 함수들이
--    anon key(브라우저)로 Supabase RPC를 직접 호출함.
--    이 마이그레이션 적용 후 해당 RPC들은 service_role 에서만 실행 가능하므로
--    Admin 어드민 기능이 브라우저에서 동작하지 않음.
--    해결 방안:
--      a) Next.js API Route (서버사이드)에서 service_role key로 RPC 호출
--      b) 또는 Supabase Edge Function (server-side) 경유
--      c) 또는 auth.jwt()->>'email' 체크를 활용해 authenticated role에도
--         조건부 GRANT (보안 수준 낮아짐 — 권장하지 않음)
-- 2. increment_post_views 두 시그니처 정리 (위 섹션 5 참조)
-- 3. IP/세션 기반 rate limit 도입 (섹션 3 참조)
