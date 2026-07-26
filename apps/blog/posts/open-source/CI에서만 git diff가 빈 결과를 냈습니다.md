---
title: 'CI에서만 git diff가 빈 결과를 냈습니다 — GitHub Actions shallow clone과 three-dot diff'
date: '2026-07-26'
published: false
slug: 'astryx-shallow-clone-merge-base'
thumbnail: '/og/astryx-shallow-clone-merge-base.png'
---

# CI에서만 git diff가 빈 결과를 냈습니다 — GitHub Actions shallow clone과 three-dot diff

## 이 글을 읽고 나면

- `git diff A..B`와 `git diff A...B`가 왜 다른 답을 내는지, CI에서 어느 쪽을 써야 하는지 구분하게 됩니다
- `actions/checkout`의 기본값 `fetch-depth: 1`이 three-dot diff를 어떻게 깨뜨리는지 직접 재현해 보게 됩니다
- 셸 파이프라인과 `try/catch`가 CI의 치명적 에러를 '조용한 정상'으로 번역해 버리는 두 경로를 보게 됩니다
- 검사가 소리 없이 꺼지지 않도록 fail open 가드를 설계하는 관점을 얻습니다

## 들어가며

CI가 빨간불이면 누구나 봅니다. 문제는 초록불인데 아무 일도 안 한 경우입니다.

facebook/astryx에서 CI를 손보던 중이었습니다. astryx는 메타가 오픈소스로 운영하는 내부 도구용 디자인 시스템입니다. PR을 열 때마다 봇이 PR Analysis Report 코멘트를 답니다. 어느 날 그 코멘트를 다시 봤습니다. 언제나 "No new or modified components detected"였습니다.

같은 화면에서 하나 더 걸렸습니다. 접근성 감사를 도는 `pr-a11y` job이 계속 `skipped`였습니다. 실패가 아니라 skip입니다. 체크는 전부 초록불이고요.

