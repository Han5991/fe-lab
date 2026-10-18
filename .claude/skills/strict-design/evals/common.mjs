/**
 * strict-design 평가 세트의 공용 부품 — worktree 준비, 헤드리스 claude 실행, 대화 기록 요약.
 *
 * ab.mjs(재연 과제 A/B)와 trigger.mjs(트리거 정확도)가 함께 쓴다. 사용법은 README.md.
 */
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import {
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

export const EVALS_DIR = dirname(fileURLToPath(import.meta.url));
export const SKILL_NAME = 'strict-design';
export const SKILL_DIR_REL = `.claude/skills/${SKILL_NAME}`;

export function git(cwd, ...args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
}

export const REPO = git(EVALS_DIR, 'rev-parse', '--show-toplevel').trim();

// off 조건은 스킬 폴더를 지우고 AGENTS.md에서 스킬을 가리키는 이 문장만 뺀다. 같은 줄의
// 원칙 요약은 남긴다 — 재는 것은 "AGENTS.md 한 줄 위에 본문이 더하는 몫"이다.
// AGENTS.md 문구가 바뀌어 이 문장을 못 찾으면 off 준비가 멈춘다. 그때 여기를 고친다.
const AGENTS_POINTER =
  '**타입·lint·게이트를 만들거나 lint·타입 에러를 고칠 때는 `strict-design` 스킬.** ';

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
// 하위 세션은 파일을 Edit 도구보다 Bash(python heredoc·sed)로 고치는 일이 많다 — 첫 실험의
// 대화 기록 12개 중 Edit을 쓴 것은 1개였다. 그래서 Bash 명령의 쓰기 모양도 편집으로 본다.
// 모양으로 찾는 휴리스틱이라 놓치는 형태가 있을 수 있다.
const BASH_WRITE =
  /sed -i|perl -pi|write_text\(|\.write\(|open\([^)]*['"][wa]|cat\s*>|\btee\b|git apply|apply_patch|>\s*[\w./@-]+\.(?:ts|tsx|mts|cts|js|mjs|json|md|ya?ml|css)\b/;

/**
 * base 커밋에 worktree를 만들고 조건을 커밋으로 고정한다.
 *
 * skillFile이 있으면 그 파일을 SKILL.md로 둔 조건, null이면 off. 조건을 커밋해 두는 이유는
 * 둘이다. 에이전트의 diff(`git diff HEAD`)에 조건 변경이 섞이지 않고, trigger.mjs가 실행
 * 사이에 `git reset --hard`로 되돌려도 조건이 남는다. 커밋 메시지는 중립("wip")으로 둔다 —
 * 에이전트가 git log에서 조건을 읽지 않게.
 */
export function prepareWorktree(path, base, skillFile) {
  if (existsSync(path)) return;
  git(REPO, 'worktree', 'add', '-q', '--detach', path, base);
  const skillDir = join(path, SKILL_DIR_REL);
  // 평가 세트는 기대 결과를 담고 있어 에이전트가 읽으면 오염된다 — 어느 조건에서든 지운다.
  rmSync(join(skillDir, 'evals'), { recursive: true, force: true });
  if (skillFile) {
    mkdirSync(skillDir, { recursive: true });
    copyFileSync(skillFile, join(skillDir, 'SKILL.md'));
  } else {
    rmSync(skillDir, { recursive: true, force: true });
    const agents = join(path, 'AGENTS.md');
    const text = readFileSync(agents, 'utf8');
    if (text.includes(AGENTS_POINTER)) {
      writeFileSync(agents, text.replaceAll(AGENTS_POINTER, ''));
    } else if (text.includes(SKILL_NAME)) {
      throw new Error(
        `${base}의 AGENTS.md가 ${SKILL_NAME}를 가리키는데 AGENTS_POINTER 문장과 다르다 — common.mjs의 AGENTS_POINTER를 고친다`,
      );
    }
  }
  git(path, 'add', '-A');
  git(
    path,
    '-c',
    'user.name=eval',
    '-c',
    'user.email=eval@example.invalid',
    'commit',
    '-qm',
    'wip',
    '--no-verify',
    '--allow-empty',
  );
  const offline = spawnSync(
    'pnpm',
    ['install', '--frozen-lockfile', '--offline'],
    { cwd: path, stdio: 'ignore' },
  );
  if (offline.status !== 0) {
    execFileSync('pnpm', ['install', '--frozen-lockfile'], {
      cwd: path,
      stdio: 'ignore',
    });
  }
}

export function removeWorktree(path) {
  spawnSync('git', ['worktree', 'remove', '--force', path], {
    cwd: REPO,
    stdio: 'ignore',
  });
}

function toolUses(event) {
  if (event.type !== 'assistant') return [];
  return (event.message?.content ?? []).filter(b => b.type === 'tool_use');
}

export function isEditCall(block) {
  if (EDIT_TOOLS.has(block.name)) return true;
  return (
    block.name === 'Bash' && BASH_WRITE.test(String(block.input?.command ?? ''))
  );
}

export function isSkillCall(block) {
  if (block.name !== 'Skill') return false;
  const name = String(block.input?.skill ?? '');
  return name === SKILL_NAME || name.endsWith(`:${SKILL_NAME}`);
}

/**
 * 헤드리스 claude를 새 세션으로 돌려 stream-json 기록을 log에 남긴다.
 *
 * stdin은 반드시 막는다 — 막지 않으면 호출자 쪽 셸 루프의 남은 입력을 claude가 읽어
 * 프롬프트 뒤에 붙인다(첫 트리거 실험이 이걸로 망가졌다). stop이 지금까지의 도구 호출을
 * 보고 참을 돌려주면 그 자리에서 끊는다(트리거 판정용).
 */
export async function runClaude(
  cwd,
  prompt,
  { model, log, extra = [], stop, timeoutMs = 3_600_000 },
) {
  const args = [
    '-p',
    prompt,
    '--output-format',
    'stream-json',
    '--verbose',
    '--model',
    model,
    '--no-session-persistence',
    '--session-id',
    randomUUID(),
    '--permission-mode',
    'bypassPermissions',
    ...extra,
  ];
  const child = spawn('claude', args, {
    cwd,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const out = createWriteStream(log);
  const lines = createInterface({ input: child.stdout });
  const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
  const calls = [];
  lines.on('line', line => {
    out.write(`${line}\n`);
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      return;
    }
    calls.push(...toolUses(event));
    if (stop?.(calls)) child.kill('SIGKILL');
  });
  await Promise.all([once(child, 'close'), once(lines, 'close')]);
  clearTimeout(timer);
  await new Promise(resolve => out.end(resolve));
}

/**
 * 대화 기록에서 도구 호출과 비용을 뽑는다.
 *
 * 백그라운드 작업이 끝나 세션이 이어지면 result 메시지가 여럿 나온다. total_cost_usd는
 * 세션 누적값이라 최댓값을, usage·num_turns·duration_ms는 구간 값이라 합계를 쓴다.
 */
export function summarize(log) {
  const calls = [];
  const results = [];
  const text = existsSync(log) ? readFileSync(log, 'utf8') : '';
  for (const line of text.split('\n')) {
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    calls.push(...toolUses(event));
    if (event.type === 'result') results.push(event);
  }
  const first = pred => {
    const i = calls.findIndex(pred);
    return i === -1 ? null : i + 1;
  };
  const summary = {
    skill_at: first(isSkillCall),
    first_edit_at: first(isEditCall),
    tool_calls: calls.length,
    other_skills: [
      ...new Set(
        calls
          .filter(c => c.name === 'Skill' && !isSkillCall(c))
          .map(c => String(c.input?.skill)),
      ),
    ].sort(),
  };
  if (results.length > 0) {
    const sum = f => results.reduce((n, r) => n + f(r), 0);
    Object.assign(summary, {
      cost_usd: round(Math.max(...results.map(r => r.total_cost_usd)), 2),
      turns: sum(r => r.num_turns),
      minutes: round(sum(r => r.duration_ms) / 60000, 1),
      output_tokens: sum(r => r.usage.output_tokens),
      input_tokens: sum(
        r =>
          r.usage.input_tokens +
          r.usage.cache_creation_input_tokens +
          r.usage.cache_read_input_tokens,
      ),
      final: results.at(-1).result ?? '',
    });
  }
  return summary;
}

export function round(n, digits) {
  return Number(n.toFixed(digits));
}
