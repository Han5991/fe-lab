import Link from 'next/link';
import { css, cx } from '@design-system/ui-lib/css';
import type { ReactNode } from 'react';
import {
  RSS_PATH,
  SITE_AUTHOR_GITHUB,
  SITE_AUTHOR_LINKEDIN,
} from '@/lib/constants';

import { PageTransition } from './PageTransition';
import { SiteRail } from './SiteRail';

interface LayoutProps {
  children: ReactNode;
}

/**
 * 푸터의 기준 칼럼. 허브와 같은 640px 축에 정렬합니다.
 * 바깥 px가 좁은 화면의 여백을, 안쪽 maxW가 넓은 화면의 폭을 담당합니다.
 *
 * 예전에는 헤더도 이 축을 공유했습니다. 헤더가 세로 레일이 되면서 그 결합이
 * 사라졌고, 이제 이 상수는 푸터만 씁니다.
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
        // 레일은 fixed라 흐름에서 빠져 있다. 본문이 그 아래로 깔리지 않도록
        // 레일이 차지한 만큼만 비워 준다 — 레일을 그리드 트랙으로 만들면
        // 스크롤 컨테이너가 body에서 옮겨가 window.scrollY를 읽는 것들이 죽는다.
        // 수치는 SiteRail과 같은 리터럴이어야 한다 — 상수로 빼면 Panda가
        // 규칙을 못 만든다(SiteRail 상단 주석).
        pl: { base: '0', lg: '[64px]' },
        pt: { base: '[52px]', lg: '0' },
      })}
    >
      <SiteRail />

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
