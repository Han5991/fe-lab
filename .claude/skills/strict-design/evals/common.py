"""strict-design 평가 세트의 공용 부품 — worktree 준비, 헤드리스 claude 실행, 대화 기록 요약.

ab.py(재연 과제 A/B)와 trigger.py(트리거 정확도)가 함께 쓴다. 사용법은 README.md.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import threading
import uuid
from collections.abc import Callable
from pathlib import Path

EVALS_DIR = Path(__file__).resolve().parent
SKILL_NAME = 'strict-design'
SKILL_DIR_REL = f'.claude/skills/{SKILL_NAME}'
REPO = Path(
    subprocess.run(
        ['git', 'rev-parse', '--show-toplevel'],
        cwd=EVALS_DIR,
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()
)

# off 조건은 스킬 폴더를 지우고 AGENTS.md에서 스킬을 가리키는 이 문장만 뺀다. 같은 줄의
# 원칙 요약은 남긴다 — 재는 것은 "AGENTS.md 한 줄 위에 본문이 더하는 몫"이다.
# AGENTS.md 문구가 바뀌어 이 문장을 못 찾으면 off 준비가 멈춘다. 그때 여기를 고친다.
AGENTS_POINTER = '**타입·lint·게이트를 만들거나 lint·타입 에러를 고칠 때는 `strict-design` 스킬.** '

EDIT_TOOLS = frozenset({'Edit', 'Write', 'MultiEdit', 'NotebookEdit'})
# 하위 세션은 파일을 Edit 도구보다 Bash(python heredoc·sed)로 고치는 일이 많다 — 첫 실험의
# 대화 기록 12개 중 Edit을 쓴 것은 1개였다. 그래서 Bash 명령의 쓰기 모양도 편집으로 본다.
# 모양으로 찾는 휴리스틱이라 놓치는 형태가 있을 수 있다.
BASH_WRITE = re.compile(
    r'sed -i|perl -pi|write_text\(|\.write\(|open\([^)]*[\'"][wa]|cat\s*>|\btee\b|git apply|apply_patch'
    r'|>\s*[\w./@-]+\.(?:ts|tsx|mts|cts|js|mjs|json|md|ya?ml|css)\b'
)


def git(cwd: Path, *args: str) -> str:
    return subprocess.run(
        ['git', *args], cwd=cwd, capture_output=True, text=True, check=True
    ).stdout


def prepare_worktree(path: Path, base: str, skill_file: Path | None) -> None:
    """base 커밋에 worktree를 만들고 조건을 커밋으로 고정한다.

    skill_file이 있으면 그 파일을 SKILL.md로 둔 조건, None이면 off. 조건을 커밋해 두는
    이유는 둘이다. 에이전트의 diff(`git diff HEAD`)에 조건 변경이 섞이지 않고,
    trigger.py가 실행 사이에 `git reset --hard`로 되돌려도 조건이 남는다. 커밋 메시지는
    중립("wip")으로 둔다 — 에이전트가 git log에서 조건을 읽지 않게.
    """
    if path.exists():
        return
    git(REPO, 'worktree', 'add', '-q', '--detach', str(path), base)
    skill_dir = path / SKILL_DIR_REL
    # 평가 세트는 기대 결과를 담고 있어 에이전트가 읽으면 오염된다 — 어느 조건에서든 지운다.
    shutil.rmtree(skill_dir / 'evals', ignore_errors=True)
    if skill_file is not None:
        skill_dir.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(skill_file, skill_dir / 'SKILL.md')
    else:
        shutil.rmtree(skill_dir, ignore_errors=True)
        agents = path / 'AGENTS.md'
        text = agents.read_text(encoding='utf-8')
        if AGENTS_POINTER in text:
            agents.write_text(text.replace(AGENTS_POINTER, ''), encoding='utf-8')
        elif SKILL_NAME in text:
            raise SystemExit(
                f'{base}의 AGENTS.md가 {SKILL_NAME}를 가리키는데 AGENTS_POINTER 문장과 다르다 '
                '— common.py의 AGENTS_POINTER를 고친다'
            )
    git(path, 'add', '-A')
    git(
        path,
        '-c', 'user.name=eval',
        '-c', 'user.email=eval@example.invalid',
        'commit', '-qm', 'wip', '--no-verify', '--allow-empty',
    )
    offline = subprocess.run(
        ['pnpm', 'install', '--frozen-lockfile', '--offline'],
        cwd=path,
        capture_output=True,
    )
    if offline.returncode != 0:
        subprocess.run(
            ['pnpm', 'install', '--frozen-lockfile'],
            cwd=path,
            capture_output=True,
            check=True,
        )


def remove_worktree(path: Path) -> None:
    subprocess.run(
        ['git', 'worktree', 'remove', '--force', str(path)],
        cwd=REPO,
        capture_output=True,
    )


def tool_uses(event: dict) -> list[dict]:
    if event.get('type') != 'assistant':
        return []
    return [b for b in event['message'].get('content', []) if b.get('type') == 'tool_use']


def is_edit_call(block: dict) -> bool:
    if block['name'] in EDIT_TOOLS:
        return True
    return block['name'] == 'Bash' and bool(BASH_WRITE.search(str(block['input'].get('command', ''))))


def is_skill_call(block: dict) -> bool:
    if block['name'] != 'Skill':
        return False
    name = str(block['input'].get('skill', ''))
    return name == SKILL_NAME or name.endswith(f':{SKILL_NAME}')


def run_claude(
    cwd: Path,
    prompt: str,
    *,
    model: str,
    log: Path,
    extra: tuple[str, ...] = (),
    stop: Callable[[list[dict]], bool] | None = None,
    timeout_s: int = 3600,
) -> None:
    """헤드리스 claude를 새 세션으로 돌려 stream-json 기록을 log에 남긴다.

    stdin은 반드시 막는다 — 막지 않으면 호출자 쪽 `while read` 루프의 남은 입력을
    claude가 읽어 프롬프트 뒤에 붙인다(첫 트리거 실험이 이걸로 망가졌다).
    stop이 지금까지의 도구 호출을 보고 참을 돌려주면 그 자리에서 끊는다(트리거 판정용).
    """
    cmd = [
        'claude', '-p', prompt,
        '--output-format', 'stream-json', '--verbose',
        '--model', model,
        '--no-session-persistence', '--session-id', str(uuid.uuid4()),
        '--permission-mode', 'bypassPermissions',
        *extra,
    ]
    calls: list[dict] = []
    with log.open('w', encoding='utf-8') as out:
        proc = subprocess.Popen(
            cmd,
            cwd=cwd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
        )
        timer = threading.Timer(timeout_s, proc.kill)
        timer.start()
        try:
            assert proc.stdout is not None
            for line in proc.stdout:
                out.write(line)
                try:
                    calls.extend(tool_uses(json.loads(line)))
                except json.JSONDecodeError:
                    continue
                if stop is not None and stop(calls):
                    break
        finally:
            timer.cancel()
            proc.kill()
            proc.wait()


def summarize(log: Path) -> dict:
    """대화 기록에서 도구 호출과 비용을 뽑는다.

    백그라운드 작업이 끝나 세션이 이어지면 result 메시지가 여럿 나온다. total_cost_usd는
    세션 누적값이라 최댓값을, usage·num_turns·duration_ms는 구간 값이라 합계를 쓴다.
    """
    calls: list[dict] = []
    results: list[dict] = []
    if log.exists():
        for line in log.open(encoding='utf-8'):
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            calls.extend(tool_uses(event))
            if event.get('type') == 'result':
                results.append(event)

    def first(pred: Callable[[dict], bool]) -> int | None:
        return next((i + 1 for i, c in enumerate(calls) if pred(c)), None)

    summary: dict = {
        'skill_at': first(is_skill_call),
        'first_edit_at': first(is_edit_call),
        'tool_calls': len(calls),
        'other_skills': sorted(
            {str(c['input'].get('skill')) for c in calls if c['name'] == 'Skill' and not is_skill_call(c)}
        ),
    }
    if results:
        usage = [r['usage'] for r in results]
        summary |= {
            'cost_usd': round(max(r['total_cost_usd'] for r in results), 2),
            'turns': sum(r['num_turns'] for r in results),
            'minutes': round(sum(r['duration_ms'] for r in results) / 60000, 1),
            'output_tokens': sum(u['output_tokens'] for u in usage),
            'input_tokens': sum(
                u['input_tokens'] + u['cache_creation_input_tokens'] + u['cache_read_input_tokens']
                for u in usage
            ),
            'final': results[-1].get('result', ''),
        }
    return summary
