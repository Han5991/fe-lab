import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { ReactNode } from 'react';
import { SITE_AUTHOR_GITHUB, SITE_AUTHOR_LINKEDIN } from '@/lib/constants';

import { PageTransition } from './PageTransition';
import { SearchDialog } from './search/SearchDialog';

interface LayoutProps {
  children: ReactNode;
}

const navLink = css({
  display: 'inline-flex',
  alignItems: 'center',
  fontSize: 'sm',
  color: 'ink.600',
  px: '3',
  py: '1.5',
  rounded: 'md',
  transition: '[all 0.15s]',
  _hover: { color: 'ink.950', bg: 'paper.100' },
});

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
      <nav
        className={css({
          borderBottomWidth: '[1px]',
          borderColor: 'ink.border',
          pos: 'sticky',
          top: '0',
          bg: '[rgba(252,250,247,0.95)]',
          backdropFilter: '[blur(12px)]',
          zIndex: '10',
        })}
      >
        <div
          className={css({
            maxW: 'containerW',
            m: 'auto',
            px: '8',
            h: '14',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          })}
        >
          <Link
            href="/"
            className={css({
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: '3',
              color: 'ink.950',
              transition: '[opacity 0.15s]',
              _hover: { opacity: '0.8' },
            })}
          >
            <span
              className={css({
                fontFamily: 'serif',
                fontStyle: 'italic',
                fontSize: 'lg',
                fontWeight: 'semibold',
                letterSpacing: 'tightXs',
              })}
            >
              Frontend Lab
            </span>
            <span
              className={css({
                fontFamily: 'mono',
                fontSize: '2xs',
                color: 'ink.400',
                letterSpacing: 'monoXxl',
                display: { base: 'none', md: 'inline' },
              })}
            >
              EST. 2025
            </span>
          </Link>
          <div
            className={css({ display: 'flex', alignItems: 'center', gap: '1' })}
          >
            <Link href="/posts/" className={navLink}>
              Posts
            </Link>
            <Link href="/about/" className={navLink}>
              About
            </Link>
            <SearchDialog />
          </div>
        </div>
      </nav>

      <main className={css({ flex: '1', w: 'full' })}>
        <PageTransition>{children}</PageTransition>
      </main>

      <footer
        className={css({
          borderTopWidth: '[1px]',
          borderColor: 'ink.border',
          mt: '20',
          py: '8',
          bg: 'paper.100',
        })}
      >
        <div
          className={css({
            maxW: 'containerW',
            mx: 'auto',
            px: '8',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '4',
          })}
        >
          <span
            className={css({
              fontFamily: 'mono',
              fontSize: 'xs',
              letterSpacing: 'monoXl',
              textTransform: 'uppercase',
              color: 'ink.500',
            })}
          >
            © {new Date().getFullYear()} Frontend Lab · 한상욱
          </span>
          <div
            className={css({
              display: 'flex',
              gap: '6',
              flexWrap: 'wrap',
              alignItems: 'center',
            })}
          >
            {[
              { href: '/about/', label: 'About', internal: true },
              { href: '/privacy', label: '개인정보', internal: true },
              { href: SITE_AUTHOR_GITHUB, label: 'GitHub', internal: false },
              {
                href: SITE_AUTHOR_LINKEDIN,
                label: 'LinkedIn',
                internal: false,
              },
              { href: '/rss.xml', label: 'RSS', internal: false },
            ].map(link =>
              link.internal ? (
                <Link
                  key={link.label}
                  href={link.href}
                  className={css({
                    fontFamily: 'mono',
                    fontSize: 'xs',
                    color: 'ink.500',
                    _hover: { color: 'ink.950' },
                    transition: '[color 0.15s]',
                  })}
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
                  className={css({
                    fontFamily: 'mono',
                    fontSize: 'xs',
                    color: 'ink.500',
                    _hover: { color: 'ink.950' },
                    transition: '[color 0.15s]',
                  })}
                >
                  {link.label}
                </a>
              ),
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
