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
      const indentMatch = normalized.match(/^( *)/);
      // `( *)`는 매치에 항상 참여한다(빈 문자열 가능).
      const indent = indentMatch ? indentMatch[1]!.length : 0;
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
  for (let i = 0; i < lines.length; i++) {
    // 루프 조건이 인덱스 범위를 보장한다 (아래 j 루프도 동일).
    const line = lines[i]!;
    const ancestorContinues: boolean[] = [];
    for (let d = 1; d < line.depth; d++) {
      let hasMoreSibling = false;
      for (let j = i + 1; j < lines.length; j++) {
        const later = lines[j]!;
        if (later.depth < d) break;
        if (later.depth === d) {
          hasMoreSibling = true;
          break;
        }
      }
      ancestorContinues.push(hasMoreSibling);
    }
    let isLast = true;
    for (let j = i + 1; j < lines.length; j++) {
      const later = lines[j]!;
      if (later.depth < line.depth) break;
      if (later.depth === line.depth) {
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
