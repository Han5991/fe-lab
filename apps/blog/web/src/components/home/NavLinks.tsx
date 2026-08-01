'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { css, cx } from '@design-system/ui-lib/css';

/**
 * 헤더 네비게이션.
 *
 * 현재 경로 표시(활성 링크)에 `usePathname`이 필요해서 이 부분만 client로
 * 떼어냈습니다. Layout 자체는 서버 컴포넌트로 남습니다.
 */
const NAV_ITEMS = [
  { href: '/posts/', label: '글' },
  { href: '/series/', label: '시리즈' },
  { href: '/about/', label: 'About' },
] as const;

const linkStyle = css({
  fontSize: '[13px]',
  color: 'ink.600',
  transition: '[color 0.15s]',
  _hover: { color: 'ink.950' },
});

const activeStyle = css({
  color: 'ink.950',
  fontWeight: 'semibold',
});

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주요 메뉴"
      className={css({
        display: 'flex',
        alignItems: 'center',
        // 좁은 화면에서 로고+네비+검색+토글이 한 줄에 들어가도록 gap만 줄인다.
        gap: { base: '[14px]', md: '[20px]' },
      })}
    >
      {NAV_ITEMS.map(item => {
        // trailingSlash: true라 pathname도 `/posts/` 형태다. 글 상세
        // (`/posts/foo/`)에서도 "글"이 활성으로 보이도록 prefix로 판정한다.
        //
        // 홈(`/`)은 예외로 "글"을 켠다. 리뉴얼 후 홈 자체가 대표글 + 글 목록을
        // 얹은 글 허브라 레퍼런스 화면 1도 "글"을 활성으로 그려 뒀다.
        const isActive =
          pathname === '/'
            ? item.href === '/posts/'
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cx(linkStyle, isActive ? activeStyle : undefined)}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
