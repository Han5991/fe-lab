'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { css } from '@design-system/ui-lib/css';

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
  transition: '[color 0.15s]',
  _hover: { color: 'ink.950' },
  _after: {
    content: '""',
    pos: 'absolute',
    insetBlock: '[-8px]',
    insetInline: '[-7px]',
  },
});

// 현재 위치는 포인트색으로 표시한다. 무채색 굵기만으로는 13px 링크 셋 중
// 어디에 있는지 눈에 안 들어온다. hover는 한 단계 더 진한 700으로 가야
// 활성 링크에서도 hover 반응이 보인다.
const activeStyle = css.raw({
  color: 'accent.600',
  fontWeight: 'semibold',
  _hover: { color: 'accent.700' },
});

interface NavLinksProps {
  /**
   * `rail`은 세로 사이드 레일용이다 — 좁은 화면에서는 상단 바가 되므로
   * 가로/세로 전환을 이 컴포넌트가 함께 책임진다. 호출부가 flexDir만 바꾸면
   * 글자는 여전히 가로로 누워 64px 레일을 넘친다.
   */
  variant?: 'bar' | 'rail';
}

export function NavLinks({ variant = 'bar' }: NavLinksProps = {}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="주요 메뉴"
      className={css({
        display: 'flex',
        alignItems: 'center',
        // 좁은 화면에서 로고+네비+검색+토글이 한 줄에 들어가도록 gap만 줄인다.
        gap: { base: '[14px]', md: '[20px]' },
        ...(variant === 'rail'
          ? {
              // lg 미만에서는 레일이 상단 바로 눕는다 — 그때는 bar와 같은 가로쓰기다.
              writingMode: { base: '[horizontal-tb]', lg: '[vertical-rl]' },
              gap: { base: '[14px]', lg: '[18px]' },
            }
          : {}),
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
            className={css(linkStyle, isActive ? activeStyle : undefined)}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
