import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  trailingSlash: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: 'https://blog.sangwook.dev/',
        permanent: true,
      },
      {
        source: '/:path+',
        destination: 'https://blog.sangwook.dev/:path+/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
