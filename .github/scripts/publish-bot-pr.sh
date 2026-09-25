#!/usr/bin/env bash
# 예약 Claude 잡(읽기 전용)이 내보낸 패치를 LLM 없이 검사해 PR로 올린다. 쓰기 권한은 여기에만 있다.
# ALLOWED_PATHS 안 기존 파일의 수정만, 그 안에서도 레지스트리 버전·overrides·catalog류만 받는다(2-b).
# 제목·본문은 데이터로만 쓰고(--body-file) 커밋에 트레일러를 붙이지 않는다(AGENTS.md §5).
#
# 입력(환경 변수):
#   OUT_DIR        아티팩트를 내려받은 디렉터리(저장소 밖)
#   NAME           `$NAME.patch`·`$NAME-title.txt`·`$NAME-body.md`·`$NAME-comment.md`의 접두어
#   BRANCH_PREFIX  이 봇이 연 같은 접두어의 열린 PR이 있으면 새 PR 대신 코멘트만 남긴다
#   ALLOWED_PATHS  변경을 허용할 경로의 확장 정규식(bash `=~`)
#   DEFAULT_TITLE  제목 파일이 비었을 때 쓸 PR 제목
#   BASE_BRANCH    PR 기준 브랜치(기본 main)
#   CI_WORKFLOW    PR을 연 뒤 workflow_dispatch로 부를 워크플로(GITHUB_TOKEN이 연 PR엔 pull_request가 안 돈다)
#   GH_TOKEN       contents·pull-requests(·actions) write 토큰
#
# 이 파일을 고치면 `bash .github/scripts/publish-bot-pr.test.sh`를 손으로 돌릴 것(CI가 부르지 않는다).
set -euo pipefail
export LC_ALL=C.UTF-8

: "${OUT_DIR:?}" "${NAME:?}" "${BRANCH_PREFIX:?}" "${ALLOWED_PATHS:?}" "${DEFAULT_TITLE:?}"
BASE_BRANCH="${BASE_BRANCH:-main}"
export BRANCH_PREFIX

patch="$OUT_DIR/$NAME.patch"
title_file="$OUT_DIR/$NAME-title.txt"
body_file="$OUT_DIR/$NAME-body.md"
comment_file="$OUT_DIR/$NAME-comment.md"

# GitHub 본문 한계(65,536자)를 넘기면 gh가 거부한다.
MAX_BODY_BYTES=60000
clip() {
  local src="$1" dest="$2"
  if (($(wc -c <"$src") > MAX_BODY_BYTES)); then
    head -c "$MAX_BODY_BYTES" -- "$src" >"$dest"
    printf '\n\n…(길이 제한으로 잘렸습니다. 전체는 워크플로 아티팩트에 있습니다.)\n' >>"$dest"
  else
    cp -- "$src" "$dest"
  fi
}

summary() {
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    printf '%s\n' "$@" >>"$GITHUB_STEP_SUMMARY"
  fi
}

# 1) 열린 봇 PR이 있으면 코멘트만 남긴다. 포크 PR도 브랜치 이름을 흉내 낼 수 있어 이 봇·이 저장소 것만 센다.
existing="$(
  gh pr list --state open --limit 100 --author app/github-actions \
    --json number,headRefName,isCrossRepository \
    --jq '[.[] | select((.isCrossRepository | not) and (.headRefName | startswith(env.BRANCH_PREFIX)))][0].number // empty'
)"
if [[ -n "$existing" ]]; then
  note="$comment_file"
  [[ -s "$note" ]] || note="$body_file"
  if [[ -s "$note" ]]; then
    clip "$note" "$RUNNER_TEMP/$NAME-note.md"
    gh pr comment "$existing" --body-file "$RUNNER_TEMP/$NAME-note.md"
    echo "열린 PR #$existing 에 이번 점검 결과를 코멘트로 남겼다(패치는 적용하지 않는다)"
    summary "열린 PR #$existing 에 코멘트를 남겼다."
  else
    echo "열린 PR #$existing 이 있고 남길 요약도 없다 — 아무것도 하지 않는다"
  fi
  exit 0
fi

if [[ ! -s "$patch" ]]; then
  echo "변경 없음 — PR을 만들지 않는다"
  summary "변경 없음 — PR을 만들지 않았다."
  exit 0
fi

# 2) 패치 검사. 적용 전에 전부 본다.
changes="$(git apply --summary -- "$patch")"
if [[ -n "$changes" ]]; then
  echo "::error::패치에 파일 생성·삭제·이름 변경·모드 변경이 들어 있다. 기존 파일 수정만 허용한다."
  printf '%s\n' "$changes"
  exit 1
fi

