---
title: '서버 의존성을 줄여보자 (Feat : 클린 아키텍처)'
date: '2025-01-13'
published: true
slug: 'reduce-server-dependency-clean-architecture'
---

텍스트> **기존 클린 아키텍처에서 많이 벗어난 내용이 많습니다. 감안하고 봐주시면 감사하겠습니다.**

# 프롤로그

#### 백엔드 개발자로 시작했지만, 프론트엔드에서 아키텍처 고민을 시작하게 된 이유

저는 자바/스프링으로 커리어를 시작 했습니다. 처음 만든 포트폴리오도 스프링mvc를 사용한 웹사이트 였습니다.
그 다음은 백엔드 서비스인 파이어베이스를 기반으로 한 React-Native과 next.js 기반의 어드민 페이지였습니다.
항상 이런 환경이다 보니 자연스럽게 api부터 고민하고 화면을 그리는 방식으로 작업을 해왔습니다.

그러다 보니 페이지 맞춤형 API, 즉 DB 구조가 그대로 노출되는 API를 자주 만들었습니다.
이로 인해 요구사항이 수정될 때마다 뷰 코드도 함께 수정해야 했고, 사이드 이펙트가 상당히 커서 불편함을 느꼈습니다.
지만 이렇게 하면 항상 **요구사항의 수정이 있을 때마다 뷰쪽도 코드를 수정하는 과정이 매우 매우 사이드 이펙트가 크고 불편하다는 느낌을 받았습니다.**

그러던 도중 예전 회사 cto님이 들고 오신 **클린 아키텍처** 내가 원하던 거였지만 매우매우 어려웠습니다.

각 각의 레이어가 있고 서로 구현부를 모른채 인터페이스만으로 통신을 하며 그 추상화 정도가 디바이스와 프레임 워크 그 어느 것 하나 의존하는 것이 있으면 안 되었습니다.

이러한 방식으로 구하는 것이 처음이고 어렵다 보니 아키텍처가 일관된 코드베이스와 의존성을 해결 해 줄 수는 있지만 **어려우면 팀 내에 적용하기 어렵겠다 라는 생각이 매우 강하게 들었습니다.**

그래서 **저희 팀만을 위한 아키텍처**를 직접 설계·구현해 보고, 실제로 팀 내에 적용한 경험을 공유해 보려고 합니다.

---

### 1부 팀 설득을 위한 코드 리팩토링 사례

처음엔 구현된 코드를 보여주었습니다.
예시를 든건 api에 들어있는 인터셉터가 덕지덕지 붙어있는 axios의 인스턴스

각 인스턴스가 제각각 흩어져있고 인터셉터 또한 다르게 작성되어 있어 도저히 유지보수 할 때마다 땀을 흘리게 하였습니다.

```javascript
// 인터셉터의 구현부를 밖으로 뺄 수도 없고 너무 나도 강력하게 인스턴스에 붙어 있는 모습

const mainAxiosV2 = axios.create();

mainAxiosV2.interceptors.request.use(~~)

mainAxiosV2.interceptors.response.use(~~)

export default mainAxiosV2;
```

그래서 변수명에서도 볼 수 있듯이 v2입니다. (이미 코드를 한번 복사해옴)

그래서 작성한 **Http class**

```typescript
// axios의 문법이 보이긴 하지만 말 그대로 껍데기만 있는 모습
class http {
	constructor(
  		private readonly instance: HttpInstance
  		private readonly setInterceptor: () => void
    ) {	}

	private setInterceptor() {
		this.instance.interceptors.request.use(~~)
		this.instance.interceptors.response.use(~~)
    }
	private getAxiosInstance() {
		return this.instance;
	}

	get<T, D = unknown>(
		url: string,
		data?: D,
		headers?: HttpRequestConfig['headers'],
		responseType?: HttpRequestConfig['responseType'],
	) {
		return this.getAxiosInstance().get<T>(url, {
			params: data,
			paramsSerializer: params =>
				qs.stringify(params, { arrayFormat: 'repeat' }),
			headers,
			responseType,
		});
	}


}
```

여기서 필요한 인스턴스를 만들어 넣고 인터셉터로직은 공통으로 사용할 수 있게 하였습니다.
(궁극적으로는 axios에 의존하지 않도록 만드는 것이 목표)

```typescript
const httpinstance = new Http(axios.create({}));
```

**반응은 꽤 좋은 편이었다. 예전보다 깔끔해졌으며 재사용성도 상승!.**
팀원들에게 class로 작성 했을 때의 장점을 보여주었다고 생각 했지만 뜻밖의 장벽이 있었습니다.

