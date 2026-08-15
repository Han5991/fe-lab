# 다이어그램 저작 가이드

글에 구조 그림을 넣는 방법. 대상은 **글 쓰는 사람**이고, 대부분의 경우 마크다운만 쓰면 된다.

다이어그램은 이미지가 아니라 **SVG React 컴포넌트**다. 그래서 다크모드 색이 자동으로 따라오고,
좁은 화면에서 본문 폭에 맞춰 줄어들며, 글자가 텍스트로 검색·복사된다. PNG를 붙이지 말 것.

---

## 1. 어느 갈래를 쓸 것인가

|                   | 선언형 태그 `<diagram>` | 이름 레지스트리 `name="…"`               |
| :---------------- | :---------------------- | :--------------------------------------- |
| 쓰는 곳           | 마크다운 본문           | 마크다운 본문 + frontmatter `hero:`      |
| 코드              | 필요 없음               | 컴포넌트 파일 1개 + 등록 2줄             |
| 그릴 수 있는 모양 | 좌→우 체인, 팬아웃      | 제한 없음(분기·회귀·중첩·라벨 자유 배치) |
| 좌표              | 자동 계산               | 손으로 지정                              |

**기본은 선언형이다.** 노드 3~4개가 한 방향으로 흐르는 그림이면 선언형으로 충분하고,
그 이상 복잡해진다면 대개 그림이 두 개로 쪼개져야 한다는 신호다(§2 「폭 감각」).

선언형으로 **안 되는** 경우에만 코드로 간다:

- 선이 노드를 가로질러야 한다(떨어진 두 노드를 직접 연결)
- 되돌아오는 화살표, 분기, 그룹 박스, 자유 위치 라벨이 필요하다
- 글 상단 히어로 자리에 꽂을 그림이다 → `hero:` 는 **이름 레지스트리만** 받는다

---

## 2. 선언형 — 문법

<!-- prettier-ignore -->
```html
<diagram label="스크린리더가 읽을 한 문장" caption="그림 아래 중앙 주석">
  <diagram-node id="a" title="첫 단계" desc="부제 5단어 이내"></diagram-node>
  <diagram-node id="b" title="두 번째" desc="부제" tone="accent"></diagram-node>
  <diagram-edge from="a" to="b" emphasis="true"></diagram-edge>
</diagram>
```

### 마크다운에서 지켜야 할 것

- **닫는 태그를 반드시 쓴다.** `<diagram-node />` 는 통하지 않는다 — 본문은 MDX가 아니라
  raw HTML이라, 브라우저 HTML 파서와 같은 규칙으로 커스텀 태그를 void가 아닌 것으로 본다.
  자기 닫힘으로 쓰면 뒤따르는 노드가 전부 그 안에 중첩돼 사라진다.
- 여는 `<diagram>` 은 **줄 맨 앞**에서 시작하고, 블록 **앞뒤로 빈 줄**을 둔다. (`<callout>`·`<file-tree>` 와 같은 규칙)
- 속성 값은 전부 문자열이다. `emphasis="true"` 처럼 따옴표로 쓴다.

### `<diagram>`

| prop        | 기본값 | 설명                                                                                                            |
| :---------- | :----- | :-------------------------------------------------------------------------------------------------------------- |
| `label`     | 없음   | `role="img"` 의 `aria-label`. **생략하면 장식으로 보고 `aria-hidden` 처리**된다. 뜻이 있는 그림이면 반드시 쓴다 |
| `caption`   | 없음   | 그림 아래 중앙 11px 주석. 그림이 말하지 못하는 조건 한 줄(예: `↻ 실패 시 자동 롤백`)                            |
| `direction` | `row`  | `row` = 좌→우 체인 / `fan` = 첫 노드에서 나머지로 갈라짐                                                        |
| `name`      | 없음   | 레지스트리 이름. 주면 children은 무시되고 등록된 컴포넌트를 그린다                                              |

### `<diagram-node>`

