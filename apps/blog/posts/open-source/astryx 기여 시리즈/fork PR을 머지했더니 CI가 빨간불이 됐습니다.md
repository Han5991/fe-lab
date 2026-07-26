---
title: 'fork PR을 머지했더니 CI가 빨간불이 됐습니다 — permissions: write가 무시된 이유'
date: '2026-07-12'
published: false
slug: 'astryx-fork-pr-token-403'
thumbnail: '/og/astryx-fork-pr-token-403.png'
---

# fork PR을 머지했더니 CI가 빨간불이 됐습니다 — permissions: write가 무시된 이유

## 이 글을 읽고 나면

- GitHub Actions가 fork발 PR의 `GITHUB_TOKEN`을 강제로 읽기 전용으로 강등하는 이유를 이해합니다
- `permissions`를 선언했는데도 403이 나올 때, 실패/성공 실행을 나란히 놓고 변수 하나를 찾아내는 진단 방법을 배우게 됩니다
- `pull_request`와 `pull_request_target`의 차이, 그리고 'pwn request' 공격이 성립하는 두 가지 조건을 이해합니다
- '고치지 않기로 하는 결정'도 유효한 엔지니어링 판단이라는 것을 알게 됩니다

## 들어가며

> **astryx 기여 시리즈**
>
> 1. 매일 쓰던 getByRole 때문에 테스트가 26배 느렸습니다
> 2. 로컬에선 그대로인데 CI에서만 빨라지는 최적화가 있습니다
> 3. GitHub Actions끼리 서로 push를 덮어쓸 때 생기는 일
> 4. fork PR을 머지했더니 CI가 빨간불이 됐습니다 — permissions: write가 무시된 이유 **(현재 글)**
> 5. deploy job은 이제 27초면 끝납니다

2026년 7월, 열흘 남짓 동안 facebook/astryx에 PR 17개를 머지시켰습니다. astryx는 메타가 오픈소스로 운영하는 내부 도구용 디자인 시스템입니다. pnpm 모노레포에 Vitest, CI는 GitHub Actions를 씁니다.

이 글은 그 시리즈 중에서 조금 특이한 편입니다. 무언가를 고친 이야기가 아니기 때문입니다. CI가 뱉은 403 하나를 추적해서 원인을 규명하고, 마지막에 **고치지 않기로 결정**한 이야기입니다.

그런데 그 과정에서 GitHub Actions의 토큰 보안 모델을 사고로 배웠습니다. `permissions: contents: write`를 분명히 선언했는데 403이 나오는 미스터리. 같은 상황을 만난 분이라면 이 글이 삽질 몇 시간을 아껴줄 겁니다.

## 머지의 기쁨은 10분을 가지 못했습니다

