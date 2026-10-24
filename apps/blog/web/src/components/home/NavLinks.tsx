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

// 터치 타겟은 의사요소로 넓힌다. Layout에서 옮겨올 때 빠진 px/py를 그대로
// 되살리면 링크 사이 간격이 레퍼런스(20px, 모바일 14px)보다 벌어진다. `::after`
// 로 히트 영역만 키우면 시각적 배치는 그대로 두고 탭 영역만 넓힐 수 있다.
// 가장 좁은 링크("글", 11px)가 11+14=25px가 되어 WCAG 2.5.8의 24px를 넘고,
// 세로는 20+16=36px다. 좌우 7px씩(총 14px) 확장은 모바일 간격 14px과 정확히
// 맞물려 인접 링크와 겹치지 않는다.
//
// 스타일은 `css.raw`로 두고 합칠 때 `css(base, active)`를 쓴다. `cx`는 클래스
// 문자열을 이어붙이기만 해서 **충돌하는 원자 클래스를 병합하지 않는다** —
// `cx(linkStyle, activeStyle)`이면 활성 링크에 `c_ink.600`과 활성 색이 둘 다
// 붙고, 승자는 클래스 순서가 아니라 스타일시트 순서가 정한다. 실제로 비활성
// 색이 이겨서 활성 표시가 굵기로만 남아 있었다. `css()`는 객체 단계에서
// 병합해 color 클래스를 하나만 낸다.
const linkStyle = css.raw({
  pos: 'relative',
  fontSize: '[13px]',
  color: 'ink.600',
  transition: 'colors',
  _hover: { color: 'ink.950' },
  _after: {
    content: '""',
    pos: 'absolute',
    insetBlock: '[-8px]',
    insetInline: '[-7px]',
  },
});

// 현재 위치는 accent.solid(본문 잉크) + semibold. 비활성 ink.600과는 명도 차가
// 3.60 / 2.59:1뿐이라 굵기가 함께 가른다(Astryx docsite의 TopNav 선택 항목도 배경 없이
// 굵기와 primary 잉크다). 활성 링크의 hover 색은 비활성 hover(ink.950)와 같은 값이라
// 따로 두지 않는다.
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
            ? item.href === POSTS_PATH
            : pathname.startsWith(item.href);
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