`class는 레거시 문법 아닌가요?`
<span style="color: red">나는 이 질문이 리액트의 클래스 컴포넌트가 함수형으로 바뀌면서 생긴 부작용이라고 생각합니다.</span>

**단지 재사용성을 올리기 위해 class를 사용 했을 뿐입니다.**
프론트에서도 oop가 필요 하다는걸 알리고 싶지만(OOP의 확장성, 타입 안정성, SOLID 원칙) 이건 나중에 다루도록 하겠습니다.

---

### 2부. 레이어드로 시작하자

Http로 oop와 class 문법을 보여주며 좀 더 확장하여 보여주기로 했다. 그래서 시작한 가장 간단한 레이어드 아키텍처 입니다.

1. repository -> api를 호출 하여 서버로부터 데이터를 가져오는 역할
2. service -> repository를 받아 비즈니스 로직을 작성
3. ui -> service를 사실상 api 삼아 그대로 ui를 그림

> 이렇게 레이어를 나누기만 해도 평소 사용하던 view에서 작성 하던 코드들을 전부 밖으로 뺄 수 있어 단일 책임을 지게 할 수 있습니다.

```typescript
// repository.ts
import { type Http, httpInstance } from '@shared/lib/http';
import type { Params } from '../types';

export interface IContract {
  getContractStatus(params: Params): Promise<ApiContractStatusRes>;
}

class ContractRepository implements IContract {
  constructor(private api: Http) {}
  async getContractStatus(params: Params) {
    const { data, config } = await this.api.get<Response<ContractRes>>(
      '/contract',
      params,
    );
    return {
      ...data.result,
      locale: config.headers['Accept-Language'] as LangsType,
    };
  }
}

const instance = new ContractRepository(httpInstance);

export default instance;
```

> api를 호출 할 뿐이지만 di를 사용하여 http를 구현한 인스턴스를 주입받아 api를 호출 합니다.

```typescript
//service.ts

import { instance, type IContract } from '../api';
import type { Params } from '../types';

class ContractService {
  constructor(protected contract: IContract) {}

  getContractStatus(params: Params) {
    return this.contract.getContractStatus(params);
  }
}

export const contractService = new ContractService(instance);
```

> 아까 만들어둔 repository의 인스턴스를 받아 호출만 한다. 이제 여기서 아무런 사이드 이펙트 없이 비즈니스 로직을 작성할 수 있습니다!!!!
> 더군다나 페이지나 컴포넌트에 필요한 키값을 여기서 직접 만들어 내려줄 수 있습니다.
> 자연스럽게 dto가 생성되는 효과가 생깁니다.

이렇게 만들어둔 서비스인스턴스는 api가 들어가는 아무 곳에서나 사용이 가능합니다.(react-query, next.js route 기타 등등)

---

### 3부. 클린아키텍처를 시작하자

#### 클린 아키텍처란?

> 클린 아키텍처는 **유지보수성, 확장성, 테스트 용이성**을 극대화 하기 위해 코드의 **관심사를 분리하고, 의존성 방향을 제어**하는 소프트 웨어 설계 원칙

##### 계층 구조 (feat: gpt)

1. domain
   • 핵심 비즈니스 로직 및 도메인 모델이 위치합니다.
   • 외부 요소에 의존하지 않는, 애플리케이션의 가장 중요한 부분입니다.
   • 의존성을 가지지 않는 추상화된 레이어로, 비즈니스 규칙과 데이터 구조를 정의합니다.
   • 예: 도메인 객체, 데이터 타입, 추상 리포지토리 인터페이스 등.
2. application
   • **유스케이스(Application Logic)**가 위치합니다.
   • 특정 작업이나 비즈니스 요구사항을 처리하는 서비스 클래스가 포함됩니다.
   • 비즈니스 로직과 인프라(데이터 저장소, 네트워크 요청 등) 간의 중개 역할을 합니다.
   • 예: 서비스 레이어.
3. infrastructure
   • 외부 시스템과의 상호작용을 담당합니다.
   • 구체적인 구현체가 위치하며, 데이터베이스, API, 또는 메모리 저장소와 같은 외부 종속성에 대한 코드를 포함합니다.
   • 예: 리포지토리의 실제 구현체.
4. main.ts
   • 애플리케이션의 엔트리 포인트입니다.
   • 의존성을 주입하거나 객체를 초기화하며, 애플리케이션을 실행합니다.

### 구조 설계

