---
title: '[Typescript로 설계하는 프로젝트] id?: string을 버려라. ID의 존재가 곧 상태다.'
thumbnail: 'ts-tagged-type-thumb.png'
description: '무분별한 옵셔널 타입이 낳은 안티 패턴에서 벗어나, 도메인의 상태를 온전히 타입으로 증명하는 방법을 알아봅니다.'
date: 2026-03-14
slug: 'typescript-domain-modeling-without-optional'
published: true
tags: ['TypeScript', 'Architecture', 'Data Modeling']
---

## 1. 프롤로그: 우리가 숨 쉬듯 작성하는 "거짓말"

> **주니어 개발자**: "OO님, `Post` 타입에서 `id`가 없다고 에디터에서 빨간 줄이 뜨는데, 새 글 작성할 땐 서버 id가 없으니까 그냥 `?` 붙여도 될까요?"

프론트엔드 개발을 하다 보면 슬랙이나 코드 리뷰에서 심심치 않게 보게 되는 질문입니다. 저 역시 예전에는 빠른 기능 구현을 위해 무심코 `?`를 붙이며 타입 에러를 '지우는 데' 급급했던 시절이 있었습니다. 십중팔구 이런 타입을 작성해 보셨을 겁니다.

```typescript
interface Post {
  id?: string; // 새로 작성 중일 땐 서버 id가 없으니까 옵셔널 처리
  title: string;
  content: string;
}
```

당장 에러는 안 나니 편합니다. **하지만 이 작은 `?` 하나 때문에 우리는 프로젝트 내내 고통받습니다.**

분명히 DB에서 방금 조회해 온 글이라 100% ID가 존재하는데도, 타입스크립트는 _"ID가 없을 수도 있잖아?"_ 라며 끊임없이 딴지를 겁니다. 결국 우리는 울며 겨자 먹기로 컴포넌트 곳곳에 `if (post.id)`나 `post.id!` 같은 무의미한 방어 코드를 도배하게 되죠. 코드는 지저분해지고, 개발자의 피로도는 급증합니다.

왜 이런 일이 발생할까요? 우리가 타입스크립트에게 **"도메인의 현실"을 제대로 알려주지 않고 거짓말을 했기 때문**입니다.

## 2. 도메인 모델링: ID는 단순한 값이 아니라 '신분증'이다

거창하게 들리지만, '도메인 모델링'의 핵심은 현실의 비즈니스 규칙을 코드에 그대로 반영하는 것입니다.
우리의 비즈니스 규칙을 가만히 들여다봅시다.

1. **작성 중인 글**: 제목과 내용만 있습니다. ID는 절대 없습니다.
2. **발행된 글**: 서버에 안전하게 저장되었습니다. **반드시 고유한 ID를 가집니다.**

즉, 이 도메인에서 "ID가 생겼다"는 것은 단순히 데이터에 문자열 필드 하나가 추가된 것이 아닙니다. **객체의 신분이 '임시'에서 '정식'으로 완전히 바뀌었음**을 의미합니다.

그런데 우리는 귀찮다는 이유로 이 완전히 다른 두 가지 상태를 `Post`라는 하나의 타입에 억지로 욱여넣고, `id?: string`으로 퉁쳐버린 겁니다.

## 3. 해결책: 공통 속성은 묶고, 상태는 있는 그대로 쪼개기

이 문제를 해결하는 가장 우아한 방법은 억지스러운 옵셔널을 걷어내고, 데이터를 상태에 맞게 완전히 분리하는 것입니다. 중복되는 코드는 `BasePost`로 깔끔하게 묶어내고, 인위적인 태그 값 없이 오직 **'ID의 유무'** 로만 상태를 정의해 봅시다.

```typescript
// 공통 속성: 글이라면 무조건 가져야 하는 기본 뼈대
interface BasePost {
  title: string;
  content: string;
}

// 1. 아직 식별자가 없는 '작성 중' 상태
interface DraftPost extends BasePost {}

// 2. 서버에 저장되어 식별자가 존재하는 '발행 완료' 상태
interface PublishedPost extends BasePost {
  id: string; // 더 이상 옵셔널이 아닙니다! 무조건 존재합니다.
}

// 이 둘을 합쳐서 비로소 완전한 Post 도메인을 만듭니다.
type Post = DraftPost | PublishedPost;
```

이제 데이터의 구조가 우리의 비즈니스 현실과 완벽하게 일치하게 되었습니다!

## 4. 타입 가드: 코드가 소설처럼 읽히는 마법

타입을 분리했으니, 이제 이 상태를 어떻게 구분할까요? 컴포넌트 안에서 `if ('id' in post)`를 직접 쓸 수도 있지만, 이런 기술적인 코드가 비즈니스 로직에 날것 그대로 노출되는 것은 조금 아쉽습니다.

