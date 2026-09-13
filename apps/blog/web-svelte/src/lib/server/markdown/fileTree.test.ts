import { expect, test } from 'vitest';
import { parseTreeLines, renderFileTree } from './fileTree.ts';

test('parseTreeLines: 2-space 들여쓰기가 깊이가 되고 끝의 /가 디렉터리다', () => {
  expect(
    parseTreeLines(`
apps/
  blog/
    posts/
    web/
package.json
`),
  ).toStrictEqual([
    { depth: 0, name: 'apps', isDir: true },
    { depth: 1, name: 'blog', isDir: true },
    { depth: 2, name: 'posts', isDir: true },
    { depth: 2, name: 'web', isDir: true },
    { depth: 0, name: 'package.json', isDir: false },
  ]);
});

test('parseTreeLines: 탭은 2-space 단위로 정규화한다', () => {
  expect(parseTreeLines('a/\n\tb/')).toStrictEqual([
    { depth: 0, name: 'a', isDir: true },
    { depth: 1, name: 'b', isDir: true },
  ]);
});

test('renderFileTree: 마지막 형제만 └─, 나머지는 ├─', () => {
  expect(renderFileTree('src/\n  a.ts\n  b.ts')).toBe(
    ['src/', '├─ a.ts', '└─ b.ts'].join('\n'),
  );
});

test('renderFileTree: 조상에 형제가 더 있으면 세로줄이 이어진다', () => {
  // 이 규칙이 이 파일의 존재 이유다 — 커넥터 모양은 **뒤쪽 줄**을 봐야 정해진다.
  // `web/`이 `blog/` 아래 마지막이 아니므로, 그 아래 `src/` 줄의 1단 칼럼은
  // 공백이 아니라 `│`여야 한다.
  expect(renderFileTree('blog/\n  web/\n    src/\n  posts/')).toBe(
    ['blog/', '├─ web/', '│  └─ src/', '└─ posts/'].join('\n'),
  );
});

test('renderFileTree: 루트는 커넥터 없이 이름만 나온다', () => {
  expect(renderFileTree('a/\nb/')).toBe(['a/', 'b/'].join('\n'));
});

test('renderFileTree: 빈 줄과 후행 공백은 무시한다', () => {
  expect(renderFileTree('\n  \na/\n  b   \n\n')).toBe(
    ['a/', '└─ b'].join('\n'),
  );
});
