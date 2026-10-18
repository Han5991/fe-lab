#!/usr/bin/env node
/**
 * strict-design 재연 과제 A/B — 머지된 커밋의 부모에서 같은 요청을 조건별로 다시 시키고
 * 결정적으로 채점한다.
 *
 * 하위 명령은 run → grade → clean 순서다. selftest는 채점 함수가 기준 커밋(base, ref)에서
 * 기대대로 나오는지 본다 — 아무것도 못 보는 채점은 "차이 없음"과 구별되지 않기 때문이다.
 * 사용법은 README.md.
 */
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import {
  EVALS_DIR,
  REPO,
  git,
  prepareWorktree,
  removeWorktree,
  runClaude,
  summarize,
} from './common.mjs';

const SPEC = JSON.parse(readFileSync(join(EVALS_DIR, 'tasks.json'), 'utf8'));
const TASKS = Object.fromEntries(SPEC.tasks.map(t => [t.id, t]));
const ARM_NAME = /^[a-z0-9_]+$/;
const RUN_ID = new RegExp(
  `^(${Object.keys(TASKS).join('|')})-[a-z0-9_]+-\\d+$`,
);
const TEST_FILE = /(\.test\.|\/e2e\/|vitest\.setup)/;

const read = (wt, rel) => {
  try {
    return readFileSync(join(wt, rel), 'utf8');
  } catch {
    return '';
  }
};

// ── 과제별 채점 ──────────────────────────────────────────────────────────────
// 값은 불리언·숫자·배열만 쓴다(요약표가 불리언은 n/N, 숫자는 평균, 배열은 길이 평균으로 센다).

