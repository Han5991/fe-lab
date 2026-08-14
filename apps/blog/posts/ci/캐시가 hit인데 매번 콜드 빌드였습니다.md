---
title: '캐시가 hit인데 매번 콜드 빌드였습니다 — GitHub Actions Next.js 캐시 키가 죽어 있던 이유'
seoTitle: '캐시가 hit인데 매번 콜드 빌드였던 이유'
date: '2026-07-26'
status: draft
slug: 'astryx-cache-hit-cold-build'
thumbnail: '/og/astryx-cache-hit-cold-build.png'
excerpt: '캐시 복원은 초록불이었고 67MB가 정상적으로 내려왔습니다. 그런데 빌드는 캐시가 아예 없을 때와 같은 4분이었습니다. hit 로그가 보증하지 않는 것 — 캐시 판정의 2층 구조, 그리고 캐시 키에서 구조적으로 빠지는 입력을 대조군 실측으로 확인합니다.'
tags: ['github-actions', 'ci', 'nextjs', 'cache']
---

## 이 글을 읽고 나면

- "캐시 hit"이 성공 신호가 아닐 수 있다는 것과, 그것을 대조군으로 증명하는 방법을 배웁니다
- Next.js 빌드 캐시가 basePath 같은 config 변화에 어떻게 반응하는지 이해합니다
- 파일이 아닌 입력(환경변수)이 왜 캐시 키에서 **구조적으로** 누락되는지 알게 됩니다

## 들어가며

CI 로그의 캐시 복원 스텝은 초록불이었습니다. 캐시 hit, 67MB 복원 완료. 그런데 빌드 시간이 전혀 줄지 않았습니다. 캐시가 있는 빌드가 4.0분, 캐시가 아예 없는 빌드가 3.9분이었습니다.

캐시는 매번 내려왔고, 매번 통째로 버려지고 있었습니다. 저는 이 두 줄을 한참 그냥 지나쳤습니다.

