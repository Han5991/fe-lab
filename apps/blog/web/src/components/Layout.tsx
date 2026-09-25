import { RSS_PATH } from '@blog/content';
import { AUTHOR_GITHUB, AUTHOR_LINKEDIN } from '@/content.values.mts';
import { ABOUT_PATH, HOME_PATH, PRIVACY_PATH } from '@/src/shared/routes';
import Link from 'next/link';
import { css, cx } from '@design-system/ui-lib/css';
import type { ReactNode } from 'react';

import { PageTransition } from './PageTransition';
import { railGutter, railColumn } from './Rail';
import { NavLinks } from './home/NavLinks';
import { SearchDialog } from './search/SearchDialog';
import { ThemeToggle } from './ThemeToggle';

interface LayoutProps {
  children: ReactNode;
}

/**
 * 헤더·푸터는 **가장 넓은 레일**에 고정합니다. 페이지마다 본문 폭이 다른데
 * (허브·글은 text 680, 목록·소개는 wide 1200) 헤더까지 따라 움직이면 이동할
 * 때마다 로고 위치가 바뀝니다. wide에 고정하면 헤더는 어느 페이지에서나 같은
 * 자리에 있고, 넓은 페이지에서는 본문 좌측과 정확히 일치합니다.
 *
 * 예전에는 640에 고정돼 있어서 /posts·/about에서 로고가 콘텐츠 안쪽으로
 * 248px 들어가 있었습니다.
 */
const railOuter = railGutter;
const railInner = railColumn({ width: 'wide' });

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
  rounded: 'md',
  transform: 'translateY(-200%)',
  _focus: { transform: 'none' },
});

const footerLink = css({
  fontFamily: 'mono',
  fontSize: '[12px]',
  color: 'ink.500',
  transition: '[color 0.15s]',
  _hover: { color: 'ink.950' },
});

const FOOTER_LINKS = [
  { href: ABOUT_PATH, label: 'About', internal: true },
  { href: PRIVACY_PATH, label: '개인정보', internal: true },
  { href: AUTHOR_GITHUB, label: 'GitHub', internal: false },
  { href: AUTHOR_LINKEDIN, label: 'LinkedIn', internal: false },
  { href: RSS_PATH, label: 'RSS', internal: false },
] as const;

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
      {/* sticky 헤더 — 위계는 hairline 보더와 반투명·흐림 배경으로만 세운다. */}
      <a href={`#${MAIN_ID}`} className={skipLink}>
        본문으로 건너뛰기
      </a>
      <header
        className={css({
          borderBottomWidth: 'hairline',
          borderBottomStyle: 'solid',
          borderColor: 'ink.border',
          pos: 'sticky',
          top: '0',
          // sticky 헤더라 아래로 본문이 지나간다. 반투명하게 둬서 헤더가 지면
          // 위에 떠 있다는 걸 드러낸다 — 불투명하면 스크롤 중에 본문이 헤더
          // 경계에서 뚝 잘려 보인다.
          //
          bg: 'paper.50/80',
          // Panda의 흐림은 `backdropFilter: 'auto'` + `backdropBlur`다(임의값이면 규칙이 안 나간다).
          // backdrop-filter는 헤더를 fixed 자손의 containing block으로 만든다 —
          // 뷰포트를 덮는 오버레이는 <Portal>로 body에 띄울 것.
          backdropFilter: 'auto',
          backdropBlur: '[12px]',
          zIndex: '10',
        })}
      >
        <div className={railOuter}>
          <div
            className={cx(
              railInner,
              css({
                // 이 높이(+ 하단 hairline)에 PreviewBanner의 sticky top이 맞물린다.
                h: '[52px]',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: { base: '[10px]', md: '[16px]' },
              }),
            )}
          >
            {/* 로고 표기만 sangwook.dev. metadata/JSON-LD의 사이트명(Frontend Lab)은
                검색 색인 보호를 위해 그대로 둔다. */}
            <Link
              href={HOME_PATH}
              className={css({
                fontFamily: 'mono',
                fontWeight: 'medium',
                fontSize: '[15px]',
                color: 'ink.950',
                transition: '[opacity 0.15s]',
                _hover: { opacity: '0.7' },
              })}
            >
              sangwook.dev
            </Link>

            <div
              className={css({
                display: 'flex',
                alignItems: 'center',
                gap: { base: '[10px]', md: '[16px]' },
              })}
            >
              <NavLinks />
              <div
                className={css({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '[4px]',
                })}
              >
                <SearchDialog />
                <ThemeToggle />
              </div>
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
        <PageTransition>{children}</PageTransition>
      </main>

      <footer
        className={css({
          borderTopWidth: 'hairline',
          borderTopStyle: 'solid',
          borderColor: 'ink.border',
          mt: '[64px]',
          py: '[20px]',
        })}
      >
        <div className={railOuter}>
          <div
            className={cx(
              railInner,
              css({
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '[12px]',
              }),
            )}
          >
            <span
              className={css({
                fontFamily: 'mono',
                fontSize: '[12px]',
                color: 'ink.500',
              })}
            >
              © {new Date().getFullYear()} 한상욱
            </span>
            <div
              className={css({
                display: 'flex',
                gap: '[16px]',
                flexWrap: 'wrap',
                alignItems: 'center',
              })}
            >
              {FOOTER_LINKS.map(link =>
                link.internal ? (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={footerLink}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={
                      link.href.startsWith('http')
                        ? 'noopener noreferrer'
                        : undefined
                    }
                    className={footerLink}
                  >
                    {link.label}
                  </a>
                ),
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
