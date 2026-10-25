-- get_all_posts_trends() 를 지운다 — admin 추이는 get_posts_trends(20261025000000) 로 받는다.
--
-- Edge Function admin-analytics 는 통계·추이를 action `posts_overview` 하나로 묶으면서 추이를 get_posts_trends
-- 한 번으로 받는다. 옛 RPC 는 RETURNS TABLE 이라 PostgREST max_rows(1000)에 잘려 페이지마다 365일 집계를 다시
-- 하던 함수이고, 이 저장소에서 부르는 곳이 없다(응답 행 타입의 출처였던 database.types.ts 항목과 adminActions.ts
-- 의 대응표도 같은 변경에서 get_posts_trends 쪽으로 옮겼다).
--
-- 배포 순서: 새 함수(action `posts_overview`, 추이는 get_posts_trends — 행 타입은 adminActions.ts 의
-- `PostTrendRow`)가 2026-10-25 운영에 배포돼 admin 요청이 200 으로 도는 것을 Edge 로그로 확인한 뒤에 지운다.
-- 같은 배포에서 지우지 않은 이유는 롤백 경로다 — 새 함수에 문제가 생겨 옛 함수로 되돌릴 때 옛 함수가 부르는
-- 이 RPC 가 남아 있어야 했다. 이 마이그레이션이 적용되면 옛 함수로는 되돌릴 수 없다.
--
-- CASCADE 를 쓰지 않는다 — 의존 객체가 있으면 조용히 딸려 지우지 말고 여기서 실패해야 한다. 이미 없는
-- 환경(재실행)에서는 no-op.

drop function if exists public.get_all_posts_trends();
