![](https://velog.velcdn.com/images/rewq5991/post/4710be4e-18f1-40dc-b7dd-dc5783900a0e/image.png)

> [공식홈피](https://feature-sliced.design/kr/)를 기반 했지만 제 입맛에 따라 해석 했음을 알려드립니다.

# 프롤로그

때는 바야흐로 2024년 5월 fsd 아키텍처가 유행하기 시작 했다. 마침 회사의 프로젝트 두개를 하나로 합치는 프로젝트를 시작 하는 나로써는 매우나도 유혹적인 글이었습니다.
하지만 지금 처럼 분석글이 많은 때도 아니었고 이제 막 **초기 상태의 FSD를 어떻게 팀 프로젝트에 적용할 수 있을까** 하는 고민이 본격적으로 시작되었습니다.

---

## 1부. FSD의 간단 설명

fsd: 기능 중심의 아키텍처
기존의 많이 사용하는 구조는 코드를 역할 중심으로만 나누었습니다.
components, apis, utils, hooks, etc... 이런 구조는 초기 프로젝트에는 큰 무리없이 사용을 하다 어느 정도 조금만 사이즈가 커지게 되면 서로의 의존성이 엮이면서 단순히 코드를 하나 바꾸거나 삭제 하는 작업조차 버거워 하게 되고 사이드 이펙트가 커진게 됩니다.

이런 문제를 fsd는 기능이라는 이름으로 역할과 기능을 중심으로 코드를 구조화 하려고 합니다.

![](https://velog.velcdn.com/images/rewq5991/post/0a5e7910-45d2-4626-b7e9-c2b3933441d7/image.png)
(참조 : [FSD 관점으로 보는 코드 경계 찾기](https://velog.io/@teo/fsd)

> 레이어(Layer): 프로젝트 기능적 역할에 따른 수직적 관심사 분리
> 슬라이스(Slice): 비즈니스 도메인별 관심사 분리
> 세그먼트(Segment): 기술적 관심사 분리

> **app**: 애플리케이션의 전역 설정 (라우팅, 스토어 등). 예를 들어, 글로벌 스타일 설정이나 다국어 설정이 이 레이어에 포함됩니다.
> **processes**: 페이지 간의 비즈니스 프로세스. 사용자 인증 흐름이나 결제 프로세스 같은 다중 페이지에 걸친 로직을 관리합니다.
> **pages**: 사용자와 상호작용하는 실제 페이지 컴포넌트. 예를 들어, Homepage, ProductListPage 등이 여기에 속합니다.
> **widgets**: 재사용 가능한 복잡한 UI 블록. 예를 들어, 헤더 네비게이션, 검색 필터, 댓글 위젯 같은 것이 있습니다.
> **features**: 특정 비즈니스 기능을 담당. 좋아요 버튼, 리뷰 작성 폼, 상품 정렬 기능 등이 포함됩니다.
> **entities**: 핵심 비즈니스 엔티티와 관련된 코드. 상품, 사용자, 주문 등 도메인 모델의 로직을 다룹니다.
> **shared**: 공통 유틸리티와 컴포넌트를 포함. UI 버튼, 인풋 컴포넌트, 유틸리티 함수 등이 여기에 속합니다.

원칙: 상위 레이어는 하위 레이어를 사용할 수 있지만, 그 반대는 불가능합니다. 이 원칙은 각 레이어의 독립성과 안정성을 보장합니다.
“이 원칙을 지킴으로써, 복잡도가 커져도 하위 레이어는 독립적으로 유지되어 재사용성과 유지보수성이 높아집니다.”

---

## 2부. FSD 생각해보기

fsd의 개념을 공부 해보니 모호한 부분이 많았다 특히 features / widgets 이 두 부분의 경계가 명확 하지 않다고 느껴졌고 그 구조를 지금 부터 천천히 맞춰 가기도 어렵다고 생각 했다.
예를 들어 앨범 제작에서 사용하는 기능과 컴포넌트들이 다른 페이지에서는 똑같이 사용되지 않기 때문이었습니다.

그래서 다시 정의 해본 fsd 구조

> **app**: 애플리케이션의 전역 설정 (라우팅, 스토어 등). 예를 들어, 글로벌 스타일 설정이나 다국어 설정이 이 레이어에 포함됩니다.
> ~~**processes**: 페이지 간의 비즈니스 프로세스. 사용자 인증 흐름이나 결제 프로세스 같은 다중 페이지에 걸친 로직을 관리합니다.~~
> **pages**: 사용자와 상호작용하는 실제 페이지 컴포넌트. 예를 들어, Homepage, ProductListPage 등이 여기에 속합니다.
> **widgets**: <span style="color: red">pages 사용할 컴포넌트의 모음</span>
> ~~**features**: 특정 비즈니스 기능을 담당. 좋아요 버튼, 리뷰 작성 폼, 상품 정렬 기능 등이 포함됩니다.~~
> **entities**: <span style="color: red">도메인 모델의 로직을 따르는 api 모음</span>
> **shared**: 공통 유틸리티와 컴포넌트를 포함. UI 버튼, 인풋 컴포넌트, 유틸리티 함수 등이 여기에 속합니다.

이런 식으로 재정의하여 생각을 해보았다. 구조만 생각해보면 next js의 app route 형식을 적극적으로 사용 했고 page에 따라 컴포넌트가 나뉘어지고 api나 hook은 entities 에서 가져와 사용한다는 식으로 보면 됩니다.

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── ...
├── pages/
│   └── album.tsx
├── widgets/
│   └── album/
│       ├── index.tsx
│       └── ...
├── entities/
│   ├── album/
│   │   ├── api/
│   │   │   ├── repository.ts
│   │   │   └── index.ts
│   │   ├── model/
│   │   │   ├── hooks.ts
│   │   │   └── index.ts
│   │   └── service.ts
│   │   │   ├── service.ts
│   │   │   └── index.ts
└── shared/
    ├── ui/
    │   ├── Button.tsx
    │   └── ...
    │── domain (#도메인 types를 모아두는 곳)
    └── ...
```

또한, **FSD의 일반적 원칙 중 하나를 일부 수정**했는데, 바로 entities 디렉토리 간에 서로 의존이 가능하게 했다는 점입니다.

**BFF 구조에서 공통된 API 호출 로직(혹은 Repository)을 재사용해야 했기 때문입니다.**

이런 방식으로 api나 hook을 구성 할 시에 서버에 완전히 의존하지 않고 page에 좀 더 알맞는 폴더 구조를 가져갈 수 다는 장점이 있었습니다.

또한, shared에 domain을 두어 서버에서 제공 하는 api의 타입과 컴포넌트의 타입을 맞추어 전체적으로 type-safe 하게 구성 했습니다.

## 3. 마무리

지금까지 **FSD(Feature-Sliced Design)**의 기본 개념과, 이를 어떻게 재정의하여 프로젝트에 적용했는지 살펴봤습니다. 역할 중심 구조(components, apis, utils 등)의 한계를 극복하기 위해 **‘기능 중심’**으로 폴더를 나누고, 여기에 Next.js의 app route를 결합해봤죠. 특히, 일반적인 FSD 원칙에서 벗어나 entities 디렉토리 간 의존을 허용한 것은 BFF(Backend For Frontend) 아키텍처를 염두에 둔 결정이었습니다.

이처럼 팀과 프로젝트 상황에 맞춰 FSD를 재정의하는 일은 쉬운 과정이 아니지만, 한 번 잘 구축해두면 유지보수나 확장성 면에서 큰 이점을 얻을 수 있습니다. 물론, features와 widgets의 경계가 모호해지거나, entities끼리 의존을 허용하면서 새로운 복잡도가 생길 수도 있습니다. 그러나 명확한 기준과 팀원 간의 합의가 있다면, 필요에 따라 구조를 유연하게 변경해나가는 것이 가능하다고 생각합니다.

앞으로도 FSD 관련 글이나 실무 사례가 계속 늘어나면서, 더 발전된 형태의 기능 중심 아키텍처가 등장할 것으로 보입니다. 제가 시도해본 이 구조도 다듬고 확장한다면, 다른 팀이나 프로젝트에서도 충분히 활용 가능하리라 생각합니다. 만약 더 구체적인 예시나 코드를 공유해주시면, 함께 고민해보는 것도 좋겠습니다.
