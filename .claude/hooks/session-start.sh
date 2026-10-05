#!/usr/bin/env bash
# 클라우드 세션 전용 — 로컬에서는 아무것도 하지 않는다.
# 컨테이너 기본 PATH는 Node 22와 그 옆 pnpm을 잡는데, 이 저장소는 engines가 Node >=24이고
# 그 pnpm을 turbo가 띄우면 "Exec format error"로 죽는다. .tool-versions의 Node·pnpm을
# 맞춰 PATH 앞에 두고(세션의 Bash에도 물려준다) 의존성을 설치한다. 여러 번 불려도 안전하다.
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "$CLAUDE_PROJECT_DIR"
die() { echo "session-start: $*" >&2; exit 1; }

node_version=$(awk '$1 == "nodejs" { print $2 }' .tool-versions)
pnpm_version=$(awk '$1 == "pnpm" { print $2 }' .tool-versions)
[ -n "$node_version" ] && [ -n "$pnpm_version" ] || die ".tool-versions에 nodejs·pnpm 줄이 없다"
export NVM_DIR=/opt/nvm # 클라우드 컨테이너 이미지의 nvm 위치
node_bin="$NVM_DIR/versions/node/v$node_version/bin"

if [ ! -x "$node_bin/node" ]; then
  [ -f "$NVM_DIR/nvm.sh" ] || die "$NVM_DIR/nvm.sh가 없다 — 이미지가 바뀌었으면 NVM_DIR을 고친다"
  set +u # nvm.sh는 set -u 아래에서 깨진다
  . "$NVM_DIR/nvm.sh" --no-use
  nvm install "$node_version" >&2
  set -u
fi
export PATH="$node_bin:$PATH"
if [ "$("$node_bin/pnpm" --version 2>/dev/null || true)" != "$pnpm_version" ]; then
  npm install --global --no-fund --no-audit "pnpm@$pnpm_version" >&2 ||
    die "pnpm@$pnpm_version 전역 설치에 실패했다"
fi

if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  line="export PATH=\"$node_bin:\$PATH\""
  grep -qxF "$line" "$CLAUDE_ENV_FILE" 2>/dev/null || echo "$line" >> "$CLAUDE_ENV_FILE"
fi

pnpm install --frozen-lockfile >&2