이 글은 그 원인을 좁혀 캐시 키 한 조각으로 고치기까지의 기록입니다(facebook/astryx [#3864](https://github.com/facebook/astryx/pull/3864)).

## 제일 느린 job이 이미 캐시를 쓰고 있었습니다

문제의 job은 `sandbox`라는 Next.js 앱을 정적 export하는 빌드입니다. PR CI에서 제일 느렸고, 약 4분이 걸렸습니다. 이걸 줄이는 게 과제였습니다.

그런데 이 job은 이미 캐시를 쓰고 있었습니다. `apps/sandbox/.next/cache`를 `actions/cache`로 복원했고, 복원은 매번 **성공**했습니다. 캐시가 있는데, 왜 매번 4분인가.

## "캐시 hit"은 성공 신호가 아닙니다

가설을 세우기 전에 숫자부터 모았습니다. 세 개의 실제 run을 비교했습니다.

| run | 맥락 | 캐시 | sandbox 컴파일 |
| --- | --- | --- | --- |
| [29181246330](https://github.com/facebook/astryx/actions/runs/29181246330) | PR build | **hit** (공유 키, 67MB 복원) | **4.0분** |
| [29181173652](https://github.com/facebook/astryx/actions/runs/29181173652) | main Deploy | hit (**같은 키**) | **64초** |
| [29180552092](https://github.com/facebook/astryx/actions/runs/29180552092) | 대조군 | **miss** (콜드) | 3.9분 |

같은 캐시 키에 같은 hit인데 main은 64초, PR은 4.0분입니다. 그리고 PR의 4.0분은 **캐시가 아예 없는 대조군 3.9분과 구분되지 않습니다**.

> 캐시가 죽었는지 살았는지는 hit/miss 로그로 알 수 없습니다. hit 이후의 실제 컴파일 시간을 콜드 run과 비교해야 알 수 있습니다.

main과 대조군은 비교의 양 끝입니다. 64초는 복원된 캐시가 **실제로 재사용된** 시간이고, 3.9분은 캐시 없이 **콜드로 컴파일한** 시간입니다. PR의 4.0분이 어느 쪽에 붙는지만 보면 됩니다. 둘 중 하나만 있었다면 진단이 안 됐을 겁니다. 콜드만 있으면 "이 프로젝트는 원래 4분짜리군"으로 끝나고, main만 있으면 "PR은 뭔가 더 하니까 느리겠지"로 끝납니다.

## 캐시 판정은 2층에서 일어납니다

여기서 "캐시 키가 어긋났다"고 읽으면 방향이 반대가 됩니다. 키는 정확히 맞았습니다. **맞은 것이 문제였습니다.**

캐시를 판정하는 주체가 둘이기 때문입니다.

| 층 | 주체 | 판단 기준 | 이번 결과 |
| --- | --- | --- | --- |
| 1층 | `actions/cache` | 키 문자열이 같은가 | 같음 → hit, 67MB 복원 |
| 2층 | Next.js(webpack) | 복원된 `.next/cache`의 config 지문이 지금과 같은가 | 다름 → 통째로 폐기 |

1층은 tarball을 풀어주는 일만 합니다. 그 안의 내용이 이번 빌드에 쓸모 있는지는 알지 못하고, 알 방법도 없습니다. 유효성 판단은 전적으로 **키를 짠 사람의 몫**입니다.

2층은 압니다. webpack의 persistent cache에는 그 캐시를 구울 때의 resolved config(설정 파일이 아니라, 환경변수까지 반영된 빌드 시점의 최종 설정값) 지문이 함께 저장되고, 복원본을 열 때 지금 값과 대조합니다.

그래서 로그에 에러가 한 줄도 없었던 겁니다. 두 층 모두 명세대로 정확히 동작했습니다. 고장난 부품은 하나도 없고, 문제는 **이음매**에 있었습니다.

<diagram label="복원된 캐시가 두 층의 판정을 거쳐 폐기되는 흐름" caption="1층 통과, 2층 폐기 — 로그에 에러는 없다">
  <diagram-node id="cache" title="actions/cache" desc="1층 · 키 문자열 같음"></diagram-node>
  <diagram-node id="restore" title="67MB 복원" desc="hit 기록"></diagram-node>
  <diagram-node id="next" title="Next.js" desc="2층 · config 지문 다름"></diagram-node>
  <diagram-node id="discard" title="통째로 폐기" desc="콜드 컴파일 4.0분" tone="accent"></diagram-node>
</diagram>

### basePath가 다르면 Next.js는 캐시를 버립니다

캐시 키는 이랬습니다.

```text
nextjs-sandbox-<pnpm-lock 해시>-<packages/core/dist 해시>
```

빌드 입력을 잘 반영한 키처럼 보입니다. 의존성이 바뀌면 갈리고, core 산출물이 바뀌면 갈립니다. 그런데 키에 안 들어간 입력이 하나 있었습니다. PR 빌드와 main 빌드는 **basePath가 다릅니다**.

- PR: `SANDBOX_BASE_PATH=/<repo>/pr/<n>/sandbox`
- main: `/<repo>/sandbox`

이건 실수가 아니라 필연입니다. PR 프리뷰는 GitHub Pages의 `<owner>.github.io/<repo>/pr/<n>/sandbox/` 경로에 배포됩니다. 그 prefix 없이 빌드하면 루트 절대 경로로 나가는 에셋 URL이 전부 404가 나서 프리뷰의 스타일과 JS가 통째로 깨집니다.

그리고 앞에서 말한 "지문"의 실체는 소박한 문자열입니다. Next.js는 config 전체가 아니라 **컴파일 결과를 바꾸는 값들만 골라**, Next.js 버전과 함께 이어 붙여 webpack 캐시의 버전 문자열로 넘깁니다.

```text
cache.version = <Next.js 버전>|{"basePath":"/<repo>/sandbox","trailingSlash":true,"assetPrefix":"",…}
```

basePath는 그 선별 목록의 한 항목입니다. webpack은 캐시를 구울 때 이 문자열을 함께 기록해 두고, 복원본을 열 때 지금 문자열과 대조합니다 — **한 글자라도 다르면 통째로 버립니다.** 부분 재사용은 없습니다. main이 구운 캐시에는 main의 basePath가 박혀 있으니, PR이 여는 순간 어긋납니다. 복원한 67MB는 처음부터 순수한 다운로드 낭비였습니다.

> 이 폐기는 버그가 아니라 안전장치입니다. Next.js가 config 지문을 대조하지 않았다면 결과는 느린 빌드가 아니라 **잘못된 배포**였을 겁니다. main용 basePath로 컴파일된 에셋이 PR 프리뷰로 나가 링크가 전부 404가 나는데, CI는 4분이 아니라 40초에 끝나서 "최적화가 잘 됐다"는 인상까지 줬을 겁니다. 느려진 것이 오히려 경보였습니다.

### hit으로 기록되면 저장도 못 합니다

여기서 끝이었으면 "쓸데없이 67MB 받는 낭비" 정도였을 겁니다. 진짜 문제는 두 번째였습니다. `actions/cache`는 primary key에 hit이 나면 이 로그를 남기고 저장 단계를 건너뜁니다.

```text
Cache hit occurred on the primary key, not saving.
```

캐시 액션 입장에선 합리적입니다. 이미 그 키로 캐시가 있으니 다시 올릴 이유가 없으니까요. 그런데 이 상황에서는 결과가 최악입니다.

PR은 main의 죽은 캐시로 "hit"을 받습니다. → 저장 단계가 건너뛰어집니다. → **PR은 자기 basePath에 맞는 캐시를 영원히 만들 수 없습니다.** → 다음 푸시에서도 똑같이 죽은 캐시를 받고 콜드 컴파일을 합니다.

> 캐시가 있는데 없는 것보다 나쁜 상태가 됐습니다. 내려받는 시간은 쓰고, 빌드는 매번 콜드로 돌고, 올바른 캐시가 생기는 것까지 막습니다.

main이 멀쩡했던 이유도 여기서 자명해집니다. main은 **자기가 구운 것을 자기가 꺼내 씁니다.** basePath가 같으니 2층을 통과하고, 그래서 64초입니다.

이 루프에 우연한 탈출구가 하나 있긴 했습니다. 키가 lock 해시와 core dist 해시로 되어 있어서, PR이 의존성이나 core 산출물을 바꾸면 키 자체가 main이 점유하지 않은 새 값이 됩니다. 그러면 miss가 나고, 이번에는 저장이 실행되고, 다음 푸시부터는 자기 캐시로 웜입니다. 즉 core를 건드리는 PR은 우연히 멀쩡했고, sandbox나 문서만 고치는 PR은 영원히 콜드였습니다. 증상이 PR마다 달랐던 것 — 이 버그가 오래 눈에 띄지 않은 이유 중 하나입니다.

## 파일이 아닌 입력은 키에서 저절로 빠집니다

그런데 왜 basePath는 키에 없었을까요. 부주의라기보다 기본값이 파놓은 함정에 가깝습니다.

```yaml
key: nextjs-sandbox-${{ hashFiles('pnpm-lock.yaml') }}-${{ hashFiles('packages/core/dist/**') }}
```

캐시 키는 관습적으로 `hashFiles()`로 짭니다. 그런데 `hashFiles()`는 **파일 시스템만 봅니다.** `SANDBOX_BASE_PATH`처럼 환경변수로 들어오는 입력은 빌드 결과를 아무리 좌우해도 여기 잡히지 않습니다. 사람이 손으로 적어 넣지 않는 한 구조적으로 누락됩니다.

파일 기반 입력은 자동으로 들어가고, 환경 기반 입력은 자동으로 빠집니다. 그리고 후자는 눈에 보이지 않습니다 — 키 문자열을 아무리 들여다봐도 "빠진 것이 있다"는 사실 자체를 알 수 없기 때문입니다.

이 고장이 다른 캐시로 번지지 않은 이유도 같은 자리에서 설명됩니다. pnpm store 같은 의존성 캐시는 산출물을 결정하는 입력이 lockfile 하나 — 즉 전부 파일이라 `hashFiles()`만으로 키가 완성됩니다. 내용도 content-addressed라 키가 헐거워도 잘못된 패키지를 집어올 수 없습니다. 위험한 쪽은 언제나 **빌드 산출물 캐시**입니다. 컴파일 결과는 그때의 config·환경변수·플래그에 통째로 물들어 있는데, 키는 보통 lockfile과 소스 해시만 담습니다. 그 틈이 이 버그의 서식지입니다.

## 빠진 입력을 키에 넣습니다

고치는 diff는 허무할 정도로 짧습니다. +17/−1 — 키에 넣은 한 조각과, 그 근거를 적은 주석이 전부입니다.

```yaml
key: nextjs-sandbox-pr${{ github.event.pull_request.number }}-${{ hashFiles('pnpm-lock.yaml') }}-${{ hashFiles('packages/core/dist/**') }}
```

`pr<n>` 한 조각을 넣은 게 전부입니다. PR 번호는 basePath를 결정하는 값입니다. 키에 들어갈 수 없던 입력(환경변수)을, 키에 들어갈 수 있는 대리 값으로 바꿔 넣은 셈입니다. 이제 각 PR은 첫 푸시에서 자기 캐시를 굽고, 이후 푸시에서 진짜 워밍 캐시를 씁니다. main은 원래부터 자기가 구운 캐시를 자기가 꺼내 쓰고 있었으니 그대로 둡니다.

### restore-keys는 넣지 않았습니다

키를 세분화하면 자연스럽게 "그럼 `restore-keys`로 느슨한 폴백을 두자"는 생각이 따라옵니다. 일부러 넣지 않았습니다. 이 저장소에는 이력이 있습니다 — Next.js 모듈 캐시에는 `@astryxdesign/core`의 resolved export graph가 함께 구워지는데, 느슨한 폴백이 다른 export 형태로 빌드된 캐시를 복원하면 조용히 잘못된 빌드가 나옵니다(#2941의 머지 후 배포가 이 방식으로 깨졌습니다). 이 저장소의 정책은 "캐시 hit률 최대화"가 아니라 **"틀린 빌드를 절대 만들지 않기"**입니다. 키가 바뀌면 콜드 리빌드가 나는 편이 안전합니다.

### 고쳤더니 hit률이 떨어집니다

직관에 반하는 지점이 하나 있습니다. 이 수정의 성공 신호는 **miss**입니다. 각 PR의 첫 푸시는 이제 반드시 miss니까요. 그래서 테스트 플랜에는 일부러 체크되지 않은 항목을 남겼습니다. "이 PR의 첫 푸시는 캐시 miss가 예상된다 — 그게 수정이 작동한다는 증거다. 후속 커밋을 푸시해 두 번째 run이 `nextjs-sandbox-pr<n>-…`를 복원하고 컴파일이 240초에서 64초급으로 떨어지는지 확인할 것." 이걸 적어두지 않으면, 다음 사람이 hit률 그래프만 보고 "캐시가 안 먹네" 하며 되돌려 놓습니다.

머지 후 워밍 캐시가 걸린 재푸시 기준으로 PR CI 총 소요는 8분 56초에서 5분 10초가 됐습니다. 다만 이 숫자는 23분 간격으로 머지된 병렬화 PR([#3811](https://github.com/facebook/astryx/pull/3811))과의 **합산 효과**라, 캐시 수정만의 몫을 분리해 말할 수는 없습니다.

### 남은 한계: 첫 푸시는 어떤 키 설계로도 웜이 될 수 없습니다

pr 키에도 결함이 남습니다. `.next/cache`는 매 빌드 갱신되는데, 두 번째 푸시부터는 또 primary hit이 나므로 저장이 다시 스킵됩니다. 그 PR의 캐시는 첫 푸시 시점에 얼어붙는 셈입니다.

이를 피하는 대안으로, primary key 끝에 커밋 SHA를 물려 hit이 구조적으로 나지 않게 만들고(그러면 저장이 항상 실행됩니다) 복원은 `restore-keys`의 접두사 매칭에 맡기는 rolling 키가 있습니다. 하지만 그 느슨한 폴백이 정확히 위에서 거부한 것입니다. basePath가 다른 캐시를 접두사로 물려받는 순간 지금 고친 버그가 폴백 경로로 되살아나고, 그렇다고 basePath를 접두사에 남기면 PR별로 갈려서 결국 pr 키와 같아집니다.

즉 **basePath가 PR마다 다른 한, 첫 푸시는 어떤 키 설계로도 웜이 될 수 없습니다.** 제약이 하나 더 있습니다. GitHub Actions 캐시는 브랜치 스코프라, PR run이 읽을 수 있는 것은 자기 브랜치와 base·기본 브랜치의 엔트리뿐입니다. PR 첫 푸시를 덥힐 수 있는 시드는 main 캐시 하나뿐이라는 뜻입니다.

그러면 근본 처방은 키 바깥에 있습니다. **main 캐시가 PR 빌드에서도 유효하게 만드는 것** — basePath를 빌드타임 입력에서 빼는 것입니다. 에셋을 상대 경로로 내보내거나 프리뷰를 경로가 아니라 서브도메인으로 배포하면 모든 컨텍스트의 basePath가 같아지고, 키를 가를 이유 자체가 사라집니다. 이번 PR은 `ci.yml`로 끝나는 키 수정을 택했고, 첫 푸시의 콜드는 고친 것이 아니라 **감수한** 것입니다. 순서는 기억해 둘 만합니다 — "캐시 키를 어떻게 짤까"를 고민하기 전에 "이 입력이 정말 달라야 하나"를 먼저 물어보는 것입니다.

## 이 패턴을 다른 저장소에 옮긴다면

| 축 | 물어볼 것 |
| --- | --- |
| **키에 넣을 것** | 산출물을 바꾸는 입력이 전부 들어갔나. `hashFiles()`는 파일만 보므로 환경변수·플래그·툴체인 버전은 손으로 넣어야 한다 |
| **갈라야 할 컨텍스트** | 섞이면 안 되는 축(PR↔main, OS, 런타임 버전, matrix 조합)이 키 접두사에 있나 |
| **폴백 정책** | `restore-keys`로 웜을 최대화할지, 정확성을 위해 콜드를 감수할지. 폴백을 쓴다면 갈라야 하는 축이 접두사에도 남아 있나 |

검증은 키를 읽어서 하는 것이 아닙니다. 빠진 입력은 키 문자열을 아무리 들여다봐도 보이지 않습니다. 캐시 스텝마다 이 한 줄만 대보면 됩니다.

> `Cache restored successfully` 다음 줄의 소요 시간이, 그 캐시를 지웠을 때와 유의미하게 다른가?

같으면 그 캐시는 죽어 있습니다.

## 마치며

캐시 hit은 "키 문자열이 같았다"는 뜻일 뿐이라, 캐시의 생사는 hit 이후의 컴파일 시간을 콜드 대조군과 비교해야 알 수 있습니다. 이번 사례에서 키는 정확히 맞았지만, Next.js가 basePath 다른 캐시를 열어보고 통째로 버리고 있었고, hit으로 기록된 탓에 올바른 캐시가 저장될 기회조차 없었습니다. basePath가 키에서 빠진 것은 부주의가 아니라 `hashFiles()`가 파일만 보기 때문입니다. 그래서 키에 PR 번호를 넣어, 각 PR이 자기 캐시를 굽게 했습니다.

여러분의 CI에도 캐시 스텝이 있다면, 지금 가장 최근 run의 로그를 열어보세요. 확인은 5분이면 끝납니다. `Cache restored successfully` 다음 줄의 빌드 시간이 캐시가 없던 시절과 정말로 다른가요. 비슷하게 "hit인데 안 빨라지는" 캐시를 만나신 적 있다면 댓글로 공유해 주세요.

- 근거 PR: [facebook/astryx#3864 — perf(ci): key sandbox next cache by PR to stop cross-basepath invalidation](https://github.com/facebook/astryx/pull/3864) · 배경이 된 병렬화 PR: [#3811 — perf(ci): build sandbox preview in parallel with storybook](https://github.com/facebook/astryx/pull/3811) (둘 다 2026-07-12 머지)
- 참고 문서: [webpack `cache.version` — 버전이 다르면 캐시를 재사용하지 않는다](https://webpack.js.org/configuration/cache/#cacheversion) · [Next.js가 config 값들로 캐시 버전 문자열을 만드는 곳 — `build/webpack-config.ts#L2380-L2423` (v16.3.1)](https://github.com/vercel/next.js/blob/v16.3.1/packages/next/src/build/webpack-config.ts#L2380-L2423)
