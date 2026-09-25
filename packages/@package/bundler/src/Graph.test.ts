import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { Graph } from './Graph.ts';

// 픽스처 파일을 임시 폴더에 쓰고, 실제 Graph로 번들을 만든 뒤 vm에서 실행해
// 번들된 프로그램이 원본 ESM과 같은 값을 내는지 본다.

type Files = Record<string, string>;

interface BundleOptions {
  entry?: string;
  externals?: string[];
  globals?: Record<string, string>;
  /** 번들 런타임의 externalRequire로 넘길 외부 모듈 */
  externalModules?: Record<string, unknown>;
}

interface BundleResult {
  code: string;
  /** 픽스처를 쓴 임시 폴더. 결과물은 `dist/`에 있다 */
  dir: string;
}

const tempDirs: string[] = [];

function bundle(files: Files, options: BundleOptions = {}): BundleResult {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'minibundler-'));
  tempDirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(dir, name);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }

  // Graph.generate()는 cwd의 dist/에 결과를 쓴다 — 임시 폴더 안에서 돌린다
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const graph = new Graph(
      path.join(dir, options.entry ?? 'index.js'),
      options.externals ?? [],
      options.globals ?? {},
    );
    graph.build();
    return { code: graph.generate(), dir };
  } finally {
    process.chdir(cwd);
  }
}

interface RunResult {
  exports: Record<string, unknown>;
  logs: string[];
}

/** 번들을 새 realm에서 실행하고 엔트리의 exports와 console.log 출력을 돌려준다 */
function run(
  code: string,
  externalModules: Record<string, unknown> = {},
): RunResult {
  const logs: string[] = [];
  const sandbox = {
    module: { exports: {} as Record<string, unknown> },
    require: (id: string) => {
      if (id in externalModules) return externalModules[id];
      throw new Error(`Unexpected external: ${id}`);
    },
    console: { log: (...args: unknown[]) => logs.push(args.join(' ')) },
  };
  vm.runInNewContext(code, sandbox);
  return { exports: sandbox.module.exports, logs };
}

const bundleAndRun = (files: Files, options: BundleOptions = {}) =>
  run(bundle(files, options).code, options.externalModules);

beforeAll(() => {
  // Graph의 진행 로그(📂 Processing …)를 끈다
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
});

describe('기본 가져오기(default import)', () => {
  test('번들 안 모듈의 default export 함수를 그대로 받는다', () => {
    const { exports } = bundleAndRun({
      'greet.js':
        'export default function greet(name) { return `Hello, ${name}!`; }',
      'index.js': [
        "import greet from './greet.js';",
        "export const message = greet('Universe');",
      ].join('\n'),
    });

    expect(exports.message).toBe('Hello, Universe!');
  });

  test('default export 표현식도 모듈 객체가 아니라 값으로 받는다', () => {
    const { exports } = bundleAndRun({
      'answer.js': 'export default 21 * 2;',
      'index.js': [
        "import answer from './answer.js';",
        'export const type = typeof answer;',
        'export const value = answer;',
      ].join('\n'),
    });

    expect(exports.type).toBe('number');
    expect(exports.value).toBe(42);
  });

  test('__esModule 표시가 없는 CJS 외부 모듈은 모듈 자체를 default로 받는다', () => {
    const { exports } = bundleAndRun(
      {
        'index.js': [
          "import legacy from 'legacy';",
          'export const hello = legacy.hello;',
        ].join('\n'),
      },
      { externals: ['legacy'], externalModules: { legacy: { hello: 'cjs' } } },
    );

    expect(exports.hello).toBe('cjs');
  });
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
    const library = page.BundlerLibrary as Record<string, unknown>;
    expect(library.version).toBe('19-test');

    const bare: Record<string, unknown> = {};
    bare.window = bare;
    expect(() => vm.runInNewContext(code, bare)).toThrow(
      /Cannot find module 'react' \(global React\)/,
    );
  });
});

describe('내보내기 변환', () => {
  test('한 선언의 여러 선언자와 구조 분해 패턴을 모두 내보낸다', () => {
    const { exports } = bundleAndRun({
      'index.js': [
        'export const a = 1, b = 2;',
        'const source = { x: 3, list: [4, 5] };',
        'export const { x, list: [y, ...rest] } = source;',
      ].join('\n'),
    });

    expect(exports.a).toBe(1);
    expect(exports.b).toBe(2);
    expect(exports.x).toBe(3);
    expect(exports.y).toBe(4);
    expect(JSON.stringify(exports.rest)).toBe('[5]');
  });

  test('export * as ns는 모듈 객체 하나를 ns라는 이름으로 내보낸다', () => {
    const { exports } = bundleAndRun({
      'math.js': 'export const one = 1;\nexport const two = 2;',
      'index.js': "export * as math from './math.js';",
    });

    const math = exports.math as Record<string, unknown>;
    expect(math.one).toBe(1);
    expect(math.two).toBe(2);
    expect(exports.one).toBe(undefined);
  });

  test('export *는 default를 옮기지 않고, 이 모듈이 직접 내보낸 이름을 덮지 않는다', () => {
    const { exports } = bundleAndRun({
      'star.js': [
        "export default 'star-default';",
        "export const shared = 'from-star';",
        "export const onlyStar = 'star';",
      ].join('\n'),
      'index.js': [
        "export function shared() { return 'local'; }",
        "export * from './star.js';",
      ].join('\n'),
    });

    expect(exports.default).toBe(undefined);
    expect(typeof exports.shared).toBe('function');
    expect(exports.onlyStar).toBe('star');
  });

  test('로컬 export는 앞에 온 export *보다 우선한다', () => {
    const { exports } = bundleAndRun({
      'star.js': "export const shared = 'from-star';",
      'index.js': [
        "export * from './star.js';",
        "export const shared = 'local';",
      ].join('\n'),
    });

    expect(exports.shared).toBe('local');
  });

  test('순환 참조에서 먼저 불려 간 모듈도 함수 선언 export는 받는다(호이스팅)', () => {
    const { exports } = bundleAndRun({
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
