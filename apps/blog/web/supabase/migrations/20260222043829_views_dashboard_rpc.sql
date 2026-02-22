-- Create get_views_summary function to return total views
create or replace function public.get_views_summary()
returns bigint
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(view_count), 0)::bigint from public.post_views;
$$;

-- Secure the function permissions
revoke execute on function public.get_views_summary() from public;
grant execute on function public.get_views_summary() to authenticated, service_role;


-- Create get_views_trend function to return views grouped by day for the last 7 days
create or replace function public.get_views_trend()
returns table (
  view_date date,
  view_count bigint
)
language sql
security definer
set search_path = public
as $$
  select 
    date_trunc('day', viewed_at)::date as view_date, 
    count(*)::bigint as view_count
  from public.post_view_logs
  where viewed_at > now() - interval '7 days'
  group by view_date
  order by view_date asc;
$$;

-- Secure the function permissions
revoke execute on function public.get_views_trend() from public;
grant execute on function public.get_views_trend() to authenticated, service_role;
