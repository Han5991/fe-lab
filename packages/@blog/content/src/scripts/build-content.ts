import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ContentContext } from './context.ts';

/**
 * 단계를 돌릴 CLI 진입점 — 형제 디렉터리의 `cli/index.ts`를 **절대 경로**로 지목한다.
 *
 * 각 단계는 별도 프로세스로 띄운다(한 단계가 죽어도 나머지 로그가 남고,
 * 네이티브 의존을 쓰는 단계의 메모리가 서로 섞이지 않는다). 부르는 쪽은
 * `blog-content <단계>`와 같은 서브커맨드이고, PATH를 타지 않도록 node로
 * 직접 실행한다 — cwd·PATH 어디에도 기대지 않는다.
 */
const CLI_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'cli',
  'index.ts',
);

export interface Step {
  label: string;
  /** blog-content 서브커맨드 이름 */
  command: string;
  args: string[];
}

export interface Flags {
  skipValidate: boolean;
  force: boolean;
  /** validate-posts를 엄격 모드로 — prebuild에서만 켠다(package.json 참고) */
  strict: boolean;
}

/**
 * 실행 계획. 바깥 배열은 순차 phase, 안쪽 배열은 병렬 실행 단계.
 *
 * - phase 1 (validate): 깨진 콘텐츠로 산출물을 만들지 않도록 게이트로 단독 실행
 * - phase 2 (generate): 각 단계가 posts/를 읽기만 하고 서로 다른 파일을 쓰므로
 *   상호 독립 — 병렬 실행으로 prebuild 시간을 가장 느린 단계 수준으로 줄임
 */
export function buildPhases(flags: Flags): Step[][] {
  const validate: Step[] = flags.skipValidate
    ? []
    : [
        {
          label: 'validate-posts',
          command: 'validate',
          args: flags.strict ? ['--strict'] : [],
        },
      ];
  const generate: Step[] = [
    {
      label: 'sync-posts',
      command: 'sync-posts',
      args: flags.force ? ['--force'] : [],
    },
    { label: 'sitemap', command: 'sitemap', args: [] },
    { label: 'rss', command: 'rss', args: [] },
    { label: 'og-images', command: 'og-images', args: [] },
    {
      // posts/를 읽어 public/thumbs/에만 쓰므로 sync-posts(public/posts/)와
      // 병렬로 돌아도 서로의 산출물에 손대지 않는다.
      label: 'thumbnails',
      command: 'thumbnails',
      args: [],
    },
    { label: 'search-index', command: 'search-index', args: [] },
    { label: 'llms-full', command: 'llms-full', args: [] },
    { label: 'llms', command: 'llms', args: [] },
  ];
  return [validate, generate].filter(phase => phase.length > 0);
}

/** 자식 프로세스 하나의 결과 — 종료 코드나 신호, 그리고 모아 둔 출력. */
export interface ProcessResult {
  /** 종료 코드. 신호로 죽었으면 null */
  code: number | null;
  /** 죽인 신호(`SIGKILL` 등). 스스로 끝났으면 null */
  signal: NodeJS.Signals | null;
  elapsedMs: number;
  output: string;
}

interface StepResult extends ProcessResult {
  step: Step;
}

/**
 * 자식 프로세스 argv. 부모가 이미 발견·검증한 설정 파일을 절대 경로 `--config`로
 * **명시 전달**한다 — 자식이 cwd에서 다시 탐색하지 않으므로, 부모와 자식이 서로
 * 다른 설정을 잡는 일이 구조적으로 불가능하다. `--config`는 루트 커맨드의 전역
 * 옵션이라 서브커맨드 이름 **앞**에 온다.
 */
export function stepArgv(step: Step, configPath: string, now: Date): string[] {
  return [
    '--config',
    configPath,
    // 기준 시각도 부모가 정해 넘긴다 — 자식마다 제 시계를 보면 예약 글의 공개
    // 시각이 빌드 도중에 지날 때 산출물끼리 글 집합이 갈린다(context.ts의 now).
    '--now',
    now.toISOString(),
    step.command,
    ...step.args,
  ];
}

