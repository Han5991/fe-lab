import { after, before, describe, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
  /** 번들 런타임의 externalRequire로 넘길 외부 모듈 */
  externalModules?: Record<string, unknown>;
}

const tempDirs: string[] = [];

function bundle(files: Files, options: BundleOptions = {}): string {
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
    );
    graph.build();
    return graph.generate();
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
  run(bundle(files, options), options.externalModules);

before(() => {
  // Graph의 진행 로그(📂 Processing …)를 끈다
  mock.method(console, 'log', () => {});
});

after(() => {
  mock.restoreAll();
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

    assert.equal(exports.message, 'Hello, Universe!');
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

    assert.equal(exports.type, 'number');
    assert.equal(exports.value, 42);
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

    assert.equal(exports.hello, 'cjs');
  });
});
