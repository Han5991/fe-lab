---
title: '테스트 한 파일에 34초, 범인은 getByRole이었습니다'
date: '2026-07-12'
published: false
slug: 'astryx-getbyrole-test-perf'
thumbnail: '/og/astryx-getbyrole-test-perf.png'
---

# 테스트 한 파일에 34초, 범인은 getByRole이었습니다

## 이 글을 읽고 나면

- RTL의 `getByRole(role, {name})`이 왜 후보 **전체**의 접근성 이름을 계산하는지 이해합니다
- jsdom의 `getComputedStyle`이 테스트 시간을 어떻게 잡아먹는지 수치로 파악하게 됩니다
- 접근성 검증은 유지하면서 쿼리 비용만 걷어내는 헬퍼 설계와 그 트레이드오프를 배웁니다
- 여러분의 프로젝트에서 같은 병목을 5분 안에 확인하는 방법을 알게 됩니다

## 들어가며

> **astryx 기여 시리즈**
>
> 1. 테스트 한 파일에 34초, 범인은 getByRole이었습니다 **(현재 글)**
> 2. 로컬에선 그대로인데 CI에서만 빨라지는 최적화가 있습니다
> 3. GitHub Actions끼리 서로 push를 덮어쓸 때 생기는 일
> 4. fork PR을 머지했더니 CI가 빨간불이 됐습니다 — permissions: write가 무시된 이유

최근 3일 동안 facebook/astryx에 PR 11개를 머지시켰습니다. astryx는 메타가 오픈소스로 공개한 내부 도구용 디자인 시스템입니다. pnpm 모노레포에 Vitest, GitHub Actions 조합이죠. 이 글은 그중 CI/테스트 인프라 개선 시리즈의 한 편입니다.

솔직히 고백하겠습니다. 저는 "테스트가 느린 건 어쩔 수 없다"고 생각했습니다. 컴포넌트가 크면 렌더링도 오래 걸리는 법이니까요. 그런데 프로파일링을 해 보니 렌더링이 아니었습니다. 시간의 대부분을 **쿼리 함수 하나**가 먹고 있었습니다.

React Testing Library를 쓰는 분이라면 남 얘기가 아닙니다. 여러분의 `getByRole`도 지금 같은 일을 하고 있을 수 있습니다.

## 34.3초짜리 테스트 파일을 만나다

packages/core의 테스트를 돌리다 이상한 패턴을 발견했습니다. 가장 느린 파일 4개가 **전부 날짜 컴포넌트**였습니다.

| 파일                    | 테스트 수 | 시간      |
| ----------------------- | --------- | --------- |
| DateRangeInput.test.tsx | 34개      | **34.3초** |
| Calendar.test.tsx       | 45개      | 7.2초     |
| DateInput.test.tsx      | 68개      | 5.1초     |
| DateTimeInput.test.tsx  | 64개      | 4.1초     |

숫자가 이상했습니다. DateInput은 테스트 68개에 5.1초입니다. 그런데 DateRangeInput은 34개에 34.3초입니다. 테스트 하나에 1초꼴입니다. 렌더링이 무거워서라기엔 편차가 너무 컸습니다.

처음엔 '날짜 컴포넌트가 원래 무겁겠지' 하고 넘길 뻔했습니다. 달력에 popover에 상태도 많으니까요. 하지만 저 편차가 계속 눈에 밟혔습니다. 그래서 프로파일러를 붙였습니다.

## 프로파일링: 렌더링이 아니라 쿼리였습니다

프로파일 결과는 예상 밖이었습니다. 시간을 먹는 건 React 렌더링이 아니었습니다. 테스트 본문의 **쿼리 한 줄**이었습니다.

```tsx
// 이런 평범한 한 줄이 —
const trigger = screen.getByRole('button', {name: /open calendar/i});
```

