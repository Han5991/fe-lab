import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  output: 'export',
  basePath: '/fe-lab',
  assetPrefix: '/fe-lab',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