/**
 * 자식 프로세스를 띄우고 출력을 모았다가 끝나면 한 번에 돌려준다 — 병렬 실행 시
 * 로그가 섞이지 않도록 단계별로 묶어서 보여 주기 위해서다.
 *
 * **띄우기 실패도 결과로 돌려준다**(`code: 1`). spawn이 실패하면(EAGAIN·ENOMEM 등)
 * 자식은 `close` 없이 `error`만 낼 수 있는데, 그 이벤트에 리스너가 없으면
 * 처리되지 않은 에러로 **부모가 통째로 죽어** 다른 단계의 결과 요약까지 사라진다.
 * 신호로 죽은 단계(OOM으로 죽은 sharp 단계 등)는 종료 코드가 null이라 신호를
 * 따로 싣는다 — 예전에는 `exit null`만 찍혀 원인을 알 수 없었다.
 */
export function runProcess(
  execPath: string,
  args: readonly string[],
): Promise<ProcessResult> {
  return new Promise(resolveRun => {
    const start = Date.now();
    const chunks: Buffer[] = [];
    let settled = false;
    const finish = (
      code: number | null,
      signal: NodeJS.Signals | null,
      note?: string,
    ) => {
      // error 뒤에 close가 이어서 올 수 있다 — 먼저 온 쪽 하나만 쓴다.
      if (settled) return;
      settled = true;
      if (note !== undefined) chunks.push(Buffer.from(note));
      resolveRun({
        code,
        signal,
        elapsedMs: Date.now() - start,
        output: Buffer.concat(chunks).toString('utf8'),
      });
    };
    // cwd는 호출자 것을 그대로 쓴다 — 단계 스크립트들은 경로를 --config로 받은
    // 설정(절대 경로 앵커)에서 풀므로 cwd에 의존하지 않는다.
    const child = spawn(execPath, args, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (c: Buffer) => chunks.push(c));
    child.stderr.on('data', (c: Buffer) => chunks.push(c));
    child.on('error', err => {
      finish(1, null, `\n자식 프로세스를 띄우지 못했습니다: ${err.message}\n`);
    });
    child.on('close', (code, signal) => {
      finish(code, signal);
    });
  });
}

/** 실패 요약의 종료 원인 — 신호로 죽었으면 신호 이름, 아니면 종료 코드. */
export function describeExit(
  result: Pick<ProcessResult, 'code' | 'signal'>,
): string {
  return result.signal !== null
    ? `signal ${result.signal}`
    : `exit ${result.code ?? '?'}`;
}

async function runStep(
  step: Step,
  configPath: string,
  now: Date,
): Promise<StepResult> {
  const result = await runProcess(process.execPath, [
    CLI_PATH,
    ...stepArgv(step, configPath, now),
  ]);
  return { step, ...result };
}

function indent(text: string): string {
  return text
    .trimEnd()
    .split('\n')
    .map(line => `    ${line}`)
    .join('\n');
}

export async function main(ctx: ContentContext, flags: Flags) {
  const phases = buildPhases(flags);
  const total = phases.reduce((n, phase) => n + phase.length, 0);
  const start = Date.now();
  console.log(
    `▶ build-content: ${total}개 단계 (${phases.length} phase) 실행 — 기준 시각 ${ctx.now.toISOString()}`,
  );

  for (const phase of phases) {
    const results = await Promise.all(
      phase.map(step => runStep(step, ctx.configPath, ctx.now)),
    );
    let failed = false;
    for (const result of results) {
      const elapsed = (result.elapsedMs / 1000).toFixed(2);
      if (result.code === 0) {
        console.log(`\n✓ [${result.step.label}] ${elapsed}s`);
      } else {
        failed = true;
        console.error(
          `\n✖ [${result.step.label}] 실패 (${elapsed}s, ${describeExit(result)})`,
        );
      }
      if (result.output.trim()) {
        (result.code === 0 ? console.log : console.error)(
          indent(result.output),
        );
      }
    }
    if (failed) process.exit(1);
  }

  const totalSec = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`\n✓ build-content 완료: ${totalSec}s`);
}
