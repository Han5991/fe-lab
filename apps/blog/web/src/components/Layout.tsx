import {
  AUTHOR_ALTERNATE_NAME,
  AUTHOR_LINKEDIN,
  SITE_DESCRIPTION,
} from '@/content.values.mts';
import { ABOUT_PATH, HOME_PATH, PRIVACY_PATH } from '@/src/shared/routes';
import { VIEW_TRANSITION } from '@/src/shared/viewTransitions';
import { css, cx } from '@blog/styled-system/css';
import type { ReactNode } from 'react';

import { headerIconButton, iconButton } from './iconButton';
import { railGutter } from './Rail';
import { SOCIAL_LINKS, ShellLink } from './shellLinks';
import { siteHeaderStyle } from './siteHeader';
import { NavLinks } from './home/NavLinks';
import { SearchDialog } from './search/SearchDialog';
import { TransitionLink } from './shared/TransitionLink';
import { ThemeToggle } from './ThemeToggle';

interface LayoutProps {
  children: ReactNode;
}

/**
 * 화면의 워드마크 — 헤더(홈 링크)와 푸터(글자)가 같은 표기를 쓴다. 표기만 도메인이고, metadata·JSON-LD의
 * 사이트명(`SITE_NAME`, Frontend Lab)은 검색 색인 보호를 위해 그대로 둔다.
 */
const WORDMARK = 'sangwook.dev';

/** 건너뛰기 링크가 가리키는 본문 영역 id. */
const MAIN_ID = 'main-content';

// 헤더의 탭 정지점을 건너뛰는 링크 — 초점을 받을 때만 나타난다.
const skipLink = css({
  pos: 'absolute',
  top: '2',
  left: '4',
  zIndex: '60',
  px: '3',
  py: '2',
  bg: 'paper.50',
  color: 'ink.950',
  fontSize: 'sm',
  borderWidth: 'hairline',
  borderColor: 'ink.borderStrong',
  rounded: 'element',
  transform: 'translateY(-200%)',
  _focus: { transform: 'none' },
});

/**
 * 푸터 가운데의 글자 링크. GitHub·RSS는 넣지 않는다 — 같은 줄 오른쪽에 아이콘(`SOCIAL_LINKS`)으로
 * 이미 있다.
 */
const FOOTER_LINKS = [
  { href: ABOUT_PATH, kind: 'route', label: 'About' },
  { href: PRIVACY_PATH, kind: 'route', label: '개인정보' },
  { href: AUTHOR_LINKEDIN, kind: 'external', label: 'LinkedIn' },
] as const;

const footerLink = css({
  color: 'ink.700',
  transition: 'colors',
  _hover: { color: 'ink.950', textDecorationLine: 'underline' },
});

const footerIconButton = iconButton({ tone: 'neutral', size: 'md' });

/**
 * 셸 — Astryx docsite의 TopNav·SiteFooter 모양(승인 목업)이다.
 *
 * **헤더·푸터는 레일 없이 전폭이고 좌우 여백은 거터(`railGutter`) 하나다.** 페이지마다 본문
 * 레일(wide 1200 / text 752)이 달라도 헤더는 화면 양끝에 붙어 있어 어느 페이지에서나 같은 자리다.
 * 목업은 헤더 8 + 워드마크 8, 푸터 24를 좌우에 줬는데 거터 단일 출처(AGENTS.md §9)를 따라 20/32로
 * 바꿨다 — 워드마크도 자기 좌우 여백을 두지 않아 글자가 거터 선에서 시작한다(본문이 레일을 꽉
 * 채우는 1264px 이하에서는 본문 왼쪽 끝과 맞는다).
 */
