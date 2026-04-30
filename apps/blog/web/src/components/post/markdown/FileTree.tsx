import { Children } from 'react';
import type { ReactNode } from 'react';
import { css } from '@design-system/ui-lib/css';

interface FileTreeProps {
  children?: ReactNode;
}

function extractText(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (!children) return '';
  if (Array.isArray(children)) {
    return children.map(extractText).join('');
  }
  if (
    typeof children === 'object' &&
    'props' in children &&
    children.props &&
    typeof children.props === 'object' &&
    'children' in children.props
  ) {
    return extractText((children.props as { children: ReactNode }).children);
  }
  return '';
}

interface Line {
  depth: number;
  name: string;
  isDir: boolean;
}

function parseLines(raw: string): Line[] {
  return raw
    .split('\n')
    .map(line => line.replace(/\s+$/, ''))
    .filter(line => line.trim().length > 0)
    .map(line => {
      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1].length : 0;
      const depth = Math.floor(indent / 2);
      const trimmed = line.trim();
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
