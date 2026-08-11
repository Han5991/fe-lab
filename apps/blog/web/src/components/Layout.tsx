import Link from 'next/link';
import { css, cx } from '@design-system/ui-lib/css';
import type { ReactNode } from 'react';
import {
  RSS_PATH,
  SITE_AUTHOR_GITHUB,
  SITE_AUTHOR_LINKEDIN,
} from '@/lib/constants';

import { PageTransition } from './PageTransition';
import { NavLinks } from './home/NavLinks';
import { SearchDialog } from './search/SearchDialog';
import { ThemeToggle } from './ThemeToggle';

interface LayoutProps {
  children: ReactNode;
}

/**
 * 헤더·푸터의 기준 칼럼. 레퍼런스 허브와 같은 640px 축에 정렬합니다.
 * 바깥 px가 좁은 화면의 여백을, 안쪽 maxW가 넓은 화면의 폭을 담당합니다.
 * (글 상세는 TOC 사이드바 때문에 더 넓지만, 헤더는 공통이라 여기 기준을 따릅니다)
 */
const railOuter = css({ px: '[20px]' });
const railInner = css({ maxW: 'hubW', mx: 'auto' });

const footerLink = css({
  fontFamily: 'mono',
  fontSize: '[12px]',
  color: 'ink.500',
  transition: '[color 0.15s]',
  _hover: { color: 'ink.950' },
});

const FOOTER_LINKS = [
  { href: '/about/', label: 'About', internal: true },
  { href: '/privacy/', label: '개인정보', internal: true },
  { href: SITE_AUTHOR_GITHUB, label: 'GitHub', internal: false },
  { href: SITE_AUTHOR_LINKEDIN, label: 'LinkedIn', internal: false },
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
      {/* sticky는 유지하되 blur/알파 배경은 걷어냈다 — 위계는 hairline 보더로만. */}
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
          // Panda에서 흐림은 `backdropFilter: 'auto'` + `backdropBlur` 조합이다.
          // `backdropFilter: '[blur(12px)]'` 처럼 임의값으로 주면 클래스만 생기고
          // 규칙이 안 나간다(리뉴얼 전 코드가 그 형태였다).
          //
          // lightningcss가 이 선언을 `-webkit-backdrop-filter` 한 줄로만 내보낸다.
          // 실제 브라우저(Chrome/Safari)는 이 접두사를 지원하므로 흐림이 걸린다.
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
              href="/"
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

      <main className={css({ flex: '1', w: 'full' })}>
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