/** no-unnecessary-condition 과제. 함정은 런타임이 타입보다 넓은 자리와 거짓 가드다. */
function checkT1(wt) {
  const rule =
    /no-unnecessary-condition['"]?\s*:\s*\[?\s*['"]?(error|warn|off)/g;
  const levels = rel => [...read(wt, rel).matchAll(rule)].map(m => m[1]);
  const app = levels('apps/blog/web/eslint.config.mts');
  const pkg = levels('packages/@blog/content/eslint.config.mts');
  const guard =
    /typeof window\.matchMedia|'matchMedia' in window|window\.matchMedia\s*(&&|\?(?!\.))|!!window\.matchMedia/.test(
      read(wt, 'apps/blog/web/src/hooks/useTheme.ts'),
    );
  const views = read(wt, 'apps/blog/web/src/hooks/useAdminViews.ts');
  return {
    rule_error_app_and_pkg: app.includes('error') && pkg.includes('error'),
    rule_warn_anywhere: [...app, ...pkg].includes('warn'),
    // 가드를 지우고 테스트 환경에 stub을 깔거나 테스트를 지우는 회피를 잡는다 — 둘 다 남아야 보존이다.
    matchMedia_kept:
      guard &&
      read(wt, 'apps/blog/web/src/hooks/useTheme.test.ts').includes(
        'matchMedia가 없으면 light로 폴백',
      ),
    json_stringify_fallback_kept:
      /(\?\?|\|\|)\s*Object\.prototype\.toString\.call/.test(
        read(wt, 'packages/@blog/content/src/scripts/validate/frontmatter.ts'),
      ),
    status_fail_closed:
      read(
        wt,
        'apps/blog/web/src/domain/analytics/adminRepository.ts',
      ).includes('isPostStatus') || views.includes("'draft'"),
  };
}

const T2_COPIES = {
  // new-post 쪽 4곳은 "새 글을 보관 상태로 만들 일은 없다"는 판단으로 남길 수 있는 자리다.
  'new-post.ts type': [
    'packages/@blog/content/src/scripts/new-post.ts',
    "status: 'draft' | 'published' | 'scheduled';",
  ],
  'program.ts type': [
    'packages/@blog/content/src/scripts/cli/program.ts',
    "status?: 'draft' | 'published' | 'scheduled' | undefined;",
  ],
  'program.ts choices': [
    'packages/@blog/content/src/scripts/cli/program.ts',
    "'draft',\n        'published',\n        'scheduled',\n      ])",
  ],
  'program.test': [
    'packages/@blog/content/src/scripts/cli/program.test.ts',
    "toStrictEqual(['draft', 'published', 'scheduled'])",
  ],
  // 나머지 5곳은 상태를 더하면 같이 바뀌어야 하는 자리다.
  'schema doc': [
    'packages/@blog/content/src/post/frontmatterSchema.ts',
    "doc: '`published` | `draft` | `scheduled`.",
  ],
  'post/contract.test': [
    'packages/@blog/content/src/post/contract.test.ts',
    "new Set(['published', 'draft', 'scheduled'])",
  ],
  'scripts/contract.test': [
    'packages/@blog/content/src/scripts/contract.test.ts',
    "['published', 'draft', 'scheduled'].includes(e.status)",
  ],
  'parsePost.test': [
    'packages/@blog/content/src/post/parsePost.test.ts',
    "for (const s of ['published', 'draft', 'scheduled'] as const)",
  ],
  'overview.test': [
    'apps/blog/web/src/domain/analytics/overview.test.ts',
    "status: 'published' | 'draft' | 'scheduled' = 'published',",
  ],
};
const T2_NEW_POST = new Set([
  'new-post.ts type',
  'program.ts type',
  'program.ts choices',
  'program.test',
]);

/** archived 추가 과제. 함정은 타입 에러 없이 조용히 남는 손 사본이다. */
function checkT2(wt) {
  const left = Object.entries(T2_COPIES)
    .filter(([, [rel, text]]) => read(wt, rel).includes(text))
    .map(([name]) => name);
  // 판정 함수를 직접 불러 동작을 본다 — node가 .ts를 type stripping으로 바로 읽는다.
  // 에이전트가 고친 코드를 채점 프로세스 안에 올리지 않으려고 따로 띄운다.
  const visibility = pathToFileURL(
    join(wt, 'packages/@blog/content/src/post/visibility.ts'),
  ).href;
  const probe = `
    const { isPostVisible, isPostFile, resolvePostState } = await import(${JSON.stringify(visibility)});
    const tz = { isoOffset: '+09:00' };
    const a = { status: 'archived', date: '2020-01-01' };
    console.log(JSON.stringify({ visible: isPostVisible(a, tz), isFile: isPostFile(a), state: resolvePostState(a, tz) }));
  `;
  const run = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', probe],
    { encoding: 'utf8' },
  );
  let seen = {};
  try {
    seen = JSON.parse(run.stdout.trim().split('\n').at(-1));
  } catch {
    // 판정 함수를 못 불렀다(문법 오류 등) — 동작 항목은 모두 거짓으로 남는다.
  }
  return {
    copies_left: left,
    copies_left_outside_new_post: left.filter(n => !T2_NEW_POST.has(n)),
    archived_hidden: seen.visible === false,
    archived_is_post: seen.isFile === true,
    archived_admin_state: seen.state === 'archived',
  };
}

const CHECKS = { t1: checkT1, t2: checkT2 };

