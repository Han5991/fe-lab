'use client';

import { css } from '@design-system/ui-lib/css';
import { useTocHook, scrollToId } from '@/src/components/tocHooks';

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
      {/* 레퍼런스의 섹션 캡션(.cap) 규격 — 모노 대문자 라벨 대신 12px 서브 텍스트 */}
      <span
        className={css({
          display: 'block',
          fontSize: '[12px]',
          color: 'ink.600',
          mb: '[10px]',
        })}
      >
        이 글의 차례
      </span>
      <ol
        className={css({
          listStyleType: 'none',
          p: '0',
          m: '0',
          fontFamily: 'sans',
          fontSize: '[13px]',
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
                  py: '[2px]',
                  pl: '[8px]',
                  cursor: 'pointer',
                  // 현재 위치 표시는 그림자 없이 좌측 hairline 레일로만.
                  // 선은 비텍스트라 원색(accent.500), 글자는 AA 확보용 accent.600.
                  borderLeftWidth: '[2px]',
                  borderLeftStyle: 'solid',
                  borderLeftColor: isActive ? 'accent.500' : 'ink.border',
                  color: isActive ? 'accent.600' : 'ink.600',
                  fontWeight: isActive ? 'medium' : 'normal',
                  transition: '[color 0.15s, border-color 0.15s]',
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
