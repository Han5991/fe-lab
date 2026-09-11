/**
 * `<file-tree>` 본문(2-space 들여쓰기)을 트리 문자열로 옮긴다.
 *
 * React 판(`FileTree.tsx`)과 **같은 규칙**이다 — 들여쓰기 2칸이 한 단계, 끝의
 * `/`가 디렉터리, 루트(depth 0)는 커넥터 없이 이름만. 규칙이 갈리면 같은 원고가
 * 두 사이트에서 다른 모양으로 그려진다.
 *
 * 파싱을 렌더에서 떼어 둔 이유는 이 로직이 유일하게 **알고리즘**이기 때문이다.
 * 나머지 커스텀 태그는 속성을 클래스에 잇는 일이라 눈으로 검증되지만, 커넥터
 * 모양은 "뒤에 같은 깊이의 형제가 또 있나"를 봐야 정해져서 테스트가 필요하다.
 */

export interface TreeLine {
  depth: number;
  name: string;
  isDir: boolean;
}

/** 2-space 들여쓰기 컨벤션 (탭은 2-space 단위로 정규화). */
export function parseTreeLines(raw: string): TreeLine[] {
  return raw
    .split('\n')
    .map(line => line.replace(/\s+$/, ''))
    .filter(line => line.trim().length > 0)
    .map(line => {
      const normalized = line.replace(/^\t+/, m => '  '.repeat(m.length));
      const indent = (/^( *)/.exec(normalized)?.[1] ?? '').length;
      const depth = Math.floor(indent / 2);
      const trimmed = line.trim();
      const isDir = trimmed.endsWith('/');
      const name = isDir ? trimmed.slice(0, -1) : trimmed;
      return { depth, name, isDir };
    });
}

function renderLine(
  line: TreeLine,
  isLast: boolean,
  ancestorContinues: boolean[],
): string {
  // 루트는 커넥터 없이 이름만 — 표준 트리 모양이다.
  if (line.depth === 0) return `${line.name}${line.isDir ? '/' : ''}`;
  const branches = ancestorContinues.map(c => (c ? '│  ' : '   ')).join('');
  const connector = isLast ? '└─ ' : '├─ ';
  return `${branches}${connector}${line.name}${line.isDir ? '/' : ''}`;
}

/**
 * 커넥터가 붙은 트리 문자열.
 *
 * 각 줄의 모양은 **뒤쪽 줄만** 보고 정해진다 — "이 아래에 같은 깊이의 형제가 또
 * 있나"가 `├─`와 `└─`를, 조상 깊이마다 같은 질문이 `│`와 공백을 가른다.
 */
export function renderFileTree(raw: string): string {
  const lines = parseTreeLines(raw);
  const out: string[] = [];

  for (const [i, line] of lines.entries()) {
    const later = lines.slice(i + 1);

    const ancestorContinues: boolean[] = [];
    for (let d = 1; d < line.depth; d++) {
      let hasMoreSibling = false;
      for (const candidate of later) {
        if (candidate.depth < d) break;
        if (candidate.depth === d) {
          hasMoreSibling = true;
          break;
        }
      }
      ancestorContinues.push(hasMoreSibling);
    }

    let isLast = true;
    for (const candidate of later) {
      if (candidate.depth < line.depth) break;
      if (candidate.depth === line.depth) {
        isLast = false;
        break;
      }
    }

    out.push(renderLine(line, isLast, ancestorContinues));
  }

  return out.join('\n');
}