발단은 제 PR [#3859](https://github.com/facebook/astryx/pull/3859)였습니다. 워크스페이스의 vite 버전을 8로 정렬하는 의존성 정리 PR이었습니다. 메인테이너 승인이 떨어지고 main에 머지됐습니다. 기분 좋게 Actions 탭을 열었습니다.

빨간 X가 하나 떠 있었습니다. `Cleanup Preview Deployments`라는 워크플로우가 exit 128로 죽어 있었습니다. 로그 끝은 이랬습니다.

```text
remote: Permission to facebook/astryx.git denied to github-actions[bot].
fatal: unable to access 'https://github.com/facebook/astryx/': The requested URL returned error: 403
```

당황했습니다. 제 PR이 머지되자마자 터진 실패입니다. 내 변경이 뭔가를 깨뜨렸나 싶어 심장이 먼저 내려앉았습니다.

다행히 diff를 다시 봐도 접점이 없었습니다. 제 PR은 `package.json`과 lockfile만 건드렸습니다. 이 워크플로우는 gh-pages 브랜치의 프리뷰 배포물을 청소하는 별개 작업입니다. 그런데 왜 하필 지금 죽었을까요.

## 첫 번째 용의자: permissions 선언

가장 먼저 워크플로우 YAML을 열었습니다. `.github/workflows/cleanup-previews.yml`입니다. 트리거는 세 개였습니다.

```yaml
on:
  schedule:
    - cron: '0 6 * * *' # Daily 6am UTC
  pull_request:
    types: [closed]
  workflow_dispatch:
```

PR이 닫힐 때(머지 포함) 그 PR의 프리뷰 디렉터리 `pr/<번호>/`를 gh-pages에서 지우고, 매일 06시 UTC에 한 번 더 전체 청소를 도는 구조입니다. 그리고 권한 선언이 눈에 들어왔습니다.

```yaml
permissions: {}

jobs:
  cleanup:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: read
```

여기서 첫 번째 가설이 나왔습니다. "최상위에 `permissions: {}`가 있으니, 이게 job 권한을 덮어쓴 거 아닐까?" 그럴듯해 보였습니다. 하지만 문서를 확인하니 반대였습니다. job 레벨 `permissions`는 워크플로우 레벨 선언을 **덮어씁니다**. 최상위 `{}`는 기본값을 좁혀두는 모범 사례일 뿐이고, `cleanup` job은 분명히 `contents: write`를 받아야 합니다. 가설 기각.

두 번째 시도는 더 단순했습니다. 실패한 job을 그냥 re-run 해봤습니다. 일시적인 GitHub 장애일 수도 있으니까요. 결과는 똑같은 403이었습니다. 재실행은 원래 이벤트의 컨텍스트를 그대로 물려받습니다. 우연이 아니라는 뜻입니다.

여기서 막혔습니다. 권한을 **선언한** 워크플로우가, 권한이 **없다며** 죽는 상황. YAML만 노려봐서는 답이 안 나왔습니다.

## 실패와 성공을 나란히 놓아보았습니다

접근을 바꿨습니다. 파일이 아니라 **실행 이력**을 보기로 했습니다. 같은 워크플로우의 최근 실행을 전부 나열했습니다.

```bash
gh run list --repo facebook/astryx \
  --workflow=cleanup-previews.yml --limit 20
```

그러자 패턴이 보였습니다. 정리하면 이렇습니다.

| 트리거 | head 저장소 | 결과 |
| --- | --- | --- |
| PR closed — 제 PR들 (#3859 등) | `Han5991/astryx` (fork) | 전부 실패 ❌ |
| PR closed — `navi/*` 브랜치 PR | `facebook/astryx` (같은 저장소) | 전부 성공 ✅ |
| schedule (매일 06:00 UTC) | — | 전부 성공 ✅ |

실패한 실행은 **전부 fork에서 온 PR이 닫힐 때**였습니다. 메인테이너들이 같은 저장소의 `navi/*` 브랜치에서 올린 PR이 닫힐 때는 멀쩡했습니다. cron 실행도 멀쩡했습니다. 변수는 딱 하나, **PR이 fork에서 왔는가**였습니다.

확인 사살로 교차 검증을 했습니다.

```bash
gh pr view 3859 --repo facebook/astryx --json isCrossRepository
```

```json
{ "isCrossRepository": true }
```

설마 싶었습니다. 저는 외부 기여자라 fork(`Han5991/astryx`)에서 PR을 올립니다. 제 PR이 닫힐 때마다 이 워크플로우는 조용히 죽고 있었던 겁니다. #3859가 처음이 아니었습니다. 그동안 아무도 눈치채지 못했을 뿐입니다.

## 범인: fork발 pull_request의 토큰 강등

원인은 GitHub Actions의 보안 모델에 있었습니다. 문서에 명시된 규칙입니다.

> fork에서 온 PR이 `pull_request` 이벤트를 발화하면, 그 실행의 `GITHUB_TOKEN`은 **최대 읽기 전용**으로 제한된다. 워크플로우 파일의 `permissions` 선언으로도 이 상한을 넘을 수 없다.

`permissions` 키는 권한을 **좁히는** 장치이지 **넓히는** 장치가 아닙니다. 이벤트 종류와 출처가 정하는 상한 안에서만 동작합니다. fork발 `pull_request` 이벤트의 상한이 read-only이므로, job에 `contents: write`를 백 번 적어도 소용없습니다. 제 첫 가설이 YAML 안에서만 맴돌다 실패한 이유입니다.

이유는 명확합니다. fork는 아무나 만들 수 있습니다. 만약 fork발 PR이 write 토큰을 받는다면, 악의적인 사용자가 PR 하나로 원본 저장소에 커밋을 쓰거나 릴리스를 조작할 수 있습니다. 그래서 GitHub은 fork발 실행의 토큰을 무조건 강등하고, 시크릿도 전달하지 않습니다.

### 흔한 오해 하나를 정정합니다

이 로그를 처음 보면 "fork 저장소에 뭘 쓰려다 실패했나?"라고 생각하기 쉽습니다. 저도 잠깐 그랬습니다. 방향이 반대입니다.

실패한 실행은 **원본 저장소(facebook/astryx)에서** 돌았습니다. 다만 fork발 PR이 트리거했기 때문에 토큰이 강등된 상태였고, 그 토큰으로 **원본 저장소의** gh-pages에 push하려다 거부당한 겁니다. 로그의 `Permission to facebook/astryx.git denied`가 그 증거입니다. fork는 피해자도 가해자도 아니고, 그저 트리거의 출처였을 뿐입니다.

### 왜 하필 마지막 한 줄에서 터졌나

워크플로우 스크립트를 따라가 보면 실패 지점도 정확히 설명됩니다.

```bash
git rm -rf --quiet "pr/${pr_num}"   # 로컬 작업 — 성공
git commit -m "chore: cleanup ..."  # 로컬 커밋 — 성공
git push origin gh-pages            # 원격 쓰기 — 여기서 403
```

읽기 권한은 있으니 gh-pages 체크아웃과 `gh pr list` 조회는 통과합니다. `git rm`과 `git commit`은 러너의 로컬 디스크에서 일어나는 일이라 토큰과 무관합니다. 오직 마지막 `git push`만 원격 쓰기이고, 거기서 403이 터집니다. exit 128은 git의 fatal 에러 코드입니다. 워크플로우가 90%를 멀쩡히 수행하고 마지막 한 줄에서 죽는, 얄궂은 실패였습니다.

## 그래서 어떻게 고칠까: 세 가지 선택지

원인을 알았으니 해결 옵션을 검토했습니다. 세 가지가 있었습니다.

### 옵션 1 — pull_request_target으로 전환

`pull_request` 대신 `pull_request_target` 이벤트를 쓰면 실행이 **base 저장소의 컨텍스트**에서 돌고, 토큰도 write 권한을 받습니다. 정석 같아 보이지만, 이 이벤트는 악명이 있습니다. 이른바 **'pwn request'** 공격의 진입점이기 때문입니다.

다만 이 공격은 아무 데서나 성립하지 않습니다. 조건이 있습니다.

| pwn request 성립 조건 | 이 워크플로우는? |
| --- | --- |
| (a) PR head의 코드를 체크아웃해서 빌드/실행한다 | ❌ base의 `gh-pages` 브랜치만 체크아웃 |
| (b) `github.event.pull_request.*` 값을 셸에 보간한다 | ❌ event 필드를 전혀 사용하지 않음 |

write 토큰을 쥔 채로 공격자가 통제하는 코드(head 체크아웃)나 데이터(PR 제목·본문 보간)를 실행할 때 뚫리는 겁니다. 이 워크플로우는 둘 다 해당하지 않습니다. 게다가 `pull_request_target`은 워크플로우 파일 자체도 base 브랜치 버전이 실행되므로, PR에서 워크플로우를 조작하는 경로도 막혀 있습니다. 결론: **이 경우에는 안전하게 전환 가능**합니다.

### 옵션 2 — fork PR이면 건너뛰기

job에 조건 한 줄을 다는 방법도 있습니다.

```yaml
if: github.event_name != 'pull_request' ||
    github.event.pull_request.head.repo.full_name == github.repository
```

빨간 X는 사라집니다. 대신 fork PR의 프리뷰는 닫히는 즉시 정리되지 않고 남습니다.

### 옵션 3 — 아무것도 안 하기

여기서 워크플로우의 첫 트리거를 다시 봤습니다. `cron: '0 6 * * *'`. 매일 06시 UTC에 어차피 전체 청소가 돕니다. 그리고 cron 실행은 fork와 무관하니 토큰 강등이 없습니다. 실제로 실행 이력에서도 cron은 전부 성공이었습니다.

즉 fork PR이 닫힐 때의 실패는 **다음 날 아침 cron이 알아서 수습**합니다. 시스템이 이미 자가 치유를 하고 있었던 겁니다.

## 고치지 않기로 했습니다

세 옵션을 놓고 저울질했습니다. 기능적 손해를 먼저 계산했습니다.

- 실제 피해: fork PR의 프리뷰 정리가 **최대 하루** 늦어짐
- 남는 노이즈: Actions 탭의 빨간 X (fork PR이 닫힐 때마다 1개)

이게 전부입니다. gh-pages 용량은 하루치 프리뷰 하나 수준이고, 사용자 영향은 없습니다. 반면 수정 PR을 올리면 어떻게 될까요. `pull_request_target`은 보안에 민감한 이벤트라, 메인테이너가 pwn request 성립 조건까지 검토해야 승인할 수 있습니다. '하루 늦는 청소'를 위해 그 리뷰 비용을 청구하는 게 맞을까요.

저는 아니라고 판단했습니다. **수정의 가치가 리뷰 비용보다 작았습니다.** 그래서 이번에는 PR 대신 조사 결과만 정리해 두기로 했습니다. 나중에 이 워크플로우를 어차피 손볼 일이 생기면, 그때 옵션 1을 한 줄 얹으면 됩니다.

3년차쯤 되면 '고치는 능력'은 어느 정도 생깁니다. 이번에 배운 건 그 반대편입니다. 원인을 완전히 규명한 뒤에, **고치지 않기로 결정하는 것도 엔지니어링**이라는 것. 모르고 방치하는 것과 알고 놔두는 것은 완전히 다릅니다.

## 마치며

이번 조사를 세 줄로 요약합니다.

1. fork발 PR이 트리거한 `pull_request` 실행의 `GITHUB_TOKEN`은 무조건 read-only입니다. `permissions: contents: write`를 선언해도 못 이깁니다.
2. 원인을 못 찾겠으면 코드가 아니라 **실행 이력**을 보세요. 실패와 성공을 나란히 놓으면 변수 하나(fork 여부)가 드러납니다.
3. `pull_request_target`은 head 코드를 실행하거나 event 필드를 셸에 보간할 때만 위험합니다. 조건을 따져보면 안전하게 쓸 수 있는 경우도 많습니다 — 다만 이번에는 cron의 자가 치유가 있어 고치지 않기로 했습니다.

여러분의 저장소에도 fork PR이 닫힐 때마다 조용히 죽는 워크플로우가 있을지 모릅니다. Actions 탭에서 `pull_request: closed` 트리거를 한번 훑어보세요. 비슷한 403을 만난 적이 있다면, 혹은 '고치지 않기로 한 결정'을 내려본 적이 있다면 댓글로 공유해 주세요. 남의 CI가 어디서 새는지는 서로의 댓글에서 가장 빨리 배웁니다.

이 조사의 발단이 된 PR은 여기에 있습니다: [facebook/astryx#3859 — chore(deps): align workspace on vite 8](https://github.com/facebook/astryx/pull/3859)

---

## 참고 링크

- [GitHub Docs — Automatic token authentication (`GITHUB_TOKEN`의 권한 상한)](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication)
- [GitHub Docs — Events that trigger workflows: `pull_request_target`](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#pull_request_target)
- [GitHub Security Lab — Preventing pwn requests](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/)
