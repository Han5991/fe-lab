/**
 * 프리뷰 워크플로의 **경로 판정 스크립트**가 무엇을 돌리고 무엇을 건너뛰는지
 * 검사합니다.
 *
 * ## 옆 테스트와 무엇이 다른가
 * `workflowPreviewGate.test.ts`는 뒤 스텝이 판정 결과를 먼저 보는지(구조)만
 * 봅니다. 판정 자체 — 접두 매칭, API가 실패하거나 상한에 닿았을 때 돌리는 쪽으로
 * 기우는 분기, 앱 사이의 파일 이동 — 는 셸 스크립트 안에 있어 그쪽 검사로는
 * 보이지 않습니다. 접두 목록에서 트레일링 슬래시 하나만 빠져도
 * `apps/blog/web/`이 `apps/blog/web-svelte/`를 삼키는데, CI는 초록으로 남습니다.
 *
 * ## 어떻게 검사하나
 * 워크플로 파일에서 `run:` 블록을 **그대로** 꺼내 bash로 실행합니다. 사본을 두면
 * 워크플로만 고쳐지고 테스트는 옛 스크립트를 검사하게 됩니다. `gh`는 PATH에 끼운
 * 가짜로 바꾸되 `--jq` 식은 실제 `jq`로 돌려, 워크플로에 적힌 식까지 함께
 * 검사합니다.
 *
 * 러너의 `gh api --jq`는 `jq`가 아니라 gh에 내장된 gojq라 구현이 다릅니다. 이 식의
 * 결과는 같습니다 — 파일 이동이 있는 실제 PR(#154)에 같은 식을 `gh api`와 `jq`로
 * 각각 돌려 출력이 바이트 단위로 같음을 확인했습니다. 식에 새 함수를 쓰면 두
 * 구현이 같게 동작하는지 다시 확인하세요.
 */
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));
const WORKFLOW = join(REPO_ROOT, '.github/workflows/preview-blog.yml');

/** REST `pulls/{n}/files`가 한 PR에 대해 돌려주는 파일 수의 상한. */
const API_FILE_LIMIT = 3000;

/** 스텝 본문의 들여쓰기 — `run: |` 아래 줄은 10칸에서 시작합니다. */
const BODY_INDENT = ' '.repeat(10);

/**
 * `Detect changes for this app` 스텝의 `run: |` 본문을 꺼냅니다. 본문보다 얕게
 * 들여 쓴 첫 비지 않은 줄에서 끝납니다.
 */
const extractGateScript = (yaml: string): string => {
  const lines = yaml.split('\n');
  const step = lines.indexOf('      - name: Detect changes for this app');
  const run = lines.findIndex(
    (line, i) => i > step && line === '        run: |',
  );
  if (step === -1 || run === -1) return '';
  const body: string[] = [];
  for (const line of lines.slice(run + 1)) {
    if (line.trim() !== '' && !line.startsWith(BODY_INDENT)) break;
    body.push(line.slice(BODY_INDENT.length));
  }
  return body.join('\n');
};

/**
 * 가짜 `gh` — `gh api --paginate <url> --jq <식>`만 흉내 냅니다. 픽스처가 한
 * 페이지라 `--paginate`는 결과가 같습니다.
 */
const GH_STUB = `#!/bin/bash
[[ "$GH_STUB_MODE" == fail ]] && { echo "stub: API error" >&2; exit 1; }
expr=''
while (( $# )); do
  if [[ "$1" == --jq ]]; then expr="$2"; shift; fi
  shift
done
exec jq -r "$expr" "$GH_STUB_FIXTURE"
`;

interface ChangedFile {
  filename: string;
  previous_filename?: string;
}

type Run = 'true' | 'false';

const files = (...paths: string[]): ChangedFile[] =>
  paths.map(filename => ({ filename }));

const unrelated = (count: number): ChangedFile[] =>
  Array.from({ length: count }, (_, i) => ({
    filename: `docs/unrelated-${String(i)}.md`,
  }));

let dir = '';
let script = '';
let bin = '';
let sequence = 0;

