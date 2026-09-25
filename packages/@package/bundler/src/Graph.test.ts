import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { Graph } from './Graph.ts';

interface BundleOptions {
  externals?: string[];
  globals?: Record<string, string>;
  externalModules?: Record<string, unknown>;
}

const tempDirs: string[] = [];

function bundle(files: Record<string, string>, options: BundleOptions = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'minibundler-'));
  tempDirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content);
  }

  // Graph.generate()는 cwd의 dist/에 쓴다
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const graph = new Graph(
      path.join(dir, 'index.js'),
      options.externals ?? [],
      options.globals ?? {},
    );
    graph.build();
    return { code: graph.generate(), dir };
  } finally {
    process.chdir(cwd);
  }
}

/** 번들을 새 realm에서 실행해 엔트리의 exports를 돌려준다 */
function bundleAndRun(
  files: Record<string, string>,
  options: BundleOptions = {},
): Record<string, unknown> {
  const sandbox = {
    module: { exports: {} as Record<string, unknown> },
    require: (id: string) => {
      if (options.externalModules && id in options.externalModules) {
        return options.externalModules[id];
      }
      throw new Error(`Unexpected external: ${id}`);
    },
  };
  vm.runInNewContext(bundle(files, options).code, sandbox);
  return sandbox.module.exports;
}

/** 다른 realm의 값을 이 realm의 JSON 값으로 옮긴다(함수·undefined는 빠진다) */
const plain = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

beforeAll(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
});

test('기본 가져오기는 번들 안 모듈의 default 값을, __esModule이 없는 CJS external은 모듈 자체를 받는다', () => {
  const exports = bundleAndRun(
    {
      'greet.js':
        'export default function greet(name) { return `Hello, ${name}!`; }',
      'answer.js': 'export default 21 * 2;',
      'index.js': [
        "import greet from './greet.js';",
        "import answer from './answer.js';",
        "import legacy from 'legacy';",
        "export const values = [greet('Universe'), answer, legacy.hello];",
      ].join('\n'),
    },
    { externals: ['legacy'], externalModules: { legacy: { hello: 'cjs' } } },
  );

  expect(plain(exports.values)).toEqual(['Hello, Universe!', 42, 'cjs']);
});

describe('배포 형식', () => {
  test('"type": "module" 패키지에서도 CJS 번들(dist/index.js)을 require()로 불러온다', () => {
    const { dir } = bundle({
      'package.json': JSON.stringify({ type: 'module' }),
      'index.js': 'export const plus = (a, b) => a + b;',
    });

    const lib = createRequire(import.meta.url)(path.join(dir, 'dist/index.js'));

    expect(lib.plus(1, 2)).toBe(3);
  });

  test('require가 없는 브라우저 <script>에서는 globals가 가리키는 전역에서 external을 찾는다', () => {
    const { code } = bundle(
      {
        'index.js': [
          "import React from 'react';",
          'export const version = React.version;',
        ].join('\n'),
      },
      { externals: ['react'], globals: { react: 'React' } },
    );

    const page: Record<string, unknown> = { React: { version: '19-test' } };
    page.window = page;
    vm.runInNewContext(code, page);

    expect(plain(page.BundlerLibrary)).toEqual({ version: '19-test' });
  });
});

describe('내보내기 변환', () => {
  test('여러 선언자·구조 분해·export * as ns를 모두 내보낸다', () => {
    const exports = bundleAndRun({
      'math.js': 'export const one = 1;',
      'index.js': [
        'export const a = 1, b = 2;',
        'export const { x, list: [y, ...rest] } = { x: 3, list: [4, 5] };',
        "export * as math from './math.js';",
      ].join('\n'),
    });

    expect(plain(exports)).toEqual({
      a: 1,
      b: 2,
      x: 3,
      y: 4,
      rest: [5],
      math: { one: 1 },
    });
  });

  test('export *는 default와 이 모듈이 앞뒤로 내보낸 이름을 덮지 않는다', () => {
    const exports = bundleAndRun({
      'star.js': [
        "export default 'star-default';",
        "export const early = 'star';",
        "export const late = 'star';",
        "export const onlyStar = 'star';",
      ].join('\n'),
      'index.js': [
        "export function early() { return 'local'; }",
        "export * from './star.js';",
        "export const late = 'local';",
      ].join('\n'),
    });

    expect(typeof exports.early).toBe('function');
    expect(plain(exports)).toEqual({ late: 'local', onlyStar: 'star' });
  });

  test('순환 참조에서 먼저 불려 간 모듈도 함수 선언 export는 받는다(호이스팅)', () => {
    const exports = bundleAndRun({
      'index.js': "export { fromB } from './a.js';",
      'a.js': [
        "import { fromB } from './b.js';",
        'export { fromB };',
        "export function helper() { return 'helper'; }",
      ].join('\n'),
      'b.js': [
        "import { helper } from './a.js';",
        'export const fromB = helper();',
      ].join('\n'),
    });

    expect(exports.fromB).toBe('helper');
  });
});
