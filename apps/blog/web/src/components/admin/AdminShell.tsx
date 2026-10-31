'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink, LogOut } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { css, cx } from '@blog/styled-system/css';
import {
  ADMIN_ANALYTICS_PATH,
  ADMIN_PATH,
  HOME_PATH,
} from '@/src/shared/routes';
import { ADMIN_VIEW_TRANSITION } from '@/src/shared/adminViewTransitions';
import { useAdminLogout } from '@/src/hooks/useAdminLogout';
import { actionButton } from '../actionButton';
import { iconButton } from '../iconButton';
import { pressTextBox } from '../interaction';
import { railGutter } from '../Rail';
import { siteHeaderStyle } from '../siteHeader';
import { MAIN_ID, skipLink } from '../skipLink';
import { ThemeToggle } from '../ThemeToggle';
import { WORDMARK, wordmarkLink } from '../wordmark';
import { AdminGuard } from './AdminGuard';
import { pillBadge } from './adminStyles';

/** 관리자 내비 — 화면 순서가 곧 배열 순서다. */
const NAV_ITEMS = [
  { href: ADMIN_PATH, label: '대시보드' },
  { href: ADMIN_ANALYTICS_PATH, label: '분석' },
] as const;

/**
 * 현재 위치 — 경로를 접두로 갖는 항목 중 가장 긴 것. 대시보드(`/admin/`)는 모든 admin 경로의
 * 접두라 접두만 보면 분석에서도 켜진다. dev 서버의 무슬래시형(`/admin/analytics`)도 같은 항목이다.
 */
function currentNavHref(pathname: string): string | undefined {
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return NAV_ITEMS.filter(item => path.startsWith(item.href)).reduce<
    string | undefined
  >(
    (longest, item) =>
      longest === undefined || item.href.length > longest.length
        ? item.href
        : longest,
    undefined,
  );
}

// 내비 항목은 사이트 헤더 내비(NavLinks)와 같은 Astryx TopNavItem 모양이다 — 위아래 6 · 좌우 12
// (md 미만 8), element 라운드, label. 현재 위치는 본문 잉크 + semibold.
const navLink = css.raw(pressTextBox, {
  display: 'inline-flex',
  alignItems: 'center',
  px: { base: '2', md: '3' },
  py: '1.5',
  rounded: 'element',
  textStyle: 'label',
  color: 'ink.700',
  whiteSpace: 'nowrap',
  _hover: { color: 'ink.950', bg: 'paper.200' },
});

const navLinkCurrent = css.raw({
  color: 'accent.solid',
  fontWeight: 'semibold',
});

/**
 * 바의 높이 변수와 View Transition 이름. 이름은 인라인 `view-transition-name`이 아니라 변수로 실어
 * 클래스가 읽는다(`barClass`) — 인라인 속성은 셀렉터로 덮을 수 없어서다.
 */
const barStyle: CSSProperties & Record<`--${string}`, string> = {
  ...siteHeaderStyle,
  '--admin-bar-transition-name': ADMIN_VIEW_TRANSITION.bar,
};

// 바의 아이콘 버튼 — ghost의 hover 면(paper.100)은 라이트 바닥(surface.base)과 같은 색이라 한 단계 위로 올린다.
const barIconButton = css(iconButton.raw({ tone: 'ghost', size: 'md' }), {
  _hover: { bg: 'paper.200' },
});

const barClass = css({
  h: '[var(--site-header-height)]',
  pos: 'sticky',
  top: '0',
  zIndex: '10',
  bg: 'surface.base/80',
  backdropFilter: 'auto',
  backdropBlur: '[12px]',
  borderBottomWidth: 'hairline',
  borderColor: 'ink.border',
  viewTransitionName: 'var(--admin-bar-transition-name)',
  // 모달(좁은 화면의 글 통계 시트)이 떠 있는 동안은 이름을 뗀다. 이름 붙은 바는 전환마다 따로 찍혀
  // 루트 위에 그려지는데, 시트·스크림은 들고 날 때만 이름이 붙고 그 사이의 전환(시트 안 분포가
  // 도착해 스켈레톤이 걷히는 것 등)에서는 루트 스냅샷 안에 있다 — 그때 바가 시트 머리와 스크림 위로
  // 올라온다(실측, 375·768). 이름을 떼면 바는 루트 안에서 시트·스크림 아래 제자리에 있다. 시트가
  // 들고 나는 전환에서는 바가 한쪽 상태에만 이름을 가져 자기 자신과 교차한다 — 같은 그림이라 보이지
  // 않는다.
  'html:has([aria-modal=true]) &': { viewTransitionName: 'none' },
});

