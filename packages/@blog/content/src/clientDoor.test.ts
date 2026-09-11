import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

/**
 * 클라이언트 문(`@blog/content/client`)의 **성질**을 잠근다.
 *
 * 이 문의 계약은 목록이 아니라 한 문장이다 — "여기서 도달하는 모듈에는 node
 * 빌트인이 없다". 목록으로 관리하면 문에 모듈을 더할 때마다 사람이 판정해야
 * 하고, 판정이 틀려도 **빌드는 성공한다**: Vite는 `node:fs`를 브라우저용 빈
 * 스텁으로 바꾸고 경고만 찍으므로, 깨지는 것은 런타임이다. 실제로
 * `apps/blog/web-svelte`가 큰 배럴에서 `postPath` 하나를 들여왔을 때 그렇게 됐다.
 *
 * 그래서 import 그래프를 직접 따라간다. 값 import든 타입 import든 가리지 않고
 * 전부 따라가는 이유는, 타입만 쓰는 파일이 나중에 값을 쓰기 시작해도 이 검사가
 * 계속 옳아야 하기 때문이다.
 */

const SRC = dirname(fileURLToPath(import.meta.url));
const DOOR = resolve(SRC, 'client.ts');

/**
 * 이 파일이 여는 **모든** 모듈 지정자. 세 꼴을 전부 잡는다:
 *
 * - `import x from 'y'` · `export * from 'y'` — `from` 절이 있는 것
 * - `import 'y'` — **부수효과 import.** `from` 절이 없어서, `from`만 찾으면
 *   통째로 지나친다. 문에 부수효과 모듈이 들어오는 것이야말로 막고 싶은 일이다
 * - `import('y')` — 동적 import. 이 패키지가 실제로 쓰는 꼴이다
 *   (`scripts/cli/program.ts`가 단계 모듈을 이렇게 든다)
 *
 * 초안은 첫 꼴만 봤다. 지금 그래프에 나머지 둘이 없어서 통과했을 뿐, 성질을
 * 검사한다면서 성질의 일부만 보고 있었다.
 */
const SPECIFIER =
  /(?:^|[\n;])\s*(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]|(?:^|[\n;])\s*import\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

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
    const bare: string[] = [];
    for (const match of source.matchAll(SPECIFIER)) {
      const specifier = match[1] ?? match[2] ?? match[3];
      if (specifier === undefined) continue;
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

test('지정자 세 꼴을 모두 따라간다', () => {
  // 이 검사 자신의 눈이 성한지 본다. 정규식이 한 꼴을 놓치면 위반이 조용히
  // 통과하는데, 그 실패는 이 파일 밖에서는 보이지 않는다.
  const found = [
    ...`
      import a from './a.ts';
      export * from './b.ts';
      import './c.ts';
      const d = await import('./d.ts');
      import type { E } from './e.ts';
      import { f } from 'node:fs';
    `.matchAll(SPECIFIER),
  ].map(m => m[1] ?? m[2] ?? m[3]);
  expect(found).toStrictEqual([
    './a.ts',
    './b.ts',
    './c.ts',
    './d.ts',
    './e.ts',
    'node:fs',
  ]);
});

test('큰 배럴은 이 검사를 통과하지 못한다', () => {
  // 대조군. 배럴이 어느 날 순수해지면 이 문이 존재할 이유가 없어지는데,
  // 그때 이 테스트가 알려 준다 — 그 전까지는 두 문이 정말로 다르다는 증거다.
  expect(offenders(resolve(SRC, 'index.ts')).length).toBeGreaterThan(0);
});
