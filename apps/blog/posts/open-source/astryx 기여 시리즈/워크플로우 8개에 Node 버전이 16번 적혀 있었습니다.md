---
title: '워크플로우 8개에 Node 버전이 16번 적혀 있었습니다 — .nvmrc와 composite action으로 단일 출처 만들기'
date: '2026-07-26'
published: false
slug: 'astryx-nvmrc-composite-action'
thumbnail: '/og/astryx-nvmrc-composite-action.png'
---

# 워크플로우 8개에 Node 버전이 16번 적혀 있었습니다 — .nvmrc와 composite action으로 단일 출처 만들기

## 이 글을 읽고 나면

- 같은 설정이 여러 워크플로우에 복붙됐을 때 생기는 드리프트(drift)가 왜 위험한지 구체적으로 이해합니다
- `.nvmrc` 하나로 CI와 로컬의 Node 버전을 묶는 방법(`node-version-file`)을 알게 됩니다
- 반복되는 스텝 묶음을 GitHub Actions composite action으로 추출하고, 어디까지 입력으로 열어둘지 판단하는 기준을 얻습니다
- "전부 통일한다"가 아니라 **일부러 통일하지 않는 예외**를 남기고 그 이유를 코드에 적는 방식을 배웁니다

> **CI 최적화 시리즈**
>
> 1. 매일 쓰던 getByRole 때문에 테스트가 26배 느렸습니다
> 2. 로컬에선 그대로인데 CI에서만 빨라지는 최적화가 있습니다
> 3. deploy job은 이제 27초면 끝납니다
> 4. GitHub Actions끼리 서로 push를 덮어쓸 때 생기는 일
> 5. fork PR을 머지했더니 CI가 빨간불이 됐습니다
> 6. 워크플로우 8개에 Node 버전이 16번 적혀 있었습니다 **(현재 글)**

## 들어가며

이번 글은 조금 심심한 이야기입니다. 앞선 글들처럼 26배나 47% 같은 숫자가 나오지 않습니다. 이 PR은 **아무것도 빨라지게 만들지 않았습니다.**

