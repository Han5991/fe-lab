# 플레이그라운드 사양 (`<playground>`)

이슈 [#140](https://github.com/Han5991/fe-lab/issues/140)을 **구현 착수 가능한 수준**으로 확정한
문서. 이슈는 "왜 만드는가"와 큰 방향을 담고 있고, 여기는 "무엇을 어떤 계약으로 만드는가"를 담는다.

읽는 순서: §1(왜 이 문서가 따로 필요한가) → §2~§6(계약) → §7(실험 3종) → §12(단계·완료 기준).
글 쓰는 사람은 §2만 보면 된다.

---

## 1. 이슈에서 바뀐 결정

이슈를 그대로 구현하려다 막힌 지점과, 이 문서에서 내린 결론.

| # | 이슈의 서술 | 문제 | 이 문서의 결정 |
| :-- | :--- | :--- | :--- |
| 1 | `<playground>` 태그 예시 | 이슈 본문의 코드블록이 HTML 이스케이프로 **통째로 비어 있다**. 문법이 사실상 미정 | §2에서 확정. 속성은 전부 문자열, self-closing 금지 |
| 2 | "플레이그라운드 없는 글의 초기 번들 크기 변화 **0**" | `PostClient`의 `components` 맵에 태그를 등록하는 순간 셸은 **모든 글**의 청크에 들어간다. 문자 그대로의 0은 달성 불가 | §4에서 **셸(정적) / 러너(클릭 시)** 로 쪼개고, 완료 기준을 "셸 ≤ 4KB gzip, 무거운 의존성은 클릭 전 0바이트"로 재정의 |
| 3 | "JS 실패 시 기록된 표로 폴백" + "`ssr: false` 로 클라이언트 전용" | 둘이 충돌한다. `ssr: false` 로 감싸면 정적 HTML에 **아무것도 안 남아** 폴백할 표가 없다 | §4. 기준선 표는 **프리렌더된 HTML에 들어간다**. `ssr: false` 는 러너에만 적용 |
| 4 | `ExperimentDef.run(params, signal)` | 진행률 보고 경로가 없어 무거운 실험이 UI를 멈춘다(이슈가 요구한 "청크로 쪼개기"를 못 함) | §3. `RunContext` 로 감싸 `onProgress` · `yieldToMain` 을 계약에 넣는다 |
| 5 | "브라우저에서 호출 횟수가 **똑같이 나온다**" | 검증 안 된 가정이다. 호출 횟수는 라이브러리 제어 흐름이 정하고, 그 흐름은 **계산된 스타일 값에 따라 분기**한다(가시성 조기 종료) | §7.2. 동등성은 **선결 검증 과제**로 두고, 어긋나면 `facts` 를 배율·구조 명제로 낮춘다 |
| 6 | 실험 3종의 이름·범위 | 이름만 있고 픽스처·기대값·판정 기준이 없다 | §7에서 픽스처 DOM·절차·`facts` 문구·기대값까지 고정 |
| 7 | (없음) | 오타난 `experiment` 이름이 조용히 빈 자리로 남는 문제 | §9. `lint:posts` 에 `unknown-experiment` 규칙 추가 (`unknown-hero-diagram` 선례) |

이슈의 나머지 결정 — MDX로 가지 않음, 임의 코드 실행 없음, WebContainer 탈락(COOP/COEP를 GitHub
Pages가 못 준다), jsdom 브라우저 구동 탈락 — 은 **그대로 유지한다.**

---

## 2. 저작 문법 (확정)

```html
<playground experiment="role-query-calls"></playground>
```

파라미터 기본값을 글에서 덮어쓸 때만 속성을 더 준다.

```html
<playground experiment="style-cache" defaults='{"buttons":85,"cssRules":2000}' title="4구간 직접 재보기"></playground>
```

| 속성 | 필수 | 설명 |
| :--- | :--: | :--- |
| `experiment` | ✅ | 등록된 실험 id(§3). 미등록이면 `lint:posts` 가 막는다 |
| `defaults` | | 파라미터 초기값 JSON **문자열**. 실험이 선언한 `min`/`max` 로 클램프되고, 모르는 키는 무시 |
| `title` | | 카드 제목. 생략하면 실험 모듈의 `title` |
| `baseline` | | `"hide"` 를 주면 기준선 열을 숨긴다(기록값이 문맥상 무의미한 자리) |

**함정은 기존 시그니처 컴포넌트와 동일하다.** 본문은 MDX가 아니라 `react-markdown` +
`rehype-raw` 이므로:

- **self-closing 금지.** `<playground … />` 로 쓰면 뒤따르는 본문이 그 안에 중첩돼 사라진다.
- 속성 값은 **전부 문자열**이다. `defaults` 는 JSON을 홑따옴표로 감싼 문자열로 준다.
- 여는 태그는 줄 맨 앞, 블록 앞뒤로 빈 줄.
- `defaults` JSON이 깨지면 **throw하지 않고** 실험 기본값으로 간다(`parseItemsProp` 과 같은
  fail-soft 원칙 — 글 하나의 오타로 페이지가 죽으면 안 된다).

---

## 3. 파일 배치와 타입 계약

### 3.1 배치 — 이름과 구현을 쪼갠다

`diagramNames.ts` ↔ `diagram/registry.ts` 선례를 그대로 따른다. 이유도 같다:
`scripts/validate-posts.ts` 는 `node --import tsx` 로 도는 순수 노드 스크립트라, 이름 목록이
React·Panda를 끌어오는 `.tsx` 안에 있으면 검증 스크립트가 UI 번들에 묶인다.

```
apps/blog/web/
├── domain/post/experimentIds.ts            # 이름만. validate-posts가 import
└── src/components/post/markdown/Playground/
    ├── Playground.tsx                      # 셸 — 정적 프리렌더 대상 (§4)
    ├── PlaygroundRunner.tsx                # 컨트롤 + 실행 + 결과. ssr:false 동적 로드
    ├── registry.ts                         # id → () => import(실험 모듈)
    ├── types.ts                            # 아래 계약
    ├── measure.ts                          # 반복·중앙값·양보·Abort (§5)
    ├── env.ts                              # 독자 환경 수집 (§6.2)
    ├── baselines/
    │   ├── accessible-name.json
    │   ├── role-query-calls.json
    │   └── style-cache.json
    └── experiments/
        ├── accessibleName.ts
        ├── roleQueryCalls.ts
        └── styleCache.ts
```

`experimentIds.ts` 는 `DIAGRAM_NAMES` 와 같은 모양이다.

```ts
export const EXPERIMENT_IDS = [
  'accessible-name',
  'role-query-calls',
  'style-cache',
] as const;

export type ExperimentId = (typeof EXPERIMENT_IDS)[number];

export function isExperimentId(value: unknown): value is ExperimentId {
  return (
    typeof value === 'string' &&
    (EXPERIMENT_IDS as readonly string[]).includes(value)
  );
}
```

레지스트리는 `Record<ExperimentId, …>` 로 못박아 **한쪽만 등록하면 컴파일이 막게** 한다.
기준선 JSON도 같은 맵에 정적으로 실린다(작고, 폴백이므로 클릭 전에 있어야 한다).

```ts
export const EXPERIMENTS: Record<
  ExperimentId,
  { baseline: Baseline; load: () => Promise<{ default: Experiment }> }
> = {
  'accessible-name': {
    baseline: accessibleNameBaseline,
    load: () => import('./experiments/accessibleName'),
  },
  // …
};
```

### 3.2 타입 (`types.ts`)

이슈의 스케치에서 제네릭이 이스케이프로 날아가 있어 여기서 완전한 형태로 고정한다.

```ts
/** 슬라이더 하나. 실험 모듈이 소유하고, 글의 `defaults` 는 초기값만 덮어쓴다. */
export interface ParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  /** '개', 'ms' 처럼 값 뒤에 붙는 단위. */
  unit?: string;
}

/** 통과/실패로 판정되는 구조적 명제. 이 위젯의 핵심 산출물. */
export interface Fact {
  /** "후보 86개 전부의 이름이 계산된다" */
  claim: string;
  /** 사람이 읽을 기대값. "86" */
  expected: string;
  /** 실제 측정값. "86" */
  actual: string;
  passed: boolean;
}

/** 결과 표 한 줄. */
export interface Row {
  label: string;
  /** 이번 실행값. 숫자면 §5의 통계가 붙는다. */
  value: number | string;
  unit?: string;
  /** 기록된 jsdom 값(§6). 있으면 나란히 렌더된다. */
  baseline?: number | string;
  /** 반복 측정한 행만. */
  stats?: { median: number; min: number; max: number; runs: number };
  note?: string;
}

export interface RunResult {
  rows: Row[];
  facts: Fact[];
  /** 실행 중 알게 된 한계(타이머 해상도 등). 결과 아래 회색 주석으로 렌더. */
  warnings?: string[];
}

export interface RunContext {
  params: Record<string, number>;
  signal: AbortSignal;
  /** 0~1. 진행 막대 갱신용. */
  onProgress: (ratio: number, label?: string) => void;
  /** 긴 루프 중간에 await 해서 메인 스레드를 놓아준다(§5.3). */
  yieldToMain: () => Promise<void>;
}

export interface Experiment {
  id: ExperimentId;
  title: string;
  /** 실행 전 카드에 접힌 채로 보여줄 절차 설명(마크다운 아님, 평문). */
  method: string;
  params: ParamSpec[];
  /** 타이밍 없는 결정론 실험은 false — §5의 반복 측정 UI를 감춘다. */
  timed: boolean;
  run: (ctx: RunContext) => Promise<RunResult>;
}
```

---

## 4. 렌더 파이프라인과 번들 경계

이슈의 완료 기준 두 개가 서로 충돌한다(§1의 #2·#3). 다음과 같이 가른다.

```
빌드 타임(정적 export)          클릭 시(동적 청크)
┌──────────────────────────┐    ┌────────────────────────────────┐
│ Playground.tsx (셸)      │    │ PlaygroundRunner.tsx           │
│  - 제목 / 절차 설명       │───▶│  - 슬라이더 · 실행 · 중단      │
│  - 기준선 표 (JSON)      │    │  - import('experiments/…')     │
│  - "실행" 버튼(비활성)    │    │     └▶ @testing-library/dom    │
└──────────────────────────┘    │        dom-accessibility-api   │
   ⇧ HTML에 그대로 남는다        └────────────────────────────────┘
   = JS 없어도 읽을 표
```

- **셸**은 `PostClient` 의 `components` 맵에 등록되므로 모든 글의 청크에 실린다. 그래서 셸은
  Panda `css()` + 정적 JSON만 쓰고 무거운 것을 **정적으로 참조하지 않는다.** (`CodeBlock` 이
  `mermaidBoxStyle` 을 `MermaidChart` 와 합치지 않고 복제해 둔 것과 같은 이유 — 정적 참조
  하나면 dynamic import가 무의미해진다.)
- **러너**는 `next/dynamic(… , { ssr: false })`. 로딩 자리는 셸이 이미 잡고 있으므로
  레이아웃 시프트가 없다(`mermaidBoxStyle` 선례).
- 실험 모듈과 `@testing-library/dom` 은 러너 안에서 **버튼을 누른 뒤** `import()`.

**재정의한 완료 기준**

| 이슈 기준 | 대체 기준 |
| :--- | :--- |
| 플레이그라운드 없는 글의 초기 번들 변화 0 | 셸이 공유 청크에 더하는 양 **≤ 4KB gzip**, `@testing-library/dom` · `dom-accessibility-api` · 실험 모듈은 **클릭 전 0바이트** (`.next` 청크 목록으로 확인) |

---

## 5. 측정 프로토콜

글이 "재봐야 안다"를 가르치므로, 위젯의 측정 규율이 글보다 허술하면 안 된다.

### 5.1 반복

- 워밍업 **1회**(버림) → 본 측정 **N회**(기본 7, 파라미터로 3~15)
- 대표값은 **중앙값**. 평균 금지(한 번의 GC 스파이크가 평균을 끌고 간다)
- 표에는 `중앙값 (최소~최대, n=7)` 을 같이 적는다. 단일 측정값만 노출하는 UI는 만들지 않는다

### 5.2 타이머 해상도

GitHub Pages는 응답 헤더를 못 넣으므로 **`crossOriginIsolated` 가 아니다.** 따라서
`performance.now()` 는 브라우저가 정한 만큼 뭉개진 값을 준다(Chrome 100µs, Firefox 1ms 급).

- 개별 호출 1회를 재지 않는다. **한 구간 전체(수백 회)를 재고** 필요하면 나눈다
- 한 구간의 중앙값이 **5ms 미만**이면 그 행에 `측정 하한 근처 — 해상도 제한` 경고를 붙인다
- `crossOriginIsolated === false` 를 결과 메타에 그대로 표기한다

### 5.3 메인 스레드

- 실험 루프는 `ctx.yieldToMain()` 을 **후보 16개마다** await 한다
  (구현: `scheduler.yield?.() ?? new Promise(r => setTimeout(r, 0))`)
- `ctx.signal.aborted` 를 같은 지점에서 확인하고 `AbortError` 로 빠져나온다
- 중단 버튼은 실행 중 항상 활성

### 5.4 자동 실행 금지

명시적 버튼으로만 실행한다. `IntersectionObserver` 로 스크롤 진입 시 실행하는 안은 채택하지
않는다 — 저사양 기기에서 글 읽는 사람이 원치 않은 부하를 진다.

---

## 6. 기준선(baseline) 포맷

### 6.1 스키마

```jsonc
{
  "experiment": "role-query-calls",
  "recordedAt": "2026-07-27",
  "env": {
    "runtime": "node <재현 시 기록>",
    "jsdom": "27.4.0",
    "libs": { "@testing-library/dom": "10.4.1", "dom-accessibility-api": "<재현 시 기록>" },
    "note": "글쓴이 재현 환경. astryx CI 실측치가 아님"
  },
  "rows": [
    { "label": "role만", "value": 0, "unit": "회" },
    { "label": "role + name", "value": 256, "unit": "회" },
    { "label": "role + hidden", "value": 176, "unit": "회" },
    { "label": "셋 다", "value": 261, "unit": "회" }
  ]
}
```

- **출처를 반드시 적는다.** 글이 이미 `<details>` 로 "재현 환경 값 vs astryx 실측치"를 구분하고
  있다. 위젯이 그 구분을 지우면 글의 정직성이 후퇴한다
- 기준선 JSON은 `scripts/` 의 재현 스크립트가 **생성**한다. 손으로 고치지 않는다
  (재현 스크립트는 PR #139 작업물에서 옮겨온다 — 현재 저장소에는 없으므로 1단계에서 함께 커밋)

### 6.2 독자 환경 표기

결과 표 아래 mono 12px 한 줄로 자동 표기한다.

`userAgent` · `navigator.hardwareConcurrency` · `deviceMemory`(있으면) · `crossOriginIsolated` ·
측정 시각. IP·화면 크기 등 식별성이 올라가는 값은 **수집하지 않고**, 어디에도 전송하지 않는다
(전부 클라이언트에서 끝난다 — 서버가 없다).

---

## 7. 실험 3종

각 실험은 **환경 의존성 등급**을 갖는다. 이 등급이 `facts` 로 갈지 `rows` 로 갈지를 정한다.

| 등급 | 뜻 | 렌더 |
| :--- | :--- | :--- |
| **A. 결정론** | 어느 엔진에서든 같은 값 | `facts` — 통과/실패 판정 |
| **B. 구조적** | 값은 같아야 하지만 검증 필요 | 검증 전엔 `rows`, 검증 후 `facts` 승격 |
| **C. 환경 의존** | 브라우저마다 다름. 그 차이가 논지 | `rows` + 기준선 나란히 |

### 7.1 `accessible-name` — 등급 A (1단계)

**픽스처** (글 5장의 코드와 동일하게 유지한다 — 글과 위젯이 다른 DOM을 쓰면 안 된다)

```html
<button id="a"><span style="display: none">지난달</span> <span>15일</span></button>
```

**절차** — 세 값을 구해 비교한다. 타이밍 없음, 파라미터 없음.

| 항목 | 방법 | 기대값 |
| :--- | :--- | :--- |
| `textContent` | `button.textContent.trim()` | `"지난달 15일"` |
| 접근성 이름 | `computeAccessibleName(button)` | `"15일"` |
| 스텁 주입 | `computeAccessibleName(button, { getComputedStyle: () => visibleStyleStub })` | `"지난달 15일"` |

**facts**

1. `접근성 이름은 textContent와 다르다` — `"15일" !== "지난달 15일"`
2. `숨은 자식이 이름에서 빠진다` — 이름에 `"지난달"` 없음
3. `스텁을 주입하면 숨은 자식이 되살아난다` — 글 8장의 **트레이드오프가 눈앞에서 재현된다**

3번이 이 실험을 첫 타자로 고른 진짜 이유다. 해법(7장)과 그 대가(8장)를 한 위젯이 동시에
보여준다. 브라우저에서는 진짜 CSS가 적용되므로 jsdom보다 **오히려 강한** 증명이 된다.

### 7.2 `role-query-calls` — 등급 B (2단계, 핵심)

**픽스처** — 달력 구조를 파라미터로 재현한다.

```
<div>
  <button>Open calendar</button>          ← 트리거 1개, 자식은 텍스트뿐
  <div style="display:none">              ← 닫힌 팝오버(언마운트되지 않음)
    <button>1</button> … <button>85</button>
  </div>
</div>
```

**파라미터**: `buttons`(날짜 버튼 수, 1~200, 기본 85), `cssRules`(주입할 스타일 규칙 수,
0~5000, 기본 0 — 여기선 호출 횟수만 보므로 기본은 규칙 없음)

**절차** — `window.getComputedStyle` 을 카운팅 래퍼로 교체하고 4조합을 각각 실행한 뒤 복원한다.
래퍼는 `try/finally` 로 복원하고, 러너 언마운트 시에도 복원되게 한다(전역 오염 금지).

| 조합 | 호출 | jsdom 기준선 |
| :--- | :--- | ---: |
| `getAllByRole('button', {hidden:true})` | role만 | 0회 |
| `getAllByRole('button', {name, hidden:true})` | role + name | 256회 |
| `getAllByRole('button')` | role + hidden | 176회 |
| `getByRole('button', {name})` | 셋 다 | 261회 |

**facts (기본 파라미터 기준)**

1. `후보 86개 전부의 이름이 계산된다` — `.filter()` 가 첫 매치에서 멈추지 않음
2. `숨은 노드 85개도 예외 없이 계산된다`
3. `후보당 getComputedStyle이 약 3회 불린다` — 총 261회

> **선결 검증 과제.** "브라우저에서도 같은 횟수"는 아직 가정이다. 호출 횟수는 라이브러리
> 제어 흐름이 정하는데, 그 흐름은 **계산된 스타일 값에 따라 분기**한다(가시성 조기 종료).
> 실제 CSS 캐스케이드가 도는 브라우저에서 jsdom과 다른 값이 나올 수 있다.
> 2단계 착수 시 **같은 픽스처를 vitest(jsdom)와 브라우저에서 각각 돌려 대조**하고,
>
> - 일치하면 위 3개를 `facts` 로 확정한다
> - 어긋나면 절대값을 버리고 배율 명제(`name 필터가 role 필터보다 두 자릿수 많이 부른다`,
>   `후보 수에 선형 비례한다`)로 낮춘 뒤, 두 값을 `rows` 에 나란히 놓는다
>
> 어느 쪽이든 **"브라우저에서 x회가 나와야 한다"고 단정하는 문구를 검증 전에 커밋하지 않는다.**

### 7.3 `style-cache` — 등급 C (3단계)

**절차** — 글 6장의 4구간을 그대로 재현한다.

| 구간 | 측정 | jsdom 기준선 |
| :--- | :--- | ---: |
| 1. 렌더 | 버튼 N개 + CSS 규칙 M개 삽입 | 9.7ms |
| 2. 스타일 첫 조회(콜드) | 전 후보 `getComputedStyle` 순회 | 463.4ms |
| 3. 재조회(캐시 히트) | 같은 순회 반복 | 8.8ms |
| 4. DOM 한 번 건드린 뒤 | 속성 하나 변경 후 순회 | 266.5ms |

**파라미터**: `buttons`(1~200, 기본 85), `cssRules`(0~5000, 기본 2000), `repeats`(3~15, 기본 7)

여기서 브라우저 값은 jsdom과 **크게 다를 것이고, 그 차이가 곧 결론이다** —
"브라우저는 렌더할 때 스타일을 계산해두고, jsdom은 물어볼 때 계산한다". 그래서 이 실험만
`facts` 가 아니라 **두 열 비교**가 본체다. 결과 아래 고정 문구로 그 해석을 붙인다.

레이아웃 스래싱 때문에 4구간이 서로 오염되지 않도록, 각 구간 시작 전에 강제 리플로우
(`void el.offsetHeight`)로 상태를 정렬하고 그 비용은 측정 밖에 둔다.

---

## 8. 실패·폴백 매트릭스

글이 깨지지 않는 것이 실행되는 것보다 우선한다.

| 상황 | 동작 |
| :--- | :--- |
| JS 비활성 / 하이드레이션 실패 | 셸이 프리렌더한 **기준선 표 + 출처** 그대로. 실행 버튼은 비활성 |
| 러너 청크 로드 실패 | 기준선 표 유지 + `실행 환경을 불러오지 못했습니다` 주석 |
| 실험 실행 중 throw | 기준선 표 유지 + 에러 메시지 1줄(스택 노출 안 함) + 재시도 버튼 |
| 중단(Abort) | 부분 결과 폐기, 기준선 표로 복귀 |
| `defaults` JSON 파싱 실패 | 실험 기본값으로 실행. 콘솔 경고만 |
| 미등록 `experiment` id | 렌더는 조용히 아무것도 안 그린다(글 보호). **`lint:posts` 가 빌드 전에 에러**로 잡는다 |
| `experiment` 속성 누락 | 위와 동일 |

`unknown-hero-diagram` 과 정확히 같은 원칙이다 — 런타임은 fail-soft, 침묵은 린트가 깬다.

---

## 9. `lint:posts` 새 규칙

`scripts/validate-posts.ts` 는 지금 frontmatter와 본문 이미지를 검사한다. 본문 스캔 경로에
규칙 두 개를 더한다.

| 규칙 | 심각도 | 조건 |
| :--- | :--- | :--- |
| `unknown-experiment` | error | `<playground>` 의 `experiment` 가 `EXPERIMENT_IDS` 밖이거나 누락 |
| `playground-self-closing` | error | `<playground … />` 형태 — 뒤 본문을 삼키므로 경고가 아니라 에러 |

`defaults` JSON 오류는 런타임이 fail-soft로 흡수하므로 **warning**으로만 알린다.
(다이어그램 태그도 같은 함정이 있으므로, `playground-self-closing` 구현 시 `<diagram-node />`
까지 함께 잡을지는 별건으로 분리한다 — 이 이슈의 범위 밖.)

---

## 10. 의존성 변경

| 패키지 | 현재 | 변경 | 비고 |
| :--- | :--- | :--- | :--- |
| `@testing-library/dom` | `devDependencies ^10.4.0` | **`dependencies` 로 승격(이동)** | 실물 라이브러리가 호출해야 §7.2가 증거가 된다. 재구현하면 증명력이 사라진다 |
| `dom-accessibility-api` | 없음(전이 의존) | **`dependencies` 에 신규 추가** | §7.1이 직접 부른다. 전이 의존에 기대면 버전이 조용히 흔들린다 |

`@testing-library/dom` 은 `pretty-format` · `lz-string` · `aria-query` 를 끌고 온다(에러 메시지
포매팅용). 클릭 시에만 받으므로 초기 로드에는 안 실리지만, **클릭 후 청크 크기를 1단계에서
실측해 이 표에 기록한다.** 500KB(gzip)를 넘으면 실행 버튼 옆에 다운로드 크기를 미리 표기한다.

> 현재 작업 환경에 `node_modules` 가 없어 실측하지 못했다. 1단계의 첫 과제다.

---

## 11. 시각·접근성 규칙

디자인 시스템 규칙(§CLAUDE.md)을 그대로 따른다. 새로 정하는 것만 적는다.

- 카드는 `<diagram>` · `<metrics>` 와 같은 지면: `bg paper.100` / `borderWidth hairline` /
  `rounded card` / `my 10`. **그림자·그라데이션 금지**
- **수치는 전부 `fontFamily: mono`** (날짜·조회수와 같은 계열). 라벨과 `claim` 문구는 sans
- 통과/실패 표시는 색만으로 구분하지 않는다 — `✓`/`✗` 문자 + `moss.700`/`danger.text`
- 결과 표는 본문 표와 같은 가로 스크롤 처리:
  `role="region"` + `aria-label` + `tabIndex={0}` + `overflowX: auto`
  (axe `scrollable-region-focusable`)
- 결과 영역은 `role="status"` + `aria-live="polite"`. 실행 중 진행률은 **읽지 않는다**
  (`aria-live` 폭주 방지). 완료 시 요약 한 문장만 읽힌다
- 실행 버튼은 실행 중 `aria-busy="true"`, 라벨이 "중단"으로 바뀐다
- `prefers-reduced-motion` 이면 진행 막대 애니메이션 없이 숫자만 갱신
- 포커스를 결과로 강제 이동시키지 않는다(읽던 자리를 뺏지 않는다)

---

## 12. 단계와 완료 기준

각 단계는 **독립적으로 머지 가능**하다. 1단계만 들어가도 글은 개선되고, 2·3단계가 없어도
깨지지 않는다.

### 1단계 — 뼈대 + `accessible-name`

- [ ] `<playground>` 태그가 `PostClient` 에 등록되고 §2 문법대로 동작
- [ ] `experimentIds.ts` + `registry.ts` 이원화, `Record<ExperimentId, …>` 로 강제
- [ ] 셸/러너 분리 — 정적 HTML에 기준선 표가 남는 것을 `out/` 산출물에서 직접 확인
- [ ] `accessible-name` 실험 3개 `facts` 통과
- [ ] `lint:posts` 두 규칙 + 그 테스트
- [ ] 셸 추가분 ≤ 4KB gzip, 클릭 전 `@testing-library/dom` 0바이트 — 청크 목록으로 확인
- [ ] 클릭 후 청크 크기 실측값을 §10 표에 기록
- [ ] `pnpm build --filter=@blog/web` 정적 export 성공

### 2단계 — `role-query-calls`

- [ ] **선결**: 같은 픽스처의 jsdom↔브라우저 호출 횟수 대조 결과를 이 문서에 기록
- [ ] 그 결과에 따라 `facts` 를 절대값 또는 배율 명제로 확정(§7.2)
- [ ] `getComputedStyle` 래퍼가 어떤 경로로 끝나도 복원됨(언마운트·throw·abort 각각 테스트)
- [ ] 글 5장의 4조합 표를 위젯으로 대체하고, 표는 기준선 열로 남긴다

### 3단계 — 파라미터 + 타이밍

- [ ] 슬라이더(`buttons` · `cssRules` · `repeats`), 중단 버튼 동작
- [ ] 워밍업 1 + N회 중앙값 + 최소~최대 표기, 5ms 미만 행에 해상도 경고
- [ ] 독자 환경 자동 표기(§6.2)
- [ ] 글 6장의 4구간 수치를 위젯으로 대체, jsdom 기준선과 나란히
- [ ] 무거운 파라미터(200개 × 5000규칙)에서 메인 스레드 블로킹 없음 — 중단이 즉시 먹힘

### 4단계 (선택)

- [ ] 파라미터를 쿼리스트링에 인코딩한 permalink (`nuqs` 가 이미 의존성에 있다)
- [ ] 전체 재현용 StackBlitz 링크

---

## 13. 미해결 / 검증 필요

| 항목 | 왜 미정 | 언제 정하나 |
| :--- | :--- | :--- |
| 브라우저↔jsdom 호출 횟수 동등성 | 검증 안 된 가정(§7.2) | 2단계 선결 |
| `@testing-library/dom` 클릭 후 청크 실크기 | 이 환경에 `node_modules` 없음 | 1단계 |
| 재현 스크립트의 위치 | PR #139 작업물이 저장소에 없다 | 1단계에서 `scripts/` 로 옮기며 결정 |
| 다른 글에서의 재사용 | 지금 실험 3개가 전부 이 글 전용 | 두 번째 글이 생길 때 |

### 13.1 확인 완료 — 정적 표를 위젯으로 "대체"하면 텍스트에서 숫자가 사라진다

빌드 산출물 세 곳의 처리를 확인했다.

| 산출물 | `<playground>` 처리 | 결과 |
| :--- | :--- | :--- |
| `search-index.json` | `toPlainText` 가 `/<[^>]+>/g` 로 **태그를 통째로 제거** | 숫자가 검색에서 사라짐 |
| `llms-full.txt` | `[#\`*\[\]]` 만 제거 — **태그가 raw로 남음** | LLM은 `<playground …>` 라는 껍데기만 읽음 |
| `rss.xml` | 본문 텍스트 기반 | 위와 동일 |

즉 **마크다운의 표를 지우고 위젯만 남기면**, 그 글의 핵심 수치가 검색·RSS·LLM 텍스트에서
통째로 증발한다. `<diagram>` 은 그림이라 상관없었지만 위젯은 숫자를 담는다.

> **결정: 위젯은 표를 대체하지 않고 표 "앞"에 놓는다.**
> 마크다운 표는 그대로 두되 `<details>` 로 접어 "기록된 jsdom 값 (펼치기)"로 남긴다.
> 글 5·6장이 이미 `<details>` 로 재현 환경 값을 구분해 두고 있어 문체도 어긋나지 않는다.
> §12의 2·3단계 "위젯으로 대체" 항목은 이 규칙으로 읽는다 — **본문 자리 대체, 텍스트 보존.**
