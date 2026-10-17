/**
 * 같은 문자열 리터럴 집합을 **프로덕션 파일 두 곳 이상**이 손으로 적으면 실패한다.
 *
 * 유니온에 값을 하나 더해도 다른 파일의 사본(두 번째 유니온·옵션 배열·키 목록)은
 * 컴파일을 통과한다. 화면에서 선택지 하나가 빠지거나 라벨이 기본값으로 떨어질 뿐
 * 아무것도 실패하지 않는다 — 조용히 새는 종류라 여기서 잠근다. 출처 하나에서 파생한
 * 값(`(typeof X)[number]`·`keyof typeof`·`satisfies Record<T, …>`)은 사본이 아니므로
 * 걸리지 않는다.
 *
 * ## 집합으로 보는 꼴
 * - 문자열 리터럴 유니온 타입 (`'a' | 'b'`)
 * - 문자열 배열 (`['a', 'b']`)
 * - `as const`·`satisfies` 객체의 키 (`{ a: …, b: … } as const`)
 * - 문자열 속성만 가진 객체 배열의 같은 속성 (`[{ id: 'a', label: '…' }, …]`의 `id`)
 *
 * 원소가 **같은** 집합만 잡는다. 이미 갈라진 사본(출처에 값이 늘고 남은 부분집합)도 잡고
 * 싶지만, 부분집합은 대개 사본이 아니라 선택이다("이 규칙이 검사하는 날짜 필드") — 재 보니
 * 걸린 셋이 전부 그쪽이었다. 그래서 이 검사는 갈라지기 **전에** 사본을 막는 데까지다.
 *
 * ## 보지 않는 것
 * - 타입 인자 안의 유니온 — `Pick<T, 'a' | 'b'>`는 필드를 고르는 것이지 어휘의 사본이 아니다.
 * - 이름 있는 타입에 `satisfies`로 묶인 값 — 키·원소가 그 타입을 벗어나면 컴파일이 막는다.
 * - 원소 둘 미만, 같은 파일 안의 반복(한 화면에 함께 보인다).
 * - 테스트 — 테스트의 목록은 단언(일부러 둔 두 번째 사본)이거나 픽스처다.
 * - 비교·switch(`x === 'a' ? … : …`) — 집합이 아니라 갈래라 이 검사가 보지 못한다.
 *
 * 이 패키지에 있는 이유는 `docPaths.test.ts`와 같다 — 이 패키지의 테스트는 캐시 없이
 * 저장소 위에서 돈다(`turbo.json`).
 *
 * 재평가: 2027-04-17 — 그때까지 새 사본을 하나도 잡지 못했으면 줄이거나 내린다(AGENTS.md §5).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, test } from 'vitest';

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url));

/** 검사하는 프로덕션 코드 — 블로그 스택 전부. */
const ROOTS = [
  'apps/blog/web/src/',
  'apps/blog/web/supabase/functions/',
  'packages/@blog/content/src/',
  'packages/@blog/preset/src/',
];
const SOURCE = /\.(ts|tsx|mts|cts)$/;
const TEST = /\.(test|spec)\.tsx?$/;

/**
 * 손으로 적을 수밖에 없는 사본 — 집합(정렬해 `|`로 이은 것) → 이유와 잠근 자리.
 * 여기 올리려면 그 사본을 다른 테스트가 잠그고 있어야 한다.
 */
const LOCKED_ELSEWHERE = new Map([
  [
    'dark|light',
    '앱의 Theme(useTheme.ts)과 프리셋의 BlogTheme — src는 경계상 preset을 열지 않는다. mermaidTheme.test.ts가 타입으로 같음을 잠근다.',
  ],
]);

interface LiteralSet {
  values: string[];
  file: string;
  line: number;
}

/** 키나 원소를 이름 있는 타입이 정하는가 — 그러면 그 값은 사본이 아니라 파생이다. */
function namesItsKeys(type: ts.TypeNode): boolean {
  const isNamed = (t: ts.TypeNode) =>
    ts.isTypeReferenceNode(t) ||
    ts.isIndexedAccessTypeNode(t) ||
    ts.isTypeQueryNode(t) ||
    (ts.isTypeOperatorNode(t) && t.operator === ts.SyntaxKind.KeyOfKeyword);
  if (ts.isIntersectionTypeNode(type)) return type.types.some(namesItsKeys);
  if (ts.isTypeOperatorNode(type)) return namesItsKeys(type.type);
  if (ts.isArrayTypeNode(type)) return isNamed(type.elementType);
  if (!ts.isTypeReferenceNode(type)) return false;
  if (type.typeName.getText() !== 'Record') return true;
  const key = type.typeArguments?.[0];
  return key !== undefined && isNamed(key);
}

function lockedBySatisfies(node: ts.Node): boolean {
  let parent = node.parent;
  while (ts.isAsExpression(parent) || ts.isParenthesizedExpression(parent)) {
    parent = parent.parent;
  }
  return ts.isSatisfiesExpression(parent) && namesItsKeys(parent.type);
}

function stringValue(node: ts.Node): string | undefined {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
    ? node.text
    : undefined;
}

/** 문자열 속성만 가진 객체의 속성 → 값. 다른 꼴이 하나라도 섞이면 undefined. */
function stringProps(node: ts.Expression): Map<string, string> | undefined {
  if (!ts.isObjectLiteralExpression(node)) return undefined;
  const props = new Map<string, string>();
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) {
      return undefined;
    }
    const value = stringValue(prop.initializer);
    if (value === undefined) return undefined;
    props.set(prop.name.text, value);
  }
  return props;
}