| prop    | 기본값          | 설명                                                                  |
| :------ | :-------------- | :-------------------------------------------------------------------- |
| `id`    | 순번(`node-0`…) | `<diagram-edge from/to>` 가 가리키는 키. 엣지를 쓸 거면 직접 준다     |
| `title` | 없음            | 노드 제목(12px/600)                                                   |
| `desc`  | 없음            | 부제(11px). **5단어 이내**                                            |
| `tone`  | `gray`          | `gray` = 구조 / `accent` = 핵심 경로. 그 밖의 값은 `gray` 로 떨어진다 |
| `shape` | `box`           | `box` = rx 8 / `pill` = 완전 둥근 캡슐                                |

### `<diagram-edge>`

| prop          | 기본값  | 설명                                                                      |
| :------------ | :------ | :------------------------------------------------------------------------ |
| `from` / `to` | —       | 노드 `id`. **둘 다 있어야** 그려진다. 없는 id·자기 참조는 조용히 버려진다 |
| `flow`        | `sync`  | `sync` = 실선(동기 호출) / `async` = 점선(비동기·데이터 흐름)             |
| `emphasis`    | `false` | 핵심 경로. 선이 액센트로 칠해지고 흐린 처리가 걷힌다                      |
| `arrow`       | `true`  | 화살촉. `arrow="false"` 면 선만                                           |

### 알아둘 규칙 네 가지

1. **연결되는 엣지를 하나라도 쓰면 자동 연결이 꺼진다.** 하나도 안 쓰면 `row` 는 인접
   노드끼리, `fan` 은 첫 노드에서 나머지로 자동 연결된다. 한 구간만 점선으로 바꾸려고
   엣지 하나를 추가하면 나머지 선이 전부 사라지므로, **쓸 거면 전부 쓴다.**
   `from`/`to` 에 오타가 나서 **해석되는 엣지가 하나도 없으면** 안 쓴 것과 같게 보고
   자동 연결로 돌아간다(노드가 통째로 분리된 그림이 조용히 나가지 않도록). dev 서버
   콘솔에는 무시된 엣지가 경고로 남는다.
2. **선은 항상 직선이다.** `row` 에서 떨어진 두 노드를 이으면 중간 노드를 가로지른다.
   그런 그림이 필요하면 선언형이 아니라 코드로 갈 때다.
3. **노드 폭은 텍스트에서 자동으로 나오고 88~200px로 잘린다.** 상한에 걸린 긴 텍스트는
   잘리지 않고 노드 밖으로 삐져나온다 — 부제를 줄이라는 신호로 쓴다.
4. **`id` 가 겹치면 먼저 선언한 노드가 이긴다.** 노드를 복사해 붙이고 `id` 를 안 고치면
   엣지는 **첫 번째** 노드에 붙고, 뒤엣것은 내부적으로 다른 이름을 받는다(그래서 화면이
   깨지지는 않는다). 다만 그 노드는 엣지로 가리킬 수 없으니 `id` 는 중복 없이 준다.

### 폭 감각 — 노드 4개를 넘기지 말 것

그림은 **자기 크기 그대로** 그려지고, 본문 칼럼(680px)보다 넓을 때만 줄어든다.
칼럼 안에 들어가는 한 노드 제목은 항상 12px, 부제는 11px — 레퍼런스 히어로와 같은 크기다.

viewBox 폭은 노드 텍스트 길이의 합이라 노드 개수가 그대로 폭이 된다(한글 부제 4~5단어 기준 실측):

| 노드 | 폭    | 렌더                       |
| :--- | :---- | :------------------------- |
| 3개  | ~500  | 12px (칼럼에 여유가 남음)  |
| 4개  | ~600  | 12px (레퍼런스 640과 비슷) |
| 5개  | ~720  | 11px (약간 줄어듦)         |
| 7개  | ~1000 | **8px — 읽기 어렵다**      |

**노드 5개부터는 글자가 작아지기 시작하고 7개면 못 읽는다.** 그 정도로 길어졌다면
그림 하나에 두 가지 이야기가 들어간 것이니 `row` 두 개로 쪼갠다.

> **모바일(375px)에서는 칼럼이 ~310px까지 좁아진다.** 640짜리 그림은 거기서 절반으로
> 줄어 제목이 6px로 보인다. 이건 손으로 그린 히어로 다이어그램도 마찬가지이고
> 선언형만의 문제가 아니다 — **그림 하나에 담는 노드 수를 줄이는 것**이 지금으로선
> 유일한 대응이다.

