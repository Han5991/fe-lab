# @blog/analytics

블로그의 **조회수·대시보드 도메인** — 순수 계산 · 계약 · 저장소.
`apps/blog/web`에서 떼어 냈다 — platform 레이어(Supabase 어댑터)와 analytics·auth
도메인의 계산·저장소가 원래 자리다.

옮길 수 있었던 이유는 원래 프레임워크 중립이었기 때문이다 — 그 2,560줄에
`react`·`next/`를 import하는 줄이 0개였다. 앱에 묶여 있던 것은 딱 하나,
URL과 키를 `process.env.NEXT_PUBLIC_*`에서 읽어 **Supabase 클라이언트를 만드는
일**이고 그건 앱이 아는 것이다.

## 문 둘

| 문                      | 내용                                                                     |
| :---------------------- | :----------------------------------------------------------------------- |
| `@blog/analytics`       | 계산 · 계약 · 저장소 팩토리 · `AdminApiClient` · `AuthRepository` · 타입 |
| `@blog/analytics/types` | 도메인 모델·DB 행 타입만. 소비자가 `export *`로 받아 이름 나열을 피한다  |

둘째 문이 있는 이유는 큰 배럴에 admin 저장소·세션 클래스가 함께 있어서다.
타입만 흘려보내고 싶은 자리(앱의 공개 배럴)가 `export *`를 쓸 수 있어야,
패키지에 타입이 늘 때 소비자 쪽에 조용히 도착하지 않는 일이 없다.

## 클라이언트를 만들지 않는다

저장소는 전부 **주입받는다.**

```ts
createPublicAnalytics(db); // PostgrestClient<Database>
createAdminAnalytics(new AdminApiClient(client)); // 세션이 붙은 supabase-js
new AuthRepository(client.auth);
```

그래서 이 패키지에는 **모듈 최상위 `new`도 호출도 없다.** 그게 계약이다 —
번들러는 모듈 최상위 부수효과를 부수효과로 보고 그래프에서 떨궈내지 못하는데,
소비 앱에서 admin 코드가 공개 페이지 청크로 새는 사고가 실제로 그 형태였다
(`adminRepository.ts` 주석). 인스턴스를 만드는 것은 소비자의 일이고, 소비자는
그 자리를 공개 그래프와 갈라 둬야 한다.

## 런타임 의존

`@supabase/*`는 **타입으로만** 쓴다(`import type`) — 주입받은 객체를 부를 뿐
아무것도 만들지 않기 때문이다. 값으로 여는 것은 `@blog/content/dates`(KST 날짜
계산) 하나이고, 배럴이 아니라 **순수 leaf 문**이다. 배럴은 `node:fs`를 함께
열어서, 이 패키지가 클라이언트 그래프에 실리는 순간 브라우저용 빈 스텁으로
externalize된다.

## Edge Function이 세 파일을 직접 읽는다

`apps/blog/web/supabase/functions/admin-analytics/index.ts`(Deno)가
`adminActions.ts` · `paging.ts` · `database.types.ts`를 **상대 경로**로 import한다.
그래서 이 셋은 **import가 하나도 없어야 한다** — Deno는 확장자 없는 상대 import를
해석하지 못하고, 번들러가 import 그래프를 따라 집어 가기 때문이다.
`adminActions.test.ts`가 소스 텍스트로 그걸 잠근다.

`database.types.ts`는 `supabase gen types --local` 산출물이다. 재생성은 앱에서
`pnpm gen:types`로 하고, 목적지가 이 폴더다.

## 파일

| 파일                                           | 무엇                                                                |
| :--------------------------------------------- | :------------------------------------------------------------------ |
| `types.ts`                                     | 도메인 모델 + `database.types.ts`에서 파생한 DB 행 타입             |
| `delta.ts` · `overview.ts` · `derivedStats.ts` | 순수 계산 — 증감률 · 대시보드 개요 · 글별 파생 통계                 |
| `service.ts`                                   | 계산 파사드(`AnalyticsCalculator`)                                  |
| `publicRepository.ts`                          | 익명 권한 PostgREST 3건(조회수 읽기·증가)                           |
| `adminRepository.ts`                           | admin RPC 4건(Edge Function 경유) + 산출물 인덱스 fetch·검증        |
| `adminApi.ts` · `adminActions.ts`              | Edge Function 호출 계약. action↔RPC 대응표는 Deno 쪽과 **공유**한다 |
| `authRepository.ts`                            | 세션 읽기·구독·OAuth 시작·로그아웃                                  |
| `paging.ts`                                    | PostgREST 1000행 cap 페이징                                         |

## 스크립트

`pnpm lint` · `pnpm check-types`(프로덕션/테스트 두 프로그램) · `pnpm test` ·
`pnpm test:coverage`. lint 수준은 `apps/blog/web`·`@blog/content`와 같다
(strict + stylistic + recommendedTypeCheckedOnly) — 옮겨 온 코드가 패키지로
나오면서 규율이 한 단 낮아지지 않게.
