-- 1. get_post_hourly_distribution: 특정 포스트의 시간대별(0~23시, KST) 조회수 분포
create or replace function public.get_post_hourly_distribution(slug_input text)
returns table (
  hour int,
  view_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    extract(hour from viewed_at at time zone 'Asia/Seoul')::int as hour,
    count(*)::bigint as view_count
  from public.post_view_logs
  where slug = slug_input
  group by hour
  order by hour asc;
$$;

revoke execute on function public.get_post_hourly_distribution(text) from public;
grant execute on function public.get_post_hourly_distribution(text) to authenticated, service_role;

-- 2. get_post_dow_distribution: 특정 포스트의 요일별(0=일~6=토, KST) 조회수 분포
create or replace function public.get_post_dow_distribution(slug_input text)
returns table (
  dow int,
  view_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    extract(dow from viewed_at at time zone 'Asia/Seoul')::int as dow,
    count(*)::bigint as view_count
  from public.post_view_logs
  where slug = slug_input
  group by dow
  order by dow asc;
$$;

revoke execute on function public.get_post_dow_distribution(text) from public;
grant execute on function public.get_post_dow_distribution(text) to authenticated, service_role;

