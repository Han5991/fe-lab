---
title: '[Typescript로 설계하는 프로젝트] id?: string을 버려라. 상태가 다르면 타입도 달라야 한다.'
thumbnail: 'ts-tagged-type-thumb.png'
description: '무분별한 옵셔널 타입이 낳은 안티 패턴에서 벗어나, Tagged Type(Discriminated Union)과 도메인 모델링으로 안전하고 견고하게 데이터를 설계하는 방법을 알아봅니다.'
date: 2026-03-16
slug: 'typescript-domain-modeling-without-optional'
published: true
tags: ['TypeScript', 'Architecture', 'Data Modeling']
---

## 1. 프롤로그: 우리가 숨 쉬듯 작성하는 "거짓말"

> **팀원**: "OO님, `Post` 타입에서 `id`가 없다고 에디터에서 빨간 줄이 뜨는데, 새 글 작성할 땐 서버 id가 없으니까 그냥 `?` 붙여도 될까요?"

프론트엔드 개발을 하다 보면 슬랙이나 코드 리뷰에서 심심치 않게 보게 되는 질문입니다. 저 역시 예전에는 빠른 기능 구현을 위해 무심코 `?`를 붙이며 타입 에러를 '지우는 데' 급급했던 시절이 있었습니다. 십중팔구 이런 타입을 작성해 보셨을 겁니다.

```typescript
interface Post {
  id?: string; // 새로 작성 중일 땐 서버 id가 없으니까 옵셔널 처리
  title: string;
  content: string;
}
```

당장 에러는 안 나니 편합니다. **하지만 이 작은 `?` 하나 때문에 우리는 프로젝트 내내 고통받습니다.**

분명히 DB에서 방금 조회해 온 글이라 100% ID가 존재하는데도, 타입스크립트는 **_"ID가 없을 수도 있잖아?"_** 라며 끊임없이 딴지를 겁니다. 결국 우리는 울며 겨자 먹기로 컴포넌트 곳곳에 `if (post.id)`나 `post.id!` 같은 무의미한 방어 코드를 도배하게 되죠. 코드는 지저분해지고, 개발자의 피로도는 급증합니다.

왜 이런 일이 발생할까요? 우리가 타입스크립트에게 **"도메인의 현실"을 제대로 알려주지 않고 거짓말을 했기 때문**입니다.

---

## 2. 왜 프론트엔드에 도메인 모델링이 필요한가

'도메인 모델링'이라고 하면 보통 백엔드나 DDD의 영역으로 생각하기 쉽습니다. 하지만 잠깐 생각해 봅시다. **사용자의 행동 흐름을 가장 충실하게 코드로 표현해야 하는 곳이 어디인가요?** 바로 프론트엔드입니다.

사용자는 글을 '작성'하고, '저장'하고, '수정'하고, '삭제'합니다. 이 모든 흐름에서 데이터의 **상태**는 끊임없이 변합니다. 그런데 우리가 이 상태 변화를 타입으로 제대로 표현하지 않으면, 결국 런타임에서 `undefined` 에러로 돌아옵니다.

도메인 모델링은 유비쿼터스 언어, 엔티티 설계, 바운디드 컨텍스트 정의 등 넓은 영역을 포괄합니다. 하지만 그 첫 번째 원칙은 **상태를 타입으로 정확히 표현하는 것** 입니다. 이 글에서는 바로 그 첫걸음에 집중합니다.

우리의 비즈니스 규칙을 가만히 들여다봅시다.

1. **작성 중인 글**: 제목과 내용만 있습니다. ID는 절대 없습니다.
2. **발행된 글**: 서버에 안전하게 저장되었습니다. **반드시 고유한 ID를 가집니다.**

즉, 이 도메인에서 _"ID가 생겼다"_ 는 것은 단순히 데이터에 문자열 필드 하나가 추가된 것이 아닙니다. **객체의 신분이 '임시'에서 '정식'으로 완전히 바뀌었음**을 의미합니다.

그런데 우리는 귀찮다는 이유로 이 완전히 다른 두 가지 상태를 `Post`라는 하나의 타입에 억지로 욱여넣고, `id?: string`으로 퉁쳐버린 겁니다.

---

## 3. Tagged Type: 상태를 타입으로 증명하기

이 문제를 해결하는 타입스크립트의 공식 패턴이 있습니다. 바로 **Tagged Type**, 또는 **Discriminated Union** 이라고 불리는 패턴입니다.

핵심 아이디어는 간단합니다.

