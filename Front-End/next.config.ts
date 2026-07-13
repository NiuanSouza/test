import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/user/:path*',
        destination: 'http://localhost:8080/user/:path*',
      },
      {
        source: '/vehicle/:path*',
        destination: 'http://localhost:8080/vehicle/:path*',
      },
      {
        source: '/service/:path*',
        destination: 'http://localhost:8080/service/:path*',
      },
      {
        source: '/export/:path*',
        destination: 'http://localhost:8080/export/:path*',
      },
    ];
  },
};

export default nextConfig;
