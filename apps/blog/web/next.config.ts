import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: process.env.PAGES_BASE_PATH || '/fe-lab',
  assetPrefix: process.env.PAGES_BASE_PATH || '/fe-lab',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