> 💡 모든 상태가 공유하는 **하나의 리터럴 속성(Tag)** 을 만들고, 그 값으로 상태를 식별하자.

중복되는 코드는 `BasePost`로 깔끔하게 묶어내고, `status`라는 **태그(Tag)** 속성으로 상태를 명확히 분리해 봅시다.

먼저, 글이라면 무조건 가져야 하는 공통 속성을 정의합니다.

```typescript
interface BasePost {
  title: string;
  content: string;
}
```

그 다음, `status` 태그로 두 가지 상태를 분리합니다.

```typescript
// 아직 식별자가 없는 '작성 중' 상태
interface DraftPost extends BasePost {
  status: 'draft';
}

// 서버에 저장되어 식별자가 존재하는 '발행 완료' 상태
interface PublishedPost extends BasePost {
  status: 'published';
  id: string; // 발행되었으니 반드시 존재!
}
```

마지막으로, 이 둘을 합쳐서 완전한 `Post` 도메인을 만듭니다.

```typescript
type Post = DraftPost | PublishedPost;
```

여기서 `status`가 바로 **Tag** 입니다. `'draft'`와 `'published'`라는 리터럴 값이 각 상태의 이름표 역할을 하죠. 이제 타입스크립트는 `status` 값만 확인하면 나머지 데이터의 형태를 **자동으로** 추론할 수 있게 됩니다.

> ### 🤔 `id` 유무로 구분하면 안 되나요?
>
> 여기서 한 가지 의문이 떠오를 수 있습니다. _"굳이 `status`를 만들지 않아도, `id`가 있으면 >`PublishedPost`고 없으면 `DraftPost` 아닌가?"_
>
> 기술적으로는 가능합니다. `id?: never`와 `id: string`으로도 Discriminated Union을 만들 수 있거든요. 하지만 **`id`의 유무는 기술적 사실이고, `status`는 도메인 개념** 입니다. 글 전체의 주장이 _"타입으로 도메인을 표현하라"_ 인데, `id`의 유무로 상태를 구분하면 그 주장과 어긋납니다. `id`가 없다는 건 우연히 `draft`와 일치하는 거지, `draft`라는 **개념 자체** 를 표현하는 게 아니기 때문입니다.
>
> 그리고 도메인이 성장하면 `archived`, `scheduled`, `under_review` 같은 상태가 생깁니다. 이때 `id`의 유무만으로는 이 상태들을 구분할 수 없습니다. 확장성은 `status` 태그를 선택했을 때 자연스럽게 >따라오는 부산물입니다.

---

## 4. Before / After: 타입으로 좁히기

이론만으로는 감이 잘 안 올 수 있습니다. 같은 비즈니스 로직을 옵셔널 방식과 Tagged Type 방식으로 나란히 비교해 봅시다.

### Before: 옵셔널 타입

```typescript
function handlePost(post: Post) {
  // post.id가 있는지 확신할 수 없습니다.
  if (!post.id) {
    // 여기가 "새 글 작성"인지 "에러 상황"인지 알 수 없습니다.
    console.log('ID가 없습니다... 새 글인가? 에러인가?');
    api.create(post);
    return;
  }

  // 여기서도 타입스크립트는 post.id가 string | undefined라고 불평합니다.
  api.update(post.id, post);
}
```

- `post.id`가 없는 상황이 "새 글 작성"인지 "진짜 에러"인지 구분이 안 됩니다.
- 개발자가 매번 `if (post.id)` 같은 방어 코드를 직접 작성해야 합니다.

### After: Tagged Type

```typescript
function handlePost(post: Post) {
  if (post.status === 'draft') {
    // 이 블록 안에서 post는 DraftPost입니다.
    // id 필드 자체가 존재하지 않으므로 실수할 여지가 없습니다.
    console.log(`임시저장 글을 새로 생성합니다: ${post.title}`);
    api.create(post);
    return;
  }

  // 여기서 post는 자동으로 PublishedPost!
  // post.id는 무조건 string. 옵셔널 체이닝도 느낌표도 필요 없습니다.
  console.log(`기존 글(${post.id})을 업데이트합니다.`);
  api.update(post.id, post);
}
```

`post.status === 'draft'`라는 조건 하나로, 타입스크립트가 **나머지 모든 타입을 자동으로 좁혀냅니다.** 개발자는 더 이상 `id`가 있는지 없는지 런타임에서 의심할 필요가 없습니다. _"발행된 글은 id가 반드시 있다"_ 는 도메인의 규칙이 타입 시스템에 완벽하게 녹아들었기 때문입니다.

