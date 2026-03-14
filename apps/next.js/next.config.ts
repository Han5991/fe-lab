import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        destination: 'https://blog.sangwook.dev/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
