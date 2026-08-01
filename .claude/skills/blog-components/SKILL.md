---
name: blog-components
description: 블로그 글(apps/blog/posts/*.md)에서 쓸 수 있는 커스텀 마크다운 컴포넌트 전체 목록과 문법 — 다이어그램, 대화 버블, 성과 수치 카드, 시도 타임라인, 콜아웃, 파일트리, 그림 캡션. 글을 쓰거나 고칠 때, "이거 어떻게 넣지" 싶을 때, 본문에 구조·수치·대화를 시각화해 넣고 싶을 때 사용한다.
---

# 블로그 커스텀 컴포넌트

`apps/blog/posts/**/*.md` 본문에서 **HTML 태그를 그대로** 쓰면 React 컴포넌트로 치환된다.
MDX가 아니라 `react-markdown` + `rehype-raw`다.

## 모든 글에 공통으로 적용되는 규칙

이걸 어기면 조용히 깨지거나 hydration mismatch가 난다.

1. **닫는 태그를 반드시 쓴다.** `<diagram-node />` 같은 자기 닫힘은 통하지 않는다.
   브라우저 HTML 파서와 같은 규칙이라 뒤따르는 형제가 전부 그 안에 중첩돼 사라진다.
2. 여는 태그는 **줄 맨 앞**에서 시작하고, 블록 **앞뒤로 빈 줄**을 둔다.
3. **속성 값은 전부 문자열이다.** `emphasis="true"`, `tone="teal"` 처럼 따옴표로 쓴다.
4. 잘못된 값(`tone="보라"`)은 throw하지 않고 기본값으로 떨어진다. 글이 죽지는 않지만
   의도한 그림도 안 나오니 아래 표의 허용값을 확인할 것.
5. 다 쓰고 나면 `pnpm --filter @blog/web run lint:posts` 로 frontmatter를 검증한다.

---

## 컴포넌트 목록

| 태그          | 용도                                      | 상세                                                                         |
| :------------ | :---------------------------------------- | :--------------------------------------------------------------------------- |
| `<diagram>`   | 구조·흐름 다이어그램 (SVG, 다크모드 자동) | [아래](#diagram) · 전체 가이드는 `apps/blog/web/design/DIAGRAM_AUTHORING.md` |
| `<dialogue>`  | 도입부 슬랙·구두 대화 재현                | [아래](#dialogue)                                                            |
| `<metrics>`   | before/after 성과 수치 카드               | [아래](#metrics)                                                             |
| `<timeline>`  | 시도1 실패 → 시도2 실패 → 시도3 성공 서사 | [아래](#timeline)                                                            |
| `<callout>`   | 강조 박스 (info/tip/warning/danger)       | [아래](#callout)                                                             |
| `<file-tree>` | 디렉토리 구조                             | [아래](#file-tree)                                                           |
| `<figure>`    | 그림 + 캡션                               | [아래](#figure)                                                              |

코드 블록(` ```ts `)과 Mermaid(` ```mermaid `)는 태그 없이 그냥 쓰면 된다.

---

## <a id="diagram"></a>`<diagram>` — 구조 다이어그램

PNG를 붙이지 말 것. SVG라 다크모드 색이 따라오고, 좁은 화면에서 줄어들고, 글자가 검색된다.

```html
<diagram label="배포 파이프라인" caption="↻ 실패 시 자동 롤백">
  <diagram-node id="push" title="git push" desc="main 병합"></diagram-node>
  <diagram-node id="actions" title="Actions" desc="Docker 빌드"></diagram-node>
  <diagram-node id="ecr" title="ECR" desc="이미지 푸시"></diagram-node>
  <diagram-node
    id="ecs"
    title="ECS 배포"
    desc="blue/green 전환"
    tone="teal"
  ></diagram-node>
  <diagram-edge from="ecr" to="ecs" emphasis="true"></diagram-edge>
</diagram>
```

노드를 나열하면 좌→우로 자동 배치되고 폭도 글자 수에서 계산된다. 좌표를 잡을 필요가 없다.

| 태그             | prop             | 기본    | 값                                                                        |
| :--------------- | :--------------- | :------ | :------------------------------------------------------------------------ |
| `<diagram>`      | `label`          | 없음    | 스크린리더용 한 문장. **없으면 장식으로 간주돼 접근성 트리에서 감춰진다** |
|                  | `caption`        | 없음    | 그림 아래 중앙 주석                                                       |
|                  | `direction`      | `row`   | `row`(좌→우 체인) / `fan`(첫 노드에서 팬아웃)                             |
|                  | `name`           | 없음    | 레지스트리 이름. 주면 children 무시                                       |
| `<diagram-node>` | `id`             | 순번    | 엣지가 가리키는 키. 엣지를 쓸 거면 직접 준다                              |
|                  | `title` / `desc` | 없음    | 제목 / 부제(**5단어 이내**)                                               |
|                  | `tone`           | `gray`  | `gray`(구조) / `teal`(핵심 경로)                                          |
|                  | `shape`          | `box`   | `box`(rx 8) / `pill`                                                      |
| `<diagram-edge>` | `from` / `to`    | —       | 노드 `id`. 둘 다 있어야 그려진다                                          |
|                  | `flow`           | `sync`  | `sync`(실선=동기) / `async`(점선=비동기·데이터)                           |
|                  | `emphasis`       | `false` | 핵심 경로만 틸로                                                          |
|                  | `arrow`          | `true`  | 화살촉                                                                    |

**가장 헷갈리는 규칙**: `<diagram-edge>`를 **하나라도** 쓰면 자동 연결이 꺼진다.
한 구간만 강조하려고 엣지 하나만 추가하면 나머지 선이 전부 사라진다 — 그럴 땐 전부 명시할 것.

**문법 규칙**(핸드오프 §4): 회색+틸 **2색만**, 실선=동기·점선=비동기, 부제 5단어 이내.
포인트 틸은 **핵심 경로에만** — 다 칠하면 강조가 아니다.

### 글 맨 위 히어로로 쓰기

frontmatter 한 줄. **등록된 이름만** 받는다(선언형 태그는 히어로에 못 쓴다).

```yaml
hero: deploy-pipeline
```

등록된 이름은 `apps/blog/web/src/components/diagram/registry.ts` 에 있고,
오타는 `lint:posts` 가 `unknown-hero-diagram` 에러로 잡는다.

### 선언형으로 안 되는 그림

떨어진 두 노드를 직접 잇거나, 되돌아오는 화살표·분기·그룹 박스가 필요하면 코드로 간다.
컴포넌트 파일 1개 + `registry.ts` 등록 2줄. 절차는 `design/DIAGRAM_AUTHORING.md`.

---

## <a id="dialogue"></a>`<dialogue>` — 대화 버블

```html
<dialogue>
  <msg from="PM">배포하다 서비스 죽으면 어떡해요? 새벽에 하실 거죠?</msg>
  <msg from="me">아니요, 점심에 합니다. 아무도 모르게요.</msg>
</dialogue>
```

`from="me"`(또는 `나`, `저`, `i`)면 우측 정렬 + 틸 버블, 그 외는 좌측 + 회색 버블.
아바타 이니셜은 자동이다 — `PM`·`QA` 같은 짧은 라틴 대문자 약어는 통째로, 사람 이름은 첫 글자만.

---

## <a id="metrics"></a>`<metrics>` — 성과 수치 카드

두 가지 중 편한 쪽으로. 2~4열까지가 적정이다. 5개 이상은 카드가 사라지진 않고
4열에서 줄바꿈되므로 마지막 줄이 비뚤어진다.

```html
<metrics>
  <metric label="배포 소요" value="22분 → 8분"></metric>
  <metric label="다운타임" value="0초"></metric>
  <metric label="롤백" value="자동" tone="success"></metric>
</metrics>
```

```html
<metrics
  items='[{"label":"배포 소요","value":"22분 → 8분"},{"label":"롤백","value":"자동","tone":"success"}]'
></metrics>
```

`tone`은 `default`(기본) / `success`(값이 초록). 값은 모노스페이스로 나온다 — 수치를 넣으라는 뜻이다.

---

## <a id="timeline"></a>`<timeline>` — 시도 타임라인

"이렇게 해봤다 → 안 됐다 → 결국 이렇게 됐다" 서사 전용.

```html
<timeline>
  <step
    title="시도 1 · pm2 롤링 재시작"
    desc="프로세스 전환 순간 504, 커넥션 드레이닝 불가"
    result="fail"
  ></step>
  <step
    title="시도 2 · ECS 롤링 업데이트"
    desc="배포는 되지만 롤백이 수동"
    result="fail"
  ></step>
  <step
    title="시도 3 · CodeDeploy blue/green"
    desc="검증 후 전환, 실패 시 자동 롤백"
    result="success"
  ></step>
</timeline>
```

`result`는 `fail`(빨강 ×) / `success`(초록 ✓). `steps='[…]'` JSON 문자열도 받는다.

---

## <a id="callout"></a>`<callout>` — 강조 박스

```html
<callout type="warning" title="선택 사항">
  본문. 마크다운이 그대로 먹는다.
</callout>
```

`type`은 `info`(기본, 무채색) / `tip`(틸) / `warning`(앰버) / `danger`(빨강).
`title` 생략 시 타입 이름이 들어간다.

---

## <a id="file-tree"></a>`<file-tree>` — 디렉토리 구조

**2-space 들여쓰기**, 디렉토리는 끝에 `/`. 들여쓰기가 곧 문법이라 줄바꿈을 지워선 안 된다.

<!-- prettier-ignore -->
```html
<file-tree>
apps/
  blog/
    posts/
    web/
      src/
packages/
</file-tree>
```

---

## <a id="figure"></a>`<figure>` — 그림 + 캡션

```html
<figure>
  <img src="./screenshot.png" alt="빌드 로그" />
  <figcaption>캐시 hit인데 콜드 빌드가 도는 구간</figcaption>
</figure>
```

이미지는 글 폴더에 두면 빌드 시 `public/posts/` 로 복사된다. 캡션은 모노 12px로 나온다.

---

## 디자인 규칙 (컴포넌트를 고칠 때)

디자인 의도와 결정 배경은 `apps/blog/web/design/blog-redesign-handoff.md`에 있다.
(리뉴얼 때 쓰던 `design-reference.html`은 구현 완료 후 삭제됐다.)

- 색은 Panda semanticTokens만. `strictTokens: true` 라 임의 값은 `'[14px]'` 로 이스케이프
- **글자엔 `accent.600`, 선·아이콘엔 `accent.500`** (라이트 모드 WCAG AA 때문에 나뉜다)
- 라운드: 카드 `card`(12px) / 작은 요소 `control`(8px) / 배지·pill `pill`
- 보더는 `hairline`. **그림자·그라데이션·글로우 금지** — 위계는 보더로만
- 메타 정보(날짜·읽기시간·조회수·태그·코드·로고)는 `fontFamily: 'mono'`.
  단 시리즈 배지는 안에 숫자가 있어도 sans다 — 레퍼런스 `.badge`가 sans고
  홈·글 상세·`/series`가 모두 그렇게 맞춰져 있다

## 검증

```bash
pnpm --filter @blog/web run lint:posts
```