이 글은 그 원인을 추적한 [facebook/astryx#3865](https://github.com/facebook/astryx/pull/3865)의 기록입니다. 워크플로 로직에는 버그가 없었습니다. 범인은 git이었습니다. 정확히는, 3개월 전에 들어온 shallow clone 최적화와 `git diff`의 점 세 개였습니다.

## 증상: 실패가 아니라 '변경 없음'이라고 말하는 두 곳

머지 직전 시점을 기준으로 CI 워크플로 실행을 훑었습니다. PR 이벤트로 돌아간 최근 실행 15건을 뽑아 `pr-a11y` job의 결론만 봤습니다.

```bash
gh api "repos/facebook/astryx/actions/runs/$id/jobs" \
  --jq '.jobs[] | select(.name|test("a11y")) | "\(.name)=\(.conclusion)"'
```

결과는 이랬습니다.

| 구간 | pr-a11y success | skipped |
|---|---|---|
| 수정 전 (최근 실행 15건 샘플) | 0건 | 14건 |

한 건은 해당 job 자체가 목록에 없었습니다. 나머지는 전부 skip. **접근성 감사가 실행된 적이 한 번도 없었습니다.**

증상은 둘인데 원인은 하나였습니다. `check-components` job은 컴포넌트가 바뀌었는지 판단해 `pr-a11y`를 켜고 끕니다. `analyze-pr.js`는 바뀐 컴포넌트를 모아 PR 리포트를 씁니다. 두 코드가 같은 한 줄에 기대고 있었습니다.

```bash
git diff --name-only origin/main...HEAD
```

점이 세 개입니다.

## `..`와 `...`는 서로 다른 질문입니다

이 둘을 같은 것으로 알고 계셨다면, 여기서 잠깐 멈추셔도 좋습니다. 저도 이번에 다시 배웠습니다.

- `git diff A..B` — **A의 끝과 B의 끝을 비교합니다.** 두 스냅샷의 차이입니다.
- `git diff A...B` — **A와 B의 merge base부터 B까지를 비교합니다.** "B가 갈라져 나온 뒤에 한 일"입니다.

말로만 보면 비슷합니다. 직접 만들어 보면 다릅니다. 아래는 실제로 돌린 것입니다. main이 10커밋 있고, PR 브랜치가 거기서 갈라져 Button만 고칩니다. 그 사이 main은 Card를 추가하고 커밋 하나를 더 쌓습니다.

```bash
git init -q --bare origin.git
git init -q work && cd work
mkdir -p packages/core/src/Button packages/core/src/Card docs
for i in $(seq 1 10); do
  echo "line $i" >> docs/history.md
  git add -A && git commit -qm "main: commit $i"
done
FORK=$(git rev-parse HEAD)

# fork 이후에도 main은 계속 전진합니다
echo 'export const Card = () => null;' > packages/core/src/Card/Card.tsx
git add -A && git commit -qm "main: add Card"
echo "line 11" >> docs/history.md && git add -A && git commit -qm "main: commit 11"

# PR 브랜치는 옛날 main에서 갈라져 Button만 고칩니다
git checkout -q -b pr "$FORK"
echo 'export const Button = () => null;' > packages/core/src/Button/Button.tsx
git add -A && git commit -qm "pr: modify Button"

git remote add origin ../origin.git && git push -q origin main pr
```

히스토리는 이렇게 갈라져 있습니다.

```
* 52d24dc main: commit 11
* 2f0048a main: add Card
| * 4b0d902 pr: modify Button
|/
* 499025d main: commit 10
```

이제 같은 저장소에서 점 두 개와 점 세 개를 나란히 돌립니다.

```
$ git diff --name-only main..pr
docs/history.md
packages/core/src/Button/Button.tsx
packages/core/src/Card/Card.tsx

$ git diff --name-only main...pr
packages/core/src/Button/Button.tsx
```

PR이 실제로 건드린 파일은 `Button.tsx` 하나뿐입니다. 그런데 점 두 개는 세 개를 내놓습니다. `docs/history.md`와 `Card.tsx`는 main이 앞서 나가며 만든 변경입니다. 두 tip을 비교하니 그게 전부 "차이"로 잡힙니다. PR 입장에서는 **없앤 것처럼** 보이기까지 합니다.

> CI에서 "이 PR이 무엇을 바꿨나"를 물을 때 정답은 거의 항상 three-dot입니다. main이 전진하는 순간, two-dot은 남의 커밋을 내 PR의 변경으로 오인합니다.

헷갈리기 쉬운 지점을 하나만 덧붙입니다. **`git log`의 `...`는 뜻이 다릅니다.** 같은 저장소에서 확인했습니다.

```
$ git log --oneline main...pr
52d24dc main: commit 11
4b0d902 pr: modify Button
2f0048a main: add Card

$ git log --oneline main..pr
4b0d902 pr: modify Button
```

`git log A...B`는 양쪽의 대칭 차집합입니다. 세 커밋이 다 나옵니다. `git diff`의 `...`와는 다른 의미입니다. 같은 기호가 명령마다 다른 뜻을 갖는, 별로 친절하지 않은 설계입니다.

## shallow clone이 깨뜨리는 정확한 지점

three-dot diff는 merge base를 **계산할 수 있어야** 성립합니다. merge base를 계산하려면 두 브랜치의 공통 조상까지 커밋 그래프가 로컬에 있어야 합니다.

`actions/checkout`의 `fetch-depth` 기본값은 `1`입니다. 액션의 `action.yml`에 그렇게 적혀 있습니다.

```yaml
fetch-depth:
  description: 'Number of commits to fetch. 0 indicates all history for all branches and tags.'
  default: 1
```

커밋 하나. 조상이 없습니다.

이제 CI 환경을 로컬에 재현합니다. 여기서 중요한 디테일이 있습니다. `git clone --depth=1`을 쓰면 안 됩니다. `clone --depth`는 `--single-branch`를 함의해서 base 브랜치 ref가 아예 따라오지 않습니다.

```
$ git clone --depth=1 origin.git cl && cd cl
$ git config --get remote.origin.fetch
+refs/heads/main:refs/remotes/origin/main
```

`actions/checkout`은 이렇게 하지 않습니다. `git init` 후 remote를 붙이고, PR의 커밋 SHA를 `--depth=N`으로 fetch합니다. 그 패턴을 그대로 흉내 냅니다.

```bash
ci() {
  local depth=$1
  mkdir -p "ci$depth" && cd "ci$depth"
  git init -q .
  git remote add origin ../origin.git
  git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"
  git fetch -q --no-tags --prune --depth="$depth" origin "+$PR_SHA:refs/remotes/origin/pr"
  git checkout -q --force -B pr refs/remotes/origin/pr
  # 워크플로의 "Fetch base branch" 스텝
  git fetch -q origin main --depth="$depth"
}
```

`fetch-depth: 1`로 돌린 결과입니다.

```
$ git rev-list --count HEAD
1

$ git diff --name-only origin/main...HEAD
fatal: origin/main...HEAD: no merge base
  (exit 128)

$ git diff --name-only origin/main..HEAD
docs/history.md
packages/core/src/Button/Button.tsx
packages/core/src/Card/Card.tsx
  (exit 0)
```

`fatal: origin/main...HEAD: no merge base`. 종료 코드 128입니다.

그런데 바로 아래 줄을 보십시오. **점 두 개는 depth 1에서도 멀쩡히 성공합니다.** 두 tip의 트리만 있으면 되니까요. 그래서 "shallow clone에서는 diff가 안 된다"가 아닙니다. 정확히는 **히스토리 그래프를 요구하는 연산만** 깨집니다. `git merge-base`도 같은 조건에서 조용히 exit 1로 끝납니다.

`fetch-depth: 50`으로 같은 스크립트를 다시 돌리면 답이 돌아옵니다.

```
$ git rev-list --count HEAD
11

$ git diff --name-only origin/main...HEAD
packages/core/src/Button/Button.tsx
  (exit 0)
```

## 왜 3개월 동안 아무도 몰랐을까

여기서부터가 이 사건의 본론입니다. `fatal`이 났는데 CI는 왜 빨간불이 아니었을까요. 에러를 삼키는 경로가 정확히 두 개 있었습니다.

**경로 1 — 셸 파이프라인.** `check-components`의 판정 코드는 이랬습니다.

```bash
CHANGED=$(git diff --name-only origin/${{ github.base_ref }}...HEAD -- packages/core/src/ | grep -v -E '(hooks|theme|utils)/' | head -1)
echo "has_components=$( [ -n "$CHANGED" ] && echo true || echo false )" >> $GITHUB_OUTPUT
```

파이프라인의 종료 코드는 기본적으로 **마지막 명령의 것**입니다. `git`이 128로 죽어도 `head`가 0으로 끝나면 전체가 0입니다. 명령 치환 결과는 빈 문자열이고요. 재현 환경에서 그대로 확인했습니다.

```
pipefail OFF: exit=0 CHANGED=''  → has_components=false
pipefail ON : exit=1 CHANGED=''  → 스텝 실패
```

실제 CI에서 이 스텝은 실패하지 않고 통과했습니다. 그래서 `pr-a11y`가 skip됐습니다. `pipefail`이 켜져 있었다면 최소한 빨간불로 티라도 났을 겁니다.

**경로 2 — Node의 catch.** `analyze-pr.js`는 이렇게 되어 있었습니다.

```js
try {
  const output = execSync(`git diff --name-only ${baseBranch}...${headRef}`, { encoding: 'utf8' });
  return output.trim().split('\n').filter(Boolean);
} catch (e) {
  console.error('Error getting changed files:', e.message);
  return [];
}
```

`execSync`는 명령이 0이 아닌 코드로 끝나면 예외를 던집니다(`e.status`는 128이었습니다). 그런데 `catch`가 빈 배열을 돌려줍니다. 호출부 입장에서 "diff가 실패했다"와 "바뀐 파일이 없다"가 완전히 같은 값이 됩니다. 그렇게 만들어진 리포트가 매 PR마다 붙었습니다.

> 두 경로의 공통 안티패턴은 하나입니다. **실패를 빈 결과로 번역한 것.** 빈 결과는 그럴듯해 보입니다. 그래서 아무도 안 봅니다.

3개월 전 CI 최적화 PR([#1379](https://github.com/facebook/astryx/pull/1379), 2026-04-15 머지)이 shallow clone을 도입했습니다. 최적화 자체는 옳았습니다. 다만 `check-components`와 `build-storybook`은 기본 depth 1인 채로 남았고, 그 안의 three-dot diff는 그날부터 조용히 죽어 있었습니다.

## 수정: depth를 맞추고, 조용한 실패를 막는다

바꾼 파일은 두 개입니다. `+25/-5`.

**첫째, depth 정렬.** `check-components`와 `build-storybook`의 checkout에 `fetch-depth: 50`, base 브랜치 fetch에 `--depth=50`을 줬습니다.

```yaml
- name: Checkout
  uses: actions/checkout@v7
  with:
    # Depth 50 (same as check-scope) so the three-dot diff below can find
    # a merge base. With the default depth of 1 the diff fails with
    # "no merge base", the error is swallowed by the pipeline, and
    # has_components silently becomes false — skipping pr-a11y entirely.
    fetch-depth: 50

- name: Fetch base branch
  run: git fetch origin ${{ github.base_ref }} --depth=50
```

50이라는 숫자는 발명한 게 아닙니다. 같은 파일의 `check-scope` job이 처음부터 `fetch-depth: 50` + `--depth=50`으로 정상 동작하고 있었습니다. 이미 검증된 값에 나머지를 **맞춘** 것뿐입니다. 새 상수를 하나 더 만드는 것보다, 같은 파일 안에서 이미 옳게 돌아가던 패턴을 재사용하는 편이 리뷰어에게도 설명하기 쉽습니다.

**둘째, fail open 가드.** depth를 고쳐도 언젠가 누가 또 얕게 만들 수 있습니다. 그때 조용히 감사가 꺼지지 않도록 명시적인 가드를 넣었습니다.

```bash
if ! git merge-base HEAD origin/${{ github.base_ref }} >/dev/null 2>&1; then
  echo "::warning::No merge base between HEAD and origin/${{ github.base_ref }} (clone too shallow) — assuming components changed so pr-a11y still runs"
  echo "has_components=true" >> $GITHUB_OUTPUT
  exit 0
fi
```

merge base를 못 찾으면 `has_components=true`입니다. 즉 **의심스러우면 감사를 돌립니다.** 안 돌리는 게 아니라요. 잘못 켜지면 job 하나가 헛돌고, 잘못 꺼지면 접근성 검사가 몇 달간 없는 셈이 됩니다. 두 오류의 비용이 대칭이 아니니 기본값도 대칭일 이유가 없습니다.

**셋째, 반대로 시끄럽게 죽이기.** `analyze-pr.js`는 정반대로 고쳤습니다.

```js
} catch (e) {
  // A failed diff (e.g. no merge base on a too-shallow clone) is not the
  // same as "no changes" — fail loudly instead of publishing an empty
  // analysis report that looks legitimate.
  console.error(`::error::git diff ${baseBranch}...${headRef} failed: ${e.message}`);
  console.error('The clone is likely too shallow to contain the merge base (see fetch-depth in ci.yml).');
  process.exit(1);
}
```

한쪽은 fail open, 한쪽은 fail closed입니다. 기준은 "안전한 기본값이 존재하는가"였습니다. `check-components`에는 안전한 쪽(감사를 돌린다)이 분명히 있습니다. 리포트에는 없습니다. 빈 리포트는 안전한 기본값이 아니라 그냥 거짓말입니다.

## 검증: 로컬 재현과 머지 후 실측

PR의 test plan은 위에서 만든 bare 저장소 시뮬레이션 그대로입니다. depth 1에서 `fatal: no merge base`와 `has_components=false`를 재현하고, depth 50에서 `Button.tsx` 감지와 `has_components=true`를 확인했습니다. 파이프라인 verbatim 실행 결과입니다.

```
############ fetch-depth: 1 ############
파이프라인 exit=0  CHANGED=''
has_components=false

############ fetch-depth: 50 ############
파이프라인 exit=0  CHANGED='packages/core/src/Button/Button.tsx'
has_components=true
```

가드도 depth 1 환경에서 직접 돌려 봤습니다.

```
::warning::No merge base between HEAD and origin/main (clone too shallow) — assuming components changed so pr-a11y still runs
has_components=true
```

PR은 2026-07-19에 머지됐습니다. 그리고 오늘 다시 실행 기록을 뽑았습니다.

| 구간 | pr-a11y success | skipped |
|---|---|---|
| 수정 전 (실행 15건 샘플) | 0건 | 14건 |
| 수정 후 (실행 20건 샘플) | 12건 | 7건 |

각 구간에서 한 건씩은 job 목록에 `pr-a11y`가 없었습니다. 핵심은 0건이 12건이 됐다는 것입니다. 이제는 컴포넌트를 건드린 PR에서 감사가 실제로 돕니다.

PR 본문에는 경고도 함께 적었습니다. 약 3개월간 꺼져 있던 검사가 다시 켜지면, 그동안 쌓인 기존 위반이 새 실패처럼 튀어나올 수 있습니다. 리뷰어가 그걸 회귀로 오해하지 않도록 미리 밝히는 편이 낫습니다.

## 배운 점

**`skipped`는 `success`가 아닙니다.** 체크 목록이 전부 초록색이어도, 그중 몇 개가 실행조차 안 됐다면 그건 통과가 아니라 무응답입니다. 저는 이번에 초록불 화면을 3개월간 믿고 지나쳤습니다.

**git 연산에는 히스토리를 요구하는 것과 아닌 것이 있습니다.** shallow clone은 전자를 소리 없이 깹니다. 이번에 직접 확인한 것만 해도 `git diff A...B`는 exit 128로, `git merge-base`는 exit 1로 죽는데 `git diff A..B`는 멀쩡히 성공했습니다. CI에서 `fetch-depth`를 줄이는 최적화를 넣는다면, 그 저장소의 스크립트가 어느 쪽 연산을 쓰는지 먼저 훑어야 합니다.

**실패를 기본값으로 번역하지 마십시오.** `catch { return [] }`와 파이프라인의 마지막 종료 코드는 둘 다 같은 일을 합니다. 오류를 그럴듯한 정상값으로 바꿔치기하는 겁니다. 이번 수정의 코드 변화량은 `+25/-5`로 아주 작았지만, 진짜 수정은 "빈 결과와 실패를 구분되게 만든 것"이었습니다.

## 마치며

정리하면 이렇습니다. `git diff A...B`는 merge base를 필요로 하고, `actions/checkout`의 기본 `fetch-depth: 1`은 그 merge base를 만들 조상을 남기지 않습니다. 실패는 셸 파이프라인과 `catch`를 거치며 "변경 없음"으로 번역됐고, 접근성 감사는 3개월간 한 번도 돌지 않았습니다. depth를 `check-scope`와 같은 50으로 맞추고, merge base 가드를 fail open으로, 리포트 스크립트를 fail closed로 고쳤습니다.

여러분의 워크플로에도 `fetch-depth`를 줄인 곳이 있나요. 거기서 `git diff ...`나 `git merge-base`를 쓰고 있다면, 한 번 열어 보시길 권합니다. 조용히 빈 답을 내고 있을지도 모릅니다.

- 근거 PR: [facebook/astryx#3865 — fix(ci): restore merge base for three-dot diffs broken by shallow clones](https://github.com/facebook/astryx/pull/3865)