이 트리거 버튼 하나를 찾는 데 **약 450ms**가 걸렸습니다. 설마 싶어서 대조 실험을 했습니다. 같은 DOM에서 name 필터만 뺐습니다.

```text
getByRole('button', {name: …})          → 약 450ms
getAllByRole('button', {hidden: true})  →     29ms
```

같은 DOM, 같은 role인데 15배가 넘게 차이 났습니다. 당황했습니다. 범인은 렌더링도, fake timer도 아니었습니다. `{name}` 필터였습니다.

## getByRole은 왜 450ms를 쓰는가

두 가지 사실이 겹쳐서 만든 결과였습니다.

**첫째, 후보가 많았습니다.** 날짜 컴포넌트의 월(月) 그리드는 `role=button` 노드를 **약 35~85개** 마운트한 채 유지합니다. Calendar는 화면에 보이는 채로, `*Input` 계열은 **닫힌 popover 안에** 숨은 채로요. 닫혀 있어도 DOM에는 존재하니 전부 쿼리 후보입니다.

**둘째, RTL은 필터링 전에 이름부터 계산합니다.** `getByRole('button', {name})`의 동작 순서는 이렇습니다.

1. role이 button인 노드를 **전부** 수집한다
2. 각 후보의 **접근성 이름(accessible name)을 전부 계산**한다
3. 그다음에야 name으로 필터링한다

즉 결과가 1개여도 계산은 후보 수만큼, O(전체 후보)입니다. 그리고 접근성 이름 계산은 공짜가 아닙니다. 스펙상 숨겨진 노드는 이름에 기여하면 안 되므로, 계산 과정에서 `display`/`visibility`를 확인합니다. 그 수단이 `getComputedStyle`인데, **jsdom의 getComputedStyle은 노드당 약 5ms**로 느립니다.

계산이 맞아떨어집니다.

```text
후보 최대 85개 × 노드당 약 5ms ≈ 425ms ≈ 측정값 450ms
```

여기에 기본 쿼리는 후보별 가시성 검사(hidden 필터링)도 수행합니다. 이것도 `getComputedStyle` 경유입니다. 이런 쿼리가 파일 곳곳에 있고 테스트가 34개니, 34초가 나온 겁니다.

## 해결 설계: 무엇을 지키고, 무엇을 버릴까

선택지를 셋 놓고 고민했습니다.

1. **`getByTestId`로 도망간다** — 쿼리는 빨라지지만 접근성 이름 검증을 통째로 포기합니다. 디자인 시스템 테스트에서 이건 후퇴입니다. 탈락.
2. **이름 매칭을 텍스트 비교로 자체 구현한다** — `aria-label`, `aria-labelledby` 등 이름 계산 스펙과 어긋나기 시작합니다. RTL과 다른 답을 내는 헬퍼는 신뢰할 수 없습니다. 탈락.
3. **RTL이 내부에서 쓰는 라이브러리를 그대로 쓰되, 비용만 제거한다** — 채택.

RTL은 접근성 이름을 `dom-accessibility-api`라는 라이브러리로 계산합니다. 그 라이브러리를 직접 호출하면 **이름 계산 알고리즘은 RTL과 동일하게** 유지됩니다. 그래서 공유 헬퍼 `fastRoleQueries.ts`를 만들었습니다. 실제 머지된 코드입니다.

```ts
import {screen} from '@testing-library/react';
import {computeAccessibleName} from 'dom-accessibility-api';

// 이름 계산은 display/visibility만 참조하므로 상수 스텁으로 대체 가능
const visibleStyleStub: Pick<CSSStyleDeclaration, 'getPropertyValue'> = {
  getPropertyValue: prop =>
    prop === 'display' ? 'block' : prop === 'visibility' ? 'visible' : '',
};

function matchesName(el: Element, name: string | RegExp): boolean {
  const accessibleName = computeAccessibleName(el, {
    getComputedStyle: () => visibleStyleStub as CSSStyleDeclaration,
  });
  return typeof name === 'string'
    ? accessibleName === name
    : name.test(accessibleName);
}

export function queryButton(name: string | RegExp): HTMLElement | null {
  return (
    screen
      .queryAllByRole('button', {hidden: true})
      .find(el => matchesName(el, name)) ?? null
  );
}

export function getButton(name: string | RegExp): HTMLElement {
  const el = queryButton(name);
  if (!el) {
    throw new Error(`Unable to find a role=button named ${String(name)}`);
  }
  return el;
}
```

