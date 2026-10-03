#!/usr/bin/env python3
"""Claude Code Action이 실패했을 때 결과 메시지의 오류 본문을 로그에 찍는다.

액션은 기본 상태(`show_full_output: false`)에서 Claude 메시지를 로그에서 가린다 —
도구 결과에 시크릿이 섞일 수 있어서다. 대가로, Claude가 **첫 요청에서** 죽으면
로그에는 `is_error: true · 1턴 · $0 · 2초`만 남고 *왜* 죽었는지는 Step Summary의
"Final Result"에만 있다. 2026-10-03 `CLAUDE_CODE_OAUTH_TOKEN`(1년 토큰)이 만료돼
Claude 워크플로 전부가 그 모양으로 죽었는데, 로그만으로는 모델 폐기·사용량 한도·
토큰 만료 중 어느 것인지 가릴 수 없었다. 디버그 재실행(ACTIONS_STEP_DEBUG)이나
`show_full_output`를 켜는 것은 그 자리에서는 안 된다 — 액션이 워크플로 파일을
기본 브랜치와 바이트 단위로 대조해 다르면 실행 자체를 건너뛴다.

그래서 실패한 뒤에 이 스크립트가 액션의 `execution_file` 출력(SDK 메시지 배열)에서
`type: result` 메시지의 오류 필드(`result`·`errors`)만 꺼내 `::error::` 주석으로
찍는다. 전체 출력은 여전히 켜지 않는다 — 오류 본문은 API가 보낸 한 문장이고
도구 결과가 아니다. 늘 exit 0이다: 잡은 이미 실패했고, 여기서 또 실패시켜 원인을
덮을 이유가 없다.

사용: claude-result-error.py <execution_file>
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

MAX_CHARS = 2000

# 본문에서 원인을 바로 가리키는 힌트. 느슨한 패턴이라 "참고"로만 찍는다.
HINTS: list[tuple[re.Pattern[str], str]] = [
    (
        re.compile(r"oauth|authentication|unauthori[sz]ed|\b401\b|expired|invalid.*(token|credential|api key)", re.I),
        "인증 실패 모양이다. CLAUDE_CODE_OAUTH_TOKEN은 `claude setup-token`이 만드는 1년 토큰 — "
        "재발급해 저장소 secret을 교체하고 AGENTS.md §5의 발급일을 고칠 것.",
    ),
    (
        re.compile(r"rate.?limit|usage limit|too many requests|\b429\b|overloaded|\b529\b", re.I),
        "사용량 한도·과부하 모양이다. 토큰은 유효하며 시간이 지나면 풀린다 — 재실행으로 충분하다.",
    ),
    (
        re.compile(r"not_found|model.*(not found|does not exist|retired)|\b404\b", re.I),
        "모델 ID 모양이다. claude_args의 --model이 폐기된 별칭인지 확인할 것.",
    ),
]


def redact(text: str) -> str:
    """토큰 모양은 가린다(러너도 secret을 마스킹하지만 믿지 않는다)."""
    return re.sub(r"sk-ant-[A-Za-z0-9_-]{8,}", "sk-ant-***", text)


def annotation(level: str, body: str) -> str:
    # 워크플로 명령은 한 줄이다 — 줄바꿈은 %0A로 이스케이프한다.
    return f"::{level}::" + body.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")


def result_messages(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, list):
        return []
    return [m for m in data if isinstance(m, dict) and m.get("type") == "result"]


def error_text(result: dict) -> str:
    parts: list[str] = []
    body = result.get("result")
    if isinstance(body, str) and body.strip():
        parts.append(body.strip())
    errors = result.get("errors")
    if isinstance(errors, list):
        parts.extend(str(e) for e in errors if str(e).strip())
    for key in ("error", "message"):
        value = result.get(key)
        if isinstance(value, str) and value.strip():
            parts.append(value.strip())
    text = "\n".join(dict.fromkeys(parts))  # 중복 제거, 순서 유지
    if len(text) > MAX_CHARS:
        text = text[:MAX_CHARS] + f"… (+{len(text) - MAX_CHARS}자 생략)"
    return redact(text)


def main(argv: list[str]) -> int:
    if len(argv) < 2 or not argv[1]:
        print("execution_file 경로가 없다 — Claude 스텝이 결과 파일을 쓰기 전에 죽었다.")
        return 0
    path = Path(argv[1])
    if not path.is_file():
        print(f"execution_file이 없다: {path}")
        return 0

    try:
        results = result_messages(path)
    except (OSError, ValueError) as exc:
        print(f"execution_file을 읽을 수 없다: {exc}")
        return 0

    if not results:
        print(annotation("warning", "결과 메시지가 없다 — Claude가 result를 내기 전에 끊겼다(타임아웃·SDK 오류)."))
        return 0

    result = results[-1]
    summary = (
        f"subtype={result.get('subtype')} is_error={result.get('is_error')} "
        f"num_turns={result.get('num_turns')} duration_ms={result.get('duration_ms')} "
        f"total_cost_usd={result.get('total_cost_usd')}"
    )
    print(summary)

    text = error_text(result)
    if not text:
        print(annotation("warning", f"결과에 오류 본문이 없다. {summary}"))
        return 0

    print(annotation("error", f"Claude 실행 오류: {text}"))
    for pattern, hint in HINTS:
        if pattern.search(text):
            print(annotation("notice", hint))
            break
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