---

## 3. 복붙 예제 3개

### (1) 가로 파이프라인 — 기본형

<!-- prettier-ignore -->
```html
<diagram label="엔트리 파일에서 시작해 AST 파싱과 resolve를 거쳐 모듈 그래프를 완성하는 과정" caption="↻ 이미 방문한 파일은 건너뛴다">
  <diagram-node id="entry" title="엔트리" desc="index.js"></diagram-node>
  <diagram-node id="ast" title="AST 파싱" desc="import 노드 추출"></diagram-node>
  <diagram-node id="resolve" title="resolve" desc="절대 경로 확정"></diagram-node>
  <diagram-node id="graph" title="Graph" desc="modules 맵 등록" tone="accent"></diagram-node>
  <diagram-edge from="entry" to="ast"></diagram-edge>
  <diagram-edge from="ast" to="resolve"></diagram-edge>
  <diagram-edge from="resolve" to="graph" emphasis="true"></diagram-edge>
</diagram>
```

### (2) 팬아웃 — 하나가 여럿으로 갈라질 때

엣지를 하나도 안 썼으므로 첫 노드 → 나머지가 자동으로 연결된다.

<!-- prettier-ignore -->
```html
<diagram direction="fan" label="변경 감지 후 test 매트릭스와 build 캐시 job이 동시에 시작된다" caption="wall time은 가장 느린 갈래가 정한다">
  <diagram-node id="push" title="PR push" desc="변경 파일 감지"></diagram-node>
  <diagram-node id="test" title="test 매트릭스" desc="node 22 · 24 병렬"></diagram-node>
  <diagram-node id="build" title="build 캐시" desc="turbo 원격 캐시 복원" tone="accent"></diagram-node>
</diagram>
```

> **`fan` 은 갈래를 2~3개로.** 팬아웃은 세로로 쌓이므로 폭보다 높이가 먼저 늘어난다.
> 위 예제는 368×179라 칼럼 안에 넉넉히 들어간다. 갈래가 넷 이상이면 세로로 길쭉한
> 그림이 되어 본문 흐름을 끊으므로 `row` 두 개로 쪼개는 편이 대개 낫다.

### (3) 비동기·데이터 흐름 — 점선

호출이 반환을 기다리지 않거나, 화살표가 "호출"이 아니라 "데이터가 흘러간다"는 뜻이면 `flow="async"`.

<!-- prettier-ignore -->
```html
<diagram label="정적 페이지가 조회수를 Supabase RPC로 비동기 전송하고 집계 결과만 다시 읽는 흐름" caption="점선 = 렌더를 막지 않는 경로">
  <diagram-node id="page" title="정적 페이지" desc="GitHub Pages"></diagram-node>
  <diagram-node id="rpc" title="increment RPC" desc="6시간 쿨다운"></diagram-node>
  <diagram-node id="db" title="post_views" desc="집계 테이블" tone="accent"></diagram-node>
  <diagram-edge from="page" to="rpc" flow="async"></diagram-edge>
  <diagram-edge from="rpc" to="db" flow="async" emphasis="true"></diagram-edge>
</diagram>
```

---

## 4. 글 상단 히어로에 꽂기 — frontmatter `hero:`

글 제목 아래 히어로 자리(레퍼런스의 `0 0 640 122` 슬롯)에는 **등록된 이름만** 들어간다.

```yaml
---
title: 'ecs와 code deploy를 활용한 next.js 배포하기'
date: '2025-03-31'
status: published
hero: 'deploy-pipeline'
---
```

- `hero` 가 있으면 썸네일 대신 다이어그램이 그려진다. 없으면 기존대로 `thumbnail` 이 쓰인다.
- 등록되지 않은 이름은 **렌더에서 조용히 썸네일로 폴백**한다. 오타는 `pnpm lint:posts` 가
  `unknown-hero-diagram` **에러**로 잡는다(빌드 전 `prebuild` 에서 자동 실행).

