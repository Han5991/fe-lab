-- =============================================================================
-- Migration: increment_view_count 가 형식 밖 slug 를 받지 않게 한다
-- =============================================================================
--
-- 배경:
--   increment_view_count(slug_input text) 는 SECURITY DEFINER 이고 anon 이
--   EXECUTE 할 수 있다(공개 키로 조회수를 올리는 정상 경로). 그런데 인자를
--   전혀 검사하지 않아, 공개 anon key 로 `POST /rest/v1/rpc/increment_view_count`
--   를 직접 부르면 길이 제한 없는 임의 문자열이 post_views(공개 읽기) 와
--   post_view_logs(영구 누적) 에 그대로 쌓인다. 클라이언트의 6시간 쿠키는
--   브라우저를 거치지 않는 호출에는 아무 효과가 없다.
--
-- 이 파일이 하는 일 (둘 다 최소 변경):
--   1. 함수 본문 맨 앞에 형식 검사를 넣는다. 통과한 slug 의 동작은 20251228073000
--      본문과 한 글자도 다르지 않다(post_views upsert + post_view_logs insert).
--        - NULL, 공백뿐인 문자열          → 무시
--        - 200자 초과                     → 무시 (현재 가장 긴 slug 는 53자)
--        - 제어 문자(개행·탭 등)            → 무시
--      공백 자체는 막지 않는다. frontmatter `slug:` 가 없는 글은 파일 경로에서
--      slug 를 유도하는데, 파일 이름에 공백이 든 글이 있다.
--   2. post_view_logs (slug, viewed_at) 인덱스를 만든다. 글 상세의 시간대·요일
--      분포 RPC(get_post_hourly_distribution / get_post_dow_distribution)가
--      `where slug = slug_input` 로 이 테이블 전체를 훑고 있었다. 로그는 지우지
--      않고 계속 자라므로 slug 선두 인덱스가 없으면 비용이 행 수에 비례한다.
--
-- 왜 에러가 아니라 조용히 return 하는가:
--   정상 호출자는 블로그 클라이언트(useViewCount) 하나뿐이고, 그쪽은 결과를 기다리지
--   않는 fire-and-forget 이라 에러를 받아도 할 수 있는 일이 콘솔 로그뿐이다. 실제
--   slug 는 위 조건을 전부 만족하므로 정상 경로에서 무시가 일어날 일도 없다.
--   반대로 에러를 돌려주면 직접 호출하는 쪽에 "어떤 입력이 걸리는지" 알려 주는
--   오라클이 된다. 그래서 형식 밖 입력은 아무 일도 없었던 것처럼 끝낸다.
--
-- 이 파일이 막지 못하는 것 (의도적으로 범위 밖):
--   형식이 멀쩡한 가짜 slug(`aaa`, `x1` …)는 여전히 기록된다. 공개 "인기 글"
--   레일이 그런 slug 에 점령되지 않는 것은 앱 쪽 방어다 — getTopPosts 가 빌드에
--   실린 실제 글 slug 로만 서버 필터(`slug=in.(…)`)를 건다. 발행 slug 허용 목록
--   테이블(배포가 동기화)과 IP/세션 단위 rate limit 은 20260524120000 의
--   TODO(#supabase-edge-rate-limit) 그대로 남는다.
--
-- 안전성·되돌리기:
--   - CREATE OR REPLACE 는 기존 ACL 을 유지한다. 그래도 grant 를 아래에서 다시
--     명시한다(20260524120000 와 같은 모양: PUBLIC 회수, anon/authenticated/
--     service_role 에 EXECUTE). 재실행해도 결과가 같다.
--   - 인덱스는 IF NOT EXISTS 라 재실행 안전. CONCURRENTLY 는 쓰지 않는다 —
--     `supabase db push` 가 파일을 트랜잭션 안에서 실행하므로 쓸 수 없다. 이
--     블로그 규모에서는 인덱스 생성 동안의 insert 대기가 순간이다.
--   - 되돌리려면 20251228073000 의 본문으로 CREATE OR REPLACE 하고
--     `drop index if exists public.post_view_logs_slug_viewed_at_idx;` 하면 된다.
-- =============================================================================

create or replace function public.increment_view_count(slug_input text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 형식 밖 slug 는 기록하지 않는다(위 머리 주석: 에러 대신 조용히 무시).
  if slug_input is null
     or btrim(slug_input) = ''
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
