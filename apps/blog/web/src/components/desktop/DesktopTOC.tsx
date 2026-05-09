'use client';

import { css } from '@design-system/ui-lib/css';
import { useTocHook, scrollToId } from '@/src/components/tocHooks';

export const DesktopTOC = () => {
  const { toc, activeId } = useTocHook();

  return (
    <nav
      className={css({
        pos: 'sticky',
        top: '[120px]',
        alignSelf: 'start',
        display: 'none',
        lg: { display: 'block' },
        w: '[240px]',
        maxH: '[calc(100vh - 140px)]',
        overflowY: 'auto',
        pl: '4',
        borderLeftWidth: '[1px]',
        borderColor: 'ink.100',
      })}
    >
      <h4
        className={css({
          textTransform: 'uppercase',
          fontSize: 'xs',
          fontWeight: 'bold',
          color: 'ink.400',
          mb: '4',
          letterSpacing: 'wider',
        })}
      >
        On this page
      </h4>
      <ul className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
        {toc.map(item => (
          <li
            key={item.id}
            onClick={() => scrollToId({ id: item.id, headerOffset: 100 })}
            className={css({
              fontSize: 'sm',
              color: activeId === item.id ? 'accent.600' : 'ink.500',
              fontWeight: activeId === item.id ? 'bold' : 'medium',
              cursor: 'pointer',
              lineHeight: 'headerSm',
              transition: '[all 0.2s]',
              borderLeftWidth: '[2px]',
              borderLeftColor:
                activeId === item.id ? 'accent.600' : 'transparent',
              ml: '[-17px]',
              paddingLeft:
                item.level === 4
                  ? '[39px]'
                  : item.level === 3
                    ? '[31px]'
                    : item.level === 2
                      ? '[23px]'
                      : '[15px]',
              _hover: { color: 'ink.950' },
            })}
          >
            {item.text}
          </li>
        ))}
      </ul>
    </nav>
  );
};
