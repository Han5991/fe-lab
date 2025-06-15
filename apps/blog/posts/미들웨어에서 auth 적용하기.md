## 프롤로그

> 이번 글에서는 Next.js의 Middleware를 사용하여 사용자 인증 및 역할 기반 라우팅을 구현한 경험을 공유합니다.

---

## 1. 요구 사항

- Next.js App Route를 사용할 것
- 최상단에서 인증을 처리할 것
- 다른 코드를 수정하지 않을 것
- 캐싱 기능을 사용할 것
  - 되도록이면 tanstack-query/react(이하 query로 통일)를 사용할 것
- 서버 사이드를 활용하여 자연스러운 UX를 제공할 것

---

## 2. 시도한 것

- **최상단 Layout.tsx에서 query 호출 및 캐싱 시간 무한대 설정**  
  → **실패**: 레이아웃 실행 순서 문제로 인해 내부 컴포넌트가 먼저 렌더링됨
- **Middleware에서 인증 로직 적용**  
  → **성공**: 요청 단계에서 인증 여부를 판단하여 프라이빗 페이지 진입 전 리다이렉션 가능

---

## 3. 문제 상황 정의

### 화면 에러 문제

- 인증 후 올바른 페이지로 리다이렉트되더라도, 인증 로직이 실행되지 않아 필요한 사용자 데이터가 없어 에러가 발생합니다.
- **해결:** 데이터 존재 여부를 항상 확인하는 로직 추가 필요

---

## 4. 원인 분석

1. **인증 로직의 위치 문제**

- 클라이언트 측 레이아웃 또는 컴포넌트에서 인증을 체크하면 렌더링 후에야 인증 상태를 확인할 수 있어, 비정상적인 화면 노출 및 깜빡임이 발생합니다.

---

## 5. 개선 방안

### Next.js Middleware 활용

- **요약:**  
  Next.js의 Middleware를 이용하면 요청 단계에서 인증 여부를 미리 체크할 수 있어, 프라이빗 페이지 렌더링 전에 불필요한 화면 노출을 방지할 수 있습니다.

- **구현 포인트:**

  - **쿠키 활용:**  
    사용자의 인증 정보를 쿠키에 저장하여, API 호출을 줄이고 응답 속도를 개선합니다.
  - **리다이렉션:**  
    인증되지 않은 요청에 대해 Middleware에서 바로 적절한 페이지로 리다이렉션 처리

- **참고 링크:**  
  [Next.js Middleware Use Cases](https://nextjs.org/docs/app/building-your-application/routing/middleware)

### 추가 보충 내용

1. **캐싱 전략 강화**

- Middleware에서 캐싱을 구현할 때, API 호출 결과를 쿠키 외에도 Edge 캐시나 서버 사이드 캐싱 레이어를 도입하면, 여러 사용자에 대해 캐시를 재사용할 수 있어 성능이 더욱 향상됩니다.

2. **보안 고려사항**

- 쿠키에 민감한 정보를 저장할 경우, `httpOnly`, `secure`, `SameSite` 옵션을 반드시 설정하여 보안을 강화해야 합니다.
- JWT와 같은 토큰 기반 인증 방식을 사용할 경우, 토큰의 만료 시간과 재발급 정책을 명확히 관리하는 것이 중요합니다.
- 쿠키 세션과 같은 시크릿키로 암호화가 필요할 경우 추가 검토할 수 있습니다.[next.js Session Management](https://nextjs.org/docs/pages/building-your-application/authentication#session-management)

3. **역할 기반 라우팅 강화**

- 인증 후, 사용자 역할(role)에 따른 접근 제어를 Middleware에서 추가적으로 구현할 수 있습니다.
- 예를 들어, 관리자(admin)와 일반 사용자(user)로 분기하여, 각 역할에 따라 다른 라우트로 리다이렉트하는 로직을 추가할 수 있습니다.
- 아래는 간단한 예시입니다:

  ```javascript
  // middleware.js (Next.js 예시)
  import { NextResponse } from 'next/server';

  export async function middleware(req) {
    const { cookies } = req;
    const userData = cookies.get('userData');

    // 인증 정보가 없으면 로그인 페이지로 리다이렉션
    if (!userData) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // 사용자 역할에 따른 분기 처리
    const user = JSON.parse(userData);
    if (user.role !== 'admin' && req.nextUrl.pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    return NextResponse.next();
  }
  ```

4. **사용자 경험(UX) 개선**

- Middleware를 사용하면 초기 렌더링 전에 리다이렉션 처리가 가능하므로, 사용자에게 불필요한 깜빡임 없이 자연스러운 전환을 제공합니다.
- 또한, 인증 실패 시 사용자에게 친절한 오류 메시지나 재로그인 페이지를 제공하는 것이 좋습니다.

5. **테스트 및 모니터링**

- Middleware 로직은 전체 애플리케이션의 성능에 큰 영향을 미치므로, 충분한 테스트를 통해 인증/리다이렉션 로직이 모든 시나리오에서 정상 동작하는지 확인해야 합니다.
- 로깅 및 모니터링을 통해, 미들웨어가 제대로 작동하는지 주기적으로 체크하는 것이 좋습니다.

6. next.js 15에서는 미들웨어의 테스트를 할 수 있는 api를 제공해줍니다. 버전을 올린다면 이 api를 사용해 인증로직의 테스트 코드를 만들어 놓는 것이 좋습니다.

---

## 6. 결과

- **API 호출 횟수 및 지연 시간 감소**
  미들웨어를 사용하여 700ms 정도의 속도를 요구하는 API 호출 횟수를 줄임으로써, 사용자 경험이 개선됩니다.

- **향상된 보안 및 UX**
  인증 정보를 미리 판단하여, 불필요한 페이지 렌더링이나 화면 깜빡임 없이 안정적인 사용자 경험을 제공할 수 있습니다.

---

## 결론

Next.js의 Middleware를 적절히 활용하면, 인증 및 역할 기반 라우팅을 포함한 다양한 요구사항을 효과적으로 해결할 수 있습니다.  
캐싱 전략, 보안 강화, 역할 기반 접근 제어, 사용자 경험 개선, 그리고 충분한 테스트 및 모니터링을 함께 고려하여 시스템을 설계하면, 더욱 견고하고 효율적인 애플리케이션을 구현할 수 있습니다.
