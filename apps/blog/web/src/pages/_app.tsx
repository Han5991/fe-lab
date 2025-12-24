import '@/src/styles/globals.css';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Layout } from '@/src/components/Layout';
import { Ssgoi } from '@ssgoi/react';
import { hero } from '@ssgoi/react/view-transitions';

export default function App({ Component, pageProps }: AppProps) {
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
      <Ssgoi config={{ defaultTransition: hero() }}>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </Ssgoi>
      {process.env.NODE_ENV === 'production' && (
        <GoogleAnalytics gaId="G-ZS9ENFSSQ0" />
      )}
    </QueryClientProvider>
  );
}
