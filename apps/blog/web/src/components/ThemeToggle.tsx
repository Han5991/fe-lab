'use client';

import { Sun, Moon } from 'lucide-react';
import { css } from '@design-system/ui-lib/css';
import { setTheme } from '@/src/hooks/useTheme';

// 아이콘은 JS 상태가 아니라 CSS(html[data-theme])로 토글한다.
// - SSG hydration: 서버는 theme을 모르지만(getServerSnapshot='dark'), 이 컴포넌트는
//   theme 값에 의존해 렌더하지 않으므로 서버/클라 마크업이 항상 같다 → 불일치 없음.
// - 깜빡임 없음: FOUC 방지 인라인 스크립트가 paint 전에 세팅한 data-theme에 CSS가
//   즉시 반응한다.
// onClick은 신뢰 가능한 현재값을 DOM에서 직접 읽어(초기 hydration 창의 stale
// state로 첫 클릭이 no-op가 되던 문제 방지) 반대 테마로 전환한다.
export function ThemeToggle() {
  const toggle = () => {
    const current =
      document.documentElement.dataset['theme'] === 'light' ? 'light' : 'dark';
    setTheme(current === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="테마 전환 (라이트/다크)"
      title="테마 전환"
      className={css({
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSize: '9',
        rounded: '[6px]',
        color: 'ink.600',
        cursor: 'pointer',
        transition: '[all 0.15s]',
        _hover: { color: 'ink.950', bg: 'paper.100' },
      })}
    >
      {/* 다크일 때 Sun(→라이트 전환 안내), 라이트일 때 Moon(→다크 전환 안내) */}
      <Sun
        size={16}
        className={css({ display: 'none', _dark: { display: 'inline-flex' } })}
      />
      <Moon
        size={16}
        className={css({ display: 'inline-flex', _dark: { display: 'none' } })}
      />
    </button>
  );
}
