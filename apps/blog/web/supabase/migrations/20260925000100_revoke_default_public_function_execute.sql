-- postgres 가 새로 만드는 함수가 PUBLIC(→ anon) EXECUTE 를 기본으로 갖지 않게 한다. 20260524120000 4절의
-- 스키마 단위 revoke 는 Postgres 내장 기본값(PUBLIC 에 EXECUTE)을 걷지 못해 그 뒤 함수도 anon 이 부를 수 있었다.
-- 전역 형태만 내장 기본값을 대체한다. 기존 함수 ACL 은 그대로이고, anon 이 부를 새 함수는 GRANT 를 직접 적을 것.

alter default privileges for role postgres
  revoke execute on functions from public;
