-- =============================================================================
-- Migration: 마이그레이션이 만들지 않은 고아 analytics 함수 정리
-- =============================================================================
--
-- 배경:
--   프로덕션(ref anbofhnldllmivlovyqb)에는 이 저장소의 마이그레이션이 만든 적
--   없는 public 함수 7개(시그니처 8개)가 남아 있다. 출처는 2025-06-23 대시보드
--   SQL 에디터 스니펫 "Analytics System Migration"으로, 커밋 294c04e에서 지운
--   apps/blog/web/supabase/production_migration.sql 과 바이트 단위로 같다.
--   `supabase db push` 없이 대시보드에 붙여넣어 적용해 온 것이 드리프트의 원인.
--
--   8개는 전부 이미 깨져 있다. 참조 대상인 post_analytics · daily_post_stats
--   테이블과 옛 post_view_logs 컬럼(visitor_id · view_hour · view_day_of_week)이
--   프로덕션에 없다. plpgsql/sql 함수는 테이블 참조를 호출 시점에 풀기 때문에
--   본문만 남아 있는 상태이고, 부르면 전부 에러다.
--
--   프로덕션 실측 방법(2026-08-17) — 공개 anon key 로 PostgREST 를 찔러 확인했다.
--   에러 코드가 존재 여부를 구분해 준다:
--     - 고아 함수 6개(읽기 전용만 호출)  → 42501   = 있지만 anon 은 못 부름
--     - 이미 DROP 된 get_views_summary   → PGRST202 = 스키마 캐시에 없음
--     - post_analytics/daily_post_stats  → PGRST205 = 테이블 없음
--     - post_view_logs.id/slug/viewed_at → 42501   = 컬럼 있음(권한만 거부)
--     - post_view_logs.visitor_id 등     → 42703   = 컬럼 없음
--   42501 이 나온다는 것 자체가 20260524120000 lockdown 이 이미 적용됐다는 뜻이다.
--
--   호출처도 없다:
--     - 앱은 publicClient 로 increment_view_count 하나만 부른다
--     - admin 은 Edge Function admin-analytics 경유로 get_all_post_stats /
--       get_all_posts_trends / get_post_hourly_distribution /
--       get_post_dow_distribution 4개만 부른다 (전부 로컬 마이그레이션 소유)
--
--   back-fill(로컬에 되살리기)은 294c04e 에서 의도적으로 버린 스키마를 부활시키는
--   반대 방향이라 택하지 않는다. 20260524120000_lockdown_admin_rpcs.sql 의
--   5절 TODO 와 후속작업 3번이 이 건이고, 거기 적힌 "Phase 2에서 실제 dump body
--   보존" 계획은 대상 테이블이 이미 없어 성립하지 않는다.
--
-- 안전성:
--   모든 블록이 pg_proc / pg_trigger / cron.job 을 조회해 있는 것만 건드린다.
--   → 로컬(supabase db reset 직후)에는 대상이 없어 전부 no-op. 재실행도 안전.
--   → CASCADE 를 쓰지 않는다. 예상 못 한 의존 객체가 있으면 조용히 딸려 지워지는
--     대신 여기서 실패해야 한다.
--
-- ⚠️ increment_post_views 와 increment_view_count 는 다른 함수다.
--    앞의 것이 지우는 대상, 뒤의 것이 지금 쓰는 조회수 카운터다.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. aggregate_daily_stats 를 부르는 pg_cron 잡 해제
-- -----------------------------------------------------------------------------
-- 함수가 이미 깨져 있으므로 잡이 있다면 매일 실패하고 있었다. 함수를 먼저 지우면
-- 잡만 남아 계속 실패하므로 순서상 여기가 먼저다.
-- pg_cron 미설치 환경(로컬)에서는 통째로 skip.
-- jobname 은 NULL 일 수 있으므로(무명 잡) 항상 존재하는 jobid 로 해제한다.
DO $$
DECLARE
  j record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron 미설치 — cron 정리 skip';
    RETURN;
  END IF;

  FOR j IN
    EXECUTE $q$
      SELECT jobid, coalesce(jobname, '(무명)') AS label, schedule, command
      FROM cron.job
      WHERE command ILIKE '%aggregate_daily_stats%'
         OR command ILIKE '%increment_post_views%'
    $q$
  LOOP
    RAISE NOTICE 'cron 잡 해제: jobid=% name=% schedule=% command=%',
      j.jobid, j.label, j.schedule, j.command;
    EXECUTE format('SELECT cron.unschedule(%s)', j.jobid);
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. set_view_analytics_columns 트리거 · 트리거 함수 정리
-- -----------------------------------------------------------------------------
-- post_view_logs 에 view_date/view_hour/view_day_of_week/view_month/view_year 를
-- 채우던 BEFORE INSERT OR UPDATE 트리거.
--
-- 프로덕션 실측(2026-08-17): post_view_logs 는 저장소 마이그레이션이 만든
-- 3컬럼(id·slug·viewed_at) 모양이고, 옛 13컬럼은 남아 있지 않다. 트리거가
-- 붙어 있었다면 NEW.view_hour 대입에서 매 조회마다 increment_view_count 가
-- 통째로 실패했을 텐데 post_views 는 정상 갱신 중이다 → 트리거는 없다.
-- 함수만 미부착으로 남아 있을 수 있어 아래에서 함께 정리한다.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tg.tgname, c.relname
    FROM pg_trigger tg
    JOIN pg_class c ON c.oid = tg.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = tg.tgfoid
    WHERE n.nspname = 'public'
      AND NOT tg.tgisinternal
      AND p.proname = 'set_view_analytics_columns'
  LOOP
    RAISE NOTICE '트리거 제거: %.% 의 %', 'public', t.relname, t.tgname;
    EXECUTE format('DROP TRIGGER %I ON public.%I', t.tgname, t.relname);
  END LOOP;
END;
$$;

DO $$
DECLARE
  args text;
BEGIN
  FOR args IN
    SELECT pg_get_function_identity_arguments(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'set_view_analytics_columns'
  LOOP
    RAISE NOTICE '트리거 함수 제거: set_view_analytics_columns(%)', args;
    EXECUTE format('DROP FUNCTION public.set_view_analytics_columns(%s)', args);
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. 고아 analytics 함수 DROP (오버로드 포함 전 시그니처)
-- -----------------------------------------------------------------------------
-- 이름 목록은 고정, 시그니처는 pg_proc 에서 실제 값을 읽어 쓴다. 대시보드에서
-- 만들어진 함수라 시그니처를 추정하면 틀릴 수 있고, increment_post_views 는
-- 오버로드가 2개다.
DO $$
DECLARE
  fname text;
  args  text;
  n     int := 0;
BEGIN
  FOR fname IN VALUES
    ('aggregate_daily_stats'),
    ('get_daily_view_trend'),
    ('get_hourly_traffic_pattern'),
    ('get_monthly_view_trend'),
    ('get_popular_posts'),
    ('get_weekly_traffic_pattern'),
    ('increment_post_views')
  LOOP
    FOR args IN
      SELECT pg_get_function_identity_arguments(p.oid)
      FROM pg_proc p
      JOIN pg_namespace n2 ON n2.oid = p.pronamespace
      WHERE n2.nspname = 'public' AND p.proname = fname
    LOOP
      RAISE NOTICE '함수 제거: %(%)', fname, args;
      EXECUTE format('DROP FUNCTION public.%I(%s)', fname, args);
      n := n + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE '제거한 시그니처 수: %', n;
END;
$$;
