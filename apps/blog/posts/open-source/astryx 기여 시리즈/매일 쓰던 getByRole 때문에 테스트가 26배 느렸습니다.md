---
title: '매일 쓰던 getByRole 때문에 테스트가 26배 느렸습니다 — RTL·jsdom 성능 분석'
date: 2026-07-26
status: draft
slug: 'getbyrole-performance'
excerpt: '매일 쓰던 getByRole이 사실은 트리 전체를 훑고 있었습니다. Meta 디자인 시스템에서 34초짜리 테스트 파일의 범인을 찾아 1.3초로 줄이기까지, RTL과 jsdom 내부에서 실제로 벌어지는 일.'
tags: ['testing-library', 'jsdom', 'performance', 'open-source']
---

# 매일 쓰던 getByRole 때문에 테스트가 26배 느렸습니다

## 이 글을 읽고 나면

- 매일 쓰는 `getByRole('button', {name})`이 내부에서 무슨 일을 하는지 알게 됩니다
- "느리다"에서 "무엇이 느린가"로 좁혀가는 방법을 배웁니다
- jsdom의 `getComputedStyle`이 왜 브라우저와 다르게 비싼지 이해합니다
- 내 프로젝트에서 언제 이 문제를 의심해야 하는지 판단 기준을 얻습니다

> **astryx 기여 시리즈**
>
> 1. 매일 쓰던 getByRole 때문에 테스트가 26배 느렸습니다 **(현재 글)**
> 2. 로컬에선 그대로인데 CI에서만 빨라지는 최적화가 있습니다
> 3. GitHub Actions끼리 서로 push를 덮어쓸 때 생기는 일
> 4. fork PR을 머지했더니 CI가 빨간불이 됐습니다 — permissions: write가 무시된 이유
> 5. deploy job은 이제 27초면 끝납니다

---

## 1. 유독 느린 파일 하나

