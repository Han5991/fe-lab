import { Children } from 'react';
import type { ReactNode } from 'react';
import { css } from '@design-system/ui-lib/css';

import { codeText } from '../markdownCode';

interface FileTreeProps {
  children?: ReactNode;
}

interface Line {
  depth: number;
  name: string;
  isDir: boolean;
}

// 2-space 들여쓰기 컨벤션 (탭은 2-space 단위로 정규화)
function parseLines(raw: string): Line[] {
  return raw
    .split('\n')
    .map(line => line.replace(/\s+$/, ''))
    .filter(line => line.trim().length > 0)
    .map(line => {
      const normalized = line.replace(/^\t+/, m => '  '.repeat(m.length));
      const indent = (/^( *)/.exec(normalized)?.[1] ?? '').length;
      const depth = Math.floor(indent / 2);
      const trimmed = normalized.trim();
      const isDir = trimmed.endsWith('/');
      const name = isDir ? trimmed.slice(0, -1) : trimmed;
      return { depth, name, isDir };
    });
}

function renderTreeLine(
  line: Line,
  isLast: boolean,
  ancestorContinues: boolean[],
): string {
  // 루트(depth 0)는 커넥터 없이 이름만 — 표준 트리 모양
  if (line.depth === 0) {
    return `${line.name}${line.isDir ? '/' : ''}`;
  }
  // 조상(depth ≥ 1) 칼럼만 그린다. 루트(depth 0)는 브랜치 칼럼을 차지하지 않고,
  // 아래 loop가 d=1부터 채우므로 별도 slice가 필요 없다.
  const branches = ancestorContinues.map(c => (c ? '│  ' : '   ')).join('');
  const connector = isLast ? '└─ ' : '├─ ';
  return `${branches}${connector}${line.name}${line.isDir ? '/' : ''}`;
}

export function FileTree({ children }: FileTreeProps) {
  const text = Children.toArray(children).map(codeText).join('\n');
  const lines = parseLines(text);

  const rendered: string[] = [];
  // entries()로 도는 이유는 인덱스와 값을 함께 쓰기 때문이다. `lines[i]`로
  // 꺼내면 타입이 `Line | undefined`가 되고(noUncheckedIndexedAccess), 그걸
  // 좁히는 유일한 방법이 non-null 단언이었다.
  for (const [i, line] of lines.entries()) {
    // 뒤쪽 줄만 본다 — "이 아래에 같은 깊이의 형제가 또 있나"가 커넥터 모양을
    // 정한다. slice로 잘라 두면 인덱스 산술 없이 값만 보면 된다.
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

    rendered.push(renderTreeLine(line, isLast, ancestorContinues));
  }

  return (
    <pre
      className={css({
        bg: 'paper.100',
        borderWidth: 'hairline',
        borderColor: 'ink.border',
        rounded: 'control',
        px: '5',
        py: '4',
        my: '6',
        fontSize: '[13px]',
        lineHeight: 'proseLoose',
        color: 'ink.700',
        overflow: 'auto',
        fontFamily: 'mono',
      })}
    >
      {rendered.join('\n')}
    </pre>
  );
}