export const Layout = ({ children }: LayoutProps) => {
  return (
    <div
      className={css({
        minH: '[100vh]',
        bg: 'paper.50',
        color: 'ink.950',
        display: 'flex',
        flexDir: 'column',
      })}
    >
      <a href={`#${MAIN_ID}`} className={skipLink}>
        본문으로 건너뛰기
      </a>
      {/* view-transition-name은 인라인으로 준다 — `siteHeaderStyle`은 진행 바도 쓰므로 거기
          두면 이름이 둘이 되고, 같은 이름이 둘이면 브라우저가 전환을 통째로 건너뛴다. */}
      <header
        style={{
          ...siteHeaderStyle,
          viewTransitionName: VIEW_TRANSITION.siteHeader,
        }}
        className={css({
          h: '[var(--site-header-height)]',
          pos: 'sticky',
          top: '0',
          // sticky 헤더라 아래로 본문이 지나간다. 구분선 없이 반투명 지면과 흐림으로만 지면
          // 위에 떠 있다는 걸 드러낸다(Astryx docsite의 상단 내비 — 지면 80% + blur 12) —
          // 불투명하면 스크롤 중에 본문이 헤더 경계에서 뚝 잘려 보인다.
          bg: 'paper.50/80',
          // Panda의 흐림은 `backdropFilter: 'auto'` + `backdropBlur`다(임의값이면 규칙이 안 나간다).
          // backdrop-filter는 헤더를 fixed 자손의 containing block으로 만든다 —
          // 뷰포트를 덮는 오버레이는 <Portal>로 body에 띄울 것.
          backdropFilter: 'auto',
          backdropBlur: '[12px]',
          zIndex: '10',
        })}
      >
        {/* 세 슬롯 — 워드마크 | 내비 | 아이콘. md 이상은 `1fr auto 1fr` 격자라 내비가 화면
            가운데에 선다(Astryx TopNav). md 미만은 격자를 끄고 양끝 정렬 한 줄이다 — GitHub·RSS를
            숨기고(푸터에 같은 아이콘이 있다) 아이콘 28px·내비 좌우 여백 8로 줄여, 360px 기기
            (거터를 빼면 320px)에도 들어간다. */}
        <div
          className={cx(
            railGutter,
            css({
              h: 'full',
              display: { base: 'flex', md: 'grid' },
              alignItems: 'center',
              justifyContent: 'space-between',
              gridTemplateColumns: { md: '[1fr auto 1fr]' },
            }),
          )}
        >
          <div className={css({ display: 'flex', alignItems: 'center' })}>
            <TransitionLink
              href={HOME_PATH}
              className={css({
                display: 'inline-flex',
                alignItems: 'center',
                minH: '8',
                fontFamily: 'mono',
                fontWeight: 'medium',
                fontSize: '[15px]',
                color: 'ink.950',
                whiteSpace: 'nowrap',
                transition: 'opacity',
                _hover: { opacity: '0.7' },
              })}
            >
              {WORDMARK}
            </TransitionLink>
          </div>

          <NavLinks />

          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.5',
            })}
          >
            <SearchDialog />
            <ThemeToggle />
            <div
              className={css({
                display: { base: 'none', md: 'flex' },
                alignItems: 'center',
                gap: '0.5',
              })}
            >
              {SOCIAL_LINKS.map(({ label, Icon, ...target }) => (
                <ShellLink
                  key={label}
                  {...target}
                  aria-label={label}
                  className={headerIconButton}
                >
                  <Icon size={18} />
                </ShellLink>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* tabIndex -1: 건너뛰기 링크가 초점을 여기로 옮길 수 있게(탭 순서에는 없다). */}
      <main
        id={MAIN_ID}
        tabIndex={-1}
        className={css({ flex: '1', w: 'full', outline: 'none' })}
      >
        {children}
      </main>

      {/* 두 줄 — 워드마크 | 글자 링크(가운데) | 아이콘 / 구분선 / 사이트 설명 | ©. md 이상은
          5칸 격자(가운데 링크가 3칸), md 미만은 가운데 정렬 한 열이다(Astryx SiteFooter). */}
      <footer className={cx(railGutter, css({ mt: 'section', pb: '6' }))}>
        <div
          className={css({
            display: { base: 'flex', md: 'grid' },
            flexDir: 'column',
            alignItems: 'center',
            gap: { base: '6', md: '0' },
            gridTemplateColumns: { md: '[repeat(5, minmax(0, 1fr))]' },
          })}
        >
          <span
            className={css({
              fontFamily: 'mono',
              fontWeight: 'medium',
              fontSize: 'sm',
              color: 'ink.700',
            })}
          >
            {WORDMARK}
          </span>
          <nav
            aria-label="사이트 링크"
            className={css({
              gridColumn: { md: 'span 3' },
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: { base: '3', md: '4' },
              textStyle: 'supporting',
            })}
          >
            {FOOTER_LINKS.map(({ label, ...target }) => (
              <ShellLink key={label} {...target} className={footerLink}>
                {label}
              </ShellLink>
            ))}
          </nav>
          <div
            className={css({
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '2',
            })}
          >
            {SOCIAL_LINKS.map(({ label, Icon, ...target }) => (
              <ShellLink
                key={label}
                {...target}
                aria-label={label}
                className={footerIconButton}
              >
                <Icon size={16} />
              </ShellLink>
            ))}
          </div>
        </div>
        <div
          className={css({
            mt: { base: '6', md: '4' },
            pt: { base: '6', md: '4' },
            borderTopWidth: 'hairline',
            borderColor: 'ink.border',
            display: 'flex',
            flexDir: { base: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '2',
            textStyle: 'supporting',
            textAlign: { base: 'center', md: 'start' },
            color: 'ink.700',
          })}
        >
          <p>{SITE_DESCRIPTION}</p>
          <p>
            © {new Date().getFullYear()} {AUTHOR_ALTERNATE_NAME}
          </p>
        </div>
      </footer>
    </div>
  );
};