Meta의 디자인 시스템 [astryx](https://github.com/facebook/astryx)에서 CI 최적화 작업을 하고 있었습니다.  
CI가 오래 걸려서 이것저것 줄여보던 중이었습니다.

그러다 테스트 파일별 실행 시간을 훑어보다가 이상한 걸 발견했습니다.  
가장 느린 파일 네 개가 **전부 날짜 컴포넌트**였습니다.

| 파일 | 테스트 수 | 시간 | 테스트 1개당 |
| :--- | ---: | ---: | ---: |
| **DateRangeInput.test.tsx** | 34 | **34.3s** | **약 1초** |
| Calendar.test.tsx | 45 | 7.2s | 0.16s |
| DateInput.test.tsx | 68 | 5.1s | 0.075s |
| DateTimeInput.test.tsx | 64 | 4.1s | 0.064s |

네 개가 한자리에 몰려 있다는 것부터 우연이 아닙니다.  
그리고 맨 위 파일은 아예 다른 세상에 있습니다.

DateInput은 테스트 68개에 5.1초인데, DateRangeInput은 34개에 34.3초입니다.  
**테스트 수는 절반인데 시간은 7배.** 하나당으로는 13배 넘게 벌어집니다.

같은 폴더에 있는, 같은 날짜 입력 컴포넌트입니다.  
그런데 테스트 하나를 도는 데 1초가 걸립니다.

여기서 한 가지 짚고 갈 게 있습니다.  
이 테스트들은 **화면을 그리지 않습니다.** jsdom 위에서 돌아가니까요.  
컴포넌트를 마운트하고, 버튼을 몇 번 클릭하고, 텍스트가 맞는지 확인하는 게 전부입니다.

> 그런 일에 1초가 걸릴 이유가 있을까요?

범인은 제가 거의 매일 쓰던 한 줄이었습니다.

---

## 2. 렌더는 무죄였습니다

느리다는 것은 알았지만, **무엇이** 느린지는 모릅니다.  
그래서 테스트 하나를 구간별로 쪼개서 측정했습니다. 방법은 단순합니다.

```js
const t0 = performance.now();
render(<DateRangeInput />);

const t1 = performance.now();
screen.getByRole('button', {name: 'Open calendar'});

const t2 = performance.now();

console.log('render :', (t1 - t0).toFixed(0), 'ms');
console.log('query  :', (t2 - t1).toFixed(0), 'ms');
```

결과는 이랬습니다.

```
render :  20 ms
query  : 450 ms
```

렌더는 20ms입니다. 쌉니다.  
그런데 버튼 **하나**를 찾는 데 450ms가 걸립니다. 22배입니다.

여기서 상식이 하나 깨집니다.

> 컴포넌트를 통째로 만드는 것보다,  
> 이미 만들어진 것 중에서 하나 찾는 게 22배 비싸다?

보통은 반대입니다. 만드는 것이 비싸고, 찾는 것은 쌉니다.  
이 뒤집힘은 그냥 넘길 일이 아니라고 봤습니다. **뒤집힌 데는 이유가 있으니까요.**

그 이유는 6장에서 제대로 파헤치겠습니다.  
지금 확실한 것은 하나입니다.

**범인은 렌더가 아니라 쿼리다.**

그래서 `getByRole`이 안에서 무엇을 하는지 보러 갔습니다.

---

## 3. 소스를 열어보다

`node_modules`를 뒤져서 실제 구현을 열었습니다.  
`@testing-library/dom`의 `queries/role.js`입니다.

놀랄 만큼 단순했습니다. 그냥 **`.filter()` 체인**이었습니다.

```js
// @testing-library/dom v10.4.1 — queries/role.js
Array.from(container.querySelectorAll(makeRoleSelector(role)))
  .filter(/* ① 이 노드의 role이 정말 맞는가 */)
  .filter(/* ② aria 속성 조건 (checked, expanded, ...) */)
  .filter(element => {
    if (name === undefined) return true;
    return matches(computeAccessibleName(element), element, name, text => text);
    //              ^^^^^^^^^^^^^^^^^^^^ ③ 이름을 계산해서 비교
  })
  .filter(/* ④ description 조건 */)
  .filter(element => {
    return hidden === false ? isInaccessible(element) === false : true;
    //                        ^^^^^^^^^^^^^^ ⑤ 화면에 보이는가
  });
```

제가 무심코 쓰던 한 줄이 사실은 **세 가지 일**을 하고 있었습니다.

```js
screen.getByRole('button', {name: 'Open calendar'});
//                ^^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^   + 기본값 hidden: false
//                ① role로  ③ 이름으로 필터           ⑤ 안 보이는 것 제외
//                후보 수집
```

여기서 `computeAccessibleName`은 **접근성 이름**을 구하는 함수입니다.  
스크린리더가 "확인 버튼"이라고 읽어주는, 그 이름이요.

### 그런데 순서가 이상합니다

체인을 다시 보세요. **③ 이름 계산이 ⑤ 가시성 검사보다 먼저 옵니다.**

`.filter()`는 앞에서부터 순서대로 실행됩니다.  
그러니까 이런 일이 벌어집니다.

> 화면에 안 보여서 **어차피 ⑤에서 걸러질 노드들**의 이름을,  
> 안 보인다는 걸 알아내기도 **전에** 전부 계산한다.

그리고 하나 더. `.filter()`니까 **원하는 걸 찾아도 멈추지 않습니다.**  
끝까지 다 돕니다.

### 그래서 DateRangeInput은요

날짜 범위 입력 컴포넌트는 이렇게 생겼습니다.

```
DateRangeInput
├── 트리거 버튼          ← 내가 찾으려던 것
└── 팝오버 (닫힘)
    └── 2개월치 달력
        └── 날짜 버튼 약 85개   ← 화면에 안 보이지만 DOM에는 그대로
```

팝오버가 닫혀 있어도 **달력은 언마운트되지 않습니다.** DOM에 계속 살아 있습니다.

그러니 트리거 버튼 하나를 찾으려고 `getByRole('button', {name})`을 부르면,

1. `role=button` 후보를 긁어모읍니다 → **86개**
2. 86개 **전부**의 접근성 이름을 계산합니다 ← ③
3. 그다음에야 "아, 85개는 안 보이는 거였네" 하고 걸러냅니다 ← ⑤

**보이지도 않을 버튼 85개의 이름을, 안 보인다는 걸 알기도 전에 전부 계산하고 있었던 겁니다.**

여기까지 읽으면 자연스럽게 의심이 갑니다.  
450ms를 먹은 건 ③번, 이름 계산 아닐까?

확인해봐야죠.

---

## 4. 옵션 하나를 뺐더니 450ms가 29ms가 됐다

의심은 의심일 뿐입니다. 재봐야 압니다.

문제는 `getByRole` 안에서 ①③⑤가 한 덩어리로 돌아간다는 겁니다.  
프로파일러를 붙여도 "이 함수가 느리다"까지는 알려주지만, **셋 중 누구인지**는 제가 갈라내야 합니다.

방법은 하나뿐입니다. **떼어내고 다시 재는 것.**

그래서 **하한선**을 먼저 만들었습니다.  
"③도 ⑤도 없이, ① 후보 수집만 하면 얼마나 걸리나?"

```js
// ① + ③ + ⑤  — 원래 쓰던 쿼리
screen.getByRole('button', {name: 'Open calendar'});
// → 450ms

// ① 만  — 이름 필터와 가시성 검사를 둘 다 끔
screen.getAllByRole('button', {hidden: true});
// → 29ms
```

**450ms에서 29ms로 떨어졌습니다.**

두 옵션이 어떻게 필터를 끄는지는 3장에서 본 소스에 그대로 있습니다.

```js
.filter(element => {
  if (name === undefined) return true;      // ③ name을 안 주면 통째로 통과
  return matches(computeAccessibleName(element), ...);
})
.filter(element => {
  return hidden === false ? isInaccessible(element) === false : true;
  //     ^^^^^^^^^^^^^^^^ hidden: true 면 검사 자체를 건너뜀
});
```

`hidden: true`를 같이 넣은 데는 이유가 있습니다.  
⑤ 가시성 검사도 결국 **스타일을 들여다보는 일**이라, 이것까지 꺼야 순수한 바닥값이 나오기 때문입니다.

정리하면 이렇습니다.

| 무엇을 쟀나 | 시간 | 비중 |
| :--- | ---: | ---: |
| ① 후보 수집만 | 29ms | 6% |
| **③ 이름 계산 + ⑤ 가시성 검사** | **421ms** | **94%** |
| 합계 | 450ms | 100% |

`role=button` 노드 86개를 긁어모으는 것 자체는 29ms면 끝납니다.  
**나머지 94%는 "이름이 맞는지"와 "보이는지"를 따지는 데 쓰였습니다.**

> 성능 문제를 좁힐 때 제가 배운 게 이겁니다.  
> **한 덩어리로 보이는 것을 쪼개서, 가장 싼 조합의 바닥값부터 만든다.**  
> 그 바닥에서 얼마나 올라가는지를 보면 범인이 드러납니다.

범인은 잡았습니다. 그런데 여기서 새로운 질문이 생깁니다.

> 이름을 구하는 게 왜 그렇게 비싸지?  
> 버튼 안에 있는 글자를 읽어오면 되는 거 아닌가?

저도 그렇게 생각했습니다. 아니었습니다.

---

## 5. 접근성 이름은 "보이는 대로 읽은 텍스트"입니다

직접 돌려보는 게 빠릅니다.  
`jsdom`과 `dom-accessibility-api`만 있으면 됩니다. (RTL이 내부에서 쓰는 바로 그 라이브러리입니다.)

```js
// npm i jsdom dom-accessibility-api
const {JSDOM} = require('jsdom');
const {computeAccessibleName} = require('dom-accessibility-api');

const dom = new JSDOM(`<!doctype html><body>
  <button id="a">
    <span style="display: none">지난달</span>
    <span>15일</span>
  </button>
</body>`);

global.window = dom.window;
const button = dom.window.document.getElementById('a');

console.log('textContent     :', JSON.stringify(button.textContent.trim()));
console.log('accessible name :', JSON.stringify(computeAccessibleName(button)));
```

결과입니다.

```
textContent     : "지난달 15일"
accessible name : "15일"
```

`textContent`는 `"지난달 15일"`이지만, 접근성 이름은 `"15일"`입니다.  
**`display: none`인 자식이 빠졌습니다.**

당연한 일입니다. 화면에는 `15일`만 보이는데 스크린리더가 "지난달 15일"이라고 읽으면 틀린 정보니까요.

여기서 하나가 결정됩니다.

> 접근성 이름을 구하려면 **"이 노드가 화면에 보이는가"를 반드시 확인해야 한다.**  
> 그리고 그걸 아는 방법은 CSS를 계산해보는 것뿐이다.

`display: none`이 인라인 스타일로 왔는지, 클래스로 왔는지, 부모에게서 상속됐는지 알 수 없으니까요.

### 게다가 자식 하나하나를 봐야 합니다

두 번째 예제입니다.

```js
const dom = new JSDOM(`<!doctype html><body>
  <button id="inline"><span>홍</span><span>길동</span></button>
  <button id="block">
    <span style="display: block">홍</span><span style="display: block">길동</span>
  </button>
</body>`);
```

```
inline 자식 : "홍길동"
block  자식 : "홍 길동"
```

`display`가 `block`이면 화면에서 줄이 바뀝니다.  
그러면 두 단어는 **분리돼서** 들려야 하니 사이에 공백이 들어갑니다. `inline`이면 붙고요.

즉 이름 계산은 버튼 자신뿐 아니라 **버튼 안의 모든 자식에게** 물어봅니다.

> "너 보이니?"  
> "너 block이니, inline이니?"

`dom-accessibility-api` 소스를 열어보면 그대로 있습니다.

```js
// dom-accessibility-api — accessible-name-and-description.js
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

### 그래서 곱셈이 됩니다

이제 3장의 그림과 합쳐보겠습니다.

```
getByRole('button', {name: 'Open calendar'})
  └─ 후보 버튼 86개 각각에 대해
       └─ 버튼 서브트리의 모든 노드에 대해
            └─ getComputedStyle() 호출
```

버튼 하나에 `getComputedStyle` 한 번이 아닙니다.  
**버튼 86개 × 각 버튼 안의 노드 수**만큼입니다.

그런데 아직 이상합니다.  
호출이 좀 많다고 450ms가 나올까요? `getComputedStyle`이 그렇게 비싼 함수였나요?

네. jsdom에서는요.

---

## 6. jsdom은 물어볼 때마다 스타일을 새로 조립합니다

### 그전에, getComputedStyle이 정확히 뭘 하는 함수인가요

브라우저 개발자도구의 **Computed 탭**, 그거 맞습니다.

- **Styles 탭** = 캐스케이드가 아직 싸우는 중. 여러 규칙이 나열되고 진 것들엔 취소선이 그어져 있죠.
- **Computed 탭** = 싸움이 끝난 결과. 프로퍼티당 값 하나.

`getComputedStyle(el)`은 코드로 그 탭을 여는 겁니다.

```js
// <style> button { display: block } .btn { color: red } </style>
// <button class="btn" style="font-size: 14px">확인</button>

el.style.color                 // ""              ← 인라인에 없으니 안 보임
el.style.display               // ""              ← 마찬가지

getComputedStyle(el).color     // "rgb(255, 0, 0)" ← 스타일시트에서 가져와 정규화
getComputedStyle(el).display   // "block"
getComputedStyle(el).visibility // "visible"       ← 아무도 안 썼는데 값이 있음
```

마지막 줄이 중요합니다.  
`visibility`는 아무도 지정하지 않았는데 값이 있습니다. 초기값이 들어가니까요.

Computed 탭의 **"Show all"** 체크박스를 켜면 건드린 적 없는 프로퍼티가 수백 개 나오는 거, 그겁니다.

> `getComputedStyle`은 **"이 엘리먼트의 모든 CSS 프로퍼티가 담긴 완성된 표"**를 만들어 돌려줍니다.  
> 부분적으로는 못 만듭니다.

```js
const display = getComputedStyle(el).display;
//              ^^^^^^^^^^^^^^^^^^^^ 표 전체를 만든 다음, 거기서 한 칸을 꺼낸다
```

### jsdom은 그 표를 호출할 때마다 다시 만듭니다

jsdom 구현을 열어봤습니다.

```js
// jsdom — lib/jsdom/browser/Window.js
window.getComputedStyle = function (elt, pseudoElt = undefined) {
  // ...
  const declaration = new CSSStyleDeclaration();          // ① 빈 객체를 새로 만들고

  const elementDeclaration = getDeclarationForElement(elt); // ② 캐스케이드를 계산해서
  forEach.call(elementDeclaration, property => {
    declaration.setProperty(...);                          // ③ 프로퍼티를 하나씩 옮겨 담고
  });

  const declarations = Object.keys(propertiesWithResolvedValueImplemented);
  forEach.call(declarations, property => {
    declaration.setProperty(property, getResolvedValue(elt, property)); // ④ 최종값을 계산한다
  });

  return declaration;
};
```

②의 캐스케이드에는 캐시가 있습니다. 그런데 그 바로 옆에 이런 코드가 있습니다.

```js
// jsdom — lib/jsdom/living/helpers/style-rules.js
if (elementImpl._attached) {
  elementImpl._ownerDocument._styleCache = null;   // 문서 전체 캐시를 통째로 버린다
}
```

**DOM이 바뀌면 문서 전체의 스타일 캐시가 날아갑니다.**

테스트는 클릭하고, 입력하고, 리렌더하는 게 일입니다.  
그러니까 테스트는 **캐시를 계속 부수면서 진행됩니다.**

### 여기서 2장의 의문이 풀립니다

렌더는 20ms인데 쿼리는 450ms. 만드는 것보다 찾는 게 22배 비쌌던 그 이상함이요.

직접 재봤습니다. 버튼 85개를 만들고, 스타일을 물어보고, 다시 물어보고, DOM을 한 번 건드린 뒤 또 물어봤습니다.

```js
// 버튼 85개 (각각 span 자식 1개) / 스타일시트 규칙 2000개
let t = performance.now();
root.innerHTML = markup;                                    // ① 렌더
const render = performance.now() - t;

t = performance.now();
buttons.forEach(b => window.getComputedStyle(b).display);   // ② 첫 조회
const cold = performance.now() - t;

t = performance.now();
buttons.forEach(b => window.getComputedStyle(b).display);   // ③ 다시 조회
const warm = performance.now() - t;

root.setAttribute('data-rerender', '1');                    // DOM을 한 글자 건드린다
t = performance.now();
buttons.forEach(b => window.getComputedStyle(b).display);   // ④ 또 조회
const afterMutation = performance.now() - t;
```

결과입니다.

```
① 렌더 (DOM 85개 생성 + 트리 삽입) :     9.7 ms
② 스타일 첫 조회 85회 (콜드)        :   463.4 ms
③ 스타일 재조회 85회 (캐시 히트)     :     8.8 ms
④ DOM 한 번 건드린 뒤 85회          :   266.5 ms
```

②가 ①의 **47배**입니다. 그리고 ③은 ②의 **1/53**입니다.  
④를 보세요. 속성 하나 추가했을 뿐인데 다시 비싸집니다.

이유는 이겁니다.

> **브라우저**는 화면을 그려야 하니 **렌더할 때** 스타일을 계산해둡니다.  
> 그래서 나중에 `getComputedStyle`을 부르면 이미 있는 걸 읽기만 합니다. 거의 공짜죠.
>
> **jsdom은 화면을 안 그립니다.** 렌더할 때 스타일을 계산할 이유가 없습니다.  
> 그러다 누가 `getComputedStyle`을 부르면 **그제서야 처음으로** 계산합니다.

**비용 청구서가 반대편에 도착하는 겁니다.**

| | 렌더 | `getComputedStyle` |
| :--- | :--- | :--- |
| 브라우저 | 비용 지불 | 거의 공짜 |
| **jsdom** | **거의 공짜** | **비용 지불** |

그래서 프로파일러가 `render()`를 20ms로 찍은 건 오해가 아니라 사실이었습니다.  
달력 버튼 85개의 스타일 비용은 렌더 청구서에 실리지 않았을 뿐입니다.  
그 청구서는 처음으로 스타일을 물어본 쪽 — `getByRole` — 앞으로 날아왔습니다.

### 숫자를 맞춰봅시다

이제 처음의 450ms가 어디서 나왔는지 계산할 수 있습니다.

astryx 환경에서 `getComputedStyle` 한 번은 대략 **5ms**였습니다.  
그리고 후보 버튼은 최대 **85개**입니다.

```
후보 85개 × 노드당 약 5ms ≈ 425ms ≈ 측정값 450ms
```

**"노드당 5ms"라는 작은 숫자가 "쿼리 하나에 450ms"라는 결과를 설명합니다.**

이게 중요한 이유가 있습니다. 원인을 잘못 짚어도 우연히 빨라지는 일은 생깁니다.  
하지만 미시 측정이 거시 결과와 자릿수까지 맞아떨어지면, 그건 **제대로 짚었다는 증거**입니다.

> 위 재현 실험의 숫자(9.7ms / 463.4ms)는 원인을 눈으로 확인하려고 제가 따로 만든 것입니다.  
> 실제 astryx에서 측정한 값은 앞서 나온 `450ms → 29ms`, 그리고 뒤에 나올 파일 단위 수치입니다.

---

## 7. 같은 알고리즘, 스타일 계산만 제거

원인을 알았으니 방향은 정해집니다. **`getComputedStyle`을 안 부르면 됩니다.**

문제는 그걸 어떻게 안 부르느냐입니다.

선택지를 셋 놓고 봤습니다.

**1. `getByTestId`로 갈아탄다**  
쿼리는 확실히 빨라집니다. 하지만 **접근성 검증을 통째로 포기**하는 겁니다.  
`getByRole`을 쓰는 이유가 있으니까요. 사용자가 화면을 인식하는 방식과 같은 방식으로 요소를 찾는 것 말입니다. 디자인 시스템 테스트에서 이건 후퇴입니다. **탈락.**

**2. 이름 비교를 직접 구현한다**  
`textContent`를 읽어서 비교하면 되지 않나 싶습니다. 실제로 제일 먼저 떠오르는 방법이고요.  
그런데 5장에서 봤듯이 접근성 이름은 `textContent`가 아닙니다. 여기에 `aria-label`, `aria-labelledby`, 숨은 자식 처리까지 얹히면 금세 스펙과 어긋나기 시작합니다.  
**RTL과 다른 답을 내는 헬퍼는 신뢰할 수 없습니다.** 테스트가 통과해도 그게 맞는 건지 알 수 없으니까요. **탈락.**

**3. RTL이 쓰는 라이브러리를 그대로 쓰되, 비용만 없앤다**  
**채택.**

그래서 조건을 이렇게 잡았습니다.

> **이름을 구하는 알고리즘은 RTL과 똑같이 유지한다.**  
> 대신 그 알고리즘이 참조하는 **스타일 계산만** 갈아끼운다.

다행히 `computeAccessibleName`은 `getComputedStyle` 구현을 **주입받을 수 있게** 열려 있었습니다.

```ts
// packages/core/src/__tests__/fastRoleQueries.ts
import {screen} from '@testing-library/react';
import {computeAccessibleName} from 'dom-accessibility-api';

// "전부 다 보인다"고만 대답하는 상수 스텁
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

장치는 두 개입니다.

**① `{hidden: true}`** — 3장의 ⑤번 필터를 통째로 건너뜁니다.  
가시성 검사를 위한 `getComputedStyle` 호출이 사라집니다.

**② 스타일 스텁 주입** — 이름 계산 안에서 부르던 `getComputedStyle`을 상수 응답으로 바꿉니다.  
캐스케이드를 계산하는 대신 `"block"`, `"visible"`을 즉시 돌려주니 비용이 0에 수렴합니다.

그리고 하나 더 있습니다.

```ts
.find(el => matchesName(el, name))
// ^^^^ filter가 아니라 find — 첫 매치에서 멈춘다
```

RTL의 `.filter()`는 끝까지 다 돌지만, `.find()`는 **찾으면 거기서 끝납니다.**  
커밋 제목에 적은 `O(match)`가 이겁니다.

호출부는 이렇게 바뀝니다.

```diff
- const trigger = screen.getByRole('button', {name: /Range:/});
+ const trigger = getButton(/Range:/);

- expect(screen.queryByRole('button', {name: 'Clear Date'})).not.toBeInTheDocument();
+ expect(queryButton('Clear Date')).not.toBeInTheDocument();
```

날짜 컴포넌트 4개 파일에서 **41개 호출부**를 이렇게 교체했습니다.

> 스텁 타입이 `Pick<CSSStyleDeclaration, 'getPropertyValue'>`인 게 눈에 걸릴 수 있습니다.  
> `CSSStyleDeclaration`으로 선언하면 필수 멤버 수백 개를 전부 구현해야 해서 불가능합니다.  
> **"이것만 구현했다"고 정직하게 선언하는 타입**이라고 보면 됩니다.

### 다만, 전부 바꾸지는 않았습니다

같은 파일 안에도 `combobox`, `tooltip`, `grid`를 찾는 쿼리들이 있었습니다.  
그건 **그대로 뒀습니다.**

후보가 몇 개 안 되거나 `name` 필터를 안 쓰는 쿼리는 애초에 싸거든요.  
비싼 곳만 바꾸는 게 맞습니다. 안 그러면 팀 전체가 표준 API 대신 사내 헬퍼를 배워야 하니까요.

---

## 8. 무엇을 포기했나

공짜는 없습니다. 이 헬퍼는 **하나를 확실히 포기합니다.**

RTL의 `getByRole`은 조건에 맞는 요소가 **두 개 이상이면 에러를 던집니다.**

```
Found multiple elements with the role "button" and name "확인"
```

이건 성가신 기능처럼 보이지만 사실 **안전장치**입니다.  
"이 이름의 버튼은 화면에 하나뿐이다"라는 걸 테스트가 대신 확인해주는 거니까요.

`.find()`로 바꾸는 순간 그게 사라집니다.

```ts
.find(el => matchesName(el, name))   // 첫 번째를 찾으면 바로 반환
```

버튼이 두 개여도 조용히 첫 번째를 집어 옵니다.  
**중복이 생겨도 테스트가 알려주지 않습니다.**

그래서 헬퍼 파일 맨 위 주석에 이걸 명시해뒀습니다.

```
Trade-off vs getByRole: first match wins — no tree-wide uniqueness check.
```

> 한 가지 더 짚어둘 게 있습니다. 스텁은 `display`에 항상 `"block"`이라고 대답합니다.  
> 그래서 CSS로 숨긴 텍스트가 이름에 섞여 들어오거나, inline 형제 사이에 공백이 생길 수 있습니다.  
> (`"홍길동"`이 `"홍 길동"`이 되는 식으로요.)  
> 날짜 버튼처럼 자식 구조가 단순한 곳에서는 문제가 없었지만, **다른 코드베이스에 그대로 옮길 때는 확인이 필요합니다.**

정리하면 이 헬퍼는 **"이 파일들에서, 이 조건에서"** 안전한 도구입니다.  
범용 유틸리티가 아니라 국소 최적화죠. 그래서 테스트 폴더 안에만 두었습니다.

---

## 9. 결과

날짜 컴포넌트 4개 파일, 211개 테스트의 실행 시간입니다.

| 파일 | 테스트 수 | before | after | |
| :--- | ---: | ---: | ---: | ---: |
| **DateRangeInput.test.tsx** | 34 | 34.3s | **1.3s** | −96% |
| Calendar.test.tsx | 45 | 7.2s | **1.9s** | −74% |
| DateInput.test.tsx | 68 | 5.1s | **2.2s** | −57% |
| DateTimeInput.test.tsx | 64 | 4.1s | **1.8s** | −56% |
| **합계** | **211** | **50.7s** | **7.2s** | |

처음의 그 파일은 **34.3초에서 1.3초**가 됐습니다. 약 **26배**입니다.

여기서 강조하고 싶은 게 있습니다.

> **테스트가 검증하는 내용은 하나도 바뀌지 않았습니다.**  
> 전체 5,893개 테스트가 그대로 통과합니다.

컴포넌트 코드도, 테스트가 확인하는 동작도 손대지 않았습니다.  
**요소를 찾는 방법만** 바꿨습니다.

CI에서도 확인됐습니다. main의 Deploy 워크플로우에서 도는 `Run pnpm test` 스텝 기준입니다.

| | `Run pnpm test` (main, 4-vCPU 러너) |
| :--- | ---: |
| 두 최적화 이전 | 296초 |
| 앞선 테스트 환경 분리 이후 | 271초 |
| **이 변경 이후** | **246초** |

이 변경 몫으로 약 **25초**입니다.  
로컬에서 잰 43초보다 작은데, CI는 워커가 병렬로 도니까 파일 하나가 빨라져도 벽시계 시간에는 일부만 반영되기 때문입니다.

---

## 10. 그래서 언제 이걸 의심해야 할까요

여기까지 읽고 나서 `getByRole`을 걷어내지는 마세요.  
대부분의 경우 `getByRole`은 몇 밀리초면 끝납니다. **문제가 되는 건 특정 조건이 겹칠 때뿐입니다.**

그리고 하나는 분명히 하고 싶습니다.

> **RTL이 잘못한 게 아닙니다.**  
> 접근성 이름을 스펙대로 정확히 계산하는 것이 RTL의 존재 이유입니다.  
> 비싼 쪽은 jsdom의 `getComputedStyle`이고, **실제 브라우저에서는 이 비용이 거의 없습니다.**

우리가 한 일은 RTL을 고친 게 아닙니다.  
`{hidden: true}`가 허용하는 범위 안에서 **테스트 환경에서만 발생하는 비용**을 걷어낸 것입니다.

### 의심 조건

이 네 가지가 동시에 성립하면 확인해볼 만합니다.

1. **role 후보가 수십 개 이상 마운트되어 있다** — 달력 그리드, 긴 목록, 데이터 테이블
2. **그중 상당수가 화면에 안 보인다** — 닫힌 팝오버, 접힌 아코디언, 숨긴 탭 패널
3. **`{name}` 옵션을 쓴다** — 이름 계산이 켜지는 스위치입니다
4. **테스트가 자주 리렌더한다** — jsdom의 스타일 캐시가 계속 무효화됩니다

날짜 컴포넌트가 느렸던 건 이 넷이 **전부** 겹쳤기 때문입니다.  
버튼이 다섯 개인 평범한 컴포넌트라면 아무 문제 없습니다.

### 확인하는 법

두 줄이면 됩니다.

```js
const t0 = performance.now();
screen.getByRole('button', {name: '내가 찾는 버튼'});
const t1 = performance.now();
screen.getAllByRole('button', {hidden: true});
const t2 = performance.now();

console.log('name 포함 :', (t1 - t0).toFixed(0), 'ms');
console.log('name 제외 :', (t2 - t1).toFixed(0), 'ms');
```

두 숫자가 비슷하면 이 글과 무관한 문제입니다.  
**차이가 10배 이상 나면** 이름 계산이 범인입니다.

### 해결은 사다리로

범인을 확인했다면, 위에서부터 시도해보세요.

| 순서 | 방법 | 언제 |
| :--- | :--- | :--- |
| 1 | **안 보이는 DOM을 애초에 안 그린다** | 팝오버가 닫혔을 때 언마운트할 수 있다면. 가장 근본적입니다 |
| 2 | **`within()`으로 탐색 범위를 좁힌다** | 컴포넌트 구조를 못 바꿀 때. 후보 수 자체가 줄어듭니다 |
| 3 | **전용 헬퍼를 만든다** | 위 둘이 불가능할 때. 이 글의 방법입니다 |

제 경우 1번은 컴포넌트 동작을 바꾸는 일이라 테스트 최적화의 범위를 넘었고, 2번으로는 닫힌 팝오버가 트리거와 같은 컨테이너 안에 있어 충분히 줄지 않았습니다.  
그래서 3번으로 갔습니다.

**3번이 첫 번째 선택지가 되면 안 됩니다.** 표준 API를 떠나는 건 팀이 치르는 비용이니까요.

---

## 마치며

이번 일에서 제일 오래 남은 건 34초를 1.3초로 줄인 것보다, **매일 쓰던 API를 처음으로 열어봤다는 것**이었습니다.

`getByRole('button', {name})`은 제게 "이름이 이런 버튼을 찾아줘"라는 한 문장이었습니다.  
열어보니 `.filter()` 다섯 개가 줄줄이 있었고, 그중 하나가 트리 전체를 훑고 있었습니다.

편의는 공짜가 아니라 **누군가 대신 내주고 있는 비용**이더군요.  
평소에는 그 비용이 충분히 작아서 안 보일 뿐이고요.

그러니 도구가 이상하게 느리다면, 한 번쯤 열어보시길 권합니다.  
`node_modules` 안에 답이 있는 경우가 생각보다 많습니다.

---

**참고**

- [PR #3816 — perf(test): make role+name queries O(match) in the date-component suites](https://github.com/facebook/astryx/pull/3816)
- [@testing-library/dom — `queries/role.js`](https://github.com/testing-library/dom-testing-library/blob/main/src/queries/role.ts)
- [dom-accessibility-api](https://github.com/eps1lon/dom-accessibility-api)
- [Accessible Name and Description Computation (W3C)](https://www.w3.org/TR/accname-1.2/)