### 등록된 이름

| 이름              | 그림                                                |
| :---------------- | :-------------------------------------------------- |
| `deploy-pipeline` | git push → Actions → ECR → ECS blue/green (640×122) |

본문 중간에서도 같은 이름을 부를 수 있다:

```html
<diagram name="deploy-pipeline"></diagram>
```

---

## 5. 새 다이어그램을 코드로 추가하기

1. `src/components/diagram/MyDiagram.tsx` 를 만든다. **프리미티브만 조합한다** —
   `DiagramFrame` / `DiagramNode` / `DiagramEdge` / `DiagramLabel`. 새 `<rect>`·`<path>` 를
   직접 쓰면 §6의 색·굵기 규칙이 강제되지 않는다. 좌표는 `DeployPipeline.tsx` 를 본뜬다.

   ```tsx
   export function MyDiagram({
     className,
     label = '기본 설명',
   }: NamedDiagramProps) {
     return (
       <DiagramFrame viewBox="0 0 640 122" label={label} className={className}>
         {/* 엣지를 먼저, 노드를 나중에 — 노드가 선 끝을 덮어야 한다 */}
       </DiagramFrame>
     );
   }
   ```

2. `domain/post/diagramNames.ts` 에 이름 한 줄을 넣는다.
3. `src/components/diagram/registry.ts` 의 `DIAGRAMS` 에 한 줄을 넣는다.

레지스트리 타입이 `Record<DiagramName, …>` 이라 2·3 중 하나만 하면 컴파일이 막는다.
이름 목록이 `domain/` 에 따로 있는 이유는 `lint:posts`(node 러너)가 React를 끌어오지 않고
이름만 검사할 수 있어야 해서다.

---

## 6. 다이어그램 문법 (핸드오프 §4 — 지킬 것)

프리미티브가 대부분 강제하지만, 글쓴이가 지켜야 하는 부분이 남아 있다.

- **노드**: 라운드 사각형 `rx=8`, 스트로크 1px. (`shape="pill"` 은 상태 뱃지 같은 예외에만)
- **선**: 실선 = 동기 호출 / 점선(`3 3`) = 비동기·데이터 흐름. **뜻대로 골라 쓴다.**
  전부 실선이어도 괜찮다 — 다양해 보이려고 점선을 섞지 말 것.
- **색은 2색뿐**: 회색(구조) + 액센트(핵심 경로). 액센트은 **그 글이 실제로 다루는 지점 하나**에만.
  노드 절반이 액센트이면 강조가 아니라 배경색이다.
- **부제는 5단어 이내.** 문장을 넣지 않는다. 설명은 본문이 한다.
- 색을 직접 쓰지 않는다. 하드코딩된 색은 다크모드에서 그대로 남아 깨진다.

### 그리기 전에 물어볼 것

> 이 그림이 **본문이 이미 말로 설명한 구조**를 옮긴 것인가?

아니라면 넣지 않는다. 다이어그램은 장식이 아니라 본문의 한 문단을 대체하는 도구다.
글이 설명하지 않은 구조를 그림으로만 보여주면 독자는 둘 다 이해하지 못한다.

---

## 7. 실제로 쓰인 곳

| 글                                                   | 위치               | 형태                    |
| :--------------------------------------------------- | :----------------- | :---------------------- |
| `bundler/…2. 코드를 데이터로 보는 법 (AST Graph).md` | 6장 DFS & Graph    | 선언형 `row` 4노드      |
| `testing/매일 쓰던 getByRole…md`                     | 3장 필터 체인 순서 | 선언형 `row` 3노드      |
| `nextjs deploy/ecs와 code deploy…md`                 | 히어로             | `hero: deploy-pipeline` |

---

## 8. 확인

```bash
pnpm lint:posts   # frontmatter + hero 이름 검증 (apps/blog/web)
```

그림 자체는 렌더를 눈으로 봐야 한다. `pnpm blog-web` 으로 띄우고 라이트/다크 양쪽에서 확인한다.
`status: draft` 인 글도 dev 서버는 실제 주소 `/posts/{slug}/` 로 열어준다(상단에 배너가 붙는다).
