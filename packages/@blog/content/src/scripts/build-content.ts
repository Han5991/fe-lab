import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isCliEntry } from './cliEntry';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * 단계 스크립트 경로를 **이 파일 기준 절대 경로**로 만든다.
 *
 * 예전에는 'scripts/…' 상대 경로 + spawn `cwd: root` 강제로 맞췄는데, 그러면
 * 자식 스크립트가 어느 cwd에서 도는지가 build-content의 숨은 계약이 된다.
 * 이제 각 스크립트가 자기 위치(contentPaths)로 경로를 해석하므로, 스크립트
 * 파일만 절대 경로로 지목하고 spawn cwd는 호출자 것을 그대로 둔다.
 */
function scriptPath(rel: string): string {
  return resolve(__dirname, rel);
}

export interface Step {
  label: string;
  cmd: string;
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
          cmd: 'tsx',
          args: [
            scriptPath('validate-posts.ts'),
            ...(flags.strict ? ['--strict'] : []),
          ],
        },
      ];
  const generate: Step[] = [
    {
      // .mjs지만 tsx로 돌린다 — 경로 설정(src/shared/contentPaths.ts)을
      // import하는데, 순 node는 .mjs → 확장자 없는 .ts 체인을 해석하지 못한다.
      label: 'sync-posts',
      cmd: 'tsx',
      args: [scriptPath('sync-posts.mjs'), ...(flags.force ? ['--force'] : [])],
    },
    { label: 'sitemap', cmd: 'tsx', args: [scriptPath('generate-sitemap.ts')] },
    {
      label: 'rss',
      cmd: 'tsx',
      args: [scriptPath('render/generate-rss.ts')],
    },
    {
      label: 'og-images',
      cmd: 'tsx',
      args: [scriptPath('render/generate-og-images.ts')],
    },
    {
      // posts/를 읽어 public/thumbs/에만 쓰므로 sync-posts(public/posts/)와
      // 병렬로 돌아도 서로의 산출물에 손대지 않는다.
      label: 'thumbnails',
      cmd: 'tsx',
      args: [scriptPath('render/generate-thumbnails.ts')],
    },
    {
      label: 'search-index',
      cmd: 'tsx',
      args: [scriptPath('generate-search-index.ts')],
    },
    {
      label: 'llms-full',
      cmd: 'tsx',
      args: [scriptPath('generate-llms-full.ts')],
    },
    { label: 'llms', cmd: 'tsx', args: [scriptPath('generate-llms.ts')] },
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
    const child = spawn('npx', [step.cmd, ...step.args], {
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
if (isCliEntry(import.meta.url)) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
}