function collectLiteralSets(file: string, source: string): LiteralSet[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const sets: LiteralSet[] = [];
  const add = (values: string[], node: ts.Node) => {
    const unique = [...new Set(values)].sort();
    if (unique.length < 2) return;
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    sets.push({ values: unique, file, line: line + 1 });
  };

  const visit = (node: ts.Node): void => {
    if (
      ts.isUnionTypeNode(node) &&
      !ts.isUnionTypeNode(node.parent) &&
      !ts.isTypeReferenceNode(node.parent) &&
      !ts.isExpressionWithTypeArguments(node.parent) &&
      !ts.isIndexedAccessTypeNode(node.parent)
    ) {
      add(
        node.types.flatMap(t =>
          ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal)
            ? [t.literal.text]
            : [],
        ),
        node,
      );
    }
    if (ts.isArrayLiteralExpression(node) && !lockedBySatisfies(node)) {
      const strings = node.elements.map(stringValue);
      if (strings.every(s => s !== undefined)) add(strings, node);
      const rows = node.elements.map(stringProps);
      const [first] = rows;
      if (first && rows.every(row => row !== undefined)) {
        for (const prop of first.keys()) {
          const column = rows.map(row => row.get(prop));
          if (column.every(v => v !== undefined)) add(column, node);
        }
      }
    }
    if (
      ts.isObjectLiteralExpression(node) &&
      (ts.isAsExpression(node.parent) ||
        ts.isSatisfiesExpression(node.parent)) &&
      !lockedBySatisfies(node)
    ) {
      const keys = node.properties.flatMap(p =>
        ts.isPropertyAssignment(p) &&
        (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))
          ? [p.name.text]
          : [],
      );
      if (keys.length === node.properties.length) add(keys, node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return sets;
}

/** 집합 → 그 집합을 적은 자리. 서로 다른 파일 둘 이상에 있는 것만 남긴다. */
function findCopies(sets: readonly LiteralSet[]): Map<string, LiteralSet[]> {
  const byKey = new Map<string, LiteralSet[]>();
  for (const set of sets) {
    const key = set.values.join('|');
    byKey.set(key, [...(byKey.get(key) ?? []), set]);
  }
  return new Map(
    [...byKey].filter(
      ([, sites]) => new Set(sites.map(site => site.file)).size >= 2,
    ),
  );
}

const at = (sets: readonly LiteralSet[]) =>
  sets.map(s => `${s.file}:${s.line}`).sort();

describe('리터럴 집합 수집기 (대조군)', () => {
  test('유니온·문자열 배열·as const 키·객체 배열의 같은 속성을 집합으로 본다', () => {
    const sets = collectLiteralSets(
      'x.ts',
      `type A = 'a' | 'b';
       const B = ['c', 'd'];
       const C = { e: 1, f: 2 } as const;
       const D = [{ id: 'g', label: 'G' }, { id: 'h', label: 'H' }];`,
    );
    expect(sets.map(s => s.values.join('|')).sort()).toEqual([
      'G|H',
      'a|b',
      'c|d',
      'e|f',
      'g|h',
    ]);
  });

  test('타입 인자·이름 있는 타입에 묶인 값·원소 하나는 보지 않는다', () => {
    const sets = collectLiteralSets(
      'x.ts',
      `type P = Pick<T, 'a' | 'b'>;
       type I = T['c' | 'd'];
       const L = { e: 1, f: 2 } as const satisfies Record<K, number>;
       const R = ['g', 'h'] as const satisfies readonly K[];
       const S = { i: 1 } as const;`,
    );
    expect(sets).toEqual([]);
  });

  test('Record<string, …>은 키를 정하지 않는다 — 그 키는 집합이다', () => {
    const sets = collectLiteralSets(
      'x.ts',
      `const L = { a: 1, b: 2 } as const satisfies Record<string, number>;`,
    );
    expect(sets.map(s => s.values.join('|'))).toEqual(['a|b']);
  });

  test('다른 파일의 같은 집합만 사본이다 — 같은 파일의 반복과 부분집합은 둔다', () => {
    const copies = findCopies([
      ...collectLiteralSets(
        'a.ts',
        `type A = 'x' | 'y'; type B = 'p' | 'q' | 'r';`,
      ),
      ...collectLiteralSets(
        'b.ts',
        `const A = ['y', 'x']; const B = ['p', 'q'];`,
      ),
      ...collectLiteralSets(
        'c.ts',
        `type M = 'm' | 'n'; const M = ['m', 'n'];`,
      ),
    ]);
    expect([...copies.keys()]).toEqual(['x|y']);
  });
});

const PRODUCTION_FILES = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '--', ...ROOTS],
  { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
)
  .split('\n')
  .filter(file => SOURCE.test(file) && !TEST.test(file));

const COPIES = findCopies(
  PRODUCTION_FILES.flatMap(file =>
    collectLiteralSets(file, readFileSync(`${REPO_ROOT}${file}`, 'utf8')),
  ),
);

test('검사가 비어 있지 않다 — 저장소의 프로덕션 파일을 실제로 읽는다', () => {
  expect(PRODUCTION_FILES.length).toBeGreaterThan(200);
});

test('같은 리터럴 집합을 두 파일이 손으로 적지 않는다 — 한 출처에서 파생한다', () => {
  const unlocked = [...COPIES]
    .filter(([key]) => !LOCKED_ELSEWHERE.has(key))
    .map(([key, sites]) => `${key} — ${at(sites).join(', ')}`);
  expect(unlocked).toEqual([]);
});

test('LOCKED_ELSEWHERE의 사본은 아직 있다 — 없어졌으면 목록에서 지운다', () => {
  const stale = [...LOCKED_ELSEWHERE.keys()].filter(key => !COPIES.has(key));
  expect(stale).toEqual([]);
});
