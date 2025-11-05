> ```typescript
> type ProfileId = string;
> ```

이 코드 한 줄이 552개 파일의 대규모 변경을 사이드 이펙트 없이 2주 만에 가능하게 했습니다.

**무슨 일이 있었던 걸까요?**

회원 구조가 바뀌었습니다.

```
[Before]
1 Account → 1 ProfileId (필수)
1 Account → N ProfileId (필수, 1개 선택됨)

[After]
1 Account → N ProfileId (옵셔널)
```

예전에는 항상 ProfileId가 선택되어 있었지만, 이제는 선택하지 않을 수도 있게 되었습니다. 

---

### 문제의 크기

거의 모든 서비스 기능이 영향을 받았습니다.

**영향받은 주요 기능:**

- **콘텐츠 관리** (업로드, 수정, 삭제)
- **데이터 조회** (통계, 수익, 리포트)
- **권한 관리** (접근 제어, 팀 관리)

이런 코드가 곳곳에 있었습니다:

```typescript
const profileId = getProfileId(); // 항상 string이라고 가정
api.fetchData(profileId);
```

기존엔 `getArtistId()`가 항상 `string`을 보장했습니다. 하지만 이제는 `undefined`일 수 있게 되었습니다. 옵셔널이 되어야 합니다.

552개 파일을 수정해야 하는 상황. 어떻게 안전하게 해낼 수 있을까요?

---

### 해결 전략

**핵심은 타입 추상화에 있었습니다.**

과거에 `string` 대신 `ProfileId`라는 타입을 만들어뒀던 것이 결정적이었습니다.

```typescript
// 만약 이랬다면?
const id = cookies.get('ProfileId'); // any 타입
api.fetchData(id); // 타입 체크 없음

// 다행히 이랬습니다
const id = cookies.get<ProfileId>('ProfileId'); // ProfileId 타입
api.fetchData(id); // 타입 안전
```

코드 곳곳에 `ProfileId` 타입이 명시되어 있었기 때문에, 반환 타입만 바꾸면 컴파일러가 수정이 필요한 모든 곳을 알려줄 수 있었습니다.

```typescript
// 변경 전
export const getProfileId = () =>
	cookies.get<ProfileId>('ProfileId'); // ProfileId 반환

// 변경 후
export const getProfileId = () =>
	cookies.get<ProfileId | undefined>('ProfileId'); // ProfileId | undefined 반환
```

타입 하나만 바꿨을 뿐인데, 타입스크립트 컴파일러가 수정이 필요한 모든 곳을 찾아냈습니다.

그럼 실제로 어떻게 수정했을까요?

---

### 수정 과정

**우선순위별로 분류했습니다:**

1. **기획 확인 필요** - ProfileId가 없는 상황을 고려하지 않은 케이스
2. **단순 null 체크** - 옵셔널 체이닝이나 조건문 추가
3. **로직 변경** - 흐름 자체를 수정해야 하는 케이스

---

**패턴 1: 옵셔널 체이닝**

```typescript
// Before
const data = profileId.something;

// After
const data = profileId?.something;
```

**패턴 2: 필수값 보장하기**

path parameter처럼 '반드시 있어야 하는' 경우를 위한 훅을 만들었습니다:

```typescript
const useProfileIdByPath = (): ProfileId => {
  const { profileId } = useParams<{ profileId: ProfileId }>();

  if (!profileId)
  	throw new Error('useProfileIdByPath hook must be used within an profileId path');
  
  return profileId;
};
```

---

**기획 논의는 이런 식이었습니다:**

> 나: "컴파일 오류를 해결하다 보니 이 상황에서는 추가적인 화면 기획이 필요해요! 에러 화면이나 비어 있는 화면이 필요합니다."
>
> 기획: "아, 그 부분은 생각 못 했네요. 로그인 페이지로 보내주세요."

또는

> 나: "이 기능 자체에 대한 기획이 빠져 있는 거 같아요! 이 부분 추가로 필요합니다."

하나씩 수정하다 보니 **총 552개 파일이 변경**되었습니다.

---

## 타입 설계 원칙: 한 줄의 힘

이 한 줄의 차이가 552개 파일, 2주, 사이드 이펙트 0건을 가능하게 했습니다.

```typescript
type ProfileId = string;
```

**`string` 대신 의미 있는 타입을 만드세요.**

```typescript
// ❌ 이렇게 하지 마세요
const getId = (): string => cookies.get('id');
const fetchData = (id: string) => api.fetch(id);
const userId: string = '123';
const profileId: string = '456';

// ✅ 이렇게 하세요
type ProfileId = string;
type UserId = string;

const getProfileId = (): ProfileId => cookies.get<ProfileId>('ProfileId');
const fetchData = (id: ProfileId) => api.fetch(id);
const userId: UserId = '123';
const profileId: ProfileId = '456';
```

---

**무엇이 달라질까요?**

1. **변경 추적이 가능합니다**
    - `ProfileId`를 `ProfileId | undefined`로 바꾸면
    - 타입스크립트 컴파일러가 모든 사용처를 찾아냅니다

2. **의미가 명확해집니다**
    - `userId`와 `profileId`를 실수로 바꿔 쓸 수 없습니다
    - 함수가 어떤 ID를 받는지 타입으로 표현됩니다

3. **리팩토링이 안전해집니다**
    - 타입 하나만 바꾸면 영향받는 곳을 모두 알 수 있습니다
    - 런타임 에러 대신 컴파일 타임에 발견합니다

---

**하지만 주의하세요**

모든 `string`을 타입으로 만들 필요는 없습니다.

❌ 과도한 적용

```typescript
type UserName = string;
type ButtonLabel = string;
type ErrorMessage = string;
```

✅ 의미 있는 적용

```typescript
type UserId = string;      // 식별자
type ProfileId = string;   // 도메인 핵심 개념
type ApiKey = string;      // 보안/검증 필요
```

**도메인의 핵심 개념이나, 추적이 필요한 식별자**처럼 꼭 필요해 보이는 곳에만 적용하세요.

---

### 결과

**552개 파일. 2주. 사이드 이펙트 0건.**

타입 시스템이 QA 역할까지 해주었습니다. 컴파일러가 알려주는 에러를 하나씩 해결하다 보니, 놓칠 수 있었던 엣지 케이스까지 모두 처리할 수 있었습니다.

심지어 기획에서 빠진 부분까지 발견했습니다.

---

### 배운 점

**타입 설계의 중요성**

`string` 대신 `ProfileId`를 썼던 과거의 선택이 모든 차이를 만들었습니다.

**"나중에 필요할지도 몰라"** 하는 막연한 기대가 아니라, **지금 당장 코드의 의미를 명확하게 만들기 위해** 타입을 만들었던 것이 1년 후 대규모 변경을 가능하게 만들었습니다.

타입은 단순히 에러를 잡는 도구가 아닙니다. **코드에 의미를 부여하고, 변경을 추적 가능하게 만드는 설계 도구** 입니다.

---

### 당신의 프로젝트에도

지금 바로 확인해보세요.

- `string`, `number` 같은 원시 타입을 직접 사용하고 있나요?
- `UserId`, `ProductId`, `Price` 같은 의미 있는 타입으로 바꿀 수 있나요?
- 제네릭을 활용해서 타입 정보를 유지하고 있나요?

**작은 변경이 큰 차이를 만듭니다.**

오늘 만든 타입 하나가 1년 후 당신을 구할 수 있습니다.
