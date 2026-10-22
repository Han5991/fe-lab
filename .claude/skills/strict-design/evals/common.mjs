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
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join } from 'node:path';
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
  // 평가 세트는 기대 결과를 담고 있어 에이전트가 읽으면 오염된다 — 어느 조건에서든 내용을
  // 비운다. 파일은 지우지 않는다: docPaths.test.ts가 evals/README.md를 검사 대상 문서로 열어,
  // 지우면 #546 이후 base에서 test가 시작부터 2건 빨갛다(채점 게이트도, 에이전트가 돌린 test도).
  for (const rel of git(path, 'ls-files', '--', `${SKILL_DIR_REL}/evals`)
    .split('\n')
    .filter(Boolean)) {
    writeFileSync(join(path, rel), extname(rel) === '.json' ? '{}\n' : '');
  }
  if (skillFile) {
    mkdirSync(skillDir, { recursive: true });
    copyFileSync(skillFile, join(skillDir, 'SKILL.md'));
  } else {
    // 평가 세트가 있는 base에서는 비운 평가 세트만 남긴다 — SKILL.md가 없는 폴더는 스킬로
    // 잡히지 않는다. 없는 base(#546 전)에서는 폴더째 지운다.
    if (existsSync(join(skillDir, 'evals'))) {
      for (const name of readdirSync(skillDir)) {
        if (name !== 'evals') {
          rmSync(join(skillDir, name), { recursive: true, force: true });
        }
      }
    } else {
      rmSync(skillDir, { recursive: true, force: true });
    }
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
  install(path);
}

/** worktree에 의존성을 깐다. 스토어에 있으면 오프라인으로 끝난다. */
export function install(path) {
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
 *
 * tmpDir을 주면 그 폴더를 TMPDIR로 둔다 — 병렬 실행끼리 임시 파일이 겹치지 않게. os.tmpdir()·
 * $TMPDIR을 읽는 도구(node·vitest·셸)는 여기로 간다. `/tmp/probe.bak`처럼 경로를 직접 적는
 * 명령은 막지 못한다(macOS에는 프로세스별 /tmp가 없다) — ab.mjs 채점이 겹친 경로를 드러낸다.
 */
export async function runClaude(
  cwd,
  prompt,
  { model, log, extra = [], stop, timeoutMs = 3_600_000, tmpDir },
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
    // 바깥으로 나가는 길을 닫는다 — 개인 머신에서 돌 때 MCP 커넥터(메일·메신저)와
    // push·gh가 권한 확인 없이 열려 있게 된다. 사용자 설정(훅·플러그인)도 싣지 않는다.
    // 모든 조건에 똑같이 걸린다. --disallowedTools는 가변 인자라 다음 옵션 앞에서
    // 끝난다 — extra는 옵션(--…)으로 시작해야 한다.
    '--setting-sources',
    'project,local',
    '--strict-mcp-config',
    '--disallowedTools',
    'Bash(git push:*)',
    'Bash(gh:*)',
    ...extra,
  ];
  // auto-memory를 끈다 — worktree는 원래 저장소의 메모리를 같이 읽는다. 개인 머신에서
  // 돌리면 사용자가 남긴 판단(예: 과제의 정답이 된 규칙)이 두 조건에 다 실려 차이를 지운다.
  //
  // push와 gh는 여기서 끊는다. 위 권한 규칙은 명령이 `git push`·`gh`로 시작할 때만 걸려
  // `git -C . push`가 지나간다. 빈 접두어 pushInsteadOf는 모든 push URL(원격·절대·상대 경로)을
  // 없는 프로토콜로 바꾼다 — 저장소 설정을 건드리지 않게 환경 변수로 얹는다(fetch는 그대로).
  // gh는 저장된 로그인보다 GH_TOKEN을 먼저 써서, 무효 토큰이면 API 호출이 401로 끝난다.
  const env = {
    ...process.env,
    CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1',
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'url.no-push://blocked/.pushInsteadOf',
    GIT_CONFIG_VALUE_0: '',
    GH_TOKEN: 'invalid',
  };
  if (tmpDir) {
    mkdirSync(tmpDir, { recursive: true });
    env.TMPDIR = tmpDir;
  }
  const child = spawn('claude', args, {
    cwd,
    env,
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

function readEvents(log) {
  const text = existsSync(log) ? readFileSync(log, 'utf8') : '';
  return text.split('\n').flatMap(line => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
}

/** 대화 기록의 도구 호출 블록(name·input). */
export function toolCalls(log) {
  return readEvents(log).flatMap(toolUses);
}

/**
 * 대화 기록에서 도구 호출과 비용을 뽑는다.
 *
 * 백그라운드 작업이 끝나 세션이 이어지면 result 메시지가 여럿 나온다. total_cost_usd는
 * 세션 누적값이라 최댓값을, usage·num_turns·duration_ms는 구간 값이라 합계를 쓴다.
 */
export function summarize(log) {
  const events = readEvents(log);
  const calls = events.flatMap(toolUses);
  const results = events.filter(e => e.type === 'result');
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
