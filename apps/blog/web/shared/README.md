# shared — 최하단 레이어

모든 레이어(lib·domain·src)가 import할 수 있는 **유일한** 폴더다. 그래서 여기
뚫린 구멍은 앱 전체가 공유한다 — 이 폴더는 저장소에서 가장 엄격하게 관리한다.

## 입장 기준 — 전부 만족해야 들어온다

1. **순수 계약만** — 리터럴 상수와 순수 함수. IO(fs·fetch·Supabase)·상태·React·훅 금지.
2. **두 레이어 이상이 소비** — 한 레이어만 쓰면 그 레이어에 둔다. shared는 편한
   잡동사니 통(utils)이 아니다.
3. **의존은 `@blog/content`뿐** — 상위 레이어(lib·domain·src)·외부 패키지·node
   코어 전부 금지.
4. **재수출 금지** — `export … from`으로 다른 모듈의 2차 문을 만들지 않는다.
   자기 선언만 내보낸다. 특히 `@blog/content` 재수출은 배럴 좁히기
   (optimizePackageImports)를 우회해 node:fs 클라이언트 누수 경로를 다시 연다.
5. **부수효과 없음** — 모듈 최상위에 문(statement)을 두지 않는다(`'use client'`
   포함). `.tsx`(컴포넌트) 금지 — 공유 컴포넌트는 `src/components/shared/`다.

전부 `eslint.config.mts`(boundaries + shared 전용 블록)가 **lint로 강제**한다 —
컨벤션이 아니다. 새 파일이 이 기준에 안 맞으면, 들어올 곳이 여기가 아니다.

## 지금 있는 것

| 모듈             | 내용                                                                 |
| :--------------- | :------------------------------------------------------------------- |
| `routes.ts`      | 앱 소유 라우트 경로의 단일 출처 — 홈·about·series·privacy·admin 영역 |
| `transitions.ts` | 페이지 전환(ssgoi) 네임스페이스 — 전환 ID·매처 글롭·hero 모핑 키     |

패키지 소유 라우트(`/posts/`·`postPath`·`archivePath`·`RSS_PATH`)는 여기 없다 —
`@blog/content`가 단일 출처고, 사본을 만들면 한쪽만 고쳐지는 날 조용히 갈라진다.
불가피한 사본(`content.values.mts`의 sitemap·번들 규칙용)은 반드시 테스트로
잠근다(`contentValues.test.ts`).