대신 다른 걸 바꿨습니다. 저장소에 16번 적혀 있던 값을 1번으로 줄였습니다. 근거는 facebook/astryx에 머지된 PR [#3753 — ci: read the Node version from .nvmrc and share one setup action](https://github.com/facebook/astryx/pull/3753)입니다. 12개 파일, 96줄 추가에 134줄 삭제, 순수하게 38줄이 사라진 변경입니다.

성능 PR은 숫자로 가치를 증명하기 쉽습니다. 이런 정리 PR은 그게 안 됩니다. "그래서 뭐가 좋아지는데?"라는 질문에 답하려면 **아직 일어나지 않은 사고**를 설명해야 하기 때문입니다. 이 글은 그 설명을 해보는 글입니다.

## 같은 줄이 16번 적혀 있었습니다

시작은 다른 작업을 하다 우연히 눈에 들어온 한 줄이었습니다. 워크플로우 파일을 열 때마다 똑같은 블록이 반복됐습니다.

```yaml
- uses: pnpm/action-setup@v6
- uses: actions/setup-node@v6
  with:
    node-version: 24
    cache: 'pnpm'

- run: pnpm install --frozen-lockfile
```

`.github/` 전체를 훑어봤습니다. `node-version: 24`는 **워크플로우 8개에 걸쳐 16번** 적혀 있었습니다. 파일별로는 `ci.yml` 6번, `deploy.yml`·`release.yml`·`vibe-screenshots.yml` 각 2번, `cli-smoke-test.yml`·`codemod-verify.yml`·`lint.yml`·`redeploy-preview.yml` 각 1번입니다.

복붙의 흔적은 표기법에 남아 있었습니다. 같은 값인데 쓰는 방식이 제각각이었습니다.

| 표기 | 나타난 곳 |
| --- | --- |
| `node-version: 24` | 대부분의 워크플로우 |
| `node-version: '24'` | `vibe-screenshots.yml` |
| `cache: 'pnpm'` | `ci.yml`, `deploy.yml`, `lint.yml`, `release.yml` … |
| `cache: "pnpm"` | `cli-smoke-test.yml`, `codemod-verify.yml` |
| `cache: pnpm` | `redeploy-preview.yml` |

스텝 이름도 마찬가지였습니다. 어떤 워크플로우는 `- name: Setup pnpm` / `- name: Setup Node.js` / `- name: Install dependencies`로 친절하게 이름을 달았고, 어떤 워크플로우는 이름 없이 `- uses:`만 썼습니다. 동작은 전부 같습니다. 다만 **누군가 앞의 파일을 복사해서 새 워크플로우를 만들었다는 사실**이 그대로 화석처럼 남아 있었습니다.

## 드리프트는 이미 시작돼 있었습니다

여기까지는 "지저분하다" 정도의 문제입니다. 진짜 문제는 다른 데 있었습니다.

저장소 어디에도 **로컬 개발용 Node 버전을 선언한 파일이 없었습니다.** `.nvmrc`가 없었습니다. 대신 `CONTRIBUTING.md`가 이렇게 안내하고 있었습니다.

```text
Install Node.js 22+ from an active LTS line using one of these methods:

**Via nvm (recommended):**

    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    source ~/.zshrc
    nvm install 22
```

> 문서는 22를 설치하라고 하고, CI는 16곳에서 24를 돌리고 있었습니다.

이게 드리프트입니다. 새로 합류한 기여자가 `CONTRIBUTING.md`를 그대로 따르면 Node 22 환경이 만들어집니다. 그리고 그 사람이 CI에서만 재현되는 버그를 만났을 때, 원인 후보 목록에 "내 Node가 CI와 다르다"가 들어 있을 리 없습니다. 문서를 그대로 따랐으니까요.

드리프트의 무서운 점은 **깨질 때 소리가 나지 않는다**는 겁니다. 문서와 CI가 어긋나 있어도 빌드는 초록불입니다. 어긋남은 누군가 Node 22와 24 사이에서 동작이 갈리는 API를 만났을 때 처음 드러납니다. 그때는 이미 "왜 내 로컬에서만 안 되지"를 몇 시간 헤맨 뒤입니다.

값이 16곳에 흩어져 있다는 건 또 다른 문제도 만듭니다. 언젠가 Node 26으로 올릴 때, 16곳을 **전부** 고쳐야 합니다. 15곳만 고치면 어떻게 될까요. CI는 여전히 초록불입니다. 남겨진 한 job만 다른 런타임에서 돌고 있을 뿐입니다.

## .nvmrc 하나로 모았습니다

해법의 첫 절반은 파일 하나였습니다.

```text
24
```

`.nvmrc`의 전체 내용입니다. 한 줄, 두 글자입니다. 패치 버전까지 못 박지 않고 24.x 라인만 가리킵니다.

이 파일이 특별한 이유는 **읽는 쪽이 이미 많다**는 점입니다. nvm, fnm, mise가 전부 `.nvmrc`를 읽습니다. 그리고 GitHub Actions의 `actions/setup-node`도 `node-version-file` 입력으로 같은 파일을 읽을 수 있습니다.

```yaml
# before
- uses: actions/setup-node@v6
  with:
    node-version: 24
    cache: 'pnpm'
```

```yaml
# after
- uses: actions/setup-node@v6
  with:
    node-version-file: .nvmrc
    cache: pnpm
```

새 표준을 발명한 게 아닙니다. **이미 모두가 읽고 있던 파일을 CI도 읽게 만든 것**뿐입니다. `CONTRIBUTING.md`도 그에 맞춰 고쳤습니다.

```bash
nvm install   # no argument — reads .nvmrc
```

인자가 사라졌습니다. 기여자가 명령어를 그대로 붙여 넣으면 CI가 쓰는 것과 같은 Node가 깔립니다. 문서에서 버전 숫자를 지운 것이 핵심입니다. 숫자가 문서에 남아 있는 한, 그 숫자는 언젠가 다시 낡습니다.

문서에는 예외도 함께 적었습니다. `asdf`는 `.nvmrc`를 읽지 않습니다. `.tool-versions`라는 자기 파일을 씁니다. 그래서 이 PR은 `.gitignore`에도 손을 댔습니다.

```gitignore
# Node version managers (.nvmrc is the single source — CI reads it via
# node-version-file). Ignored so a personal asdf/mise/nodenv file cannot drift
# from it. If the team ever moves to one of these, delete the matching line
# here first — otherwise the new file is silently left out of the commit.
.node-version
.tool-versions
mise.toml
```

개인이 쓰는 버전 매니저 파일이 저장소에 커밋되어 **두 번째 진실 공급원**이 되는 걸 막는 장치입니다. 이미 `package-lock.json`과 `yarn.lock`을 같은 이유로 무시하고 있어서, 그 스탠자 바로 아래에 같은 형식으로 붙였습니다.

주석의 마지막 문장이 중요합니다. `.gitignore`는 커밋을 **막지 않습니다. 조용히 누락시킵니다.** 나중에 팀이 정말로 mise로 옮기기로 하면, 먼저 이 줄을 지워야 합니다. 그러지 않으면 새 설정 파일이 커밋에서 빠진 채로 "왜 내 로컬에만 있지"가 시작됩니다. 그 함정을 미래의 누군가가 밟지 않도록 파일 안에 적어뒀습니다.

## composite action으로 세 스텝을 하나로

해법의 나머지 절반은 반복 자체를 없애는 것이었습니다. `pnpm/action-setup` → `setup-node` → `pnpm install --frozen-lockfile` 이 세 스텝 묶음은 저장소 안에서 14번 반복되고 있었습니다.

GitHub Actions에는 이런 걸 위한 장치가 있습니다. **composite action**입니다. 스텝 여러 개를 하나의 액션으로 묶어서, `uses:` 한 줄로 부를 수 있게 만듭니다. 별도 저장소에 올릴 필요도 없습니다. 같은 저장소 안에 파일로 두고 상대 경로로 호출하면 됩니다.

### reusable workflow가 아니라 composite action인 이유

GitHub Actions에는 중복을 줄이는 장치가 두 개 있습니다. 헷갈리기 쉬워서 짚고 넘어가겠습니다.

**reusable workflow**는 `on: workflow_call`로 선언하고, 호출하는 쪽에서 `jobs.<id>.uses:`로 부릅니다. 대체하는 단위가 **job 하나 전체**입니다. `runs-on`부터 스텝 목록까지 전부 호출되는 쪽이 정의합니다.

**composite action**은 대체하는 단위가 **스텝 묶음**입니다. 기존 job 안의 스텝 자리에 `uses:` 한 줄로 끼워 넣습니다. 나머지 스텝은 그대로 둡니다.

이번에 없애고 싶었던 건 job이 아니라 **job마다 앞에 붙는 세 스텝**이었습니다. 그 뒤에 오는 일은 job마다 전부 다릅니다. 어떤 job은 lint를 돌리고, 어떤 job은 Storybook을 빌드하고, 어떤 job은 npm에 배포합니다. 공통분모가 앞부분에만 있으니 composite action이 맞는 도구였습니다.

대신 제약이 하나 생깁니다. 같은 저장소의 composite action을 `./.github/actions/setup`처럼 상대 경로로 부르면, 그 파일은 **체크아웃된 작업 트리에서 읽힙니다.** checkout이 먼저 돌지 않은 job에서는 액션 자체를 찾지 못합니다. 이 제약은 뒤에서 다시 나옵니다.

### 41줄짜리 파일 하나

`.github/actions/setup/action.yml`을 새로 만들었습니다. 41줄입니다.

```yaml
name: 'Setup Node and pnpm'
description: >-
  Install pnpm, set up Node from .nvmrc with the pnpm store cached, and
  optionally install workspace dependencies. Requires actions/checkout to have
  run first — .nvmrc and the composite action itself are read from the
  checked-out tree.

inputs:
  install:
    description: 'Run `pnpm install --frozen-lockfile` after Node is set up.'
    required: false
    default: 'true'
  registry-url:
    description: >-
      npm registry to authenticate against. Publishing jobs set this so
      setup-node writes the auth config npm publish needs.
    required: false
    default: ''

runs:
  using: composite
  steps:
    # pnpm has to be on PATH before setup-node, otherwise `cache: pnpm` cannot
    # resolve the store path. The version comes from package.json's
    # `packageManager` field — never pin it here as well.
    - uses: pnpm/action-setup@v6

    # .nvmrc is the single source of truth for the Node version, shared with
    # local nvm / fnm / mise. The 24.x line also bundles npm >= 11.5.1, which
    # release.yml requires for OIDC trusted publishing.
    - uses: actions/setup-node@v6
      with:
        node-version-file: .nvmrc
        cache: pnpm
        registry-url: ${{ inputs.registry-url }}

    - if: inputs.install == 'true'
      run: pnpm install --frozen-lockfile
      shell: bash
```

호출부는 이렇게 줄었습니다.

```yaml
# before — cli-smoke-test.yml
- uses: pnpm/action-setup@v6
- uses: actions/setup-node@v6
  with:
    node-version: 24
    cache: "pnpm"

- run: pnpm install --frozen-lockfile
```

```yaml
# after
- uses: ./.github/actions/setup
```

### 순서가 의미를 가집니다

composite action 안의 주석 두 개는 장식이 아닙니다. 둘 다 **잘못 건드리면 깨지는 지점**을 지키고 있습니다.

첫째, `pnpm/action-setup`이 반드시 `setup-node`보다 먼저 와야 합니다. `setup-node`의 `cache: pnpm`은 pnpm 스토어 경로를 알아내기 위해 `pnpm` 실행 파일을 호출합니다. pnpm이 아직 `PATH`에 없으면 그 경로를 해석하지 못합니다. 두 스텝의 순서가 곧 의존 관계입니다.

둘째, composite action 안에서 pnpm 버전을 **핀하지 않았습니다.** 버전은 `package.json`의 `packageManager` 필드에서 옵니다. 여기에 또 적으면 방금 없앤 것과 똑같은 문제를 새 파일에서 다시 만드는 셈입니다. 그래서 주석에 "never pin it here as well"이라고 못 박았습니다.

> 단일 출처를 만드는 리팩터링의 가장 흔한 실패는, 공통 파일 안에 **두 번째 하드코딩**을 새로 심는 것입니다.

### 입력은 딱 두 개만 열었습니다

composite action을 만들 때 유혹이 하나 있습니다. "나중에 필요할지 모르니 입력을 넉넉히 열어두자"는 생각입니다. 그렇게 하면 공통 액션이 순식간에 설정 덩어리가 되고, 결국 각 호출부가 자기만의 조합을 넘기면서 원래의 복붙 상태로 돌아갑니다.

그래서 실제로 필요한 두 개만 열었습니다.

| 입력 | 필요한 이유 |
| --- | --- |
| `install` | `ci.yml`의 `pr-a11y` job은 아티팩트를 먼저 내려받아야 해서, 의존성 설치를 Playwright 브라우저 설치와 함께 나중에 합니다. 이 job만 `install: 'false'`를 넘깁니다. |
| `registry-url` | `release.yml`의 `publish` / `canary` job은 `setup-node`가 인증 설정을 써줘야 합니다. `npm publish`가 OIDC trusted publishing에서 그 파일을 읽습니다. |

둘 다 "언젠가 쓸 것 같아서"가 아니라 **지금 실제로 호출하는 job이 있어서** 만든 입력입니다. 기본값을 각각 `'true'`와 `''`로 둬서, 나머지 12개 호출부는 `with:` 블록 없이 한 줄로 끝납니다.

`release.yml`에서는 덤도 하나 있었습니다. 원래 이런 주석이 달려 있었습니다.

```yaml
node-version: 24 # bundles npm >= 11.5.1, required for OIDC publishing
```

Node 24를 써야 하는 **진짜 이유**입니다. 그런데 이 지식이 16곳 중 딱 한 곳에만 적혀 있었습니다. 나머지 15곳의 `24`는 이유를 모른 채 복사된 숫자였습니다. 만약 누군가 "LTS니까 22로 내리자"고 결정한다면, 이 주석이 달린 파일을 열어보기 전까지는 릴리스가 깨진다는 걸 알 수 없습니다.

이 PR은 그 문장을 버리지 않고 옮겼습니다. 지금은 composite action의 `.nvmrc` 줄 옆과 `release.yml`의 `registry-url` 옆, 두 군데에 남아 있습니다. **값은 한 곳으로 모으되, 그 값을 지켜야 하는 이유는 값이 사용되는 자리에 남깁니다.**

## 일부러 통일하지 않은 job이 둘 있습니다

전부 composite action으로 바꾸는 게 깔끔해 보입니다. 하지만 `ci.yml`의 `pr-comment`와 `pr-comment-update` 두 job은 그대로 뒀습니다.

이 둘은 아티팩트를 내려받아 읽고, PR에 코멘트를 다는 일만 합니다. 워크스페이스 의존성을 설치하지 않습니다. 이 job을 composite action에 태우면 쓰지도 않을 pnpm 스토어 캐시를 복원하게 됩니다. 필요 없는 일입니다.

그렇다고 이 둘만 `node-version: 24`로 남겨두면 다시 두 개의 진실 공급원이 생깁니다. 그래서 절충했습니다. composite action은 안 쓰되, Node 버전은 같은 파일에서 읽게 했습니다.

```yaml
# Node only. This job reads a downloaded artifact and posts a comment; it
# never installs workspace deps, so it skips the composite action and the
# pnpm store cache restore that comes with it.
- name: Setup Node.js
  uses: actions/setup-node@v6
  with:
    node-version-file: .nvmrc
```

이 주석이 없으면 다음 사람이 "여기만 빠뜨렸네" 하고 composite action으로 바꿉니다. 그리고 아무도 그게 왜 되돌려진 건지 모르게 됩니다. **예외에는 이유를 함께 적어야 예외로 남습니다.**

정리하면 이렇습니다. 16개 setup 지점 중 14개는 composite action을 쓰고, 2개는 `node-version-file`만 씁니다. Node 버전을 읽는 곳은 여전히 `.nvmrc` 하나입니다.

## 덤: if 조건도 3분의 1로 줄었습니다

예상하지 못한 부수 효과가 하나 있었습니다. `ci.yml`과 `lint.yml`에는 docsite만 바뀐 PR에서 job을 건너뛰는 가드가 걸려 있습니다. 스텝이 3개니까 같은 조건을 3번 써야 했습니다.

```yaml
# before
- uses: pnpm/action-setup@v6
  if: needs.check-scope.outputs.docsite_only != 'true'
- uses: actions/setup-node@v6
  if: needs.check-scope.outputs.docsite_only != 'true'
  with:
    node-version: 24
    cache: 'pnpm'

- run: pnpm install --frozen-lockfile
  if: needs.check-scope.outputs.docsite_only != 'true'
```

```yaml
# after
- uses: ./.github/actions/setup
  if: needs.check-scope.outputs.docsite_only != 'true'
```

세 job에서 각각 3줄이던 조건이 1줄이 됐습니다. 하나만 빠뜨려도 조용히 어긋나는 조건이 애초에 하나뿐이 됩니다. 중복을 없애면 **동기화해야 할 지점의 개수 자체가 줄어듭니다.** 이게 이런 리팩터링의 실제 이득입니다.

## 눈으로 확인하지 않았습니다

CI 워크플로우 12개 파일을 한꺼번에 고치는 PR입니다. 로컬에서 돌려볼 수 없고, 잘못되면 저장소 전체의 CI가 멈춥니다. 그래서 검증을 눈으로 하지 않았습니다.

가장 위험한 전제는 이것이었습니다.

> `node-version-file: .nvmrc`와 `uses: ./.github/actions/setup`은 **둘 다 체크아웃된 작업 트리에서 읽힙니다.** checkout보다 먼저 setup을 실행하는 job이 하나라도 있으면 그 job은 깨집니다.

원래 `node-version: 24`는 리터럴이라 checkout 전에 실행돼도 문제가 없었습니다. 이 PR은 그 리터럴을 **파일 참조**로 바꿉니다. 그래서 이전에는 상관없던 스텝 순서가 갑자기 의미를 갖게 됐습니다.

파일 16개를 눈으로 훑어서 "다 checkout이 먼저네"라고 결론 내리는 건 위험합니다. 대신 YAML을 파싱해서 job마다 스텝 목록을 걸어가며 확인했습니다. 검증 항목은 세 가지였습니다.

1. 워크플로우와 액션 YAML 15개가 전부 파싱된다
2. **16개 job 전부가 setup 스텝보다 먼저 `actions/checkout`을 실행한다**
3. `.github/` 아래에 `node-version:` 리터럴이 하나도 남아 있지 않다

3번은 "빠뜨린 곳이 없다"를 보장하는 항목입니다. 16곳을 하나씩 세는 대신, 남은 개수가 0인지만 확인하면 됩니다. 이렇게 검사 가능한 형태로 만들어두면 다음에 누군가 `node-version: 22`를 새 워크플로우에 적었을 때도 같은 방식으로 잡을 수 있습니다.

## 마치며

PR은 2026년 7월 10일에 머지됐습니다. 리뷰어의 코멘트는 한 줄이었습니다.

> Thanks this is good cleanup and helps coordinate our node versions.

이런 PR은 리뷰가 짧습니다. 논쟁할 게 없기 때문입니다. 그래서 오히려 올리기 전에 스스로 답을 준비해야 합니다. "왜 지금 이걸 하는가"에 대한 답 말이죠.

이번에 정리한 답은 세 가지입니다.

1. **같은 값이 N번 적혀 있다면, 그건 N-1개의 잠재적 버그입니다.** 값이 틀려서가 아니라 언젠가 N-1곳만 고쳐질 것이기 때문입니다.
2. **단일 출처를 만들 때는 이미 모두가 읽는 파일을 고르세요.** `.nvmrc`가 좋은 선택이었던 이유는 nvm·fnm·mise·`setup-node`가 이미 읽고 있었기 때문입니다. 새 규약을 발명하면 그것도 언젠가 드리프트합니다.
3. **예외를 남길 거면 이유를 코드에 적으세요.** 이유 없는 예외는 다음 사람이 "빠뜨린 것"으로 오해하고 지웁니다.

같은 시기에 올린 다른 정리 PR들도 결국 같은 이야기였습니다. 워크스페이스 목록을 `pnpm-workspace.yaml` 한 곳으로 모은 [#3752](https://github.com/facebook/astryx/pull/3752), 아무것도 하지 않던 `.npmrc`를 지우고 문서의 낡은 pnpm 버전을 고친 [#3750](https://github.com/facebook/astryx/pull/3750), `packageManager`와 `devEngines.packageManager`가 함께 선언돼 경고를 내던 중복을 제거한 [#3807](https://github.com/facebook/astryx/pull/3807). 전부 "같은 걸 두 군데서 말하고 있다"를 한 군데로 줄이는 작업이었습니다.

여러분의 저장소에서 `.github/` 아래를 한번 grep 해보세요. `node-version`, `python-version`, `go-version` 같은 키가 몇 번 나오는지. 2번 이상이라면 이미 드리프트가 시작될 준비를 마친 상태입니다.

- 근거 PR: [facebook/astryx#3753 — ci: read the Node version from .nvmrc and share one setup action](https://github.com/facebook/astryx/pull/3753)

---

## 참고 링크

- [GitHub Docs — Creating a composite action](https://docs.github.com/en/actions/sharing-automations/creating-actions/creating-a-composite-action)
- [actions/setup-node — `node-version-file`](https://github.com/actions/setup-node#usage)
- [nvm — `.nvmrc`](https://github.com/nvm-sh/nvm#nvmrc)
