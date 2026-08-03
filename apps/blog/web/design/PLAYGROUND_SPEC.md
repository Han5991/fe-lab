# 플레이그라운드 사양 (`<playground>`)

**글 안에서 실행되는 증거**를 붙이기 위한 공용 설비의 사양. 이슈
[#140](https://github.com/Han5991/fe-lab/issues/140)에서 출발했지만, 이슈가 다루는
getByRole 글은 **첫 소비자**일 뿐이고 이 문서의 주제가 아니다.

목표는 이것이다.

> 글에 "제가 재봤더니 이랬습니다"라고 쓰는 대신, **독자가 자기 브라우저에서 눌러 확인하게** 한다.
> 그리고 그걸 붙이는 비용이 `<diagram>` 하나 붙이는 정도여야 한다.

읽는 순서

| 당신이 | 읽을 곳 |
| :--- | :--- |
| 글에 위젯을 붙이려는 저자 | §2 문법 → §3 종류 → §17 후보 목록 |
| 새 실험을 추가하려는 저자 | §3 → §8 하네스 → §14 체크리스트 |
| 이 설비를 구현하려는 사람 | 전부. 특히 §4(이슈에서 바뀐 결정) · §6(계약) · §7(번들 경계) |

---

## 1. 범위 — 무엇이 되고 무엇이 안 되는가

이 설비는 **서버가 없고**(GitHub Pages 정적 export), **임의 코드를 실행하지 않으며**(등록된
모듈만), **네트워크를 쓰지 않는다**(전부 클라이언트에서 끝난다). 그래서 담을 수 있는 것과 없는
것이 분명히 갈린다. 저장소의 실제 글로 예를 든다.

### 담을 수 있는 것

| 성격 | 실제 글 예 | 무엇을 보여주나 |
| :--- | :--- | :--- |
| 브라우저 API의 실제 동작 | 「getByRole … 26배」 | 접근성 이름 계산이 `textContent` 와 다르다 |
| 라이브러리 내부 호출 계측 | 위 글 | `getComputedStyle` 이 후보당 몇 번 불리는가 |
| 순수 함수의 입출력 | 「번들러 만들기」 AST·스코프 편 | 같은 코드가 어떤 그래프·이름으로 변환되는가 |
| 실행 순서 | 「우아하게 에러 핸들링」 시리즈 | `throw` 가 어느 경계까지 전파되는가, microtask 순서 |
| 크기·개수 비교 | 「번들러」 소스맵 편 | 옵션에 따라 산출물이 몇 바이트가 되는가 |
| 상호작용 데모 | 「useSyncExternalStore Toast」 | 컴포넌트가 실제로 어떻게 동작하는가 |

### 담을 수 없는 것

| 성격 | 실제 글 예 | 왜 |
| :--- | :--- | :--- |
| 타입 검사 결과 | 「Typescript로 설계하는 프로젝트」 시리즈 | 타입은 런타임이 없다. `tsc` 를 브라우저에 올리는 건 이 설비의 범위 밖 |
| 파일시스템·패키지 매니저 | 「pnpm 호이스팅」 | 브라우저에 파일시스템이 없다. 그림·표로 남긴다 |
| CI·빌드 파이프라인 | 「CI가 빨라지자…」 시리즈 | 러너가 필요하다. 기록된 수치 + 그림이 맞다 |
| Node 전용 API | 「번들러」 파일 읽기 부분 | 입력을 문자열로 바꿔 **순수 변환 부분만** 떼어내면 가능 |

### 실행 예산

담을 수 있어도 **무거우면 넣지 않는다.**

- 기본 파라미터로 **저사양 모바일에서 3초 이내**에 끝나야 한다
- `params` 의 `max` 는 같은 기기에서 **5초 이내**로 잡는다
- 5초를 넘기면 러너가 경고를 띄우고 중단을 권한다(강제 종료는 하지 않는다 — 독자가 의도적으로
  최대치를 돌려볼 수 있다)

---

## 2. 저작 문법

```html
<playground experiment="a11y-name-vs-textcontent"></playground>
```

파라미터 기본값을 이 글에서만 바꿀 때 속성을 더 준다.

```html
<playground experiment="style-cache-phases" defaults='{"nodes":85,"cssRules":2000}' title="4구간 직접 재보기"></playground>
```

| 속성 | 필수 | 설명 |
| :--- | :--: | :--- |
| `experiment` | ✅ | 등록된 실험 id(§5.3). 미등록·오타는 `lint:posts` 가 막는다 |
| `defaults` | | 파라미터 초기값 JSON **문자열**. 실험이 선언한 `min`/`max` 로 클램프되고 모르는 키는 무시 |
| `title` | | 카드 제목. 생략하면 실험 모듈의 `title` |
| `baseline` | | `"hide"` 를 주면 기준선 열을 숨긴다(기록값이 이 문맥에서 무의미할 때) |
| `caption` | | 카드 아래 한 줄 주석. 이 **글에서의 해석**을 붙이는 자리 |

`caption` 이 있는 이유는 범용성 때문이다. 같은 실험을 두 글이 쓰면 숫자는 같아도 **왜 보여주는지가
다르다.** 실험 모듈은 해석을 갖지 않고, 해석은 글이 준다.

**함정은 기존 시그니처 컴포넌트와 동일하다.** 본문은 MDX가 아니라 `react-markdown` +
`rehype-raw` 이므로:

- **self-closing 금지.** `<playground … />` 로 쓰면 뒤따르는 본문이 그 안에 중첩돼 사라진다
- 속성 값은 **전부 문자열**. `defaults` 는 JSON을 홑따옴표로 감싼다
- 여는 태그는 줄 맨 앞, 블록 앞뒤로 빈 줄
- `defaults` JSON이 깨져도 **throw하지 않고** 실험 기본값으로 간다 (`parseItemsProp` 과 같은
  fail-soft 원칙 — 글 하나의 오타로 페이지가 죽으면 안 된다)

한 글에 여러 개, 같은 실험을 여러 번(파라미터만 다르게) 넣어도 된다. 각 카드는 독립적으로
실행·중단된다.

---

## 3. 실험의 종류(`kind`)

**이 문서에서 가장 중요한 결정.** 실험마다 UI를 새로 짜면 두 번째 글부터 비용이 폭발한다.
실험은 넷 중 하나를 선언하고, **UI·통계·판정 방식은 종류가 결정한다.**

| `kind` | 무엇을 보여주나 | 반복 측정 | 기본 판정 | 기준선 |
| :--- | :--- | :--- | :--- | :--- |
| `compare` | 같은 입력에 대한 서로 다른 결과값 | 없음 | `facts` 통과/실패 | 보통 불필요 |
| `count` | 어떤 일이 몇 번 일어나는가 | 없음(결정론) | `facts` + `rows` | 다른 환경의 기록값 |
| `time` | 얼마나 걸리는가 | 필수(§9) | `rows` 중앙값 | 필수 — 환경이 다르므로 |
| `trace` | 무슨 순서로 일어나는가 | 없음 | 순서 배열 일치 | 보통 불필요 |

종류를 고르는 기준은 하나다. **환경이 바뀌면 값이 바뀌는가?**

- 안 바뀐다 → `compare` · `count` · `trace`. 독자 브라우저의 결과를 **판정**으로 보여준다
- 바뀐다 → `time`. 판정하지 않고 **기록값과 나란히** 놓는다

`time` 실험이 `facts` 를 갖는 것은 허용하지만, 그 `facts` 는 **절대값이 아니라 관계**여야 한다
(`3구간이 2구간보다 빠르다` 는 되고, `463ms가 나온다` 는 안 된다). 이 규칙을 §12의 린트가 아니라
코드 리뷰로 지킨다.

---

## 4. 이슈 #140에서 바뀐 결정

| # | 이슈의 서술 | 문제 | 결정 |
| :-- | :--- | :--- | :--- |
| 1 | `<playground>` 태그 예시 | 이슈 본문 코드블록이 HTML 이스케이프로 **비어 있다**. 문법이 미정 | §2에서 확정 |
| 2 | "플레이그라운드 없는 글의 초기 번들 변화 **0**" | `components` 맵에 등록하는 순간 셸은 **모든 글**의 청크에 들어간다. 문자 그대로는 불가능 | §7. 셸/러너 분리 + 기준을 "셸 ≤ 4KB gzip, 실험 의존성은 클릭 전 0바이트"로 재정의 |
| 3 | "JS 실패 시 표로 폴백" + "`ssr:false` 로 클라이언트 전용" | 충돌한다. `ssr:false` 면 정적 HTML에 폴백할 표가 안 남는다 | §7. 기준선 표는 **프리렌더**, `ssr:false` 는 러너에만 |
| 4 | `run(params, signal)` | 진행률 경로가 없어 무거운 실험이 UI를 멈춘다 | §6. `RunContext` 로 `onProgress`·`yieldToMain` 을 계약에 포함 |
| 5 | "브라우저에서 호출 횟수가 똑같이 나온다" | 검증 안 된 가정. 호출 횟수는 라이브러리 제어 흐름이 정하고, 그 흐름은 계산된 스타일 값에 따라 분기한다 | §16.2. **선결 검증 과제**로 분리 |
| 6 | 실험 3종이 곧 설비 | 셋 다 한 글 전용이라, 두 번째 글이 오면 설계를 다시 하게 된다 | **§3 `kind` 도입.** 설비는 종류를 알고 글은 실험만 고른다. 이슈의 3종은 §16 부록으로 내린다 |
| 7 | (없음) | 오타난 실험 이름이 조용히 빈 자리로 남는다 | §12. `unknown-experiment` 규칙 (`unknown-hero-diagram` 선례) |
| 8 | (없음) | 위젯이 마크다운 표를 대체하면 검색·RSS·LLM 텍스트에서 수치가 사라진다 | §11.2. **표를 지우지 않는다** |

이슈의 나머지 결정 — MDX로 가지 않음, 임의 코드 실행 없음, WebContainer 탈락(COOP/COEP를
GitHub Pages가 못 준다), jsdom 브라우저 구동 탈락 — 은 **그대로 유지한다.**

---

## 5. 배치와 이름

### 5.1 파일 배치

```
apps/blog/web/
├── domain/post/experimentIds.ts          # 이름만. validate-posts가 import
└── src/components/post/markdown/Playground/
    ├── Playground.tsx                    # 셸 — 정적 프리렌더 (§7)
    ├── PlaygroundRunner.tsx              # 컨트롤·실행·결과. ssr:false
    ├── views/                            # kind별 결과 렌더 (§3)
    │   ├── FactList.tsx                  # compare · count
    │   ├── ResultTable.tsx               # count · time
    │   └── TraceList.tsx                 # trace
    ├── harness/                          # 실험이 쓰는 공용 도구 (§8)
    ├── registry.ts                       # id → 기준선 + 동적 로더
    ├── types.ts                          # §6
    └── experiments/                      # 실험 모듈 (글이 아니라 저장소 소유)
```

`experimentIds.ts` 를 따로 두는 이유는 `diagramNames.ts` 와 같다. `scripts/validate-posts.ts` 는
`node --import tsx` 로 도는 순수 노드 스크립트라, 이름 목록이 React·Panda를 끌어오는 `.tsx` 안에
있으면 검증 스크립트가 UI 번들에 묶인다.

```ts
export const EXPERIMENT_IDS = ['a11y-name-vs-textcontent'] as const;
export type ExperimentId = (typeof EXPERIMENT_IDS)[number];
export function isExperimentId(value: unknown): value is ExperimentId {
  return (
    typeof value === 'string' &&
    (EXPERIMENT_IDS as readonly string[]).includes(value)
  );
}
```

레지스트리는 `Record<ExperimentId, …>` 로 못박아 **한쪽만 등록하면 컴파일이 막게** 한다.

```ts
export const EXPERIMENTS: Record<ExperimentId, ExperimentEntry> = {
  'a11y-name-vs-textcontent': {
    baseline: a11yNameBaseline, // 정적 — 폴백이므로 클릭 전에 있어야 한다
    load: () => import('./experiments/a11yNameVsTextContent'),
  },
};
```

### 5.2 실험은 글이 아니라 저장소가 소유한다

실험 모듈을 글 폴더(`apps/blog/posts/…`)에 두지 않는다. 이유는 셋이다.

1. `posts/` 는 마크다운과 이미지만 있는 **콘텐츠 디렉토리**다. `sync-posts.mjs` 가 미디어를
   복사하는 대상이지 번들 입력이 아니다
2. 실험은 두 글이 공유할 수 있어야 한다(시리즈 안에서 특히)
3. 타입·린트·테스트가 `src/` 기준으로 잡혀 있다

### 5.3 id 규칙

`<도메인>-<무엇을 보이는가>` 케밥 케이스.

| 좋음 | 나쁨 | 왜 |
| :--- | :--- | :--- |
| `a11y-name-vs-textcontent` | `getbyrole-post-exp1` | 글 슬러그·번호를 넣으면 재사용이 막힌다 |
| `style-cache-phases` | `benchmark2` | 무엇을 보는지 안 보인다 |
| `scope-hoisting-rename` | `bundler-3` | 시리즈 회차는 바뀐다 |

글 제목·슬러그·회차를 id에 넣지 않는다.

---

## 6. 타입 계약 (`types.ts`)

```ts
import type { ExperimentId } from '@/domain/post/experimentIds';

export type ExperimentKind = 'compare' | 'count' | 'time' | 'trace';

/** 슬라이더 하나. 실험이 소유하고, 글의 `defaults` 는 초기값만 덮어쓴다. */
export interface ParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
}

/** 통과/실패로 판정되는 명제. compare·count·trace의 주 산출물. */
export interface Fact {
  claim: string;
  expected: string;
  actual: string;
  passed: boolean;
}

/** 결과 표 한 줄. count·time이 쓴다. */
export interface Row {
  label: string;
  value: number | string;
  unit?: string;
  /** 기록된 다른 환경의 값(§10). 있으면 나란히 렌더된다. */
  baseline?: number | string;
  /** kind === 'time' 인 행에만. */
  stats?: { median: number; min: number; max: number; runs: number };
  note?: string;
}

/** 순서를 보여주는 실험(kind === 'trace')의 한 항목. */
export interface TraceEntry {
  /** 0부터. 같은 값이면 동시 발생으로 그린다. */
  order: number;
  label: string;
  detail?: string;
  /** 강조할 항목(논지의 핵심 단계). */
  emphasis?: boolean;
}

export interface RunResult {
  facts?: Fact[];
  rows?: Row[];
  trace?: TraceEntry[];
  /** 실행 중 알게 된 한계(타이머 해상도, 예산 초과 등). 회색 주석으로 렌더. */
  warnings?: string[];
}

export interface RunContext {
  params: Record<string, number>;
  signal: AbortSignal;
  onProgress: (ratio: number, label?: string) => void;
  /** 긴 루프 중간에 await 해서 메인 스레드를 놓아준다(§9.3). */
  yieldToMain: () => Promise<void>;
  /** 실험이 만드는 DOM은 전부 여기 안에서. 러너가 정리를 보장한다(§8.1). */
  container: HTMLElement;
}

export interface Experiment {
  id: ExperimentId;
  kind: ExperimentKind;
  title: string;
  /** 실행 전 접힌 채로 보여줄 절차 설명(평문). "무엇을 어떻게 재는가" */
  method: string;
  params: ParamSpec[];
  run: (ctx: RunContext) => Promise<RunResult>;
}
```

`RunResult` 의 세 출력(`facts`/`rows`/`trace`)은 **전부 선택**이다. `kind` 가 어떤 조합을
기대하는지는 §3의 표가 정하고, 어긋나면(예: `kind: 'trace'` 인데 `trace` 가 비었다) 러너가
경고를 남기고 있는 것만 그린다 — 여기서도 throw하지 않는다.

---

## 7. 렌더 파이프라인과 번들 경계

```
빌드 타임(정적 export)          클릭 시(동적 청크)
┌──────────────────────────┐    ┌────────────────────────────────┐
│ Playground.tsx (셸)      │    │ PlaygroundRunner + views       │
│  - 제목 / method         │───▶│  - 슬라이더 · 실행 · 중단      │
│  - 기준선 표 (정적 JSON) │    │  - import('experiments/…')     │
│  - 실행 버튼(비활성)      │    │     └▶ 실험이 소유한 의존성    │
└──────────────────────────┘    └────────────────────────────────┘
   ⇧ HTML에 남는다 = JS 없어도 읽히는 표
```

- **셸**은 `PostClient` 의 `components` 맵에 등록되므로 모든 글의 청크에 실린다. 그래서 셸은
  Panda `css()` + 정적 JSON만 쓰고 무거운 것을 **정적으로 참조하지 않는다.** (`CodeBlock` 이
  `mermaidBoxStyle` 을 `MermaidChart` 와 합치지 않고 복제해 둔 것과 같은 이유 — 정적 참조 하나면
  dynamic import가 무의미해진다.)
- **러너**는 `next/dynamic(…, { ssr: false })`. 자리는 셸이 이미 잡고 있어 레이아웃 시프트가 없다
- **실험 모듈과 그 의존성**은 러너 안에서 버튼을 누른 뒤 `import()`

### 7.1 의존성 소유 규칙 (범용성의 핵심)

> **코어(셸·러너·하네스)는 런타임 의존성을 갖지 않는다.**
> 무거운 라이브러리는 **그것을 쓰는 실험 모듈이 소유**하고, 반드시 실험 모듈 안에서 동적으로
> import한다.

실험 하나가 500KB짜리 라이브러리를 쓴다고 해서, 다른 실험을 보는 독자가 그 값을 치르면 안 된다.
새 실험이 새 의존성을 요구하면:

1. `dependencies` 에 넣는다 (브라우저로 나가므로 `devDependencies` 는 틀린 자리다)
2. 실험 모듈 안에서만 import한다 — 하네스·러너·셸에서 참조 금지
3. **클릭 후 청크 크기를 실측**해 §14 체크리스트에 기록한다
4. gzip 300KB를 넘으면 실행 버튼 옆에 다운로드 크기를 미리 표기한다

### 7.2 완료 기준 재정의

| 이슈 기준 | 대체 기준 |
| :--- | :--- |
| 플레이그라운드 없는 글의 초기 번들 변화 0 | 셸이 공유 청크에 더하는 양 **≤ 4KB gzip**, 러너·하네스·실험·실험 의존성은 **클릭 전 0바이트** (`.next` 청크 목록으로 확인) |

---

## 8. 하네스 툴킷

새 실험을 싸게 만들기 위한 공용 도구. **실험 모듈은 "픽스처 + 절차 + 판정"만 쓰고, 반복·정리·
계측·통계는 여기에 맡긴다.** 이게 있어야 §14의 "실험 하나 = 파일 하나 + 등록 두 줄"이 성립한다.

| 모듈 | 제공 | 쓰는 kind |
| :--- | :--- | :--- |
| `fixture.ts` | 격리된 DOM 서브트리 생성, 노드 N개 생성, CSS 규칙 M개 주입, **자동 정리** | 전부 |
| `instrument.ts` | 전역/메서드를 카운팅 래퍼로 교체하고 **어떤 경로로 끝나도 복원** | `count` |
| `stats.ts` | 워밍업·N회 반복·중앙값·min/max·해상도 경고 | `time` |
| `schedule.ts` | `yieldToMain`, abort 확인, 진행률 보고 | 전부 |
| `facts.ts` | 값 비교 → `Fact` 생성 (`expectEqual`, `expectOrder`, `expectRatio`) | `compare`·`count`·`trace` |
| `trace.ts` | 순서 기록기(`mark(label)`), microtask/task 경계 표시 | `trace` |
| `size.ts` | `TextEncoder` 바이트 크기, `CompressionStream` gzip 크기 | `count` |

핵심 계약 두 개만 못박는다.

**정리 보장** — 실험은 `ctx.container` 밖에 DOM을 만들지 않는다. 러너는 성공·실패·중단·언마운트
어느 경로에서든 `container` 를 비우고, `instrument.ts` 가 건 래퍼를 `finally` 로 되돌린다.
전역을 건드린 채 끝나는 실험은 **다음 실험의 측정을 오염시키므로** 이건 협상 대상이 아니다.

**결정론 우선** — `compare`·`count`·`trace` 는 같은 파라미터로 두 번 돌리면 같은 결과여야 한다.
난수·시각·네트워크에 의존하지 않는다. 러너는 개발 모드에서 **연속 2회 실행 후 결과를 대조**해
어긋나면 콘솔 경고를 낸다(실험을 잘못 만들었다는 신호).

---

## 9. 측정 프로토콜 (`kind: 'time'` 전용)

글이 "재봐야 안다"를 가르치는 자리에 위젯을 놓는데 위젯의 측정 규율이 더 허술하면 안 된다.

### 9.1 반복

- 워밍업 **1회**(버림) → 본 측정 **N회**(기본 7, 파라미터로 3~15)
- 대표값은 **중앙값**. 평균 금지(GC 스파이크 한 번이 평균을 끌고 간다)
- 표에는 `중앙값 (최소~최대, n=7)` 을 같이 적는다. 단일 측정값만 노출하는 UI는 만들지 않는다

### 9.2 타이머 해상도

GitHub Pages는 응답 헤더를 못 넣으므로 **`crossOriginIsolated` 가 아니다.** `performance.now()` 는
브라우저가 정한 만큼 뭉개진 값을 준다(Chrome 100µs, Firefox 1ms 급).

- 개별 호출 1회를 재지 않는다. **구간 전체를 재고** 필요하면 나눈다
- 구간 중앙값이 **5ms 미만**이면 그 행에 `측정 하한 근처 — 해상도 제한` 경고를 붙인다
- `crossOriginIsolated === false` 를 결과 메타에 그대로 표기한다

### 9.3 메인 스레드

- 실험 루프는 `ctx.yieldToMain()` 을 **작업 16단위마다** await 한다
  (구현: `scheduler.yield?.() ?? new Promise(r => setTimeout(r, 0))`)
- 같은 지점에서 `ctx.signal.aborted` 를 확인하고 `AbortError` 로 빠져나온다
- 중단 버튼은 실행 중 항상 활성

### 9.4 자동 실행 금지

명시적 버튼으로만 실행한다. 스크롤 진입 시 자동 실행하는 안은 채택하지 않는다 — 저사양 기기에서
글 읽는 사람이 원치 않은 부하를 진다. `kind` 와 무관하게 적용된다.

---

## 10. 기준선(baseline)

`time` 은 필수, `count` 는 다른 환경(주로 Node·jsdom)의 값이 있으면 붙인다.

```jsonc
{
  "experiment": "style-cache-phases",
  "recordedAt": "2026-07-27",
  "env": {
    "runtime": "node <재현 시 기록>",
    "jsdom": "27.4.0",
    "libs": { "@testing-library/dom": "10.4.1" },
    "note": "글쓴이 재현 환경. 프로덕션 실측치가 아님"
  },
  "rows": [{ "label": "스타일 첫 조회(콜드)", "value": 463.4, "unit": "ms" }]
}
```

- **출처를 반드시 적는다.** 재현 환경 값과 프로덕션 실측치를 구분하지 않으면, 위젯이 원래 글의
  정직성을 후퇴시킨다
- 기준선 JSON은 `scripts/` 의 재현 스크립트가 **생성**한다. 손으로 고치지 않는다
- 독자 환경은 결과 아래 mono 12px로 자동 표기: `userAgent` · `hardwareConcurrency` ·
  `deviceMemory`(있으면) · `crossOriginIsolated` · 측정 시각. 식별성이 올라가는 값은 수집하지
  않고, **어디에도 전송하지 않는다**(서버가 없다)

---

## 11. 실패와 폴백

글이 깨지지 않는 것이 실행되는 것보다 우선한다.

### 11.1 매트릭스

| 상황 | 동작 |
| :--- | :--- |
| JS 비활성 / 하이드레이션 실패 | 셸이 프리렌더한 **기준선 표 + 출처**. 실행 버튼 비활성 |
| 러너·실험 청크 로드 실패 | 기준선 유지 + `실행 환경을 불러오지 못했습니다` 주석 |
| 실행 중 throw | 기준선 유지 + 에러 1줄(스택 노출 안 함) + 재시도 버튼 |
| 중단(Abort) | 부분 결과 폐기, 기준선으로 복귀 |
| 예산 초과(5초) | 계속 돌리되 경고 + 중단 권유 |
| `defaults` JSON 파싱 실패 | 실험 기본값으로 실행, 콘솔 경고만 |
| 미등록·누락 `experiment` | 렌더는 조용히 아무것도 안 그린다(글 보호). **`lint:posts` 가 빌드 전에 에러** |

`unknown-hero-diagram` 과 같은 원칙이다 — 런타임은 fail-soft, 침묵은 린트가 깬다.

### 11.2 위젯은 마크다운 표를 대체하지 않는다

빌드 산출물 세 곳의 처리를 확인했다.

| 산출물 | `<playground>` 처리 | 결과 |
| :--- | :--- | :--- |
| `search-index.json` | `toPlainText` 가 `/<[^>]+>/g` 로 **태그를 통째로 제거** | 숫자가 검색에서 사라짐 |
| `llms-full.txt` | `[#\`*\[\]]` 만 제거 — **태그가 raw로 남음** | LLM은 껍데기만 읽음 |
| `rss.xml` | 본문 텍스트 기반 | 위와 동일 |

`<diagram>` 은 그림이라 상관없었지만 위젯은 숫자를 담는다. 그래서:

> **위젯은 표 "앞"에 놓고, 마크다운 표는 `<details>` 로 접어 남긴다.**
> 본문 자리는 위젯이 갖고, 텍스트 산출물은 표가 지킨다.

---

## 12. `lint:posts` 새 규칙

`scripts/validate-posts.ts` 는 지금 frontmatter와 본문 이미지를 검사한다(본문 스캔 경로가 이미
있다). 규칙 두 개를 더한다.

| 규칙 | 심각도 | 조건 |
| :--- | :--- | :--- |
| `unknown-experiment` | error | `<playground>` 의 `experiment` 가 `EXPERIMENT_IDS` 밖이거나 누락 |
| `playground-self-closing` | error | `<playground … />` — 뒤 본문을 삼키므로 경고가 아니라 에러 |

`defaults` JSON 오류는 런타임이 fail-soft로 흡수하므로 **warning**으로만 알린다.
(`<diagram-node />` 등 다른 태그의 같은 함정까지 잡을지는 이 이슈의 범위 밖으로 분리한다.)

---

## 13. 시각·접근성

디자인 시스템 규칙(CLAUDE.md)을 따르고, 새로 정하는 것만 적는다.

- 카드는 `<diagram>`·`<metrics>` 와 같은 지면: `bg paper.100` / `borderWidth hairline` /
  `rounded card` / `my 10`. **그림자·그라데이션 금지**
- **수치는 전부 `fontFamily: mono`** (날짜·조회수와 같은 계열). 라벨과 `claim` 문구는 sans
- 통과/실패는 색만으로 구분하지 않는다 — `✓`/`✗` 문자 + `moss.700`/`danger.text`
- 결과 표는 본문 표와 같은 가로 스크롤 처리: `role="region"` + `aria-label` + `tabIndex={0}` +
  `overflowX: auto` (axe `scrollable-region-focusable`)
- 결과 영역은 `role="status"` + `aria-live="polite"`. 진행률은 **읽지 않고**(폭주 방지) 완료 시
  요약 한 문장만 읽힌다
- 실행 버튼은 실행 중 `aria-busy="true"`, 라벨이 "중단"으로 바뀐다
- `prefers-reduced-motion` 이면 진행 막대 애니메이션 없이 숫자만 갱신
- 포커스를 결과로 강제 이동시키지 않는다(읽던 자리를 뺏지 않는다)

---

## 14. 새 실험 추가 체크리스트

목표는 **파일 하나 + 등록 두 줄**이다. 이보다 비싸지면 하네스(§8)에 빠진 게 있다는 신호다.

- [ ] `kind` 를 고른다(§3). 환경에 따라 값이 바뀌면 `time`, 아니면 나머지
- [ ] §1의 실행 예산(기본 3초 / 최대 5초)을 넘지 않는지 어림한다
- [ ] `experiments/<이름>.ts` 작성 — 픽스처·절차·판정만. DOM은 `ctx.container` 안에서만
- [ ] `domain/post/experimentIds.ts` 에 id 한 줄 (§5.3 이름 규칙)
- [ ] `registry.ts` 에 한 줄 (`Record` 타입이 빠뜨림을 막는다)
- [ ] `time`·`count` 면 기준선 JSON을 **재현 스크립트로 생성** (§10)
- [ ] 테스트: 결정론 실험은 값 검증, `time` 은 "행이 나온다"까지만
- [ ] 새 런타임 의존성이 있으면 §7.1의 4단계
- [ ] 글에 `<playground experiment="…">` 삽입 + **표는 `<details>` 로 보존** (§11.2)
- [ ] `pnpm lint:posts` · `pnpm test --filter=@blog/web` · `pnpm build --filter=@blog/web`

---

## 15. 단계와 완료 기준

각 단계는 **독립적으로 머지 가능**하다.

### 1단계 — 설비 뼈대 + `compare` 실험 1개

- [ ] `<playground>` 태그가 `PostClient` 에 등록되고 §2 문법대로 동작
- [ ] `experimentIds.ts` ↔ `registry.ts` 이원화, `Record<ExperimentId, …>` 강제
- [ ] 셸/러너 분리 — 정적 HTML에 기준선 표가 남는 것을 `out/` 산출물에서 확인
- [ ] `kind: 'compare'` 경로(§3) + `FactList` 뷰
- [ ] 하네스 최소 3종: `fixture` · `schedule` · `facts`
- [ ] `lint:posts` 두 규칙 + 테스트
- [ ] 셸 추가분 ≤ 4KB gzip, 클릭 전 실험 의존성 0바이트 (청크 목록으로 확인)
- [ ] 첫 실험은 §16.1 (`a11y-name-vs-textcontent`)
- [ ] `pnpm build --filter=@blog/web` 정적 export 성공

### 2단계 — `count` + 계측 하네스

- [ ] `instrument.ts` — 어떤 경로로 끝나도 복원됨(언마운트·throw·abort 각각 테스트)
- [ ] `ResultTable` 뷰 + 기준선 열
- [ ] §16.2 선결 검증 과제 수행 후 그 결과를 이 문서에 기록
- [ ] `size.ts` (바이트 비교) — 번들러 시리즈에서 바로 쓸 수 있게

### 3단계 — `time` + 측정 프로토콜

- [ ] `stats.ts`(워밍업·중앙값·해상도 경고), 슬라이더, 중단 버튼
- [ ] 독자 환경 자동 표기(§10)
- [ ] 최대 파라미터에서 메인 스레드 블로킹 없음 — 중단이 즉시 먹힘
- [ ] §16.3 실험

### 4단계 — `trace` (선택)

- [ ] `trace.ts` + `TraceList` 뷰. 첫 소비자는 에러 핸들링 시리즈(§17)

### 5단계 (선택)

- [ ] 파라미터를 쿼리스트링에 인코딩한 permalink (`nuqs` 가 이미 의존성에 있다)
- [ ] 전체 재현용 StackBlitz 링크

---

## 16. 부록 A — 첫 소비자: 「getByRole … 26배 느렸습니다」

이슈 #140이 지목한 실험 3종. **설비의 일부가 아니라 첫 사용 사례**다.

### 16.1 `a11y-name-vs-textcontent` — `kind: 'compare'`

픽스처는 글 5장의 코드와 동일하게 유지한다(글과 위젯이 다른 DOM을 쓰면 안 된다).

```html
<button><span style="display: none">지난달</span> <span>15일</span></button>
```

| 항목 | 방법 | 기대값 |
| :--- | :--- | :--- |
| `textContent` | `el.textContent.trim()` | `"지난달 15일"` |
| 접근성 이름 | `computeAccessibleName(el)` | `"15일"` |
| 스텁 주입 | `computeAccessibleName(el, { getComputedStyle: () => visibleStyleStub })` | `"지난달 15일"` |

facts: ① 접근성 이름은 `textContent` 와 다르다 ② 숨은 자식이 이름에서 빠진다 ③ 스텁을 주입하면
숨은 자식이 되살아난다. ③이 이 실험을 첫 타자로 고른 이유다 — 글 7장의 **해법과 8장의 대가를 한
위젯이 동시에** 보여준다. 브라우저에선 진짜 CSS가 적용되므로 jsdom보다 오히려 강한 증명이 된다.

의존성: `dom-accessibility-api` 신규 추가(§7.1 규칙 적용).

### 16.2 `role-query-calls` — `kind: 'count'`

`window.getComputedStyle` 을 카운팅 래퍼로 교체하고 4조합을 실행한다. 파라미터는 `nodes`(1~200,
기본 85), `cssRules`(0~5000, 기본 0).

| 조합 | jsdom 기준선 |
| :--- | ---: |
| role만 | 0회 |
| role + name | 256회 |
| role + hidden | 176회 |
| 셋 다 | 261회 |

> **선결 검증 과제.** "브라우저에서도 같은 횟수"는 아직 가정이다. 호출 횟수는 라이브러리 제어
> 흐름이 정하는데, 그 흐름은 **계산된 스타일 값에 따라 분기**한다(가시성 조기 종료). 실제 CSS
> 캐스케이드가 도는 브라우저에서 다른 값이 나올 수 있다. 2단계 착수 시 같은 픽스처를
> vitest(jsdom)와 브라우저에서 각각 돌려 대조하고 —
>
> - 일치하면 절대값 facts로 확정
> - 어긋나면 배율·구조 명제(`name 필터가 role 필터보다 두 자릿수 많이 부른다`, `후보 수에 선형
>   비례한다`)로 낮추고 두 값을 나란히 놓는다
>
> 어느 쪽이든 **검증 전에 "브라우저에서 261회가 나온다"고 단정하는 문구를 커밋하지 않는다.**

의존성: `@testing-library/dom` 을 `devDependencies` → `dependencies` **승격(이동)**. 실물
라이브러리가 호출해야 증거가 된다 — 재구현하면 증명력이 사라진다. `pretty-format`·`lz-string`
등을 끌고 오므로 §7.1의 실측·표기 규칙을 반드시 적용한다.

### 16.3 `style-cache-phases` — `kind: 'time'`

글 6장의 4구간(렌더 / 콜드 / 캐시 히트 / DOM 변경 후)을 재현한다. 파라미터는 `nodes`(기본 85),
`cssRules`(기본 2000), `repeats`(기본 7). 기준선 9.7 / 463.4 / 8.8 / 266.5ms.

브라우저 값은 jsdom과 크게 다를 것이고 **그 차이가 곧 결론이다** — "브라우저는 렌더할 때
계산해두고, jsdom은 물어볼 때 계산한다". 그래서 이 실험만 판정이 아니라 **두 열 비교**가 본체다.
각 구간 시작 전 강제 리플로우(`void el.offsetHeight`)로 상태를 정렬하고 그 비용은 측정 밖에 둔다.

---

## 17. 부록 B — 다음 소비자 후보

설비가 범용인지 검증하는 목록. 착수 순서가 아니라 **이 설계로 담기는지 확인하는 용도**다.

| 글·시리즈 | 실험 | `kind` |
| :--- | :--- | :--- |
| 「번들러 만들기」 2. AST Graph | 코드 조각 → 의존성 그래프 노드·엣지 수 | `count` |
| 「번들러 만들기」 3. 스코프 | 같은 이름이 어떻게 리네이밍되는가 | `compare` |
| 「번들러 만들기」 4. 소스맵 | VLQ 인코딩 전후 바이트 수 (`size.ts`) | `count` |
| 「우아하게 에러 핸들링」 시리즈 | `throw` 가 어느 경계에서 잡히는가 / microtask 순서 | `trace` |
| 「useSyncExternalStore Toast」 | 외부 store 구독 시 리렌더 횟수 | `count` |
| 「Type Guard 버튼」 | 좁히기 전후 런타임 분기 결과 | `compare` |
| 「Panda CSS 1년」 | 레시피 조합 수 대비 생성 클래스 수 | `count` |

이 목록에 `time` 이 하나도 없는 것은 우연이 아니다. **대부분의 글은 시간이 아니라 구조를
증명하고 싶어 한다.** 그래서 §3에서 `compare`·`count`·`trace` 를 1급으로 두고, `time` 을 가장
제약이 많은 종류로 다뤘다.

---

## 18. 미해결 / 검증 필요

| 항목 | 왜 미정 | 언제 |
| :--- | :--- | :--- |
| 브라우저↔jsdom 호출 횟수 동등성 | 검증 안 된 가정(§16.2) | 2단계 선결 |
| `@testing-library/dom` 클릭 후 청크 실크기 | 현재 작업 환경에 `node_modules` 가 없어 실측 못 함 | 2단계(§7.1) |
| 재현 스크립트의 위치 | PR #139 작업물이 저장소에 없다 | 1단계에서 `scripts/` 로 옮기며 결정 |
| `trace` 뷰의 시각 언어 | `<timeline>` 시그니처 컴포넌트와 겹칠 수 있다 | 4단계 착수 시 통합 여부 판단 |
| 실험 수가 10개를 넘을 때 | 레지스트리 정적 맵의 트리셰이킹 한계 | 그때 측정하고 결정 |
