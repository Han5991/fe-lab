#!/usr/bin/env node
/**
 * strict-design 트리거 정확도 — 스킬 이름을 말하지 않은 프롬프트에서 스킬이 열리는지 잰다.
 *
 * HEAD에 worktree를 --par개 만들고(스킬은 --skill 파일, 기본은 작업 트리의 SKILL.md),
 * triggers.json의 프롬프트마다 --reps번 돌린다. 스킬이 열리거나, 첫 편집이 나오거나,
 * 도구 호출이 30번에 닿으면 끊는다 — 판정에 필요한 것은 "편집 전에 열었는가" 하나다.
 * 사용법은 README.md.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  EVALS_DIR,
  REPO,
  SKILL_DIR_REL,
  git,
  isEditCall,
  isSkillCall,
  prepareWorktree,
  removeWorktree,
  runClaude,
  summarize,
} from './common.mjs';

const PROMPTS = JSON.parse(
  readFileSync(join(EVALS_DIR, 'triggers.json'), 'utf8'),
);
const MAX_CALLS = 30;

const shouldStop = calls =>
  calls.some(c => isSkillCall(c) || isEditCall(c)) || calls.length >= MAX_CALLS;

function outcome(s) {
  if (s.skill_at !== null) return 'skill';
  if (s.first_edit_at !== null) return 'edit-first';
  return s.tool_calls >= MAX_CALLS ? 'cap' : 'ended';
}

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    skill: { type: 'string', default: join(REPO, SKILL_DIR_REL, 'SKILL.md') },
    reps: { type: 'string', default: '2' },
    par: { type: 'string', default: '3' },
    model: { type: 'string', default: 'opus' },
    ids: { type: 'string' },
  },
});
if (!positionals[0]) {
  console.error(
    '사용법: node trigger.mjs <OUT> [--skill SKILL.md] [--reps 2] [--par 3] [--model opus] [--ids S1,N1]',
  );
  process.exit(2);
}

const out = resolve(positionals[0]);
mkdirSync(join(out, 'trigger-logs'), { recursive: true });
const skill = join(out, 'trigger-skill.md');
copyFileSync(resolve(opts.skill), skill);
const head = git(REPO, 'rev-parse', 'HEAD').trim();
// ab.mjs의 worktree(OUT/wt)와 섞이지 않게 따로 둔다 — 같은 OUT을 써도 된다.
const workers = Array.from({ length: Number(opts.par) }, (_, i) =>
  join(out, 'trigger-wt', `trig-${i + 1}`),
);
for (const wt of workers) prepareWorktree(wt, head, skill);

const wanted = opts.ids ? new Set(opts.ids.split(',')) : null;
const jobs = [];
for (let rep = 1; rep <= Number(opts.reps); rep += 1) {
  for (const prompt of PROMPTS) {
    if (!wanted || wanted.has(prompt.id)) jobs.push([prompt, rep]);
  }
}
const results = [];
let next = 0;

async function work(wt) {
  while (next < jobs.length) {
    const [prompt, rep] = jobs[next];
    next += 1;
    const log = join(out, 'trigger-logs', `${prompt.id}-${rep}.jsonl`);
    await runClaude(wt, prompt.q, {
      model: opts.model,
      log,
      extra: ['--max-turns', '25'],
      stop: shouldStop,
    });
    // 편집이 나왔을 수 있다 — 조건 커밋(wip)으로 되돌려 다음 프롬프트가 깨끗한 트리에서 시작하게 한다.
    git(wt, 'reset', '-q', '--hard');
    git(wt, 'clean', '-fdq');
    const s = summarize(log);
    const row = {
      id: prompt.id,
      rep,
      expect: prompt.expect,
      triggered: s.skill_at !== null,
      outcome: outcome(s),
      skill_at: s.skill_at,
      other_skills: s.other_skills,
    };
    results.push(row);
    console.log(JSON.stringify(row));
  }
}

try {
  await Promise.all(workers.map(work));
} finally {
  for (const wt of workers) removeWorktree(wt);
}

writeFileSync(join(out, 'trigger.json'), JSON.stringify(results, null, 1));
const count = (expect, triggered) =>
  results.filter(r => r.expect === expect && r.triggered === triggered).length;
const total = expect => results.filter(r => r.expect === expect).length;
console.log(
  `\n열어야 함: ${count(true, true)}/${total(true)} · 열면 안 됨(오탐): ${count(false, true)}/${total(false)} · 경계: ${count(null, true)}/${total(null)}`,
);
const misses = [
  ...new Set(
    results
      .filter(
        r =>
          (r.expect === true && !r.triggered) ||
          (r.expect === false && r.triggered),
      )
      .map(r => r.id),
  ),
].sort();
if (misses.length > 0) console.log(`어긋난 프롬프트: ${misses.join(', ')}`);
const firsts = results
  .map(r => r.skill_at)
  .filter(n => n !== null)
  .sort((a, b) => a - b);
if (firsts.length > 0) {
  console.log(`열린 위치(몇 번째 도구 호출): ${firsts.join(', ')}`);
}
