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

/** `import … from './x.ts'` · `export … from './x.ts'`의 상대 지정자. */
const SPECIFIER =
  /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s+['"](\.[^'"]+)['"]/g;

/**
 * 이 파일에서 여는 node 빌트인. `node:` 접두 없는 옛 표기도 함께 본다.
 *
 * **`g` 플래그를 붙이지 않는다.** `.test()`로 여러 번 묻는데, `g`가 붙은
 * 정규식은 `lastIndex`를 들고 다녀 같은 패턴에 두 번째로 물으면 답이 달라진다 —
 * 파일 목록을 순회하는 이 검사에서는 위반을 하나 걸러 뛰어넘는다.
 */
const NODE_BUILTIN =
  /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s+['"](node:[^'"]+|fs|path|url|os|crypto|child_process)['"]/;

function walk(entry: string): Map<string, string> {
  const seen = new Map<string, string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || seen.has(file)) continue;
    const source = readFileSync(file, 'utf8');
    seen.set(file, source);
    for (const [, specifier] of source.matchAll(SPECIFIER)) {
      if (specifier === undefined) continue;
      queue.push(resolve(dirname(file), specifier));
    }
  }
  return seen;
}

test('클라이언트 문에서 도달하는 모듈에는 node 빌트인이 없다', () => {
  const offenders = [...walk(DOOR)]
    .filter(([, source]) => NODE_BUILTIN.test(source))
    .map(([file]) => relative(SRC, file));
  // 실패 메시지에 파일명이 그대로 나오도록 배열째 비교한다.
  expect(offenders).toStrictEqual([]);
});

test('문이 실제로 무언가를 열고 있다', () => {
  // 양성 대조 — 이 문이 빈 파일이 되거나 상대 import를 잃으면 위 검사가
  // "위반 없음"으로 조용히 통과한다.
  const graph = walk(DOOR);
  expect(graph.size).toBeGreaterThan(10);
});

test('큰 배럴은 이 검사를 통과하지 못한다', () => {
  // 대조군. 배럴이 어느 날 순수해지면 이 문이 존재할 이유가 없어지는데,
  // 그때 이 테스트가 알려 준다 — 그 전까지는 두 문이 정말로 다르다는 증거다.
  const offenders = [...walk(resolve(SRC, 'index.ts'))].filter(([, source]) =>
    NODE_BUILTIN.test(source),
  );
  expect(offenders.length).toBeGreaterThan(0);
});
