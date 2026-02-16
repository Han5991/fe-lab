import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { ReactNode } from 'react';
import { getAllPosts } from '@/lib/posts';

import { PageTransition } from './PageTransition';
import { SearchDialog } from './search/SearchDialog';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const posts = getAllPosts();
  const searchPosts = posts.map(p => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
    excerpt: p.excerpt || '',
    tags: p.tags || [],
    series: p.series || null,
  }));

  return (
    <div className={css({ minH: '100vh', bg: 'white', color: 'gray.900', display: 'flex', flexDirection: 'column' })}>
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
          <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
            <SearchDialog posts={searchPosts} />
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
          © {new Date().getFullYear()} FE Lab. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

