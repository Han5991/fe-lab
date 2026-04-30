import { Children, isValidElement } from 'react';
import type { ReactNode } from 'react';
import { css } from '@design-system/ui-lib/css';

interface FileTreeProps {
  children?: ReactNode;
}

function extractText(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (children == null || typeof children === 'boolean') return '';
  if (Array.isArray(children)) {
    return children.map(extractText).join('');
  }
  if (isValidElement<{ children?: ReactNode }>(children)) {
    return extractText(children.props.children);
  }
  return '';
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
      const indent = indentMatch ? indentMatch[1].length : 0;
      const depth = Math.floor(indent / 2);
      const trimmed = normalized.trim();
      const isDir = trimmed.endsWith('/');
      const name = isDir ? trimmed.slice(0, -1) : trimmed;
      return { depth, name, isDir };
    });
}

function renderTreeLine(line: Line, isLast: boolean, ancestorContinues: boolean[]): string {
  const branches = ancestorContinues
    .map(c => (c ? '│  ' : '   '))
    .join('');
  const connector = isLast ? '└─ ' : '├─ ';
  return `${branches}${connector}${line.name}${line.isDir ? '/' : ''}`;
}

export function FileTree({ children }: FileTreeProps) {
  const text = Children.toArray(children).map(extractText).join('\n');
  const lines = parseLines(text);

  const rendered: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ancestorContinues: boolean[] = [];
    for (let d = 0; d < line.depth; d++) {
      let hasMoreSibling = false;
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].depth < d) break;
        if (lines[j].depth === d) {
          hasMoreSibling = true;
          break;
        }
      }
      ancestorContinues.push(hasMoreSibling);
    }
    let isLast = true;
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].depth < line.depth) break;
      if (lines[j].depth === line.depth) {
        isLast = false;
        break;
      }
    }
    rendered.push(renderTreeLine(line, isLast, ancestorContinues));
  }

  return (
    <pre
      className={css({
        bg: 'ink.50',
        border: '1px solid',
        borderColor: 'ink.border',
        rounded: 'lg',
        px: '5',
        py: '4',
        my: '6',
        fontSize: 'sm',
        lineHeight: '1.7',
        color: 'ink.700',
        overflow: 'auto',
        fontFamily: 'mono',
      })}
    >
      {rendered.join('\n')}
    </pre>
  );
}
