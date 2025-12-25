import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className={css({ minH: '100vh', bg: 'white', color: 'gray.900' })}>
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
            maxW: '800px',
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
          <Link
            href="/posts"
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
        </div>
      </nav>
      <main>{children}</main>
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
          © {new Date().getFullYear()} FE Lab. All rights reserved.
        </div>
      </footer>
    </div>
  );
};
