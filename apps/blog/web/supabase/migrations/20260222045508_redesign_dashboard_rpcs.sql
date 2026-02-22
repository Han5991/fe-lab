-- Drop previous dashboard RPCs that are no longer needed
drop function if exists public.get_views_summary();
drop function if exists public.get_views_trend();

-- 1. get_all_post_stats: Returns total views and today's views for each post
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
    where l.viewed_at >= date_trunc('day', now())
    group by l.slug
  ) today_logs on today_logs.slug = pv.slug;
$$;

revoke execute on function public.get_all_post_stats() from public;
grant execute on function public.get_all_post_stats() to authenticated, service_role;

-- 2. get_all_posts_trends: Returns daily view counts for the last 30 days for each post
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
    date_trunc('day', viewed_at)::date as view_date, 
    count(*)::bigint as view_count
  from public.post_view_logs
  where viewed_at >= date_trunc('day', now() - interval '30 days')
  group by slug, view_date
  order by slug, view_date asc;
$$;

revoke execute on function public.get_all_posts_trends() from public;
grant execute on function public.get_all_posts_trends() to authenticated, service_role;
