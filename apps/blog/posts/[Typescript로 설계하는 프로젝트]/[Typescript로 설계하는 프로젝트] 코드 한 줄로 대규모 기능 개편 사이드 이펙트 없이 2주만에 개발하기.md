**"회원 구조가 바뀌었습니다. 552개 파일을 수정해야 합니다."**

보통은 이렇게 됩니다

- 어디를 수정해야 하는지 찾느라 1주
- 수정하다가 놓친 곳 때문에 버그 발생
- 회귀 테스트에 또 1주
- QA에서 엣지 케이스 발견
- 결국 한 달...

하지만 우리는 **2주 만에, 사이드 이펙트 없이** 끝냈습니다.

비결은 1년 전 작성한 이 한 줄이었습니다.

> ```typescript
> type ProfileId = string;
> ```

---

## 무슨 일이 있었던 걸까요?

회원 구조가 바뀌었습니다.

```
[Before]
1 Account → 1 ProfileId (필수)

[After]
1 Account → N ProfileId (옵셔널)
```

예전에는 항상 ProfileId가 선택되어 있었지만, 이제는 선택하지 않을 수도 있게 되었습니다.

---

## 문제의 크기

거의 모든 서비스 기능이 영향을 받았습니다.

**영향받은 주요 기능**

- **콘텐츠 관리** (업로드, 수정, 삭제)
- **데이터 조회** (통계, 수익, 리포트)
- **권한 관리** (접근 제어, 팀 관리)

이런 코드가 곳곳에 있었습니다:

```typescript
const profileId = getProfileId(); // 항상 string이라고 가정
api.fetchData(profileId);
```

기존엔 `getProfileId()`가 항상 `string`을 보장했습니다. 하지만 이제는 `undefined`일 수 있게 되었습니다. 옵셔널이 되어야 합니다.

**552개 파일을 수정해야 하는 상황.** 어떻게 안전하게 해낼 수 있을까요?

---

## 왜 가능했을까? #1: 도메인 분리의 시작점

답은 1년 전으로 거슬러 올라갑니다.

처음 코드를 작성할 때, 이렇게 할 수도 있었습니다:

```typescript
// ❌ 의미 없는 원시 타입
const id = cookies.get('ProfileId'); // any 타입
api.fetchData(id); // 타입 체크 없음
```

하지만 우리는 이렇게 했습니다:

```typescript
// ✅ 도메인 개념을 표현하는 타입
type ProfileId = string;

const id = cookies.get<ProfileId>('ProfileId'); // ProfileId 타입
api.fetchData(id); // 타입 안전
```

**무엇이 달라졌을까요?**

`string`은 그냥 원시 타입입니다. **"문자열"** 이라는 것 외에 아무 의미가 없습니다.

하지만 `ProfileId`는 다릅니다:

- **"이 값은 프로필을 식별하는 ID다"**
- **"이 값은 특정 도메인에 속한다"**

**코드에 의미 계층을 추가한 것**입니다.

이 작은 차이가 1년 후, 552개 파일을 수정할 때 결정적이었습니다.

---

## 해결 전략

**핵심은 타입 추상화에 있었습니다.**

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

---

## 왜 가능했을까? #2: 변경 전파의 단위 생성

타입 별칭이 없었다면 어땠을까요?

```typescript
// 만약 string을 직접 사용했다면
const getProfileId = () => cookies.get<string>('ProfileId');
const fetchData = (id: string) => api.fetch(id);
const userId: string = '123';
const profileId: string = '456';
```

`string`을 `string | undefined`로 바꾸면?

**아무 일도 일어나지 않습니다.**

왜냐하면 `string`은 너무 범용적이기 때문입니다. 사용자 ID도 string, 프로필 ID도 string, 이름도 string... 타입스크립트는 어떤 `string`을
바꿔야 하는지 알 수 없습니다.

하지만 `ProfileId`라는 별칭을 만들면:

```typescript
// ProfileId 타입이 명시된 모든 곳
type ProfileId = string;

const getProfileId = (): ProfileId =>
...
const fetchData = (id: ProfileId) =>
...
const profileId: ProfileId = '456';
```

이제 `const getProfileId = () => cookies.get<ProfileId | undefined>('ProfileId');`로 한 줄만 바꾸면:

```
❌ Type 'ProfileId | undefined' is not assignable to type 'ProfileId'
❌ Argument of type 'ProfileId | undefined' is not assignable to parameter
❌ Object is possibly 'undefined'
```

**컴파일러가 수정이 필요한 552개 파일을 모두 찾아냅니다.**

이것이 **"변경 전파의 단위를 중앙집중화"** 한 것입니다.

타입 하나만 바꾸면, 그 변경이 자동으로 전체 코드베이스에 전파됩니다.

---

## 수정 과정

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
	const {profileId} = useParams<{ profileId: ProfileId }>();
	
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

## 왜 가능했을까? #3: 컴파일러를 QA로 전환

만약 `string`을 직접 사용했다면 어땠을까요?

