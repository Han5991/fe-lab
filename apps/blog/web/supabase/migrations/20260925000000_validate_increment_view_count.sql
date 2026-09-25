-- increment_view_count 가 형식 밖 slug(NULL·공백뿐·200자 초과·제어 문자)를 조용히 무시하게 한다.
-- anon 이 부르는 SECURITY DEFINER 라 임의 문자열이 post_views·post_view_logs 에 쌓였다. 에러 대신 return 하는 건
-- 직접 호출자에게 검사 규칙을 알려 주지 않기 위해서다. 공백은 막지 않는다(파일명에서 유도한 slug 에 있다).
-- 상세 분포 RPC 용 (slug, viewed_at) 인덱스도 만든다(db push 가 트랜잭션 안이라 CONCURRENTLY 불가).

create or replace function public.increment_view_count(slug_input text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if slug_input is null
     -- 유니코드 공백(NBSP·전각 공백·제로폭 공백)만으로 된 값도 빈 slug로 본다.
     or slug_input ~ '^[[:space:]\u00A0\u1680\u2000-\u200B\u2028\u2029\u202F\u205F\u3000\uFEFF]*$'
     or char_length(slug_input) > 200
     or slug_input ~ '[[:cntrl:]]'
  then
    return;
  end if;

  -- 1. Upsert into post_views (Stats aggregation)
  insert into public.post_views (slug, view_count, updated_at)
  values (slug_input, 1, now())
  on conflict (slug)
  do update set
    view_count = post_views.view_count + 1,
    updated_at = now();

  -- 2. Log the individual view event (History tracking)
  insert into public.post_view_logs (slug, viewed_at)
  values (slug_input, now());
end;
$$;

revoke all on function public.increment_view_count(text) from public;
grant execute on function public.increment_view_count(text)
  to anon, authenticated, service_role;

create index if not exists post_view_logs_slug_viewed_at_idx
  on public.post_view_logs (slug, viewed_at);