위의 원칙과 예제를 통해 구성해본 간단한 클린 아키텍처이다.

```
domain/types (핵심 모델 정의)
      ↓
domain/repositories (Repository 인터페이스 정의)
      ↓
infrastructure/repositories (Repository 구현체)
      ↓
application/services (Service 레이어 - Repository 인터페이스에 의존)
      ↓
main (Repository 구현체를 Service에 주입 및 실행)
```

구조

```
src/
├── domain/
│   ├── types/
│   │   └── Contract.ts
│   └── repositories/
│       └── IContract.ts
├── application/
│   └── services/
│       └── ContractService.ts
├── infrastructure/
│   └── repositories/
│       └── ContractRepository.ts
└── main.ts
```

위의 구조로 가고 싶었지만 infrastructure레이어의 존재를 나는 다른 팀원들에게 필요성에 대해 어필 해야 했지만 아직은 이르다고 생각을 했습니다.

심지어 본인 조차 필요성을 못 느꼈다 아마 api를 가지고 인터페이스를 만들어야 하는대 infrastructure레이어를 떠올리는게 힘들었다는 걸 느꼈습니다.

그래서 만든 좀 더 프론트에서 사용하기 편한 구조로 다시 설계 하였습니다.
기능을 설계 할 때 순서는 다음과 같습니다.

**간소화된 구조 (프론트엔드 친화 버전)**

그래서 조금 더 **프론트엔드 개발자**에게 익숙한 순서로 다시 설계해 보았습니다.

1. type 설계
2. repository + interface 설계
3. service를 만들어 repository를 주입
4. service를 custom hook 등과 연결해 사용
5. domain의 type을 통해 UI까지 자연스럽게 의존

```
├── domain/
│   ├── types/
│   │   └── User.ts
├── application/
│   └── repositories/
│   │   │   IContract.ts
│   │   └── ContractRepository.ts
│   └── services/
│       └── ContractService.ts
└── main.ts
```

이런 과정을 거치니, **프론트엔드 개발자가 API를 연동하는 흐름**과 맞물려서 팀원들의 이해와 참여도가 높아졌습니다.

덕분에 **어플리케이션 전체의 타입 안정성**이 올라갔고, **도메인 중심**으로 설계를 진행하니 백엔드와 협업하기도 훨씬 수월해졌습니다.
또한 레이어별로 규칙이 생겨 **팀원 간 커뮤니케이션 비용**도 줄어들었고, 프론트엔드를 더 폭넓은 시각에서 바라볼 수 있게 된 점이 개인적으로 무척 만족스러웠습니다.

특히 팀 코드 리뷰에서

    “이 로직은 service 레이어에 있는 것이 더 적절해 보이네요.”

라는 피드백이 나왔을 때, 우리의 팀이 한 단계 성장했다는 것을 실감할 수 있었습니다.

---

### 4부. 마무리

현재는 위 구조를 **FSD(Feature-Sliced Design)**와 혼합하여 사용 중입니다. (예: Entities, shared/domain)
하지만 앞으로는 원래 설계했던 대로 조금씩 되돌아가서, 도메인 영역에 단순 타입만 두는 대신, 엔티티 클래스로 작성해 각 도메인이 스스로 검증 로직을 담당하도록 발전시키고자 합니다.

예컨대, User 객체를 만들 때:

```typescript
class User {
  constructor(
    readonly id: string,
    readonly email: string,
  ) {
    if (!this.isValidEmail(email)) {
      throw new Error('이메일 형식이 잘못되었습니다.');
    }
  }

  private isValidEmail(email: string): boolean {
    // 간단한 정규식 예시
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  applyRole(role: string) {
    // 로직 ...
  }
}
```

이렇게 검증된 엔티티를 도메인에서 다룸으로써, 로직을 보다 견고하게 유지할 계획입니다.

정리하자면, 프론트엔드에서도 OOP와 DI, 레이어드 아키텍처를 적절히 도입하면

- 타입 안정성 향상
- 도메인 모델에 대한 명확한 책임 분리
- API 스펙 변경 시 영향 범위 최소화
- 팀 협업 및 코드 가독성 개선
  등의 이점을 누릴 수 있습니다.

> 물론, 완벽한 “클린 아키텍처”와는 다를 수 있지만, 팀 사정과 스펙에 맞춰 실용적으로 변형하는 것이 오히려 유지보수에 더 유리하다고 느꼈습니다.
> 이 경험이 비슷한 고민을 하고 있는 프론트엔드 개발자분들께 조금이나마 도움이 되길 바랍니다. 감사합니다!
