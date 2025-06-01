### 3. 도메인별 API 클라이언트 계층 구축

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