count=0
rejected=0
paths=()
while IFS= read -r -d '' record; do
  # --numstat -z 레코드: "<추가>\t<삭제>\t<경로>" (이름 변경은 위에서 이미 걸렀다)
  path="${record#*$'\t'}"
  path="${path#*$'\t'}"
  count=$((count + 1))
  paths+=("$path")
  if [[ "/$path/" == *"/../"* || "/$path/" == *"/./"* || "/$path/" == *"/.git/"* ]] ||
    [[ ! "$path" =~ $ALLOWED_PATHS ]]; then
    echo "::error::허용 목록 밖의 경로를 고치는 패치다: $path"
    rejected=1
  fi
done < <(git apply --numstat -z -- "$patch")

if ((count == 0)); then
  echo "::error::패치 파일은 비어 있지 않은데 고치는 파일이 없다 — 형식이 깨졌다"
  exit 1
fi
if ((rejected)); then
  exit 1
fi

# 2-b) 내용 검사: 허용된 파일에도 postinstall·tarball/git resolution·pnpmfile 같은 코드 실행 경로를 심을 수 있다.
# 임시 인덱스에서만 본다. 아래 함수는 `||`·`if` 안에서 부르지 말 것 — set -e가 꺼져 git 실패가 통과로 보인다.
scratch="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/publish-bot-pr.XXXXXX")"
trap 'rm -rf -- "$scratch"' EXIT
check_index="$scratch/index"
GIT_INDEX_FILE="$check_index" git read-tree HEAD
GIT_INDEX_FILE="$check_index" git apply --cached -- "$patch"

old_blob() { git cat-file blob "HEAD:$1"; }
new_blob() { GIT_INDEX_FILE="$check_index" git cat-file blob ":$1"; }

# 레지스트리 밖 스펙. 콜론 뒤가 공백이면 키(`vfile: 6.0.3`)다. 역슬래시는 YAML 이스케이프
# 우회(`"\x66ile:…"`)라 통째로 막는다.
EXTERNAL_SPEC_RE='(https?|ssh|git|file|link|github|gitlab|bitbucket|gist|npm|jsr|workspace|runtime)(\+[a-z]+)?:[^[:space:]]|git\+|tarball|type:[[:space:]]*["'"'"']?(git|directory)|[{,][[:space:]]*(repo|commit|directory):|[\\]'
# 설치 중 코드를 돌리거나 빌드 스크립트·패치를 허용하는 설정 키.
BUILD_KEY_RE='(^|[[:space:]{,"'"'"'])([a-z]*pnpmfile[a-z]*|configDependencies|allowBuilds|onlyBuiltDependencies[a-z]*|neverBuiltDependencies|ignoredBuiltDependencies|dangerouslyAllowAllBuilds|patchedDependencies|packageExtensions[a-z]*)["'"'"']?[[:space:]]*:'

# $1 경로, $2 검사에서 뺄 줄의 정규식. 추가된 줄(-U0: 문맥 줄 없음)만 본다.
scan_added() {
  local hits
  GIT_INDEX_FILE="$check_index" git diff --cached --no-ext-diff --no-textconv --no-color \
    -U0 HEAD -- "$1" | awk '/^@@ /{hunk = 1; next} hunk && /^\+/{print substr($0, 2)}' \
    >"$scratch/added.txt"
  hits="$(grep -v -E -e "$2" -- "$scratch/added.txt" | grep -i -E -e "$EXTERNAL_SPEC_RE" -e "$BUILD_KEY_RE" || true)"
  if [[ -n "$hits" ]]; then
    echo "::error::$1 에 레지스트리 밖을 가리키는 스펙이나 빌드·훅 설정 키가 추가됐다:"
    printf '%s\n' "$hits" | cut -c1-200
    rejected=1
  fi
}

