-- admin 일별 추이(Edge Function action `all_posts_trends`)를 RPC 한 번으로 받게 get_posts_trends 를 만든다.
--
-- get_all_posts_trends() 는 RETURNS TABLE 이라 PostgREST max_rows(1000)에 잘린다. 그래서 Edge Function 이
-- offset 으로 1000행씩 순차 호출했다(2026-10 프로덕션 3,012행 → 4번). 함수가 SECURITY DEFINER 라 인라인되지
-- 않아 페이지마다 365일 GROUP BY 전체를 다시 계산한다(로컬 EXPLAIN: 네 장 모두 Function Scan 3,014행).
-- 새 함수는
--   - slug 목록을 RPC 인자(POST 본문)로 받아 함수 안에서 거르고,
--   - 기간 조건을 viewed_at 자체에 걸어 (slug, viewed_at) 인덱스의 범위 조건이 되게 하고,
--   - 결과를 json 배열 하나로 돌려줘 max_rows 가 걸리지 않는다(스칼라 반환은 한 행이다).
-- 행 모양(slug, view_date, view_count)·정렬(slug, view_date)·KST 날짜 경계는 get_all_posts_trends 와 같다.
-- 두 함수의 결과가 같다는 것은 src/lib/platform/migrations.test.ts 가 PGlite 에서 잠근다.
--
-- slug 조건을 `slugs is null or slug = any(slugs)` 로 쓰지 않는 이유: PG17 의 SQL 함수 본문은 인자를 모르는
-- generic plan 으로 계획돼 OR 를 접지 못하고, 로컬 7,813행에서 Seq Scan + 정렬(17ms)이 된다.
-- `slug = any(coalesce(slugs, …))` 는 두 경우 모두 Index Only Scan 이고(7~9ms), slugs 를 주면 coalesce 의
-- 두 번째 항(InitPlan)은 실행되지 않는다(EXPLAIN ANALYZE: never executed).
--
-- get_all_posts_trends 는 지우지 않는다. 마이그레이션(supabase-migrations.yml, main push)과 Edge Function
-- 배포(수동 `supabase functions deploy admin-analytics`)는 따로 나간다 — 이 마이그레이션이 먼저 적용되고,
-- 배포돼 있는 함수는 새 함수를 배포할 때까지 옛 RPC 를 부른다. 옛 RPC 는 새 함수 배포를 확인한 뒤 후속
-- 마이그레이션에서 지운다(그때 응답 행 타입의 출처 — adminActions.ts 의 ADMIN_ACTION_RPC — 도 옮긴다).

create or replace function public.get_posts_trends(slugs text[] default null)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(json_agg(t order by t.slug, t.view_date), '[]'::json)
  from (
    select
      l.slug,
      (l.viewed_at at time zone 'Asia/Seoul')::date as view_date,
      count(*)::bigint as view_count
    from public.post_view_logs l
    -- slugs 가 null 이면 기록이 있는 모든 slug(= 거르지 않음).
    where l.slug = any (coalesce(slugs, array(select distinct p.slug from public.post_view_logs p)))
      -- KST 기준 365일 전 날짜의 00:00(KST)부터. get_all_posts_trends 의
      -- `(viewed_at at time zone 'Asia/Seoul')::date >= (now() at time zone 'Asia/Seoul' - interval '365 days')::date`
      -- 와 같은 행을 고르되, 열에 식을 씌우지 않아 인덱스 범위 조건이 된다.
      and l.viewed_at >= (((now() at time zone 'Asia/Seoul') - interval '365 days')::date)::timestamp
                         at time zone 'Asia/Seoul'
    group by 1, 2
  ) t;
$$;

-- admin RPC 는 service_role(Edge Function)만 부른다 — AGENTS.md §7 "Analytics RPC 는 anon 에 잠겨 있다".
-- 새 함수는 PUBLIC 에 EXECUTE 가 기본으로 붙고, Supabase 기본 권한이 anon·authenticated 에도 줄 수 있어
-- 셋 다에서 명시적으로 뺀다.
revoke all on function public.get_posts_trends(text[]) from public, anon, authenticated;
grant execute on function public.get_posts_trends(text[]) to service_role;
