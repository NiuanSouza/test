import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Usa a URL de produção se existir, caso contrário aponta para o localhost
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    
    return [
      {
        source: '/user/:path*',
        destination: `${API_URL}/user/:path*`,
      },
      {
        source: '/vehicle/:path*',
        destination: `${API_URL}/vehicle/:path*`,
      },
      {
        source: '/service/:path*',
        destination: `${API_URL}/service/:path*`,
      },
      {
        source: '/export/:path*',
        destination: `${API_URL}/export/:path*`,
      },
    ];
  },
};

export default nextConfig;