---

## 5. 한 걸음 더: 타입 가드로 의도를 명시적으로 드러내기

한 가지 더 욕심을 부려봅시다. 컴포넌트 곳곳에 `if (post.status === 'published')`가 반복되고 있지 않나요? **타입 좁힘 의도를 함수로 빼내세요.** 조건의 의미가 명시적으로 드러나고, 변경 포인트가 한 곳에 모입니다.

```typescript
// 타입 좁힘 의도를 명시적으로 드러내는 타입 가드 함수
function isPublished(post: Post): post is PublishedPost {
  return post.status === 'published';
}
```

여기서 반환 타입이 `boolean`이 아니라 `post is PublishedPost`인 점이 눈에 띌 겁니다. 이것은 타입스크립트의 **타입 서술어** 문법입니다. 의미는 간단합니다. _"이 함수가 `true`를 반환하면, 매개변수 `post`를 `PublishedPost` 타입으로 좁혀도 안전하다"_ 고 컴파일러에게 알려주는 것이죠.

만약 반환 타입을 그냥 `boolean`으로 쓰면, 함수 호출 후에도 타입스크립트는 여전히 `post`를 `DraftPost | PublishedPost`로 인식합니다. `post is PublishedPost`라는 한 마디가 `if` 블록 안에서 자동 타입 좁혀짐을 가능하게 하는 열쇠입니다.

이렇게 하면 `post.status === 'published'`라는 기술적 조건이 `isPublished`라는 도메인 언어로 바뀌고, 타입 좁힘 의도가 코드에 명확히 드러납니다.

```typescript
function updatePost(post: Post) {
  if (isPublished(post)) {
    // isPublished를 통과했으니 post.id는 무조건 존재!
    api.patch(`/posts/${post.id}`, post);
  }
}
```

### 그래서 DraftPost는 언제 PublishedPost가 되는가?

**"타입을 분리한 건 알겠는데, 실제 코드에서 `DraftPost`가 `PublishedPost`로 바뀌는 시점은 언제야?"** 라는 의문이 남을 수 있습니다. 답은 명확합니다. **서버가 ID를 부여해서 응답을 돌려주는 바로 그 순간** 입니다.

```typescript
// API 응답 타입: 서버가 ID를 부여한 결과
interface CreatePostResponse {
  id: string;
  title: string;
  content: string;
}

async function createPost(draft: DraftPost): Promise<PublishedPost> {
  const response = await api.post<CreatePostResponse>('/posts', draft);

  // 서버가 부여한 id와 함께, 상태 태그를 'published'로 확정합니다.
  // 이 순간 DraftPost는 사라지고, PublishedPost가 탄생합니다.
  return {
    ...draft,
    status: 'published',
    id: response.id,
  };
}
```

핵심은 **객체를 직접 변환하지 않는다** 는 것입니다. 기존 `DraftPost`의 `status`를 바꾸는 게 아니라, 서버 응답 데이터를 기반으로 **완전히 새로운 `PublishedPost` 객체를 생성** 합니다. `status: 'published'`와 `id`가 함께 들어가는 순간, 타입스크립트는 이 객체가 `PublishedPost`임을 자동으로 인식합니다. 타입의 전환이 곧 도메인 상태의 전환이 되는 셈이죠.

---

## 6. 마무리

처음에 우리는 타입스크립트에게 거짓말을 했습니다. `id?: string`으로 현실을 왜곡했죠.
`Tagged Type`은 그 거짓말을 걷어내는 작업입니다. 도메인의 규칙을 있는 그대로 코드에 옮기면, 타입스크립트는 더 이상 적이 아닙니다.

타입은 단순한 에러 방지용 도구가 아닙니다. 비즈니스의 흐름과 상태의 변화를 코드에 **증명** 하는 수단입니다.

---

**💡 내 프로젝트에 당장 적용하기 체크리스트**

- [ ] 내 코드에 무의미한 `if (data.id)` 체크가 너무 많지 않은가?
- [ ] `?` 옵셔널 필드들이 사실 특정 '상태'를 대변하고 있진 않은가?
- [ ] 상태를 식별할 수 있는 공통 Tag 속성(`status`, `type`, `kind`)을 추가할 수 있는가?
- [ ] 상태별로 타입을 명확히 분리하여 유니온(`|`)으로 묶었는가?
- [ ] 타입 가드 함수로 타입 좁힘 의도를 명시적으로 드러냈는가?