beforeAll(() => {
  // jq가 없으면 가짜 gh가 실패해 "API 실패 → 돌린다"로 흘러가고, 실패 이유가
  // 엉뚱하게 보인다. 원인을 바로 알 수 있게 먼저 멈춘다.
  if (spawnSync('jq', ['--version']).status !== 0) {
    throw new Error('이 테스트는 jq가 필요합니다(GitHub 러너에는 기본 설치).');
  }
  dir = mkdtempSync(join(tmpdir(), 'preview-gate-'));
  script = join(dir, 'gate.sh');
  writeFileSync(script, extractGateScript(readFileSync(WORKFLOW, 'utf8')));
  bin = join(dir, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'gh'), GH_STUB);
  chmodSync(join(bin, 'gh'), 0o755);
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const runGate = (
  app: string,
  changed: ChangedFile[],
  mode: 'ok' | 'fail' = 'ok',
) => {
  sequence += 1;
  const fixture = join(dir, `files-${String(sequence)}.json`);
  const output = join(dir, `output-${String(sequence)}`);
  writeFileSync(fixture, JSON.stringify(changed));
  writeFileSync(output, '');
  // GitHub 러너의 기본 셸(`bash -e {0}`)과 맞춘다.
  const result = spawnSync('bash', ['-e', script], {
    encoding: 'utf8',
    env: {
      PATH: `${bin}:${process.env.PATH ?? ''}`,
      APP: app,
      REPO: 'owner/repo',
      PR_NUMBER: '1',
      GITHUB_OUTPUT: output,
      GH_STUB_MODE: mode,
      GH_STUB_FIXTURE: fixture,
    },
  });
  return {
    status: result.status,
    run: /^run=(\w+)$/m.exec(readFileSync(output, 'utf8'))?.[1],
    notice: result.stdout.includes('::notice'),
  };
};

describe('프리뷰 워크플로의 판정 스크립트', () => {
  test('워크플로에서 스크립트를 꺼낸다', () => {
    // 꺼내기가 조용히 빈 문자열을 내면 아래 경우가 전부 엉뚱한 이유로 실패한다.
    expect(readFileSync(script, 'utf8')).toContain('GITHUB_OUTPUT');
  });

  const CASES: [
    label: string,
    changed: ChangedFile[],
    web: Run,
    svelte: Run,
  ][] = [
    [
      'React 앱만 바뀜',
      files('apps/blog/web/src/app/page.tsx'),
      'true',
      'false',
    ],
    [
      'SvelteKit 앱만 바뀜',
      files('apps/blog/web-svelte/src/routes/+page.svelte'),
      'false',
      'true',
    ],
    ['원고만 바뀜', files('apps/blog/posts/ci/a.md'), 'true', 'true'],
    [
      '@blog 패키지만 바뀜',
      files('packages/@blog/content/src/post/urls.ts'),
      'true',
      'true',
    ],
    [
      '워크플로 파일만 바뀜',
      files('.github/workflows/preview-blog.yml'),
      'true',
      'true',
    ],
    // 트레일링 슬래시가 빠지면 web이 web-svelte·webby까지 삼킨다.
    [
      '이름 앞부분만 같은 디렉터리',
      files('apps/blog/web-svelte-extra/x', 'apps/blog/webby/x'),
      'false',
      'false',
    ],
    [
      '트리거엔 걸리지만 어느 앱도 아님',
      files('apps/blog/README.md'),
      'false',
      'false',
    ],
    // 새 경로만 보면 파일을 잃은 쪽이 건너뛰어진다.
    [
      'React 앱에서 SvelteKit 앱으로 파일 이동',
      [
        {
          filename: 'apps/blog/web-svelte/src/x.ts',
          previous_filename: 'apps/blog/web/src/x.ts',
        },
      ],
      'true',
      'true',
    ],
    [
      'React 앱에서 앱 밖으로 파일 이동',
      [{ filename: 'docs/x.ts', previous_filename: 'apps/blog/web/src/x.ts' }],
      'true',
      'false',
    ],
    [
      '상한 바로 아래, 무관한 파일뿐',
      unrelated(API_FILE_LIMIT - 1),
      'false',
      'false',
    ],
    // 이동한 파일은 옛 경로 줄이 하나 더 나오지만 상한은 파일 수로 센다.
    [
      '이동이 섞여 줄은 상한에 닿아도 파일은 상한 아래',
      [
        ...unrelated(API_FILE_LIMIT - 2),
        { filename: 'docs/moved.md', previous_filename: 'docs/old.md' },
      ],
      'false',
      'false',
    ],
    // 목록이 잘렸을 수 있으므로 무엇이 바뀌었든 돌린다.
    ['상한에 닿음', unrelated(API_FILE_LIMIT), 'true', 'true'],
  ];

  describe.each(CASES)('%s', (_label, changed, web, svelte) => {
    test.each([
      ['web', web],
      ['web-svelte', svelte],
    ] as const)('%s → run=%s', (app, expected) => {
      const result = runGate(app, changed);
      expect(result.status).toBe(0);
      expect(result.run).toBe(expected);
      // 건너뛸 때만 notice를 남긴다 — 체크는 성공으로 남으므로 요약의 notice가
      // 유일한 구분이다.
      expect(result.notice).toBe(expected === 'false');
    });
  });

  test.each(['web', 'web-svelte'])(
    'API가 실패하면 %s 프리뷰를 건너뛰지 않는다',
    app => {
      const result = runGate(app, files('apps/blog/README.md'), 'fail');
      expect(result.status).toBe(0);
      expect(result.run).toBe('true');
    },
  );
});