```typescript
const profileId = getProfileId(); // string
api.fetchData(profileId); // 컴파일은 성공
```

`getProfileId()`가 `undefined`를 반환해도 **컴파일 에러가 나지 않습니다.**

런타임에 가서야 발견됩니다:

- 사용자가 클릭했을 때
- QA가 테스트할 때
- 운이 나쁘면 프로덕션에서

하지만 `ProfileId` 타입 덕분에:

```typescript
const profileId = getProfileId(); // ProfileId | undefined
api.fetchData(profileId); // ❌ 컴파일 에러!
```

**컴파일 타임에 모든 문제를 발견합니다.**

더 놀라운 점은, 컴파일러가 **우리가 놓친 엣지 케이스까지 찾아냈다**는 것입니다.

"여기도 ProfileId가 없을 수 있는데 처리 안 했네요?"

기획에서 빠진 부분까지 발견했습니다. 타입 체크가 **회귀 테스트 역할**을 한 셈입니다.

**타입스크립트 컴파일러가 QA가 된 것**입니다.

---

## 결과

**552개 파일. 2주. 사이드 이펙트 0건.**

타입 시스템이 QA 역할까지 해주었습니다. 컴파일러가 알려주는 에러를 하나씩 해결하다 보니, 놓칠 수 있었던 엣지 케이스까지 모두 처리할 수 있었습니다.

심지어 기획에서 빠진 부분까지 발견했습니다.

---

## 추가 효과: 커뮤니케이션 비용 절감

타입 별칭의 효과는 여기서 끝나지 않습니다.

**협업할 때도 차이가 납니다.**

```typescript
// ❌ 의미 없는 원시 타입
function updateProfile(id: string, name: string) {
	// id가 UserId인가? ProfileId인가? TeamId인가?
	// name이 displayName인가? userName인가?
}

// ✅ 의미 있는 타입
function updateProfile(id: ProfileId, name: DisplayName) {
	// 명확합니다
}
```

**실수로 잘못된 ID를 넘기는 것도 방지됩니다:**

```typescript
const userId: UserId = '123';
const profileId: ProfileId = '456';

updateProfile(userId, 'name'); // ❌ 컴파일 에러!
updateProfile(profileId, 'name'); // ✅
```

**코드 자체가 문서 역할**을 합니다. 주석이나 별도 문서 없이도 "이 함수는 ProfileId를 받는구나"를 즉시 알 수 있습니다.

코드 리뷰할 때도, 온보딩할 때도, 코드를 이해하는 속도가 빨라집니다.

---

## 타입 설계 원칙: 한 줄의 힘

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

### 타입 한 줄이 만드는 4가지 변화

**1. 도메인 분리의 시작점**

- `string`은 의미 없는 원시 타입
- `ProfileId`는 "이 값은 프로필 식별자"라는 도메인 개념
- 코드에 의미 계층을 추가

**2. 변경 전파의 단위 생성**

- 타입 정의 한 곳만 바꾸면 모든 사용처에 전파
- 컴파일러가 영향받는 552개 파일을 자동으로 찾아줌
- 변경 단위가 중앙집중화됨

**3. 컴파일러를 QA로 전환**

- 런타임 에러 → 컴파일 타임 에러
- 타입 체크가 회귀 테스트 역할
- 기획 누락까지 발견

**4. 커뮤니케이션 비용 절감**

- 코드 자체가 문서 역할
- 의미 충돌 방지 (UserId vs ProfileId)
- 협업 속도 향상

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

## 배운 점

**타입 설계의 중요성**

`string` 대신 `ProfileId`를 썼던 과거의 선택이 모든 차이를 만들었습니다.

**"나중에 필요할지도 몰라"** 하는 막연한 기대가 아니라, **지금 당장 코드의 의미를 명확하게 만들기 위해** 타입을 만들었던 것이 1년 후 대규모 변경을 가능하게
만들었습니다.

타입은 단순히 에러를 잡는 도구가 아닙니다. **코드에 의미를 부여하고, 변경을 추적 가능하게 만드는 설계 도구**입니다.

---

## 당신의 프로젝트에도

지금 바로 확인해보세요.

**체크리스트:**

```
□ string, number 같은 원시 타입을 직접 사용하고 있나요?
□ UserId, ProductId, Price 같은 의미 있는 타입으로 바꿀 수 있나요?
□ 도메인 핵심 개념을 타입으로 표현하고 있나요?
□ 제네릭을 활용해서 타입 정보를 유지하고 있나요?
```

**지금 당장 시작하세요:**

1. 가장 중요한 식별자 하나를 골라보세요 (userId, orderId, productId...)
2. `type UserId = string` 한 줄을 추가하세요
3. 해당 타입을 사용하는 모든 곳에 타입을 명시하세요
4. 다음에 변경이 필요할 때, 그 위력을 경험하게 될 것입니다

**작은 변경이 큰 차이를 만듭니다.**

오늘 만든 타입 하나가 1년 후 당신을 구할 수 있습니다.
