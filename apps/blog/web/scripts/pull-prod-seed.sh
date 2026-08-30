#!/usr/bin/env bash
#
# 프로덕션 Supabase 의 public 데이터를 supabase/seed.sql 로 당기고, 로컬 DB 에 적용한다.
#
#   pnpm seed:pull              덤프 + 로컬 반영
#   pnpm seed:pull --dump-only  seed.sql 만 갱신 (로컬 리셋 생략)
#
# 스키마는 supabase/migrations/ 가 재현하므로 데이터만 뜬다.
# 링크(supabase/.temp/project-ref)만 있으면 되고 DB 비밀번호는 필요 없다 —
# CLI 가 임시 cli_login_postgres 롤을 만들어 pooler 로 붙는다.
#
set -euo pipefail

cd "$(dirname "$0")/.."

SEED=supabase/seed.sql
# devDependencies 에 고정된 CLI. 맨 `supabase` 는 brew 설치본이 잡히고 그건 업그레이드가 막혀 있다.
CLI=node_modules/.bin/supabase

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

echo "▸ 프로덕션 public 데이터 덤프"
# 덤프가 중간에 죽어도 seed.sql 이 반쯤 덮이지 않도록 임시 파일을 거친다.
"$CLI" db dump --linked --data-only --schema public -f "$TMP"

# seed.sql 은 커밋되는 파일이다(supabase/.gitignore 는 .temp·.branches 만 뺀다).
# --schema 가 어떤 이유로든 새면 auth.users·identities·refresh_tokens·flow_state
# (provider_access_token 컬럼) 까지 담기므로, 파일에 닿기 전에 막는다.
if grep -E '^INSERT INTO ' "$TMP" | grep -qv '^INSERT INTO "public"\.'; then
  echo "✗ public 밖 스키마가 덤프에 섞였다 — $SEED 를 갱신하지 않는다:" >&2
  grep -oE '^INSERT INTO "[a-z_]+"\."[a-z_]+"' "$TMP" | grep -v '^INSERT INTO "public"' | sort -u >&2
  exit 1
fi

# pg_dump 17.5+ 가 붙이는 `-- \restrict <랜덤토큰>` 두 줄을 걷어낸다. CLI 가 이미 주석으로
# 만들어 두어 로더에 아무 영향이 없는데, 토큰은 실행마다 새로 생성돼서 데이터가 한 줄도
# 바뀌지 않은 날에도 커밋되는 이 파일에 diff 를 남긴다.
sed -e '/^-- \\restrict /d' -e '/^-- \\unrestrict /d' "$TMP" > "$SEED"
echo "▸ $SEED 갱신 — 데이터 $(grep -c $'^\t(' "$SEED" || true) 행"

if [[ "${1:-}" == "--dump-only" ]]; then
  echo "  로컬 반영은 건너뛴다 (--dump-only)"
  exit 0
fi

# start 만으로는 seed 가 다시 안 들어간다(새 볼륨일 때만 로드). 갱신하려면 reset 이어야 한다.
if ! docker ps --format '{{.Names}}' | grep -q '^supabase_db_web$'; then
  echo "✗ 로컬 Supabase 가 떠 있지 않다. \`pnpm supabase-start\` 후 다시 실행할 것" >&2
  exit 1
fi

echo "▸ 로컬 DB 리셋 (마이그레이션 재적용 + seed 로드)"
"$CLI" db reset
