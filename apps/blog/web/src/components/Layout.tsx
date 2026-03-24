import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { ReactNode } from 'react';
import { SITE_AUTHOR_GITHUB, SITE_AUTHOR_LINKEDIN } from '@/lib/constants';

import { PageTransition } from './PageTransition';
import { SearchDialog } from './search/SearchDialog';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div
      className={css({
        minH: '100vh',
        bg: 'ink.25',
        color: 'ink.950',
        display: 'flex',
        flexDir: 'column',
      })}
    >
      <nav
        className={css({
          borderBottomWidth: '1px',
          borderColor: 'ink.border',
          pos: 'sticky',
          top: 0,
          bg: 'ink.25/85',
          backdropFilter: 'blur(12px)',
          zIndex: 10,
        })}
      >
        <div
          className={css({
            maxW: '1200px',
            m: 'auto',
            px: '6',
            h: '14',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          })}
        >
          <Link
            href="/"
            className={css({
              fontSize: 'sm',
              fontWeight: 'bold',
              letterSpacing: 'widest',
              textTransform: 'uppercase',
              color: 'ink.950',
              _hover: { color: 'accent.600' },
              transition: 'color 0.15s',
            })}
          >
            FE Lab
          </Link>
          <div
            className={css({ display: 'flex', alignItems: 'center', gap: '1' })}
          >
            <SearchDialog />
            <Link
              href="/posts/"
              className={css({
                fontSize: 'sm',
                fontWeight: 'medium',
                color: 'ink.500',
                px: '3',
                py: '1.5',
                rounded: 'md',
                _hover: { color: 'ink.950', bg: 'ink.100' },
                transition: 'all 0.15s',
              })}
            >
              Posts
            </Link>
            <Link
              href="/about/"
              className={css({
                fontSize: 'sm',
                fontWeight: 'medium',
                color: 'ink.500',
                px: '3',
                py: '1.5',
                rounded: 'md',
                _hover: { color: 'ink.950', bg: 'ink.100' },
                transition: 'all 0.15s',
              })}
            >
              About
            </Link>
          </div>
        </div>
      </nav>

      <main className={css({ flex: 1, w: 'full' })}>
        <PageTransition>{children}</PageTransition>
      </main>

      <footer
        className={css({
          borderTopWidth: '1px',
          borderColor: 'ink.border',
          py: '10',
          mt: '16',
          bg: 'ink.50',
        })}
      >
        <div
          className={css({
            maxW: '1200px',
            mx: 'auto',
            px: '6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '4',
          })}
        >
          <span
            className={css({
              fontSize: 'xs',
              fontWeight: 'bold',
              letterSpacing: 'widest',
              textTransform: 'uppercase',
              color: 'ink.500',
            })}
          >
            © {new Date().getFullYear()} FE Lab
          </span>
          <div
            className={css({
              display: 'flex',
              gap: '5',
              flexWrap: 'wrap',
              alignItems: 'center',
            })}
          >
            {[
              { href: '/about/', label: 'About', internal: true },
              { href: '/privacy', label: '개인정보처리방침', internal: true },
              { href: SITE_AUTHOR_GITHUB, label: 'GitHub', internal: false },
              { href: SITE_AUTHOR_LINKEDIN, label: 'LinkedIn', internal: false },
            ].map(link =>
              link.internal ? (
                <Link
                  key={link.label}
                  href={link.href}
                  className={css({
                    fontSize: 'xs',
                    color: 'ink.500',
                    _hover: { color: 'ink.950' },
                    transition: 'color 0.15s',
                  })}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={css({
                    fontSize: 'xs',
                    color: 'ink.500',
                    _hover: { color: 'ink.950' },
                    transition: 'color 0.15s',
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