트릭은 두 가지입니다.

- **후보 수집을 `{hidden: true}`로** — RTL이 후보마다 하던 가시성 검사(`getComputedStyle`)를 건너뜁니다.
- **이름 계산에 상수 'visible' 스타일 스텁 주입** — `computeAccessibleName`이 스타일에서 참조하는 건 `display`/`visibility`뿐입니다. 그 자리에 항상 "보인다"고 답하는 스텁을 꽂아 `getComputedStyle` 비용만 제거합니다.

"스텁이면 결과가 달라지는 것 아닌가?" 싶으실 텐데, 여기에 정당성이 있습니다. `{hidden: true}`의 의미론 자체가 **"가시성으로 후보를 제외하지 말라"**입니다. 그렇다면 이름 계산에서도 가시성 판정이 결과를 바꾸면 안 됩니다. 스텁은 그 의미론을 코드로 옮긴 것뿐입니다.

물론 공짜는 아닙니다. 트레이드오프를 헬퍼 주석에 명시했습니다.

- `getByRole`은 매치가 2개면 에러를 던지지만, `getButton`은 **첫 매치를 반환**합니다 (first-match-wins)
- 트리 전체의 **유일성 검사가 없습니다**

그래서 전면 교체가 아니라 선별 교체를 했습니다. 4개 스위트의 button role+name 쿼리 **41곳**만 헬퍼로 바꾸고, 이미 싼 쿼리(combobox/tooltip/grid — 후보가 적거나 name 필터가 없는 곳)는 stock RTL을 그대로 뒀습니다. 빠른 길은 비싼 곳에만 쓰면 됩니다.

## 곁가지 시련: 유령 의존성과 TS7016

여기서 끝인 줄 알았는데, 복병이 하나 있었습니다. `dom-accessibility-api`를 직접 import하자 typecheck가 깨진 겁니다. 의존성 선언을 잠깐 빼먹었을 때 `tsc`가 이렇게 실패했습니다.

```text
error TS7016: Could not find a declaration file for module 'dom-accessibility-api'.
  ... implicitly has an 'any' type.
```

설마 싶었습니다. 이 패키지는 RTL의 의존성이라 node_modules에 이미 있었거든요. 원인은 **버전**이었습니다. 호이스팅된 사본은 RTL이 끌어온 transitive 버전 **0.5.16**인데, 이 버전의 `exports` map에는 **types 조건이 없습니다**. 요즘 module resolution에서 tsc는 exports map을 따르기 때문에, 파일이 옆에 있어도 타입 선언을 찾지 못합니다.

해결은 루트 devDependency로 `^0.6.3`을 명시하는 것이었습니다. types 조건이 있는 사본을 핀으로 박은 셈입니다. 교훈은 오래된 격언 그대로입니다. **transitive 의존성을 직접 import하려면, 반드시 직접 선언하세요.** 유령 의존성은 어느 버전이 올지 보장하지 않습니다.

## 결과: 34.3초가 1.3초로

로컬 측정입니다. 동일 머신에서 순차 실행으로 비교했습니다.

| 파일                    | before | after     |
| ----------------------- | ------ | --------- |
| DateRangeInput.test.tsx | 34.3s  | **1.3s**  |
| Calendar.test.tsx       | 7.2s   | 1.9s      |
| DateInput.test.tsx      | 5.1s   | 2.2s      |
| DateTimeInput.test.tsx  | 4.1s   | 1.8s      |