**"ID가 있으면 발행된 글이다"** 라는 비즈니스 규칙 자체를 아예 함수로 빼내어 캡슐화해 봅시다.
이때 반환 타입을 `post is PublishedPost`로 지정해주면, 이 함수를 통과한 데이터는 타입스크립트가 `PublishedPost`로 완벽하게 신뢰하게 됩니다.

```typescript
// 비즈니스 규칙이 담긴 타입 가드 함수
function isPublished(post: Post): post is PublishedPost {
  return 'id' in post;
}
```

이제 실제 비즈니스 로직을 작성할 때, 코드가 어떻게 변하는지 감상해 보세요. 기술적인 구현은 숨겨지고, 도메인의 언어만 남습니다.

```typescript
function handlePost(post: Post) {
  if (isPublished(post)) {
    // 타입스크립트는 isPublished를 통과했으니 id가 무조건 있음을 알아챕니다.
    console.log(`발행된 글의 ID: ${post.id}`);

    // 무조건 id가 있는 타입만 받는 깐깐한 함수에도 안전하게 통과!
    updatePost(post);
  } else {
    // 이 블록 안에서 post는 자연스럽게 DraftPost로 취급됩니다.
    console.log(`아직 저장되지 않은 글: ${post.title}`);
  }
}

// 오직 발행된 글만 받을 수 있는 엄격한 함수
function updatePost(post: PublishedPost) {
  api.patch(`/posts/${post.id}`, post);
}
```

더 이상 옵셔널 체이닝이나 느낌표를 남발하며 타입스크립트와 싸울 필요가 없습니다.

## 5. 보너스: 존재함을 넘어, '의미'를 부여하기

자, 이제 우리는 `PublishedPost`를 통해 ID가 100% 존재한다는 확신을 얻었습니다. 그런데 여기서 한 걸음 더 나아가 볼까요? 흥미로운 의문이 하나 생깁니다.

```typescript
function deletePost(id: string) {
  /* ... */
}

// 프론트엔드 어딘가에서 발생한 대참사
const currentUserId = 'user_999';
deletePost(currentUserId); // 타입스크립트: "음~ 둘 다 string이네! 통과!"
```

분명 ID가 존재하도록 만들었지만, 타입스크립트의 눈에는 글의 ID나 유저의 ID나 그저 똑같은 `string`일 뿐입니다. 여기서 우리가 처음에 던졌던 **"타입스크립트에게 거짓말을 하지 말자"** 는 원칙을 한 번 더 끝까지 밀어붙여 봅시다.

복잡한 유틸리티 타입 없이, 타입스크립트에게 이 문자열이 단순한 텍스트가 아니라 **'글의 ID'** 라는 가상의 이름표를 찰칵 달아주는 겁니다.

```typescript
// 실제로는 존재하지 않는 가상의 이름표를 달아줍니다.
type PostId = string & { readonly __tag: unique symbol };

// 이제 PublishedPost의 id는 단순한 string이 아닙니다.
interface PublishedPost extends BasePost {
  id: PostId;
}
```

이제 우리의 함수는 어처구니없는 실수로부터 완벽하게 보호받습니다.

```typescript
function deletePost(id: PostId) {
  api.delete(`/posts/${id}`);
}

const currentUserId = 'user_999';
// 컴파일 에러: "user_999는 단순 string이지, PostId 태그가 없잖아!"
deletePost(currentUserId);
```

`isPublished`라는 타입 가드를 통과한 데이터는 이제 ID가 '존재'할 뿐만 아니라, 그 ID가 완벽하게 검증된 '글의 ID'임이 증명된 것입니다.

## 6. 마무리: 방어하지 말고 증명하세요

`id?: string`을 사용할 때 타입스크립트는 걸핏하면 에러를 띄우는 깐깐한 '단속 카메라' 같았습니다. 우리는 그 카메라를 피하기 위해 의미 없는 `if` 문을 덕지덕지 발라야 했죠.

하지만 도메인의 실제 규칙에 맞춰 상태를 분리하고, 이를 **타입 가드 함수**와 **브랜디드 타입**으로 풀어내는 순간, 타입스크립트는 우리가 실수하지 않도록 가장 빠르고 안전한 길을 안내해 주는 든든한 '네비게이션'이 됩니다.

타입은 단순한 에러 방지용 도구가 아닙니다. 비즈니스의 흐름과 상태의 변화를 코드에 증명하는 가장 강력한 수단입니다. `undefined`와의 무의미한 감정 소모를 멈추고, 진짜 중요한 비즈니스 로직에 여러분의 에너지를 집중해 보세요.
