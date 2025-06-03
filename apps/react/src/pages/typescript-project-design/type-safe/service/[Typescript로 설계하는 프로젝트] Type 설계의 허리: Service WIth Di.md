## 들어가며

> 겨우 백엔드의 요청을 쳐내고 다시 피곤에 쩔은 모습으로 테스크를 마무리 하려는 순간 이번엔 제 슬랙이 울립니다.  
> [기획자]: "급하게 기획이 바뀌어서요 이거 프론에서 추가로 수정해주셔야 할 것 같아. 아직 마무리 다 안 하신거 맞죠?"
> [나]: "네 아직 마무리 안 했어요 수정 사항이 뭔가요?'  
> [기획자]: "별거 없어요! 다른쪽에 있는 그대로 가져다가 똑같이 만들어 주시면 됩니다. 이미 구현되어 있는거라 금방 하시죠?"  
> [니]: "(그거 거기에만 쓴다며... 그래서 그쪽 로직하고 딱 붙여 놓은건대... ) 네 하지만 시간은 좀 걸릴 것 같아요 PM 하고 이여기는 하고 오신거죠?"

> **어떻게 하면 이런 로직을 재활용하기 쉽게 만들 수 없을까? 지난번 API도 구조적으로 설계 했는대 이것도 그럴 수 있지 않을까?**

[이전글](https://velog.io/@rewq5991/typescript-project-api-di-design)에서는 Type-Safe Http class을 설계하고 Type을 구조적으로 설계하는 것에 대해 이야기 했습니다.

이번글에서는 프론트에서 쓰이는 비즈니스로직을 분리하는 부분에 대하여 이야기 해볼까 합니다.

여러분이 여기까지 따라오셨다면 이미 http와 api 호출부를 나누어 놓았을 것입니다.  
축하합니다! 레이어를 나누신거고 그럼 그 이후에 로직을 붙여 나가는건 별로 어렵지 않습니다.
대신에 이번 레이어를 저는 service 레이어라고 부르고 여기에 어떤 것들이 들어오면 좋은지에대해서 설명드리겠습니다.

## 3. 도메인별 API 클라이언트 계층 구축

HTTP 클래스를 직접 사용하는 대신, 도메인별 API 클라이언트 계층을 구축합니다:

```typescript
// 📁 apps/react/src/server/user/api.ts
interface UserServer {
  createUser: (user: UserReq) => Promise<UserRes>;
}

class UserServerImpl implements UserServer {
  constructor(private api: Http) {}

  async createUser(user: UserReq): Promise<UserRes> {
    const response = await this.api.post<UserRes, UserReq>('/api/user', user);
    return response.data;
  }
}

export const userServer = new UserServerImpl(instance);
```

이 설계의 장점:

- **관심사 분리**: HTTP 통신 로직과 비즈니스 로직이 분리됩니다.
- **타입 집중화**: API 관련 타입이 한 곳에 집중되어 관리가 용이합니다.
- **테스트 용이성**: 모킹이 쉬워져 단위 테스트가 간편해집니다.
- **인터페이스 기반 설계**: 구현체를 쉽게 교체할 수 있어 유연성이 향상됩니다.
