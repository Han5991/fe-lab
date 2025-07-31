import type { NextConfig } from 'next';
import createMDX from '@next/mdx';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: isDev ? undefined : 'export',
  basePath: isDev ? undefined : process.env.PAGES_BASE_PATH || '/fe-lab',
  assetPrefix: isDev ? undefined : process.env.PAGES_BASE_PATH || '/fe-lab',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],
};

const withMDX = createMDX({
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
