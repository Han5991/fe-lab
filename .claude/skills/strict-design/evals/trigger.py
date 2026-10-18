#!/usr/bin/env python3
"""strict-design 트리거 정확도 — 스킬 이름을 말하지 않은 프롬프트에서 스킬이 열리는지 잰다.

HEAD에 worktree를 --par개 만들고(스킬은 --skill 파일, 기본은 작업 트리의 SKILL.md),
triggers.json의 프롬프트마다 --reps번 돌린다. 스킬이 열리거나, 첫 편집이 나오거나,
도구 호출이 30번에 닿으면 끊는다 — 판정에 필요한 것은 "편집 전에 열었는가" 하나다.
사용법은 README.md.
"""

from __future__ import annotations

import argparse
import json
import queue
import threading
from pathlib import Path

from common import EVALS_DIR, REPO, SKILL_DIR_REL, git, is_edit_call, is_skill_call, prepare_worktree, remove_worktree, run_claude, summarize

PROMPTS = json.loads((EVALS_DIR / 'triggers.json').read_text(encoding='utf-8'))
MAX_CALLS = 30


def should_stop(calls: list[dict]) -> bool:
    return any(is_skill_call(c) or is_edit_call(c) for c in calls) or len(calls) >= MAX_CALLS


def outcome(s: dict) -> str:
    if s['skill_at'] is not None:
        return 'skill'
    if s['first_edit_at'] is not None:
        return 'edit-first'
    return 'cap' if s['tool_calls'] >= MAX_CALLS else 'ended'


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('out', help='결과 폴더(저장소 밖)')
    p.add_argument('--skill', default=str(REPO / SKILL_DIR_REL / 'SKILL.md'), help='시험할 SKILL.md (기본: 작업 트리의 것)')
    p.add_argument('--reps', type=int, default=2)
    p.add_argument('--par', type=int, default=3)
    p.add_argument('--model', default='opus')
    p.add_argument('--ids', help='쉼표로 고른 프롬프트 id (기본: 전부)')
    args = p.parse_args()

    out = Path(args.out).resolve()
    (out / 'trigger-logs').mkdir(parents=True, exist_ok=True)
    skill = out / 'trigger-skill.md'
    skill.write_bytes(Path(args.skill).read_bytes())
    head = git(REPO, 'rev-parse', 'HEAD').strip()
    # ab.py의 worktree(OUT/wt)와 섞이지 않게 따로 둔다 — 같은 OUT을 써도 된다.
    workers = [out / 'trigger-wt' / f'trig-{i}' for i in range(1, args.par + 1)]
    for wt in workers:
        prepare_worktree(wt, head, skill)

    wanted = set(args.ids.split(',')) if args.ids else None
    jobs: queue.Queue = queue.Queue()
    for rep in range(1, args.reps + 1):
        for prompt in PROMPTS:
            if wanted is None or prompt['id'] in wanted:
                jobs.put((prompt, rep))
    results: list[dict] = []
    lock = threading.Lock()

    def work(wt: Path) -> None:
        while True:
            try:
                prompt, rep = jobs.get_nowait()
            except queue.Empty:
                return
            log = out / 'trigger-logs' / f"{prompt['id']}-{rep}.jsonl"
            run_claude(wt, prompt['q'], model=args.model, log=log, extra=('--max-turns', '25'), stop=should_stop)
            # 편집이 나왔을 수 있다 — 조건 커밋(wip)으로 되돌려 다음 프롬프트가 깨끗한 트리에서 시작하게 한다.
            git(wt, 'reset', '-q', '--hard')
            git(wt, 'clean', '-fdq')
            s = summarize(log)
            row = {'id': prompt['id'], 'rep': rep, 'expect': prompt['expect'], 'triggered': s['skill_at'] is not None,
                   'outcome': outcome(s), 'skill_at': s['skill_at'], 'other_skills': s['other_skills']}
            with lock:
                results.append(row)
                print(json.dumps(row, ensure_ascii=False), flush=True)

    threads = [threading.Thread(target=work, args=(wt,)) for wt in workers]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    for wt in workers:
        remove_worktree(wt)

    (out / 'trigger.json').write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding='utf-8')
    pos = [r for r in results if r['expect'] is True]
    neg = [r for r in results if r['expect'] is False]
    mid = [r for r in results if r['expect'] is None]
    print(f"\n열어야 함: {sum(r['triggered'] for r in pos)}/{len(pos)}"
          f" · 열면 안 됨(오탐): {sum(r['triggered'] for r in neg)}/{len(neg)}"
          f" · 경계: {sum(r['triggered'] for r in mid)}/{len(mid)}")
    misses = sorted({r['id'] for r in pos if not r['triggered']} | {r['id'] for r in neg if r['triggered']})
    if misses:
        print('어긋난 프롬프트:', ', '.join(misses))
    firsts = [r['skill_at'] for r in results if r['skill_at'] is not None]
    if firsts:
        print(f'열린 위치(몇 번째 도구 호출): {sorted(firsts)}')


if __name__ == '__main__':
    main()
