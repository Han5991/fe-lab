import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { expect, test } from 'vitest';

/**
 * 클라이언트 문(`@blog/content/client`)의 **성질**을 잠근다.
 *
 * 이 문의 계약은 목록이 아니라 한 문장이다 — "여기서 도달하는 모듈에는 node
 * 빌트인도 외부 패키지도 없다". 목록으로 관리하면 문에 모듈을 더할 때마다
 * 사람이 판정해야 하고, 판정이 틀려도 **앱 빌드는 실패하지 않는다**: 앱의
 * `optimizePackageImports`가 쓰지 않는 export를 import 단계에서 걸러 내기
 * 때문이다. 그 설정은 Next 전용·앱별이고 트리 셰이킹이 없는 dev에서는 유일한
 * 방어선이라, 빠지는 날에야 fs가 클라이언트 그래프로 들어온 것이 드러난다. 문은
 * 그 설정에 기대지 않으려고 생겼으니, 문의 성질도 번들러가 아니라 여기서
 * 확인한다.
 *
 * 그래서 import 그래프를 직접 따라간다. 값 import든 타입 import든 가리지 않고
 * 전부 따라가는 이유는, 타입만 쓰는 파일이 나중에 값을 쓰기 시작해도 이 검사가
 * 계속 옳아야 하기 때문이다.
 */

const SRC = dirname(fileURLToPath(import.meta.url));
const DOOR = resolve(SRC, 'client.ts');

/**
 * 이 파일이 여는 **모든** 모듈 지정자 — 정규식이 아니라 TypeScript의 전처리기로 뽑는다.
 * `from` 절만 찾으면 부수효과 import(`import 'y'`)와 동적 import(`import('y')` — 이
 * 패키지의 `scripts/cli/program.ts`가 쓰는 꼴)를 놓치고, 손으로 쓴 정규식은 주석 뒤의
 * import·템플릿 리터럴·`require`를 놓친다. 전처리기는 토큰 단위라 주석을 건너뛰고 그
 * 꼴을 전부 잡는다.
 */
function specifiersOf(source: string): string[] {
  return ts
    .preProcessFile(source, true, true)
    .importedFiles.map(file => file.fileName);
}

/**
 * 지정자 없이 빌트인을 여는 길 — `process.getBuiltinModule('node:fs')`. 전처리기가 보지
 * 않으므로 이름으로 잡는다.
 */
const BUILTIN_BY_CALL = /\bgetBuiltinModule\b/;

/**
 * 클라이언트에서 안전하다고 **명시적으로** 인정한 외부 패키지.
 *
 * 비워 두는 것이 기본이고, 그게 이 검사의 핵심이다 — 상대 경로가 아닌 지정자는
 * **전부** 위반으로 본다. `node:fs`만 찾으면 `gray-matter`처럼 자기 안에서 fs를
 * 여는 패키지가 그냥 통과하는데, npm 패키지 내부는 여기서 볼 수 없다. 볼 수
 * 없는 것은 열지 않는 편이 낫고, 정말 필요하면 사람이 여기 이름을 적어
 * "이 패키지는 브라우저에서 돈다"를 보증한다.
 */
const ALLOWED_PACKAGES = new Set<string>([]);

interface Walked {
  /** 방문한 파일 → 그 파일이 연 **상대 아닌** 지정자들. */
  files: Map<string, string[]>;
}

function walk(entry: string): Walked {
  const files = new Map<string, string[]>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || files.has(file)) continue;
    const source = readFileSync(file, 'utf8');
    const bare: string[] = BUILTIN_BY_CALL.test(source)
      ? ['getBuiltinModule']
      : [];
    for (const specifier of specifiersOf(source)) {
      if (specifier.startsWith('.')) {
        queue.push(resolve(dirname(file), specifier));
      } else {
        bare.push(specifier);
      }
    }
    files.set(file, bare);
  }
  return { files };
}

/** 문에서 도달하는 파일 중, 상대 경로가 아닌 지정자를 연 것들. */
function offenders(entry: string): string[] {
  return [...walk(entry).files]
    .filter(([, bare]) =>
      bare.some(specifier => !ALLOWED_PACKAGES.has(specifier)),
    )
    .map(([file]) => relative(SRC, file));
}

test('클라이언트 문은 상대 모듈과 허용 패키지만 연다', () => {
  // 실패 메시지에 파일명이 그대로 나오도록 배열째 비교한다.
  expect(offenders(DOOR)).toStrictEqual([]);
});

test('문이 실제로 무언가를 열고 있다', () => {
  // 양성 대조 — 이 문이 빈 파일이 되거나 상대 import를 잃으면 위 검사가
  // "위반 없음"으로 조용히 통과한다.
  expect(walk(DOOR).files.size).toBeGreaterThan(10);
});

test('import의 모든 꼴을 따라간다', () => {
  // 이 검사 자신의 눈이 성한지 본다. 한 꼴을 놓치면 위반이 조용히 통과하는데, 그
  // 실패는 이 파일 밖에서는 보이지 않는다.
  expect(
    specifiersOf(`
      import a from './a.ts';
      export * from './b.ts';
      import './c.ts';
      const d = await import('./d.ts');
      import type { E } from './e.ts';
      import {
        f,
      } from 'node:fs';
      export { g } from 'node:url';
      /* 주석 뒤 */ import 'node:os';
      const h = await import(\`node:path\`);
      const i = require('node:child_process');
      // import 'commented-out';
    `),
  ).toStrictEqual([
    './a.ts',
    './b.ts',
    './c.ts',
    './d.ts',
    './e.ts',
    'node:fs',
    'node:url',
    'node:os',
    'node:path',
    'node:child_process',
  ]);
  expect(BUILTIN_BY_CALL.test("process.getBuiltinModule('node:fs')")).toBe(
    true,
  );
});

test('큰 배럴은 이 검사를 통과하지 못한다', () => {
  // 대조군. 배럴이 어느 날 순수해지면 이 문이 존재할 이유가 없어지는데,
  // 그때 이 테스트가 알려 준다 — 그 전까지는 두 문이 정말로 다르다는 증거다.
  expect(offenders(resolve(SRC, 'index.ts')).length).toBeGreaterThan(0);
});

test('SEO 문도 이 검사를 통과하지 못한다', () => {
  // `seo/postSeo.ts`가 `post/index.ts`(→ `series.ts`의 node:fs)를 연다. 앱 lint가
  // `@blog/content/seo` 값 import를 서버 전용 파일로 가두는 근거다 — 이 문이 순수해지면
  // 그 금지를 풀어도 된다는 신호로 이 테스트가 실패한다.
  expect(offenders(resolve(SRC, 'seo/index.ts')).length).toBeGreaterThan(0);
});
