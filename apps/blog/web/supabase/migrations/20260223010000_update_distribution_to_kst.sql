-- KST(Asia/Seoul) 시간대로 변환하여 시간대별/요일별 분포를 계산하도록 RPC 업데이트
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
