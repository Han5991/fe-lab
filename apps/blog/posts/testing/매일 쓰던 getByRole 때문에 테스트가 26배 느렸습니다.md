---
title: '매일 쓰던 getByRole 때문에 테스트가 26배 느렸습니다 — RTL·jsdom 성능 분석'
seoTitle: 'getByRole 때문에 테스트가 26배 느렸습니다'
date: '2026-07-31'
status: published
slug: 'getbyrole-performance'
excerpt: '매일 쓰던 getByRole이 사실은 트리 전체를 훑고 있었습니다. Meta 디자인 시스템에서 34초 걸리던 테스트 파일의 원인을 찾아 1.3초로 줄이기까지, RTL과 jsdom 내부에서 실제로 벌어지는 일을 따라가 봤습니다.'
thumbnail: '/og/getbyrole-performance.png'
tags: ['testing-library', 'jsdom', 'performance', 'open-source']
---

## 이 글을 읽고 나면

- 매일 쓰는 `getByRole('button', {name})`이 내부에서 무슨 일을 하는지 알게 됩니다
- "느리다"에서 "무엇이 느린가"로 좁혀가는 방법을 배웁니다
- jsdom의 `getComputedStyle`이 왜 브라우저와 다르게 비싼지 이해합니다
- 내 프로젝트에서 언제 이 문제를 의심해야 하는지 판단 기준을 얻습니다

---

## 병목 좁히기 — 렌더가 아니라 getByRole 쿼리였다

### 1. 유독 느린 파일 하나

