import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: isDev ? undefined : process.env.PAGES_BASE_PATH || '/fe-lab',
  assetPrefix: isDev ? undefined : process.env.PAGES_BASE_PATH || '/fe-lab',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
