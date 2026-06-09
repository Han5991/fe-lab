import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

export interface Step {
  label: string;
  cmd: string;
  args: string[];
}

export interface Flags {
  skipValidate: boolean;
  force: boolean;
}

export function parseFlags(argv: string[]): Flags {
  return {
    skipValidate: argv.includes('--skip-validate'),
    force: argv.includes('--force'),
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
          cmd: 'tsx',
          args: ['scripts/validate-posts.ts'],
        },
      ];
  const generate: Step[] = [
    {
      label: 'sync-posts',
      cmd: 'node',
      args: ['sync-posts.mjs', ...(flags.force ? ['--force'] : [])],
    },
    { label: 'sitemap', cmd: 'tsx', args: ['generate-sitemap.ts'] },
    { label: 'rss', cmd: 'tsx', args: ['generate-rss.ts'] },
    {
      label: 'og-images',
      cmd: 'tsx',
      args: ['scripts/generate-og-images.ts'],
    },
    {
      label: 'search-index',
      cmd: 'tsx',
      args: ['scripts/generate-search-index.ts'],
    },
    { label: 'llms-full', cmd: 'tsx', args: ['scripts/generate-llms-full.ts'] },
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
    const child = spawn('npx', [step.cmd, ...step.args], {
      cwd: root,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
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

async function main() {
  const phases = buildPhases(parseFlags(process.argv.slice(2)));
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

// 스크립트로 직접 실행될 때만 main()을 호출합니다.
// (테스트 등에서 import할 때 main()이 자동 실행되는 것을 방지)
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
}