DateRangeInput 기준 **26배** 빨라졌습니다. 전체 스위트 5,893개는 모두 그린이고, 단언하는 내용은 이전과 동일합니다. 전체 wall time은 105.9초에서 92.8초로, worker 합산 tests 단계는 297.7초에서 235.1초로 줄었습니다.

CI 효과도 직접 측정했습니다. astryx는 main에 머지될 때마다 Deploy 워크플로우가 돕니다. 그 안의 `Run pnpm test` 스텝(4-vCPU 러너)이 이 PR 머지 전 평균 약 271초였는데, 머지 후 평균 약 **246초**가 됐습니다. 머지 한 번마다 약 25초씩 아끼는 셈입니다.

## 여러분의 프로젝트에서도 확인해 보세요

이 병목은 astryx만의 문제가 아닙니다. RTL + jsdom 조합이면 어디서든 재현됩니다. 체크리스트로 정리하면 이렇습니다.

1. **느린 테스트 파일부터 찾으세요.** Vitest 출력의 파일별 시간을 보면 됩니다.
2. **그 컴포넌트가 role 노드를 많이 유지하는지 보세요.** 달력, 큰 테이블, 긴 리스트가 대표적입니다. 닫힌 popover/menu도 DOM에 있으면 전부 후보입니다.
3. **`getByRole(role, {name})` 쿼리가 몰려 있는지 보세요.** name 필터가 붙는 순간 O(전체 후보)가 됩니다.
4. **의심되면 30초짜리 대조 측정을 하세요.**

```ts
console.time('named');
screen.getByRole('button', {name: /next month/i});
console.timeEnd('named');

console.time('no-name-filter');
screen.getAllByRole('button', {hidden: true});
console.timeEnd('no-name-filter');
```

두 값이 10배 이상 차이 나면 같은 병목입니다.

오해는 하나 짚고 가겠습니다. **RTL이 잘못한 게 아닙니다.** 접근성 이름을 스펙대로 정확히 계산하는 것이 RTL의 존재 이유입니다. 비싼 쪽은 jsdom의 `getComputedStyle`이고, 실제 브라우저에선 이 비용이 거의 없습니다. 우리가 한 일은 `{hidden: true}` 의미론이 허용하는 범위 안에서 그 비용만 걷어낸 것입니다.

## 마치며

핵심만 다시 정리합니다.

- `getByRole(role, {name})`은 필터링 전에 **모든 role 후보의 접근성 이름을 계산**합니다
- 그 계산은 jsdom의 느린 `getComputedStyle`(노드당 약 5ms)을 경유합니다
- 후보가 수십 개면 쿼리 한 줄이 수백 ms — 그렇게 파일 하나가 34초가 됩니다
- RTL의 이름 알고리즘(`dom-accessibility-api`)은 그대로 두고, `{hidden: true}` 수집 + 스타일 스텁으로 비용만 제거해 34.3초를 1.3초로 줄였습니다
- 대신 first-match-wins라는 트레이드오프를 명시하고, 비싼 쿼리 41곳에만 선별 적용했습니다

"테스트는 원래 느리다"는 말, 저도 오래 믿었습니다. 하지만 프로파일러를 붙이기 전까지는 모르는 겁니다. 여러분의 스위트에서 가장 느린 파일은 몇 초인가요? `getByRole` name 필터를 세어 본 적 있으신가요? 측정해 보고 결과를 댓글로 공유해 주세요. 같은 병목이었는지 정말 궁금합니다.

전체 변경 내역과 측정 데이터는 머지된 PR에서 확인할 수 있습니다.

- PR: [facebook/astryx#3816 — perf(test): make role+name queries O(match) in the date-component suites](https://github.com/facebook/astryx/pull/3816) (2026-07-12 머지)

다음 글에서는 이 시리즈의 다른 CI 개선 작업을 다루겠습니다.
