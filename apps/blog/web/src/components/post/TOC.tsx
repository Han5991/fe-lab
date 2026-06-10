'use client';

import { css } from '@design-system/ui-lib/css';
import { useTocHook, scrollToId } from '@/src/components/tocHooks';
import { Label } from '@/src/components/blog/Label';

export const TOC = () => {
  const { toc, activeId } = useTocHook();
  if (toc.length === 0) return null;

  return (
    <nav
      className={css({
        pos: 'sticky',
        top: '24',
        alignSelf: 'start',
        display: 'none',
        lg: { display: 'block' },
        maxH: '[calc(100vh - 100px)]',
        overflowY: 'auto',
      })}
      aria-label="이 글의 차례"
    >
      <Label
        tone="meta"
        className={css({
          display: 'block',
          mb: '3',
          pb: '2',
          borderBottomWidth: '[1px]',
          borderColor: 'ink.border',
        })}
      >
        이 글의 차례
      </Label>
      <ol
        className={css({
          listStyleType: 'none',
          p: '0',
          m: '0',
          fontFamily: 'sans',
          fontSize: 'sm',
          lineHeight: 'proseLoose',
        })}
      >
        {toc.map(item => {
          const isActive = activeId === item.id;
          const indent =
            item.level === 4
              ? '24px'
              : item.level === 3
                ? '16px'
                : item.level === 2
                  ? '8px'
                  : '0';
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => scrollToId({ id: item.id, headerOffset: 100 })}
                aria-current={isActive ? 'true' : undefined}
                className={css({
                  display: 'block',
                  width: 'full',
                  textAlign: 'left',
                  py: '0.5',
                  pl: '2',
                  cursor: 'pointer',
                  borderLeftWidth: '[2px]',
                  borderLeftColor: isActive ? 'ink.950' : 'transparent',
                  color: isActive ? 'ink.950' : 'ink.600',
                  fontWeight: isActive ? 'medium' : 'normal',
                  transition: '[all 0.15s]',
                  _hover: { color: 'ink.950' },
                })}
                style={{ paddingLeft: `calc(8px + ${indent})` }}
              >
                {item.text}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
