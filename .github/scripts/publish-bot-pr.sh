#!/usr/bin/env bash
# Claude가 **읽기 전용 잡**에서 만든 변경을 결정적으로 검사해 PR로 올린다.
#
# 왜 이렇게 나눴나:
#   예약 Claude 잡(claude-deps-audit·claude-link-rot)은 WebFetch/WebSearch/curl로
#   신뢰할 수 없는 외부 페이지를 읽는다. 예전에는 같은 잡이 쓰기 토큰까지 들고
#   있어서, 프롬프트 인젝션 한 번이면 `pnpm dlx`·git hook 같은 경로로 임의 코드가
#   쓰기 권한을 쥐었다. 이제 Claude 잡은 읽기 전용 GITHUB_TOKEN만 받고 변경을
#   패치 파일로 내보내기만 한다. 쓰기 권한은 LLM이 없는 이 스크립트에만 있다.
#
# 이 스크립트가 지키는 것:
#   - 패치가 **허용 목록(ALLOWED_PATHS) 안의 기존 파일 수정**만 담는지. 파일 생성·
#     삭제·이름 변경·모드 변경(심링크 포함)은 거부한다. 워크플로·스크립트·설정을
#     건드리는 패치는 여기서 멈춘다.
#   - 제목·본문은 **데이터로만** 쓴다(셸에 끼워 넣지 않고 --body-file로 넘긴다).
#   - 커밋에 트레일러를 붙이지 않는다(AGENTS.md §5).
#
# 입력(환경 변수):
#   OUT_DIR        Claude 잡이 올린 아티팩트를 내려받은 디렉터리(저장소 밖)
#   NAME           파일 접두어. `$NAME.patch`, `$NAME-title.txt`, `$NAME-body.md`,
#                  `$NAME-comment.md`를 읽는다
#   BRANCH_PREFIX  브랜치 접두어(예: claude/deps-audit-). 같은 접두어의 열린 PR이
#                  있으면 새 PR 대신 그 PR에 코멘트만 남긴다
#   ALLOWED_PATHS  변경을 허용할 경로의 확장 정규식(bash `=~`)
#   DEFAULT_TITLE  제목 파일이 비었을 때 쓸 PR 제목
#   BASE_BRANCH    PR 기준 브랜치(기본 main)
#   CI_WORKFLOW    PR을 연 뒤 이 브랜치로 수동 실행할 워크플로 파일(예: ci.yml)
#   GH_TOKEN       contents·pull-requests(·actions) write 권한의 토큰
#
# GITHUB_TOKEN으로 연 PR에는 pull_request 워크플로가 돌지 않는다(GitHub의 재귀 방지
# 규칙). 그래서 CI_WORKFLOW를 workflow_dispatch로 직접 부른다 — 체크는 커밋에
# 붙으므로 PR의 required check(`Lint / Types / Tests`)도 그 실행으로 채워진다.
set -euo pipefail
export LC_ALL=C.UTF-8

: "${OUT_DIR:?}" "${NAME:?}" "${BRANCH_PREFIX:?}" "${ALLOWED_PATHS:?}" "${DEFAULT_TITLE:?}"
BASE_BRANCH="${BASE_BRANCH:-main}"
export BRANCH_PREFIX

patch="$OUT_DIR/$NAME.patch"
title_file="$OUT_DIR/$NAME-title.txt"
body_file="$OUT_DIR/$NAME-body.md"
comment_file="$OUT_DIR/$NAME-comment.md"

# GitHub 코멘트·본문 한계(65,536자) 아래로 자른다. 넘기면 gh가 거부해 잡이 죽는다.
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

# 1) 같은 접두어의 열린 PR이 있으면 새 PR을 만들지 않고 이번 결과를 코멘트로 남긴다.
existing="$(
  gh pr list --state open --limit 100 --json number,headRefName \
    --jq '[.[] | select(.headRefName | startswith(env.BRANCH_PREFIX))][0].number // empty'
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
while IFS= read -r -d '' record; do
  # --numstat -z 레코드: "<추가>\t<삭제>\t<경로>" (이름 변경은 위에서 이미 걸렀다)
  path="${record#*$'\t'}"
  path="${path#*$'\t'}"
  count=$((count + 1))
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

git apply --check -- "$patch"
git apply -- "$patch"

# 적용 결과도 한 번 더 본다 — 수정(M) 외의 상태가 있으면 멈춘다.
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

# 4) 커밋·푸시·PR. 이 러너에는 git hook이 없다(lefthook은 pnpm install이 깐다).
# 같은 실행을 다시 돌리면(re-run) 실행 번호가 같으므로 시도 번호까지 붙여 이름이
# 겹치지 않게 한다 — 겹치면 non-fast-forward로 푸시가 거부된다.
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
