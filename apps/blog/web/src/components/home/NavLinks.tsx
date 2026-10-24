'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { css } from '@blog/styled-system/css';
import { POSTS_PATH } from '@blog/content/client';
import { ABOUT_PATH, SERIES_PATH } from '@/src/shared/routes';

/**
 * 헤더 네비게이션.
 *
 * 현재 경로 표시(활성 링크)에 `usePathname`이 필요해서 이 부분만 client로
 * 떼어냈습니다. Layout 자체는 서버 컴포넌트로 남습니다.
 */
const NAV_ITEMS = [
  { href: POSTS_PATH, label: '글' },
  { href: SERIES_PATH, label: '시리즈' },
  { href: ABOUT_PATH, label: 'About' },
] as const;

// 항목은 Astryx TopNavItem 모양이다 — 위아래 6 · 좌우 12 안쪽 여백에 라벨(14/20 500)이라 높이가
// 32px로 터치 타겟(WCAG 2.5.8의 24px)을 상자 자체가 넘는다(예전엔 글자만 있는 링크라 `::after`로
// 히트 영역을 넓혔다). hover에는 지면 한 단계(paper.100)가 element 라운드로 깔린다.
// md 미만은 좌우 8로 줄인다 — 360px 기기(거터를 빼면 320px)에서 워드마크·내비·아이콘 둘이 한 줄에
// 들어가야 한다(Layout의 헤더 주석).
//
// 스타일은 `css.raw`로 두고 합칠 때 `css(base, active)`를 쓴다. `cx`는 클래스
// 문자열을 이어붙이기만 해서 **충돌하는 원자 클래스를 병합하지 않는다** —
// `cx(linkStyle, activeStyle)`이면 활성 링크에 비활성 색 클래스와 활성 색이 둘 다
// 붙고, 승자는 클래스 순서가 아니라 스타일시트 순서가 정한다. 실제로 비활성
// 색이 이겨서 활성 표시가 굵기로만 남아 있었다. `css()`는 객체 단계에서
// 병합해 color 클래스를 하나만 낸다.
const linkStyle = css.raw({
  display: 'inline-flex',
  alignItems: 'center',
  px: { base: '2', md: '3' },
  py: '1.5',
  rounded: 'element',
  textStyle: 'label',
  color: 'ink.700',
  whiteSpace: 'nowrap',
  transition: 'colors',
  _hover: { color: 'ink.950', bg: 'paper.100' },
});

// 현재 위치는 accent.solid(본문 잉크) + semibold. 비활성 ink.700(목업의 보조 잉크)과는 명도
// 차가 2.30 / 1.87:1뿐이라 굵기가 함께 가른다(Astryx docsite의 TopNav 선택
// 항목도 배경 없이 굵기와 primary 잉크다). 활성 링크의 hover 색은 비활성 hover(ink.950)와
// 같은 값이라 따로 두지 않는다.
const activeStyle = css.raw({
  color: 'accent.solid',
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
        // 항목 사이 4px — Astryx TopNav. 간격은 항목의 안쪽 여백이 낸다.
        gap: '1',
      })}
    >
      {NAV_ITEMS.map(item => {
        // trailingSlash: true라 pathname도 `/posts/` 형태다. 글 상세
        // (`/posts/foo/`)에서도 "글"이 활성으로 보이도록 prefix로 판정한다.
        // 홈(`/`)은 어느 항목의 경로로도 시작하지 않아 활성이 없다 — 홈은 글 허브지만
        // 내비의 어느 링크도 홈을 가리키지 않는다(목업은 홈에서 "글"을 켰다).
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={css(linkStyle, isActive ? activeStyle : undefined)}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
