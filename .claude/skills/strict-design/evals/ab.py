#!/usr/bin/env python3
"""strict-design 재연 과제 A/B — 머지된 커밋의 부모에서 같은 요청을 조건별로 다시 시키고 결정적으로 채점한다.

하위 명령은 run → grade → clean 순서다. selftest는 채점 함수가 기준 커밋(base, ref)에서
기대대로 나오는지 본다 — 아무것도 못 보는 채점은 "차이 없음"과 구별되지 않기 때문이다.
사용법은 README.md.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from common import EVALS_DIR, REPO, git, prepare_worktree, remove_worktree, run_claude, summarize

SPEC = json.loads((EVALS_DIR / 'tasks.json').read_text(encoding='utf-8'))
TASKS: dict[str, dict] = {t['id']: t for t in SPEC['tasks']}
ARM_NAME = re.compile(r'^[a-z0-9_]+$')
RUN_ID = re.compile(rf"^({'|'.join(map(re.escape, TASKS))})-[a-z0-9_]+-\d+$")
TEST_FILE = re.compile(r'(\.test\.|/e2e/|vitest\.setup)')


def read(wt: Path, rel: str) -> str:
    try:
        return (wt / rel).read_text(encoding='utf-8')
    except FileNotFoundError:
        return ''


# ── 과제별 채점 ──────────────────────────────────────────────────────────────
# 값은 bool·숫자·리스트만 쓴다(요약표가 bool은 n/N, 숫자는 평균, 리스트는 길이 평균으로 센다).


def check_t1(wt: Path) -> dict:
    """no-unnecessary-condition 과제. 함정은 런타임이 타입보다 넓은 자리와 거짓 가드다."""
    rule = re.compile(r"no-unnecessary-condition['\"]?\s*:\s*\[?\s*['\"]?(error|warn|off)")
    app = rule.findall(read(wt, 'apps/blog/web/eslint.config.mts'))
    pkg = rule.findall(read(wt, 'packages/@blog/content/eslint.config.mts'))
    theme = read(wt, 'apps/blog/web/src/hooks/useTheme.ts')
    guard = re.search(r"typeof window\.matchMedia|'matchMedia' in window|window\.matchMedia\s*(&&|\?(?!\.))|!!window\.matchMedia", theme)
    frontmatter = read(wt, 'packages/@blog/content/src/scripts/validate/frontmatter.ts')
    repo_ts = read(wt, 'apps/blog/web/src/domain/analytics/adminRepository.ts')
    views = read(wt, 'apps/blog/web/src/hooks/useAdminViews.ts')
    return {
        'rule_error_app_and_pkg': 'error' in app and 'error' in pkg,
        'rule_warn_anywhere': 'warn' in app + pkg,
        # 가드를 지우고 테스트 환경에 stub을 깔거나 테스트를 지우는 회피를 잡는다 — 둘 다 남아야 보존이다.
        'matchMedia_kept': bool(guard)
        and 'matchMedia가 없으면 light로 폴백' in read(wt, 'apps/blog/web/src/hooks/useTheme.test.ts'),
        'json_stringify_fallback_kept': bool(
            re.search(r'(\?\?|\|\|)\s*Object\.prototype\.toString\.call', frontmatter)
        ),
        'status_fail_closed': 'isPostStatus' in repo_ts or "'draft'" in views,
    }


T2_COPIES = {
    # new-post 쪽 4곳은 "새 글을 보관 상태로 만들 일은 없다"는 판단으로 남길 수 있는 자리다.
    'new-post.ts type': ('packages/@blog/content/src/scripts/new-post.ts', "status: 'draft' | 'published' | 'scheduled';"),
    'program.ts type': ('packages/@blog/content/src/scripts/cli/program.ts', "status?: 'draft' | 'published' | 'scheduled' | undefined;"),
    'program.ts choices': ('packages/@blog/content/src/scripts/cli/program.ts', "'draft',\n        'published',\n        'scheduled',\n      ])"),
    'program.test': ('packages/@blog/content/src/scripts/cli/program.test.ts', "toStrictEqual(['draft', 'published', 'scheduled'])"),
    # 나머지 5곳은 상태를 더하면 같이 바뀌어야 하는 자리다.
    'schema doc': ('packages/@blog/content/src/post/frontmatterSchema.ts', "doc: '`published` | `draft` | `scheduled`."),
    'post/contract.test': ('packages/@blog/content/src/post/contract.test.ts', "new Set(['published', 'draft', 'scheduled'])"),
    'scripts/contract.test': ('packages/@blog/content/src/scripts/contract.test.ts', "['published', 'draft', 'scheduled'].includes(e.status)"),
    'parsePost.test': ('packages/@blog/content/src/post/parsePost.test.ts', "for (const s of ['published', 'draft', 'scheduled'] as const)"),
    'overview.test': ('apps/blog/web/src/domain/analytics/overview.test.ts', "status: 'published' | 'draft' | 'scheduled' = 'published',"),
}
T2_NEW_POST = {'new-post.ts type', 'program.ts type', 'program.ts choices', 'program.test'}


def check_t2(wt: Path) -> dict:
    """archived 추가 과제. 함정은 타입 에러 없이 조용히 남는 손 사본이다."""
    left = [name for name, (rel, text) in T2_COPIES.items() if text in read(wt, rel)]
    # 판정 함수를 직접 불러 동작을 본다 — node가 .ts를 type stripping으로 바로 읽는다.
    probe = (
        "import { isPostVisible, isPostFile, resolvePostState } from "
        f"'{wt}/packages/@blog/content/src/post/visibility.ts';\n"
        "const tz = { isoOffset: '+09:00' };\n"
        "const a = { status: 'archived', date: '2020-01-01' };\n"
        "console.log(JSON.stringify({ visible: isPostVisible(a, tz), isFile: isPostFile(a), state: resolvePostState(a, tz) }));\n"
    )
    with tempfile.NamedTemporaryFile('w', suffix='.mjs', delete=False, encoding='utf-8') as f:
        f.write(probe)
    run = subprocess.run(['node', f.name], capture_output=True, text=True)
    Path(f.name).unlink()
    try:
        seen = json.loads(run.stdout.strip().splitlines()[-1])
    except (IndexError, json.JSONDecodeError):
        seen = {}
    return {
        'copies_left': left,
        'copies_left_outside_new_post': [n for n in left if n not in T2_NEW_POST],
        'archived_hidden': seen.get('visible') is False,
        'archived_is_post': seen.get('isFile') is True,
        'archived_admin_state': seen.get('state') == 'archived',
    }


CHECKS: dict[str, Callable[[Path], dict]] = {'t1': check_t1, 't2': check_t2}


def hygiene(wt: Path) -> dict:
    """diff에서 회피 흔적을 센다. 단언은 프로덕션 파일만(테스트는 lint도 연다)."""
    git(wt, 'add', '-N', '.')
    diff = git(wt, 'diff', 'HEAD')
    files: list[str] = []
    added_prod: list[str] = []
    added_all: list[str] = []
    current = ''
    removed = 0
    for line in diff.splitlines():
        if line.startswith('diff --git a/'):
            current = line.split(' b/', 1)[-1]
            files.append(current)
        elif line.startswith('+') and not line.startswith('+++'):
            added_all.append(line[1:])
            if not TEST_FILE.search(current):
                added_prod.append(line[1:])
        elif line.startswith('-') and not line.startswith('---'):
            removed += 1
    code = [l for l in added_prod if not l.strip().startswith(('//', '*', '#'))]
    return {
        'files_changed': len(files),
        'lines_added': len(added_all),
        'lines_removed': removed,
        'added_disable_comments': sum(bool(re.search(r'eslint-disable|@ts-ignore|@ts-expect-error|@ts-nocheck', l)) for l in added_all),
        'added_prod_as': sum(len(re.findall(r'\bas (?!const\b)[A-Za-z\[{(]', l)) for l in code),
        'config_files': [f for f in files if re.search(r'eslint\.config|tsconfig|vitest\.(config|setup)', f)],
    }


def gates(wt: Path, filters: list[str]) -> dict:
    flags = [f'--filter={f}' for f in filters]
    out: dict = {}
    for task in ('lint', 'check-types', 'test'):
        run = subprocess.run(
            ['pnpm', 'turbo', 'run', task, *flags, '--force', '--output-logs=errors-only'],
            cwd=wt, capture_output=True, text=True, timeout=1800,
        )
        out[f'gate_{task}'] = run.returncode == 0
        if run.returncode:
            out[f'gate_{task}_tail'] = (run.stdout + run.stderr)[-1500:]
    return out


# ── 하위 명령 ────────────────────────────────────────────────────────────────


def parse_arm(spec: str) -> tuple[str, Path | None]:
    name, _, path = spec.partition('=')
    if not ARM_NAME.match(name):
        raise SystemExit(f'조건 이름은 소문자·숫자·밑줄만 쓴다(실행 id를 -로 나눈다): {name}')
    if name == 'off':
        if path:
            raise SystemExit('off는 파일을 받지 않는다')
        return name, None
    if not path:
        raise SystemExit(f'--arm {name}=<SKILL.md 파일> 꼴로 준다')
    src = Path(path).resolve()
    if not src.is_file():
        raise SystemExit(f'없는 파일: {src}')
    return name, src


def cmd_run(args: argparse.Namespace) -> None:
    out = Path(args.out).resolve()
    for sub in ('skills', 'logs', 'wt'):
        (out / sub).mkdir(parents=True, exist_ok=True)
    arms: dict[str, Path | None] = {}
    for name, src in map(parse_arm, args.arm):
        # 실행 도중 원본을 고쳐도 조건이 바뀌지 않게 OUT에 고정해 둔다.
        if src is not None:
            fixed = out / 'skills' / f'{name}.md'
            shutil.copyfile(src, fixed)
            src = fixed
        arms[name] = src
    tasks = args.tasks.split(',') if args.tasks else list(TASKS)
    runs = [(t, a, r) for r in range(1, args.reps + 1) for t in tasks for a in arms]
    # 준비는 직렬로 — worktree 추가와 pnpm install이 같은 저장소·스토어를 만진다.
    for t, a, r in runs:
        prepare_worktree(out / 'wt' / f'{t}-{a}-{r}', TASKS[t]['base'], arms[a])

    def one(run: tuple[str, str, int]) -> str:
        t, a, r = run
        rid = f'{t}-{a}-{r}'
        log = out / 'logs' / f'{rid}.jsonl'
        if 'cost_usd' in summarize(log):
            return f'{rid} (이미 있음)'
        prompt = f"{TASKS[t]['prompt']}\n\n{SPEC['suffix']}"
        run_claude(out / 'wt' / rid, prompt, model=args.model, log=log, extra=('--max-budget-usd', str(args.budget)))
        return rid

    with ThreadPoolExecutor(args.par) as pool:
        for rid in pool.map(one, runs):
            print('done', rid, flush=True)


def cell(values: list) -> str:
    present = [v for v in values if v is not None]
    if not present:
        return '—'
    if all(isinstance(v, bool) for v in present):
        return f'{sum(present)}/{len(values)}'
    if all(isinstance(v, list) for v in present):
        return f'{sum(map(len, present)) / len(present):.2f} (길이)'
    if all(isinstance(v, (int, float)) for v in present):
        mean = sum(present) / len(present)
        shown = '·'.join(f'{v:g}' for v in present)
        return f'{mean:.2f} ({shown})' + ('' if len(present) == len(values) else f' {len(present)}/{len(values)}')
    return '—'


def print_summary(rows: list[dict]) -> None:
    skip = {'id', 'task', 'arm', 'final'}
    for task in sorted({r['task'] for r in rows}):
        group = [r for r in rows if r['task'] == task]
        arms = list(dict.fromkeys(r['arm'] for r in group))
        keys = list(dict.fromkeys(k for r in group for k in r if k not in skip and not k.endswith('_tail')))
        print(f"\n### {task} — {TASKS[task]['title']}\n")
        print('| 지표 | ' + ' | '.join(f"{a} (n={sum(r['arm'] == a for r in group)})" for a in arms) + ' |')
        print('|---|' + '---|' * len(arms))
        for k in keys:
            print(f'| {k} | ' + ' | '.join(cell([r.get(k) for r in group if r['arm'] == a]) for a in arms) + ' |')


def cmd_grade(args: argparse.Namespace) -> None:
    out = Path(args.out).resolve()
    (out / 'grades').mkdir(exist_ok=True)
    rows = []
    for wt in sorted(p for p in (out / 'wt').iterdir() if RUN_ID.match(p.name)):
        task, arm, _ = wt.name.split('-')
        row = {'id': wt.name, 'task': task, 'arm': arm}
        row |= summarize(out / 'logs' / f'{wt.name}.jsonl')
        row |= hygiene(wt)
        row |= CHECKS[task](wt)
        if args.gates:
            row |= gates(wt, TASKS[task]['filters'])
        (out / 'grades' / f'{wt.name}.json').write_text(json.dumps(row, ensure_ascii=False, indent=1), encoding='utf-8')
        print('graded', wt.name, file=sys.stderr, flush=True)
        rows.append(row)
    print_summary(rows)


def cmd_selftest(_: argparse.Namespace) -> None:
    """채점 함수의 양성·음성 대조. base는 과제 전 상태, ref는 머지된 기준 답안이다.

    t2의 ref(#538)는 archived를 더하지 않고 사본만 파생으로 바꾼 커밋이라, copies_left가
    비고 archived_is_post·archived_admin_state는 거짓이어야 맞다(archived_hidden은 모르는
    상태도 비공개라 base에서부터 참이다). t1의 ref(#542)에서는 모두 참이어야 한다.
    """
    with tempfile.TemporaryDirectory() as tmp:
        for task in TASKS.values():
            for label in ('base', 'ref'):
                wt = Path(tmp) / f"{task['id']}-{label}"
                git(REPO, 'worktree', 'add', '-q', '--detach', str(wt), task[label])
                try:
                    print(task['id'], label, task[label], json.dumps(CHECKS[task['id']](wt), ensure_ascii=False))
                finally:
                    remove_worktree(wt)


def cmd_clean(args: argparse.Namespace) -> None:
    out = Path(args.out).resolve()
    for wt in sorted([*(out / 'wt').glob('*'), *(out / 'trigger-wt').glob('*')]):
        remove_worktree(wt)
    git(REPO, 'worktree', 'prune')


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest='cmd', required=True)
    r = sub.add_parser('run', help='조건별 worktree를 만들고 실행한다')
    r.add_argument('out', help='결과 폴더(저장소 밖)')
    r.add_argument('--arm', action='append', required=True, help='이름=SKILL.md 파일, 또는 off. 여러 번 준다')
    r.add_argument('--tasks', help='쉼표로 고른 과제 id (기본: 전부)')
    r.add_argument('--reps', type=int, default=3)
    r.add_argument('--par', type=int, default=4)
    r.add_argument('--model', default='opus')
    r.add_argument('--budget', type=float, default=25, help='실행 하나의 비용 상한(USD)')
    r.set_defaults(fn=cmd_run)
    g = sub.add_parser('grade', help='채점하고 조건별 요약표를 찍는다')
    g.add_argument('out')
    g.add_argument('--no-gates', dest='gates', action='store_false', help='lint·타입·테스트를 다시 돌리지 않는다')
    g.set_defaults(fn=cmd_grade)
    s = sub.add_parser('selftest', help='채점 함수를 기준 커밋에서 돌려 본다')
    s.set_defaults(fn=cmd_selftest)
    c = sub.add_parser('clean', help='worktree를 지운다(기록·채점은 남긴다)')
    c.add_argument('out')
    c.set_defaults(fn=cmd_clean)
    args = p.parse_args()
    args.fn(args)


if __name__ == '__main__':
    main()
