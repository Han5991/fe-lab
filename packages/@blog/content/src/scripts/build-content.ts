import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 단계를 돌릴 CLI 진입점 — 이 파일의 형제인 `cli.ts`를 **절대 경로**로 지목한다.
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

export function parseFlags(argv: string[]): Flags {
  return {
    skipValidate: argv.includes('--skip-validate'),
    force: argv.includes('--force'),
    strict: argv.includes('--strict'),
  };
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

interface StepResult {
  step: Step;
  code: number | null;
  elapsedMs: number;
  output: string;
}

/** 병렬 실행 시 로그가 섞이지 않도록 출력을 모았다가 단계별로 묶어서 보여줍니다. */
function runStep(step: Step): Promise<StepResult> {
  return new Promise(resolveStep => {
    const start = Date.now();
    // cwd는 호출자 것을 그대로 쓴다 — 단계 스크립트들은 전부 자기 위치 기준
    // 절대 경로(contentPaths)로 동작하므로 cwd에 의존하지 않는다.
    const child = spawn(
      process.execPath,
      [CLI_PATH, step.command, ...step.args],
      {
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    const chunks: Buffer[] = [];
    child.stdout.on('data', (c: Buffer) => chunks.push(c));
    child.stderr.on('data', (c: Buffer) => chunks.push(c));
    child.on('close', code => {
      resolveStep({
        step,
        code,
        elapsedMs: Date.now() - start,
        output: Buffer.concat(chunks).toString('utf8'),
      });
    });
  });
}

function indent(text: string): string {
  return text
    .trimEnd()
    .split('\n')
    .map(line => `    ${line}`)
    .join('\n');
}

export async function main(argv: string[]) {
  const phases = buildPhases(parseFlags(argv));
  const total = phases.reduce((n, phase) => n + phase.length, 0);
  const start = Date.now();
  console.log(`▶ build-content: ${total}개 단계 (${phases.length} phase) 실행`);

  for (const phase of phases) {
    const results = await Promise.all(phase.map(runStep));
    let failed = false;
    for (const result of results) {
      const elapsed = (result.elapsedMs / 1000).toFixed(2);
      if (result.code === 0) {
        console.log(`\n✓ [${result.step.label}] ${elapsed}s`);
      } else {
        failed = true;
        console.error(
          `\n✖ [${result.step.label}] 실패 (${elapsed}s, exit ${result.code})`,
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
