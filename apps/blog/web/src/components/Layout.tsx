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
        bg: 'white',
        color: 'gray.900',
        display: 'flex',
        flexDir: 'column',
      })}
    >
      <nav
        className={css({
          borderBottomWidth: '1px',
          borderColor: 'gray.100',
          pos: 'sticky',
          top: 0,
          bg: 'white/80',
          backdropFilter: 'blur(8px)',
          zIndex: 10,
        })}
      >
        <div
          className={css({
            maxW: '1200px',
            m: 'auto',
            px: '6',
            h: '16',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          })}
        >
          <Link
            href="/"
            className={css({
              fontSize: 'lg',
              fontWeight: 'bold',
              letterSpacing: 'tight',
              _hover: { color: 'blue.600' },
              transition: 'color 0.2s',
            })}
          >
            FE Lab
          </Link>
          <div
            className={css({ display: 'flex', alignItems: 'center', gap: '3' })}
          >
            <SearchDialog />
            <Link
              href="/posts/"
              className={css({
                fontSize: 'sm',
                fontWeight: 'medium',
                color: 'gray.600',
                _hover: { color: 'gray.900' },
                transition: 'color 0.2s',
              })}
            >
              Posts
            </Link>
            <Link
              href="/about/"
              className={css({
                fontSize: 'sm',
                fontWeight: 'medium',
                color: 'gray.600',
                _hover: { color: 'gray.900' },
                transition: 'color 0.2s',
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
          borderColor: 'gray.100',
          py: '12',
          mt: '12',
        })}
      >
        <div
          className={css({
            maxW: '800px',
            mx: 'auto',
            px: '6',
            textAlign: 'center',
            color: 'gray.400',
            fontSize: 'sm',
          })}
        >
          <div
            className={css({
              display: 'flex',
              justifyContent: 'center',
              gap: '5',
              mb: '4',
              flexWrap: 'wrap',
            })}
          >
            <Link href="/about/" className={css({ _hover: { color: 'gray.600' }, transition: 'color 0.2s' })}>
              About
            </Link>
            <Link href="/privacy" className={css({ _hover: { color: 'gray.600' }, transition: 'color 0.2s' })}>
              개인정보처리방침
            </Link>
            <a
              href={SITE_AUTHOR_GITHUB}
              target="_blank"
              rel="noopener noreferrer"
              className={css({ _hover: { color: 'gray.600' }, transition: 'color 0.2s' })}
            >
              GitHub
            </a>
            <a
              href={SITE_AUTHOR_LINKEDIN}
              target="_blank"
              rel="noopener noreferrer"
              className={css({ _hover: { color: 'gray.600' }, transition: 'color 0.2s' })}
            >
              LinkedIn
            </a>
          </div>
          © {new Date().getFullYear()} FE Lab. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
