import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

interface Step {
  label: string;
  cmd: string;
  args: string[];
  optional?: boolean;
}

function parseFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const skipValidate = parseFlag('skip-validate');
const force = parseFlag('force');

const steps: Step[] = [
  ...(skipValidate
    ? []
    : [
        {
          label: 'validate-posts',
          cmd: 'tsx',
          args: ['scripts/validate-posts.ts'],
        },
      ]),
  {
    label: 'sync-posts',
    cmd: 'node',
    args: ['sync-posts.mjs', ...(force ? ['--force'] : [])],
  },
  { label: 'sitemap', cmd: 'tsx', args: ['generate-sitemap.ts'] },
  { label: 'rss', cmd: 'tsx', args: ['generate-rss.ts'] },
  { label: 'search-index', cmd: 'tsx', args: ['scripts/generate-search-index.ts'] },
  { label: 'llms-full', cmd: 'tsx', args: ['scripts/generate-llms-full.ts'] },
];

const start = Date.now();
console.log(`▶ build-content: ${steps.length}개 단계 실행`);

for (const step of steps) {
  const stepStart = Date.now();
  process.stdout.write(`\n› [${step.label}] `);
  const result = spawnSync('npx', [step.cmd, ...step.args], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  });
  const elapsed = ((Date.now() - stepStart) / 1000).toFixed(2);
  if (result.status !== 0) {
    console.error(`✖ [${step.label}] 실패 (${elapsed}s, exit ${result.status})`);
    process.exit(result.status ?? 1);
  }
  console.log(`✓ [${step.label}] ${elapsed}s`);
}

const total = ((Date.now() - start) / 1000).toFixed(2);
console.log(`\n✓ build-content 완료: ${total}s`);
