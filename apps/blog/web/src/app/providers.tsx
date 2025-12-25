'use client';

import { type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Ssgoi } from '@ssgoi/react';
import { fade, drill } from '@ssgoi/react/view-transitions';
import { css } from '@design-system/ui-lib/css';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Ssgoi
        config={{
          defaultTransition: fade(),
          transitions: [
            {
              from: '/posts',
              to: '/posts/*',
              transition: drill({ direction: 'enter' }),
            },
            {
              from: '/posts/*',
              to: '/posts',
              transition: drill({ direction: 'exit' }),
            },
          ],
        }}
      >
        <div
          className={css({
            pos: 'relative',
          })}
        >
          {children}
        </div>
      </Ssgoi>
    </QueryClientProvider>
  );
}
