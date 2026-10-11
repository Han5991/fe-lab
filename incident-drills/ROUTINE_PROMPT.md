# 루틴 프롬프트

claude.ai/code/routines의 루틴 설정에 아래 내용을 붙여 넣는다. 이 파일은 기록용이다.

```text
이번 주 장애 대응 훈련 세션을 준비해. 훈련 자료는 전부 incident-drills/ 폴더에 있고, 면접관 규칙은 incident-drills/CLAUDE.md다. 루트 CLAUDE.md는 블로그 개발 규칙이라 이 훈련과 관계없다.

1. incident-drills/log.md에서 마지막으로 기록된 주차를 확인하고, incident-drills/curriculum.md에서 다음 주차의 시나리오를 가져와.
2. incident-drills/CLAUDE.md의 면접관 규칙에 따라 가상 회사와 장애 상황을 만들고, 1단계 첫 질문 하나만 제시한 뒤 멈춰. 힌트나 정답은 주지 마.
3. Slack으로 나에게 "N주차 장애 대응 훈련이 준비됐어요"라는 DM을 보내.

내가 이 세션에서 답을 이어 가면 면접을 계속 진행해. 끝나면 피드백을 주고, incident-drills/log.md에 이번 주 행을 채워서 claude/ 브랜치에 커밋하고 푸시한 뒤 main으로 가는 PR을 열어. main에 직접 푸시하지 마.
```

## 루틴 설정

- 레포: 이 레포만 선택
- 환경: Default
- 커넥터: Slack만 남기고 나머지는 제거
- 트리거: Weekly, 정각을 피해서 (예: 월요일 9:07)