/** diff에서 회피 흔적을 센다. 단언은 프로덕션 파일만(테스트는 lint도 연다). */
function hygiene(wt) {
  git(wt, 'add', '-N', '.');
  const diff = git(wt, 'diff', 'HEAD');
  const files = [];
  const addedAll = [];
  const addedProd = [];
  let current = '';
  let removed = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git a/')) {
      current = line.split(' b/').at(-1);
      files.push(current);
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      addedAll.push(line.slice(1));
      if (!TEST_FILE.test(current)) addedProd.push(line.slice(1));
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      removed += 1;
    }
  }
  const code = addedProd.filter(l => !/^\s*(\/\/|\*|#)/.test(l));
  return {
    files_changed: files.length,
    lines_added: addedAll.length,
    lines_removed: removed,
    added_disable_comments: addedAll.filter(l =>
      /eslint-disable|@ts-ignore|@ts-expect-error|@ts-nocheck/.test(l),
    ).length,
    added_prod_as: code.reduce(
      (n, l) => n + [...l.matchAll(/\bas (?!const\b)[A-Za-z[{(]/g)].length,
      0,
    ),
    config_files: files.filter(f =>
      /eslint\.config|tsconfig|vitest\.(config|setup)/.test(f),
    ),
  };
}

function gates(wt, filters) {
  const flags = filters.map(f => `--filter=${f}`);
  const out = {};
  for (const task of ['lint', 'check-types', 'test']) {
    const run = spawnSync(
      'pnpm',
      ['turbo', 'run', task, ...flags, '--force', '--output-logs=errors-only'],
      {
        cwd: wt,
        encoding: 'utf8',
        timeout: 1_800_000,
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    out[`gate_${task}`] = run.status === 0;
    if (run.status !== 0) {
      out[`gate_${task}_tail`] = `${run.stdout}${run.stderr}`.slice(-1500);
    }
  }
  return out;
}

// ── 하위 명령 ────────────────────────────────────────────────────────────────

function fail(message) {
  console.error(message);
  process.exit(2);
}

function parseArm(spec) {
  const [name, ...rest] = spec.split('=');
  const path = rest.join('=');
  if (!ARM_NAME.test(name)) {
    fail(`조건 이름은 소문자·숫자·밑줄만 쓴다(실행 id를 -로 나눈다): ${name}`);
  }
  if (name === 'off') {
    if (path) fail('off는 파일을 받지 않는다');
    return [name, null];
  }
  if (!path) fail(`--arm ${name}=<SKILL.md 파일> 꼴로 준다`);
  const src = resolve(path);
  if (!existsSync(src) || !statSync(src).isFile()) fail(`없는 파일: ${src}`);
  return [name, src];
}

async function pool(items, size, fn) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await fn(item);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, worker),
  );
}

async function cmdRun(out, opts) {
  for (const sub of ['skills', 'logs', 'wt']) {
    mkdirSync(join(out, sub), { recursive: true });
  }
  if (!opts.arm?.length)
    fail('--arm을 하나 이상 준다(이름=SKILL.md 파일, 또는 off)');
  const arms = {};
  for (const [name, src] of opts.arm.map(parseArm)) {
    // 실행 도중 원본을 고쳐도 조건이 바뀌지 않게 OUT에 고정해 둔다.
    if (src) {
      const fixed = join(out, 'skills', `${name}.md`);
      copyFileSync(src, fixed);
      arms[name] = fixed;
    } else {
      arms[name] = null;
    }
  }
  const tasks = opts.tasks ? opts.tasks.split(',') : Object.keys(TASKS);
  for (const t of tasks) if (!TASKS[t]) fail(`없는 과제: ${t}`);
  const reps = Number(opts.reps);
  const runs = [];
  for (let r = 1; r <= reps; r += 1) {
    for (const t of tasks)
      for (const a of Object.keys(arms)) runs.push([t, a, r]);
  }
  // 준비는 직렬로 — worktree 추가와 pnpm install이 같은 저장소·스토어를 만진다.
  for (const [t, a, r] of runs) {
    prepareWorktree(join(out, 'wt', `${t}-${a}-${r}`), TASKS[t].base, arms[a]);
  }
  await pool(runs, Number(opts.par), async ([t, a, r]) => {
    const id = `${t}-${a}-${r}`;
    const log = join(out, 'logs', `${id}.jsonl`);
    if ('cost_usd' in summarize(log)) {
      console.log('done', id, '(이미 있음)');
      return;
    }
    await runClaude(
      join(out, 'wt', id),
      `${TASKS[t].prompt}\n\n${SPEC.suffix}`,
      {
        model: opts.model,
        log,
        extra: ['--max-budget-usd', String(opts.budget)],
      },
    );
    console.log('done', id);
  });
}

function cell(values) {
  const present = values.filter(v => v !== null && v !== undefined);
  if (present.length === 0) return '—';
  if (present.every(v => typeof v === 'boolean')) {
    return `${present.filter(Boolean).length}/${values.length}`;
  }
  if (present.every(Array.isArray)) {
    const mean = present.reduce((n, v) => n + v.length, 0) / present.length;
    return `${mean.toFixed(2)} (길이)`;
  }
  if (present.every(v => typeof v === 'number')) {
    const mean = present.reduce((n, v) => n + v, 0) / present.length;
    const missing =
      present.length === values.length
        ? ''
        : ` ${present.length}/${values.length}`;
    return `${mean.toFixed(2)} (${present.join('·')})${missing}`;
  }
  return '—';
}

function printSummary(rows) {
  const skip = new Set(['id', 'task', 'arm', 'final']);
  for (const task of [...new Set(rows.map(r => r.task))].sort()) {
    const group = rows.filter(r => r.task === task);
    const arms = [...new Set(group.map(r => r.arm))];
    const keys = [
      ...new Set(
        group.flatMap(r =>
          Object.keys(r).filter(k => !skip.has(k) && !k.endsWith('_tail')),
        ),
      ),
    ];
    console.log(`\n### ${task} — ${TASKS[task].title}\n`);
    const n = a => group.filter(r => r.arm === a).length;
    console.log(`| 지표 | ${arms.map(a => `${a} (n=${n(a)})`).join(' | ')} |`);
    console.log(`|---|${arms.map(() => '---|').join('')}`);
    for (const k of keys) {
      const cells = arms.map(a =>
        cell(group.filter(r => r.arm === a).map(r => r[k])),
      );
      console.log(`| ${k} | ${cells.join(' | ')} |`);
    }
  }
}

function cmdGrade(out, opts) {
  mkdirSync(join(out, 'grades'), { recursive: true });
  const rows = [];
  const ids = readdirSync(join(out, 'wt'))
    .filter(name => RUN_ID.test(name))
    .sort();
  for (const id of ids) {
    const wt = join(out, 'wt', id);
    const [task, arm] = id.split('-');
    const row = {
      id,
      task,
      arm,
      ...summarize(join(out, 'logs', `${id}.jsonl`)),
      ...hygiene(wt),
      ...CHECKS[task](wt),
      ...(opts['no-gates'] ? {} : gates(wt, TASKS[task].filters)),
    };
    writeFileSync(
      join(out, 'grades', `${id}.json`),
      JSON.stringify(row, null, 1),
    );
    console.error('graded', id);
    rows.push(row);
  }
  printSummary(rows);
}

/**
 * 채점 함수의 양성·음성 대조. base는 과제 전 상태, ref는 머지된 기준 답안이다.
 *
 * t2의 ref(#538)는 archived를 더하지 않고 사본만 파생으로 바꾼 커밋이라, copies_left가
 * 비고 archived_is_post·archived_admin_state는 거짓이어야 맞다(archived_hidden은 모르는
 * 상태도 비공개라 base에서부터 참이다). t1의 ref(#542)에서는 모두 참이어야 한다.
 */
function cmdSelftest() {
  const tmp = mkdtempSync(join(tmpdir(), 'strict-design-selftest-'));
  try {
    for (const task of Object.values(TASKS)) {
      for (const label of ['base', 'ref']) {
        const wt = join(tmp, `${task.id}-${label}`);
        git(REPO, 'worktree', 'add', '-q', '--detach', wt, task[label]);
        try {
          console.log(
            task.id,
            label,
            task[label],
            JSON.stringify(CHECKS[task.id](wt)),
          );
        } finally {
          removeWorktree(wt);
        }
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function cmdClean(out) {
  for (const dir of ['wt', 'trigger-wt']) {
    const parent = join(out, dir);
    if (!existsSync(parent)) continue;
    for (const name of readdirSync(parent)) removeWorktree(join(parent, name));
  }
  git(REPO, 'worktree', 'prune');
}

const USAGE = `사용법:
  node ab.mjs run <OUT> --arm 이름=SKILL.md [--arm off] [--tasks t1,t2] [--reps 3] [--par 4] [--model opus] [--budget 25]
  node ab.mjs grade <OUT> [--no-gates]
  node ab.mjs selftest
  node ab.mjs clean <OUT>`;

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    arm: { type: 'string', multiple: true },
    tasks: { type: 'string' },
    reps: { type: 'string', default: '3' },
    par: { type: 'string', default: '4' },
    model: { type: 'string', default: 'opus' },
    budget: { type: 'string', default: '25' },
    'no-gates': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h' },
  },
});
const [cmd, outArg] = positionals;
if (opts.help || !cmd) {
  console.log(USAGE);
  process.exit(cmd ? 0 : 2);
}
const out = outArg ? resolve(outArg) : undefined;
if (cmd !== 'selftest' && !out) fail(USAGE);
switch (cmd) {
  case 'run':
    await cmdRun(out, opts);
    break;
  case 'grade':
    cmdGrade(out, opts);
    break;
  case 'selftest':
    cmdSelftest();
    break;
  case 'clean':
    cmdClean(out);
    break;
  default:
    fail(USAGE);
}
