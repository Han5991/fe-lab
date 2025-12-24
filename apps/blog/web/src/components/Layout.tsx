import React from 'react';
import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div
      className={css({ minHeight: '100vh', bg: 'white', color: 'gray.900' })}
    >
      <nav
        className={css({
          borderBottomWidth: '1px',
          borderColor: 'gray.100',
          position: 'sticky',
          top: 0,
          bg: 'white/80',
          backdropFilter: 'blur(8px)',
          zIndex: 10,
        })}
      >
        <div
          className={css({
            maxWidth: '800px',
            margin: '0 auto',
            px: '6',
            height: '16',
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
          <div className={css({ display: 'flex', gap: '6' })}>
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
            maxWidth: '800px',
            margin: '0 auto',
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
