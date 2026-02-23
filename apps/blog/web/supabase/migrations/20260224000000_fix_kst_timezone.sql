-- Fix all date/time calculations to use KST (Asia/Seoul, UTC+9)
-- 
-- Previously, now() and date_trunc() operated in the database's default timezone (UTC).
-- This caused "today's views" and "daily buckets" to be off by 9 hours for KST users.
-- All timestamps are stored as UTC in the DB; we convert them to KST for grouping/filtering.

-- 1. get_all_post_stats: today_views now reflects KST "today" (00:00 KST ~ now)
create or replace function public.get_all_post_stats()
returns table (
  slug text,
  total_views bigint,
  today_views bigint
)
language sql
security definer
set search_path = public
as $$
  select
    pv.slug,
    pv.view_count as total_views,
    coalesce(today_logs.today_views, 0)::bigint as today_views
  from public.post_views pv
  left join (
    select l.slug, count(*) as today_views
    from public.post_view_logs l
    where l.viewed_at at time zone 'Asia/Seoul'
          >= date_trunc('day', now() at time zone 'Asia/Seoul')
    group by l.slug
  ) today_logs on today_logs.slug = pv.slug;
$$;

revoke execute on function public.get_all_post_stats() from public;
grant execute on function public.get_all_post_stats() to authenticated, service_role;


-- 2. get_all_posts_trends: view_date is now the KST calendar date, window is 365 days back (KST)
create or replace function public.get_all_posts_trends()
returns table (
  slug text,
  view_date date,
  view_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    slug,
    (viewed_at at time zone 'Asia/Seoul')::date as view_date,
    count(*)::bigint as view_count
  from public.post_view_logs
  where (viewed_at at time zone 'Asia/Seoul')::date
        >= (now() at time zone 'Asia/Seoul' - interval '365 days')::date
  group by slug, view_date
  order by slug, view_date asc;
$$;

revoke execute on function public.get_all_posts_trends() from public;
grant execute on function public.get_all_posts_trends() to authenticated, service_role;
