-- Drop the old get_all_posts_trends
drop function if exists public.get_all_posts_trends();

-- Recreate to expand data window to 1 year back (or all time, for safety 365 days is enough for most blogs)
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
  where viewed_at >= date_trunc('day', now() - interval '365 days')
  group by slug, view_date
  order by slug, view_date asc;
$$;

revoke execute on function public.get_all_posts_trends() from public;
grant execute on function public.get_all_posts_trends() to authenticated, service_role;