# package.json: 버전 맵 밖은 그대로, 맵 안은 기존 이름의 값만 레지스트리 범위·catalog:로 바뀔 수 있다
# (새 이름은 bin 이름으로 turbo·vitest를 가로챌 수 있다).
# shellcheck disable=SC2016 # jq 프로그램이다 — $는 jq 변수다.
PKG_JSON_CHECK='
  def rest: del(.dependencies, .devDependencies, .peerDependencies, .optionalDependencies);
  def registry_spec:
    test("^catalog:[A-Za-z0-9._-]*$")
    or (test("^[0-9A-Za-z.*^~<>=| +-]+$")
        and (test("^\\s*\\.") | not)
        and (test("\\.t(gz|ar)"; "i") | not));
  if ($old | length) != 1 or ($new | length) != 1
     or ($old[0] | type) != "object" or ($new[0] | type) != "object" then
    "JSON 객체 하나가 아니다"
  else
    $old[0] as $a | $new[0] as $b
    | (if ($a | rest) != ($b | rest)
       then "의존성 버전 맵 밖(scripts·pnpm·packageManager 등)이 바뀌었다" else empty end),
      ( ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies") as $m
        | ($a[$m] // {}) as $prev
        | ($b[$m] // {}) | to_entries[] | .key as $k | .value as $v
        | if ($prev | has($k) | not) then "\($m).\($k): 새 의존성 이름은 받지 않는다"
          elif $prev[$k] == $v then empty
          elif ($v | type) != "string" or ($v | registry_spec | not)
          then "\($m).\($k): 레지스트리 버전 범위가 아니다: \($v | tojson)"
          else empty end )
  end'

# pnpm-workspace.yaml의 허용 블록 밖을 뽑는다. 0열 비주석 줄이 새 블록이라 사이에 끼운 최상위 키도 잡힌다.
workspace_rest() {
  awk 'BEGIN { keep = 1 }
    /^[^[:space:]#]/ { keep = ($0 !~ /^(overrides|catalog|catalogs|auditConfig):[[:space:]]*(#.*)?$/) }
    keep'
}

for path in "${paths[@]}"; do
  case "/$path" in
    */package.json)
      old_blob "$path" >"$scratch/old.json"
      new_blob "$path" >"$scratch/new.json"
      problems="$(jq -n -r --slurpfile old "$scratch/old.json" --slurpfile new "$scratch/new.json" "$PKG_JSON_CHECK")"
      if [[ -n "$problems" ]]; then
        while IFS= read -r problem; do
          echo "::error::$path: $problem"
        done <<<"$problems"
        rejected=1
      fi
      ;;
    */pnpm-workspace.yaml)
      old_blob "$path" | workspace_rest >"$scratch/old.yaml"
      new_blob "$path" | workspace_rest >"$scratch/new.yaml"
      if ! cmp -s -- "$scratch/old.yaml" "$scratch/new.yaml"; then
        echo "::error::$path: overrides·catalog·catalogs·auditConfig 밖의 설정이 바뀌었다"
        diff -- "$scratch/old.yaml" "$scratch/new.yaml" | head -n 20 || true
        rejected=1
      fi
      # 주석 줄은 advisory URL 같은 설명을 담을 수 있으므로 빼고 본다.
      scan_added "$path" '^[[:space:]]*#'
      ;;
    */pnpm-lock.yaml)
      # deprecated는 레지스트리가 준 안내문이라 URL이 흔하다. 해석에는 쓰이지 않는다.
      scan_added "$path" '^[[:space:]]+deprecated:[[:space:]]'
      ;;
  esac
done
if ((rejected)); then
  exit 1
fi

git apply --check -- "$patch"
git apply -- "$patch"

while IFS= read -r -d '' entry; do
  state="${entry:0:2}"
  path="${entry:3}"
  if [[ "$state" != " M" || ! "$path" =~ $ALLOWED_PATHS ]]; then
    echo "::error::적용 뒤 예상 밖의 변경: [$state] $path"
    exit 1
  fi
done < <(git status --porcelain=v1 -z --untracked-files=all)

# 3) 제목·본문. 모델 출력이므로 한 줄로 정리하고 길이를 자른다.
title=""
if [[ -s "$title_file" ]]; then
  title="$(head -n 1 -- "$title_file" | tr '\000-\037\177' ' ')"
  title="${title#"${title%%[![:space:]]*}"}"
  title="${title%"${title##*[![:space:]]}"}"
  title="${title:0:100}"
fi
[[ -n "$title" ]] || title="$DEFAULT_TITLE"

body_out="$RUNNER_TEMP/$NAME-pr-body.md"
if [[ -s "$body_file" ]]; then
  clip "$body_file" "$body_out"
else
  printf '%s\n' "Claude가 본문을 남기지 않았습니다. 변경 내용은 diff를 보세요." >"$body_out"
fi

# 4) 커밋·푸시·PR(pnpm install을 안 해 hook도 없다). re-run은 실행 번호가 같아 시도 번호를 붙인다.
branch="${BRANCH_PREFIX}$(TZ=Asia/Seoul date +%Y%m%d)-${GITHUB_RUN_NUMBER:-0}"
if ((${GITHUB_RUN_ATTEMPT:-1} > 1)); then
  branch="$branch-${GITHUB_RUN_ATTEMPT}"
fi
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git switch -c "$branch"
git commit -q -a -m "$title"
git push -q origin "HEAD:refs/heads/$branch"

if ! pr_url="$(gh pr create --base "$BASE_BRANCH" --head "$branch" --title "$title" --body-file "$body_out" 2>&1)"; then
  echo "::error::브랜치 $branch 는 올렸지만 PR을 열지 못했다: $pr_url"
  echo "GITHUB_TOKEN으로 PR을 열려면 Settings → Actions → General의"
  echo "'Allow GitHub Actions to create and approve pull requests'가 켜져 있어야 한다."
  echo "수동으로 열기: ${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/compare/$BASE_BRANCH...$branch"
  exit 1
fi
echo "PR: $pr_url"
summary "PR을 열었다: $pr_url"

if [[ -n "${CI_WORKFLOW:-}" ]]; then
  if gh workflow run "$CI_WORKFLOW" --ref "$branch"; then
    echo "$CI_WORKFLOW 를 $branch 로 실행했다"
  else
    echo "::warning::$CI_WORKFLOW 실행에 실패했다. PR을 닫았다 다시 열면 CI가 돈다."
  fi
fi
