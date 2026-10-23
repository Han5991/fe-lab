# 보안 정책

## 취약점 제보

공개 이슈·PR·댓글에 적지 말고 GitHub 비공개 제보로 보내 주세요.

**[Report a vulnerability](https://github.com/Han5991/fe-lab/security/advisories/new)**

재현 절차, 영향 범위(URL·파일·커밋), 가능하면 PoC를 함께 적어 주시면 빨리 확인할 수 있습니다. 개인이 운영하는
저장소라 응답 기한을 약속하지는 못하지만, 받은 제보는 모두 확인하고 같은 비공개 스레드에서 진행 상황을 알려
드립니다.

## 범위

| 대상                                                                              | 우선순위                    |
| :-------------------------------------------------------------------------------- | :-------------------------- |
| 블로그 [blog.sangwook.dev](https://blog.sangwook.dev) — apps/blog, packages/@blog | 높음 — 운영 중인 서비스     |
| 블로그의 Supabase 백엔드(조회수 기록, admin 분석 Edge Function)                   | 높음                        |
| 그 밖의 apps/·packages/ 아래 학습·실험용 앱                                       | 낮음 — 운영 서비스가 아니다 |

지원하는 버전은 `main` 브랜치 하나입니다. 블로그는 `main`에서 배포됩니다.