Meta의 디자인 시스템 [astryx](https://github.com/facebook/astryx)에서 CI 최적화 작업을 하고 있었습니다.  
파이프라인이 오래 걸려서 이것저것 줄여보던 중이었습니다.

> 이 글의 근거 PR은 [facebook/astryx#3816](https://github.com/facebook/astryx/pull/3816)이고, 2026년 7월 12일에 머지되었습니다.  
> 아래 나오는 코드와 수치는 전부 그 PR에서 직접 확인하실 수 있습니다.

그러다 테스트 파일별 실행 시간을 훑어보다가 이상한 걸 발견했습니다.  
가장 느린 파일 네 개가 **전부 날짜 컴포넌트**였습니다.

| 파일 | 테스트 수 | 시간 | 테스트 1개당 |
| :--- | ---: | ---: | ---: |
| **DateRangeInput.test.tsx** | 34 | **34.3s** | **약 1초** |
| Calendar.test.tsx | 45 | 7.2s | 0.16s |
| DateInput.test.tsx | 68 | 5.1s | 0.075s |
| DateTimeInput.test.tsx | 64 | 4.1s | 0.064s |

네 개가 한자리에 몰려 있다는 것부터 우연이 아닌데, 맨 위 파일은 아예 다른 세상에 있습니다. DateInput은 테스트 68개에 5.1초, DateRangeInput은 34개에 34.3초. **테스트 수는 절반인데 시간은 7배**입니다.

같은 폴더의, 같은 날짜 입력 컴포넌트입니다. 게다가 이 테스트들은 **화면을 그리지 않습니다.** jsdom 위에서 마운트하고, 클릭하고, 텍스트를 확인하는 게 전부죠.

> 그런 일에 1초가 걸릴 이유가 있을까요?

원인은 제가 거의 매일 쓰던 한 줄이었습니다.

---

### 2. 렌더 20ms, 쿼리 450ms

느리다는 건 알았지만 **무엇이** 느린지는 모릅니다. 그래서 테스트 하나를 구간별로 쪼개서 쟀습니다.

```js
const t0 = performance.now();
render(<DateRangeInput />);

const t1 = performance.now();
screen.getByRole('button', {name: 'Open calendar'});

const t2 = performance.now();
console.log('render :', (t1 - t0).toFixed(0), 'ms');
console.log('query  :', (t2 - t1).toFixed(0), 'ms');
```

```
render :  20 ms
query  : 450 ms
```

렌더는 20ms인데 버튼 **하나**를 찾는 데 450ms. 22배입니다.

> 컴포넌트를 통째로 만드는 것보다,  
> 이미 만들어진 것 중에서 하나 찾는 게 22배 비싸다?

보통은 반대입니다. 만드는 게 비싸고 찾는 건 쌉니다. 뒤집혔다면 이유가 있습니다. 그 이유는 6장에서 다루고, 지금 확실한 건 하나입니다.

**느린 쪽은 렌더가 아니라 쿼리다.**

---

### 3. 소스를 열어보다

`node_modules`를 뒤져서 실제 구현을 열었습니다.  
`@testing-library/dom`의 `dist/queries/role.js`입니다.  
다만 아래에는 읽기 편하도록 같은 코드의 원본인 `src/queries/role.ts`를 인용하겠습니다.

놀랄 만큼 단순했습니다. 그냥 **`.filter()` 체인**이었습니다.

```js
// @testing-library/dom v10.4.1 — src/queries/role.ts
Array.from(container.querySelectorAll(makeRoleSelector(role)))
  .filter(/* role 필터 — 이 노드의 role이 정말 맞는가 */)
  .filter(/* aria 필터 — checked, expanded, ... */)
  .filter(element => {
    if (name === undefined) return true;
    return matches(computeAccessibleName(element), element, name, text => text);
    //              ^^^^^^^^^^^^^^^^^^^^ name 필터 — 이름을 계산해서 비교
  })
  .filter(/* description 필터 */)
  .filter(element => {
    return hidden === false ? isInaccessible(element) === false : true;
    //                        ^^^^^^^^^^^^^^ hidden 필터 — 화면에 보이는가
  });
```

실제 체인은 필터 5개고, 위는 필요한 부분만 남긴 것입니다.

<details>
<summary>출처 — @testing-library/dom v10.4.1 <code>role.ts</code> (펼치기)</summary>

[`role.ts` L186–L304](https://github.com/testing-library/dom-testing-library/blob/v10.4.1/src/queries/role.ts#L186-L304) · [name 필터](https://github.com/testing-library/dom-testing-library/blob/v10.4.1/src/queries/role.ts#L266-L281) · [hidden 필터](https://github.com/testing-library/dom-testing-library/blob/v10.4.1/src/queries/role.ts#L298-L304)

</details>

제가 무심코 쓰던 한 줄이 사실은 **세 가지 일**을 하고 있었습니다.

```js
screen.getByRole('button', {name: 'Open calendar'});
//                ^^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^   + 기본값 hidden: false
//                role 필터  name 필터                hidden 필터
//                후보 수집  이름으로 걸러냄          안 보이는 것 제외
```

여기서 `computeAccessibleName`은 스크린리더가 읽어주는 그 **접근성 이름**을 구하는 함수입니다.

#### 그런데 순서가 이상합니다

**name 필터가 hidden 필터보다 먼저 옵니다.** `.filter()`는 앞에서부터 실행되니 이런 일이 벌어지죠.

> 화면에 안 보여서 **어차피 hidden 필터에서 걸러질 노드들**의 이름을,  
> 안 보인다는 걸 알아내기도 **전에** 전부 계산한다.

하나 더. `.filter()`니까 **원하는 걸 찾아도 멈추지 않습니다.**

#### 그래서 DateRangeInput은요

```
DateRangeInput
├── 트리거 버튼          ← 내가 찾으려던 것
└── 팝오버 (닫힘)
    └── 2개월치 달력
        └── 날짜 버튼 약 85개   ← 화면에 안 보이지만 DOM에는 그대로
```

팝오버가 닫혀 있어도 **달력은 언마운트되지 않습니다.** 그러니 트리거 하나를 찾으려고 `getByRole('button', {name})`을 부르면, 후보 **86개**를 모으고 → **전부**의 이름을 계산하고 → 이름이 다른 85개를 떨어뜨립니다. 그 85개가 애초에 화면에 없었다는 사실은 어디에도 쓰이지 않습니다.

**보이지도 않을 버튼 85개의 이름을, 안 보인다는 걸 알기도 전에 전부 계산하고 있었던 겁니다.**

<diagram label="role 필터로 후보 86개를 모은 뒤 name 필터가 전부의 이름을 계산하고, hidden 필터가 마지막에 85개를 제외하는 순서" caption="hidden이 먼저였다면 85개는 계산조차 없다">
  <diagram-node id="role" title="role 필터" desc="후보 86개 수집"></diagram-node>
  <diagram-node id="name" title="name 필터" desc="86개 전부 이름 계산" tone="accent"></diagram-node>
  <diagram-node id="hidden" title="hidden 필터" desc="85개 뒤늦게 제외"></diagram-node>
  <diagram-edge from="role" to="name" emphasis="true"></diagram-edge>
  <diagram-edge from="name" to="hidden"></diagram-edge>
</diagram>

다만 순서가 문제의 전부는 아닙니다. hidden 필터도 결국 후보 하나하나의 스타일을 봐야 하거든요. 이건 4장에서 다시 짚겠습니다.

그럼 450ms를 먹은 건 이름 계산일까요? 확인해봐야죠.

---

### 4. 옵션 하나를 뺐더니 450ms가 29ms가 됐다

의심은 의심일 뿐입니다. 재봐야 압니다.

문제는 세 필터가 한 덩어리로 돈다는 겁니다. 프로파일러는 "이 함수가 느리다"까지만 알려주지 **셋 중 어느 것인지**는 안 갈라줍니다. 방법은 하나뿐입니다. **떼어내고 다시 재는 것.**

그래서 **하한선**부터 만들었습니다. name도 hidden도 없이 후보만 모으면 얼마나 걸리나?

```js
screen.getByRole('button', {name: 'Open calendar'});   // → 450ms
screen.getAllByRole('button', {hidden: true});         // → 29ms  (두 필터 다 끔)
```

두 옵션이 어떻게 필터를 끄는지는 3장에서 본 소스에 그대로 있습니다. `name`을 안 주면 이름 계산을 건너뛰고, `hidden: true`면 가시성 검사를 건너뜁니다. hidden 필터도 결국 스타일을 들여다보는 일이라, 이것까지 꺼야 순수한 바닥값이 나옵니다.

| 무엇을 쟀나 | 시간 | 비중 |
| :--- | ---: | ---: |
| role 필터 (후보 수집만) | 29ms | 6% |
| **name 필터 + hidden 필터** | **421ms** | **94%** |
| 합계 | 450ms | 100% |

후보 86개를 긁어모으는 것 자체는 29ms면 끝납니다. **나머지 94%는 "이름이 맞는지"와 "보이는지"를 따지는 데 쓰였습니다.**

> 성능 문제를 좁힐 때 제가 배운 게 이겁니다.  
> **한 덩어리로 보이는 것을 쪼개서, 가장 싼 조합의 바닥값부터 만든다.**  
> 그 바닥에서 얼마나 올라가는지를 보면 어디가 비싼지 드러납니다.

#### 94%를 한 번 더 쪼개면

방금 그 말대로라면 여기서 멈추면 안 됩니다. 94%를 name과 hidden이 나눠 가졌는데 **누가 얼마나 가져갔는지를 아직 모릅니다.**

두 옵션이 필터를 따로 켜고 끄니 가를 수 있습니다.

```js
screen.getAllByRole('button', {hidden: true});                        // role만
screen.getAllByRole('button', {name: 'Open calendar', hidden: true}); // role + name
screen.getAllByRole('button');                                        // role + hidden
screen.getByRole('button', {name: 'Open calendar'});                  // 셋 다
```

같은 구조를 jsdom 27.4.0 · `@testing-library/dom` 10.4.1로 재현해 넷을 각각 쟀습니다.

| 조합 | `getComputedStyle` 호출 |
| :--- | ---: |
| role만 | **0회** |
| role + **name** | **256회** |
| role + **hidden** | **176회** |
| 셋 다 | **261회** |

<details>
<summary>이 표는 재현 환경 값입니다 — 시간이 아니라 호출 횟수로 잰 이유 (펼치기)</summary>

시간도 쟀지만 표에서 뺐습니다. 같은 코드가 실행마다 1.4초와 2.4초 사이를 오가서, 호출이 더 많은 쪽이 더 빠르게 찍히는 일까지 생기더군요. 반면 호출 횟수는 몇 번을 돌려도 그대로였습니다. 이 절은 호출 횟수에만 기댑니다. (astryx CI가 아니라 제가 따로 만든 재현 환경입니다.)

</details>

이상한 게 보입니다. **셋 다 돌린 261회가 role + name의 256회와 거의 같습니다.** 혼자면 176회를 부르는 hidden 필터가 여기선 5회로 끝났다는 뜻이죠.

`.filter()` 체인이라서 그렇습니다. hidden 필터는 **name 필터가 걸러낸 결과**를 받는데, 이름이 `Open calendar`인 버튼은 하나뿐입니다. 86개가 아니라 **1개**만 검사하는 겁니다.

그 5회는 버튼의 `visibility` 조기 종료 검사 1회 + 버튼부터 `DIV → BODY → HTML`까지의 `display` 4회입니다.

<details>
<summary>출처 — @testing-library/dom v10.4.1 <code>role-helpers.js</code> (펼치기)</summary>

[`role-helpers.js` L46–L66](https://github.com/testing-library/dom-testing-library/blob/v10.4.1/src/role-helpers.js#L46-L66) · [L15–L30](https://github.com/testing-library/dom-testing-library/blob/v10.4.1/src/role-helpers.js#L15-L30)

</details>

여기서 규칙이 드러납니다.

> **먼저 오는 필터가 86개 값을 다 치릅니다.** 뒤에 오는 필터는 살아남은 것만 봅니다.

그래서 3장의 "순서가 이상하다"에 답이 나옵니다. 순서를 뒤집어봤습니다.

| 순서 | 먼저 (86개) | 뒤에 (1개) | 합계 |
| :--- | ---: | ---: | ---: |
| name → hidden (RTL 기본) | 256회 | 5회 | **261회** |
| hidden → name (가정) | 176회 | 1회 | **177회** |

84회가 줄어듭니다. **그런데 3분의 2는 그대로 남습니다.** 누가 먼저 오든 86개를 다 훑어야 하니까요.

> **순서는 낭비를 만들지만, 비용을 만들지는 않습니다.**  
> 비용은 "스타일을 봐야 한다"는 사실에서 나옵니다.  
> 그래서 7장의 해법은 순서를 고치지 않습니다. 스타일 조회를 아예 없앱니다.

이름 계산이 비싸다는 것까지는 알았습니다. 그런데 여기서 새로운 질문이 생깁니다.

> 이름을 구하는 게 왜 그렇게 비싸지?  
> 버튼 안에 있는 글자를 읽어오면 되는 거 아닌가?

저도 그렇게 생각했습니다. 아니었습니다.

---

## 원인 — 접근성 이름 계산과 jsdom의 getComputedStyle

### 5. 접근성 이름은 "보이는 대로 읽은 텍스트"입니다

접근성 이름이 그냥 버튼 안의 글자라면 `textContent`와 같아야 합니다. 버튼을 하나 만들되 **자식 하나를 `display: none`으로 숨겨두고** 확인해봤습니다. `jsdom`과 `dom-accessibility-api`(RTL이 내부에서 쓰는 바로 그 라이브러리)만 있으면 직접 돌려볼 수 있습니다.

```js
// npm i jsdom dom-accessibility-api
const {JSDOM} = require('jsdom');
const {computeAccessibleName} = require('dom-accessibility-api');

const dom = new JSDOM(`<!doctype html><body>
  <button id="a"><span style="display: none">지난달</span> <span>15일</span></button>
</body>`);

const button = dom.window.document.getElementById('a');

console.log('textContent     :', JSON.stringify(button.textContent.trim()));
console.log('accessible name :', JSON.stringify(computeAccessibleName(button)));
```

```
textContent     : "지난달 15일"
accessible name : "15일"
```

**둘이 다릅니다.** 숨겨둔 `"지난달"`이 접근성 이름에서만 빠졌습니다. 당연한 일이죠. 화면엔 `15일`만 보이는데 스크린리더가 "지난달 15일"이라 읽으면 틀린 정보니까요.

여기서 하나가 결정됩니다.

> 접근성 이름을 구하려면 **"이 노드가 화면에 보이는가"를 반드시 확인해야 한다.**  
> 그리고 그걸 아는 방법은 CSS를 계산해보는 것뿐이다.

`display: none`이 인라인으로 왔는지, 클래스로 왔는지, 부모에게서 상속됐는지 알 수 없으니까요.

#### 게다가 자식 하나하나를 봐야 합니다

확인 대상은 버튼 자신만이 아닙니다.  
`dom-accessibility-api` 소스를 열어보면 그대로 있습니다.

```js
// dom-accessibility-api v0.6.3 — sources/accessible-name-and-description.ts
function isHidden(node, getComputedStyleImplementation) {
  // ...
  const style = getComputedStyleImplementation(node);
  return (
    style.getPropertyValue('display') === 'none' ||
    style.getPropertyValue('visibility') === 'hidden'
  );
}

// 자식을 순회하면서
const display = isElement(child)
  ? getComputedStyle(child).getPropertyValue('display')
  : 'inline';
```

`isHidden`이 스타일 조회를 건너뛰는 건 `hidden`·`aria-hidden` **속성이 붙은 노드**에서뿐입니다. 그 밖의 노드는 — 멀쩡히 보이는 노드까지 — CSS로 숨겨졌는지 알아내려고 `getComputedStyle`을 한 번씩 부릅니다. 4장의 256회가 전부 여기서 나옵니다. 다만 8장의 트레이드오프는 CSS로 숨긴 경우에만 발생합니다.

<details>
<summary>출처 — dom-accessibility-api v0.6.3 (펼치기)</summary>

[`isHidden` L70–L90](https://github.com/eps1lon/dom-accessibility-api/blob/v0.6.3/sources/accessible-name-and-description.ts#L70-L90) · [자식 `display` L380–L382](https://github.com/eps1lon/dom-accessibility-api/blob/v0.6.3/sources/accessible-name-and-description.ts#L380-L382)

</details>

두 번째 조각이 중요합니다. **자식의 `display`까지** 확인하죠. `block`이면 화면에서 줄이 바뀌니 단어 사이에 공백을 넣어야 하거든요.

즉 이름 계산은 버튼 하나가 아니라 **그 안의 모든 노드에게** 물어봅니다. 그래서 곱셈이 됩니다.

```
<button><span>15</span></button>     ← 후보 하나에 3회
   │        │      └─ 자식 display 확인
   │        └─ 자식 isHidden
   └─ 버튼 자신 isHidden
```

4장에서 쟀던 256회가 이렇게 나온 겁니다. 후보 86개 중 트리거 1개는 자식이 텍스트뿐이라 1회, 나머지 날짜 버튼 85개가 3회씩. **후보 하나당 약 3회**입니다. 여기에 hidden 필터가 마지막에 부르는 5회를 더하면 261회가 됩니다.

그런데 아직 이상합니다.  
호출이 좀 많다고 450ms가 나올까요? `getComputedStyle`이 그렇게 비싼 함수였나요?

네. jsdom에서는요.

---

### 6. jsdom은 물어볼 때마다 스타일을 새로 조립합니다

먼저 알아둘 게 하나 있습니다. `getComputedStyle`은 **부분적으로 못 만듭니다.**

```js
const display = getComputedStyle(el).display;
//              ^^^^^^^^^^^^^^^^^^^^ 표 전체를 만든 다음, 거기서 한 칸을 꺼낸다
```

개발자도구 Computed 탭에서 "Show all"을 켜면 건드린 적 없는 프로퍼티가 수백 개 나오죠. `display` 하나가 궁금해도 그 표 전체가 만들어집니다.

#### jsdom은 그 표를 호출할 때마다 다시 만듭니다

jsdom 구현을 열어봤습니다.

```js
window.getComputedStyle = function (elt) {
  const declaration = new CSSStyleDeclaration();            // 1. 빈 객체를 새로 만들고
  const elementDeclaration = getDeclarationForElement(elt);  // 2. 캐스케이드를 계산해서
  forEach.call(elementDeclaration, p => declaration.setProperty(...));  // 3. 옮겨 담고
  forEach.call(Object.keys(propertiesWithResolvedValueImplemented),
    p => declaration.setProperty(p, getResolvedValue(elt, p)));         // 4. 최종값 계산
  return declaration;
};
```

2번의 캐스케이드에는 캐시가 있습니다. 그런데 그 바로 옆에 이런 코드가 있습니다.

```js
exports.invalidateStyleCache = elementImpl => {
  if (elementImpl._attached) {
    elementImpl._ownerDocument._styleCache = null;   // 문서 전체 캐시를 통째로 버린다
  }
};
```

<details>
<summary>출처 — jsdom v27.4.0 (펼치기 · jsdom 29에서는 이 코드가 옮겨졌습니다)</summary>

[`Window.js` L908–L944](https://github.com/jsdom/jsdom/blob/v27.4.0/lib/jsdom/browser/Window.js#L908-L944) · [`style-rules.js` L149–L153](https://github.com/jsdom/jsdom/blob/v27.4.0/lib/jsdom/living/helpers/style-rules.js#L149-L153)

jsdom 29부터 이 둘은 `computed-style.js`와 `Document-impl.js`로 옮겨졌으니, 최신 버전을 열면 이 코드가 없습니다.

</details>

**DOM이 바뀌면 문서 전체의 스타일 캐시가 날아갑니다.**

테스트는 클릭하고, 입력하고, 리렌더하는 게 일입니다. 그러니까 테스트는 **캐시를 계속 부수면서 진행됩니다.**

#### 여기서 2장의 의문이 풀립니다

렌더는 20ms인데 쿼리는 450ms. 만드는 것보다 찾는 게 22배 비쌌던 그 이상함이요.

달력과 같은 규모로 버튼 85개를 두고, 스타일시트 규칙 2,000개를 얹어 네 구간을 재봤습니다.

```
1. 렌더                    9.7 ms
2. 스타일 첫 조회 (콜드)  463.4 ms   ← 렌더의 47배
3. 재조회 (캐시 히트)       8.8 ms   ← 2번의 1/53
4. DOM 한 번 건드린 뒤    266.5 ms   ← 속성 하나 바꿨을 뿐인데 다시 비싸진다
```

이유는 이겁니다.

> **브라우저**는 화면을 그려야 하니 **렌더할 때** 스타일을 계산해둡니다.  
> 그래서 나중에 `getComputedStyle`을 부르면 이미 있는 걸 읽기만 합니다. 거의 공짜죠.
>
> **jsdom은 화면을 안 그립니다.** 렌더할 때 스타일을 계산할 이유가 없습니다.  
> 그러다 누가 `getComputedStyle`을 부르면 **그제야 처음으로** 계산합니다.

**비용 청구서가 반대편에 도착하는 겁니다.**

| | 렌더 | `getComputedStyle` |
| :--- | :--- | :--- |
| 브라우저 | 비용 지불 | 거의 공짜 |
| **jsdom** | **거의 공짜** | **비용 지불** |

그래서 2장에서 `render()`가 20ms로 찍힌 건 사실이었습니다. 달력 버튼 85개의 스타일 비용이 렌더 청구서에 실리지 않았을 뿐이고, 그 청구서는 처음으로 스타일을 물어본 쪽, 즉 `getByRole`에게 날아왔습니다.

#### 숫자를 맞춰봅시다

astryx 환경에서 후보 버튼 하나를 처리하는 데 대략 **5ms**가 들었습니다. 5장에서 셌듯 후보 하나에 `getComputedStyle`이 약 세 번 불리니, 이 5ms는 그 세 번을 합친 값입니다.

```
후보 86개 × 후보당 약 5ms ≈ 430ms ≈ 측정값 450ms
```

다른 걸 고쳐놓고 우연히 빨라지는 일은 생깁니다. 하지만 후보 하나의 비용에서 쌓아올린 값이 전체 측정치와 자릿수까지 맞으면, **그건 우연으로 설명되지 않습니다.**

<details>
<summary>위 4구간도 재현 환경 값입니다 — astryx 실측치와의 구분 (펼치기)</summary>

원인을 눈으로 확인하려고 제가 따로 만든 재현 환경의 값입니다. astryx 실측치는 `450ms → 29ms`와 뒤에 나올 파일 단위 수치입니다.

</details>

---

## 해결 — getComputedStyle을 걷어낸 헬퍼와 그 트레이드오프

### 7. 같은 알고리즘, 스타일 계산만 제거

원인을 알았으니 방향은 정해집니다. **`getComputedStyle`을 안 부르면 됩니다.** 문제는 어떻게 안 부르느냐입니다.

선택지를 셋 놓고 봤습니다.

1. **`getByTestId`로 갈아탄다** — 빨라지지만 접근성 검증을 통째로 포기합니다. 디자인 시스템 테스트에서 이건 후퇴입니다. **탈락.**
2. **이름 비교를 직접 구현한다** — 5장에서 봤듯 접근성 이름은 `textContent`가 아닙니다. `aria-label`, `aria-labelledby`, 숨은 자식까지 얹히면 금세 스펙과 어긋납니다. RTL과 다른 답을 내는 헬퍼는 통과해도 믿을 수가 없습니다. **탈락.**
3. **RTL이 쓰는 라이브러리를 그대로 쓰되 비용만 없앤다** — **채택.**

그래서 조건을 이렇게 잡았습니다.

> **이름을 구하는 알고리즘은 RTL과 똑같이 유지한다.**  
> 대신 그 알고리즘이 참조하는 **스타일 계산만** 갈아끼운다.

다행히 `computeAccessibleName`은 `getComputedStyle` 구현을 **주입받을 수 있게** 열려 있었습니다.

실제로 머지된 코드입니다. ([`6cfb542`에서 보기](https://github.com/facebook/astryx/blob/6cfb542/packages/core/src/__tests__/fastRoleQueries.ts))

```ts
// packages/core/src/__tests__/fastRoleQueries.ts — 핵심만 추린 것

// "전부 다 보인다"고만 대답하는 상수 스텁
const visibleStyleStub: Pick<CSSStyleDeclaration, 'getPropertyValue'> = {
  getPropertyValue: prop =>
    prop === 'display' ? 'block' : prop === 'visibility' ? 'visible' : '',
};

function matchesName(el: Element, name: string | RegExp): boolean {
  const accessibleName = computeAccessibleName(el, {
    getComputedStyle: () => visibleStyleStub as CSSStyleDeclaration,
  });
  return typeof name === 'string' ? accessibleName === name : name.test(accessibleName);
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

장치는 셋입니다.

1. **`{hidden: true}`** — hidden 필터를 통째로 건너뜁니다. 가시성 검사용 `getComputedStyle`이 사라집니다.
2. **스타일 스텁 주입** — 이름 계산 안의 `getComputedStyle`을 상수 응답으로 바꿉니다. 캐스케이드를 계산하는 대신 `"block"`을 즉시 돌려주니 비용이 0에 수렴합니다.
3. **`filter`가 아니라 `find`** — RTL은 끝까지 다 돌지만 `.find()`는 찾으면 거기서 멈춥니다. 후보 86개를 끝까지 훑는 대신 첫 매치까지만 봅니다.

호출부는 이렇게 바뀝니다.

```diff
- const trigger = screen.getByRole('button', {name: /Range:/});
+ const trigger = getButton(/Range:/);
```

날짜 컴포넌트 4개 파일에서 **41개 호출부**를 교체했습니다. 호출부가 짧아진 덕에 테스트 파일 자체는 64줄을 더하고 96줄을 덜어 **32줄 줄었지만**, 헬퍼 66줄이 새로 생겼으니 저장소 전체로는 늘었습니다(`+134 −96`). ([전체 diff](https://github.com/facebook/astryx/pull/3816/files))

같은 파일의 `combobox`·`tooltip`·`grid` 쿼리는 **그대로 뒀습니다.** 후보가 몇 개 안 되거나 `name`을 안 쓰면 애초에 싸거든요. 비싼 곳만 바꿔야 팀이 표준 API 대신 사내 헬퍼를 익혀야 하는 부담이 줄어듭니다.

---

### 8. 무엇을 포기했나

공짜는 없습니다. 이 헬퍼는 **두 가지**를 포기했습니다.

**포기 1 — 유일성 검사.** RTL의 `getByRole`은 조건에 맞는 요소가 두 개 이상이면 에러를 던집니다. 성가신 기능 같지만 "이 이름의 버튼은 화면에 하나뿐이다"를 테스트가 대신 확인해주는 안전장치죠. `.find()`는 첫 매치에서 멈추므로 그게 사라집니다. **중복이 생겨도 테스트가 알려주지 않습니다.**

**포기 2 — 이름의 정확도.** 스텁은 `display`에 항상 `"block"`이라 대답하니 CSS로 숨긴 노드도 "보인다"고 판정됩니다. 앞서 `textContent`와 갈렸던 그 버튼을 다시 보죠.

```
<button><span style="display: none">지난달</span> <span>15일</span></button>

RTL     : "15일"
이 헬퍼 : "지난달 15일"   ← 숨긴 텍스트가 이름에 섞여 들어온다
```

"접근성 이름은 보이는 대로 읽은 텍스트"라는 원칙이 여기서 깨집니다. `getComputedStyle` 비용을 없앤 대가로 **"보이는 대로"를 포기한 셈**입니다.

날짜 버튼은 `<button><span>15</span></button>` 정도로 단순해서 문제가 없었지만, **다른 코드베이스에 옮길 때는 반드시 확인해야 합니다.**

그래서 헬퍼 파일 맨 위 주석에 트레이드오프를 명시해뒀습니다.

```
Trade-off vs getByRole: first match wins — no tree-wide uniqueness check.
```

정리하면 이 헬퍼는 **"이 파일들에서, 이 조건에서"** 안전한 도구입니다.  
범용 유틸리티가 아니라 국소 최적화죠. 그래서 테스트 폴더 안에만 두었습니다.

---

## 성과와 적용 기준 — 34.3초에서 1.3초로

### 9. 결과

날짜 컴포넌트 4개 파일, 211개 테스트의 실행 시간입니다.  
아래 수치는 [PR 본문](https://github.com/facebook/astryx/pull/3816)에 그대로 기록돼 있습니다.

| 파일 | 테스트 수 | before | after | 변화 |
| :--- | ---: | ---: | ---: | ---: |
| **DateRangeInput.test.tsx** | 34 | 34.3s | **1.3s** | −96% |
| Calendar.test.tsx | 45 | 7.2s | **1.9s** | −74% |
| DateInput.test.tsx | 68 | 5.1s | **2.2s** | −57% |
| DateTimeInput.test.tsx | 64 | 4.1s | **1.8s** | −56% |
| **합계** | **211** | **50.7s** | **7.2s** | **−86%** |

처음의 그 파일은 **34.3초에서 1.3초**가 됐습니다. 약 **26배**입니다.

#### 그런데 분모를 봐야 합니다

26배는 **파일 하나** 이야기입니다. 전체 스위트는 이렇습니다.

| 무엇 | before | after | 변화 |
| :--- | ---: | ---: | ---: |
| 날짜 파일 4개 | 50.7s | 7.2s | −86% |
| 워커별 테스트 시간 합계 | 297.7s | 235.1s | −21% |
| **전체 벽시계 시간** | **105.9s** | **92.8s** | **−12%** |

**26배를 줄였는데 벽시계는 12%만 줄었습니다.**

테스트가 여러 워커에 나뉘어 병렬로 돌기 때문입니다. 느린 파일 하나를 34초에서 1.3초로 줄여도, 그 워커가 남는 동안 다른 워커가 여전히 자기 몫을 돌고 있으면 전체는 그만큼 안 줄어듭니다. 가장 오래 걸리는 경로가 따로 있는 거죠.

그러니 이 글의 26배는 **"이 병목은 확실히 제거됐다"** 는 뜻이지 **"CI가 26배 빨라졌다"** 는 뜻이 아닙니다.

여기서 강조하고 싶은 게 있습니다.

> **테스트가 확인하는 동작은 바뀌지 않았습니다.**  
> 컴포넌트 코드도 각 테스트의 단언도 손대지 않았고, 전체 5,893개 테스트가 그대로 통과합니다.

바꾼 건 **요소를 찾는 방법**입니다.  
다만 8장에서 적었듯 그 방법에는 대가가 있으니, "검증이 하나도 안 줄었다"고까지 말하면 과장입니다. 유일성 검사가 쿼리에서 빠졌습니다.

그럼 남은 시간은 어디에 있을까요. 그건 쿼리가 아니라 워커에 일을 어떻게 나누느냐의 문제라, 이 글의 범위 밖입니다.

---

### 10. 그래서 언제 이걸 의심해야 할까요

여기까지 읽고 `getByRole`을 걷어내지는 마세요. 대부분의 경우 몇 밀리초면 끝납니다. **문제가 되는 건 특정 조건이 겹칠 때뿐입니다.**

> **RTL이 잘못한 게 아닙니다.**  
> 접근성 이름을 스펙대로 정확히 계산하는 것이 RTL의 존재 이유입니다.  
> 비싼 쪽은 jsdom의 `getComputedStyle`이고, **실제 브라우저에서는 이 비용이 거의 없습니다.**

우리가 한 일은 RTL을 고친 게 아니라, `{hidden: true}`가 허용하는 범위 안에서 **테스트 환경에서만 발생하는 비용**을 걷어낸 것입니다.

#### 의심 조건

이 네 가지가 동시에 성립하면 확인해볼 만합니다.

1. **role 후보가 수십 개 이상 마운트되어 있다** — 달력 그리드, 긴 목록, 데이터 테이블
2. **그중 상당수가 화면에 안 보인다** — 닫힌 팝오버, 접힌 아코디언, 숨긴 탭 패널
3. **`{name}` 옵션을 쓴다** — 이름 계산이 켜지는 스위치입니다
4. **테스트가 자주 리렌더한다** — jsdom의 스타일 캐시가 계속 무효화됩니다

날짜 컴포넌트가 느렸던 건 이 넷이 **전부** 겹쳤기 때문입니다.  
버튼이 다섯 개인 평범한 컴포넌트라면 아무 문제 없습니다.

#### 확인하는 법

두 쿼리를 나란히 재보면 됩니다. 복사해서 느린 테스트에 붙여넣으면 바로 나옵니다.

```js
const t0 = performance.now();
screen.getByRole('button', {name: '내가 찾는 버튼'});
const t1 = performance.now();
screen.getAllByRole('button', {hidden: true});
const t2 = performance.now();

console.log('name 포함 :', (t1 - t0).toFixed(0), 'ms');
console.log('name 제외 :', (t2 - t1).toFixed(0), 'ms');
```

두 숫자가 비슷하면 이 글과 무관한 문제입니다. **차이가 10배 이상 나면** 이름 계산이 원인입니다.

#### 전용 헬퍼는 마지막 선택지입니다

| 순서 | 방법 | 언제 |
| :--- | :--- | :--- |
| 1 | **안 보이는 DOM을 애초에 안 그린다** | 팝오버가 닫혔을 때 언마운트할 수 있다면. 가장 근본적입니다 |
| 2 | **`within()`으로 탐색 범위를 좁힌다** | 구조를 못 바꿀 때. 후보 수 자체가 줄어듭니다 |
| 3 | **전용 헬퍼를 만든다** | 위 둘이 불가능할 때. 이 글의 방법입니다 |

이번에는 1번을 고르지 않았습니다. 컴포넌트 동작을 바꾸는 일이라 테스트만 손보려던 범위를 넘었거든요. 2번은 찾으려는 요소와 숨은 요소가 같은 컨테이너에 있으면 효과가 없습니다.

**3번이 첫 번째 선택지가 되면 안 됩니다.** 표준 API를 떠나는 건 팀이 치르는 비용이니까요.

---

## 마치며

`getByRole('button', {name})`은 제게 "이름이 이런 버튼을 찾아줘"라는 한 문장이었습니다.  
열어보니 `.filter()` 다섯 개가 줄줄이 있었고, 그중 하나가 트리 전체를 훑고 있었습니다.

편의는 공짜가 아니라 **누군가 대신 내주고 있는 비용**이었습니다.  
평소에는 그 비용이 충분히 작아서 안 보일 뿐이고요.

그러니 도구가 이상하게 느리다면, 한 번쯤 열어보시길 권합니다.  
`node_modules` 안에 답이 있는 경우가 생각보다 많습니다.

---

**이 글의 근거**

- PR: [facebook/astryx#3816](https://github.com/facebook/astryx/pull/3816) (2026-07-12 머지) · [전체 diff](https://github.com/facebook/astryx/pull/3816/files)
- 머지된 헬퍼: [`fastRoleQueries.ts`](https://github.com/facebook/astryx/blob/6cfb542/packages/core/src/__tests__/fastRoleQueries.ts) (`6cfb542` — 이 글이 인용한 버전)
- 인용한 라이브러리 소스는 본문 각 코드블록 아래 출처에 버전과 줄 범위를 고정해 달아두었습니다.
- 더 읽을거리: [Accessible Name and Description Computation (W3C)](https://www.w3.org/TR/accname/)