function AdminBar() {
  const pathname = usePathname();
  const current = currentNavHref(pathname);
  const { handleLogout } = useAdminLogout();

  return (
    // 높이는 사이트 헤더와 같은 48(Astryx TopNav)이고 같은 변수에서 온다 — 분석 화면의 오른쪽
    // 패널이 이 높이 아래에 붙는다. 사이트 헤더와 달리 아래 hairline을 둔다(승인 목업): 분석
    // 화면에서 패널의 왼쪽 보더와 만나 화면을 나눈다.
    // 페이지 전환·패널·정렬의 View Transition에서는 사이트 헤더처럼 따로 찍혀 페이지 위에 남는다
    // (`ADMIN_VIEW_TRANSITION.bar` — 스크롤된 채 바뀌는 목록이 바 자리에 덧칠되지 않게).
    <header style={barStyle} className={barClass}>
      {/* 세 슬롯 — 워드마크·배지 | 내비 | 블로그·테마·로그아웃. md 이상은 사이트 헤더와 같은
          `1fr auto 1fr` 격자라 내비가 화면 가운데에 선다. md 미만은 워드마크를 숨기고(배지가
          admin임을 말한다) 로그아웃을 아이콘만 남겨 360px 기기에도 한 줄에 들어간다. */}
      <div
        className={cx(
          railGutter,
          css({
            h: 'full',
            display: { base: 'flex', md: 'grid' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '2',
            gridTemplateColumns: { md: '[1fr auto 1fr]' },
          }),
        )}
      >
        <div
          className={css({ display: 'flex', alignItems: 'center', gap: '2' })}
        >
          <Link
            href={ADMIN_PATH}
            className={css(wordmarkLink, {
              display: { base: 'none', md: 'inline-flex' },
            })}
          >
            {WORDMARK}
          </Link>
          <span className={css(pillBadge)}>Admin</span>
        </div>

        <nav
          aria-label="관리자 메뉴"
          className={css({ display: 'flex', alignItems: 'center', gap: '1' })}
        >
          {NAV_ITEMS.map(item => {
            const isCurrent = item.href === current;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isCurrent ? 'page' : undefined}
                className={css(navLink, isCurrent ? navLinkCurrent : undefined)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '2',
          })}
        >
          {/* 블로그는 새 탭 — 관리 화면을 떠나지 않고 글을 확인한다. */}
          <a
            href={HOME_PATH}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="블로그 열기"
            className={barIconButton}
          >
            <ExternalLink size={18} aria-hidden />
          </a>
          {/* 사이트 헤더와 같은 컴포넌트 — 같은 쿠키·같은 View Transition 전환. */}
          <ThemeToggle className={barIconButton} />
          <button
            type="button"
            onClick={() => void handleLogout()}
            aria-label="로그아웃"
            className={actionButton({ tone: 'neutral', size: 'md' })}
          >
            <LogOut size={16} aria-hidden />
            <span className={css({ display: { base: 'none', md: 'inline' } })}>
              로그아웃
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

/**
 * admin 셸 — 관리자 바와 본문. 루트 레이아웃이 admin에는 사이트 셸을 씌우지 않으므로
 * (`ShellSwitch`) 이 셸이 admin 화면의 header·main 랜드마크다. 가드 안에 있어 관리자로 확인된
 * 뒤에만 그린다 — 바가 리다이렉트 전에 비치지 않는다.
 *
 * 레이아웃의 즉시 로드 청크에 auth 배럴(로그아웃)을 끌어오지 않도록 `AdminLayoutClient`가
 * 가드와 함께 지연 로드한다.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <a href={`#${MAIN_ID}`} className={skipLink}>
        본문으로 건너뛰기
      </a>
      <AdminBar />
      {/* tabIndex -1: 건너뛰기 링크가 초점을 여기로 옮길 수 있게(탭 순서에는 없다). */}
      <main
        id={MAIN_ID}
        tabIndex={-1}
        className={css({ flex: '1', w: 'full', outline: 'none' })}
      >
        {children}
      </main>
    </AdminGuard>
  );
}
